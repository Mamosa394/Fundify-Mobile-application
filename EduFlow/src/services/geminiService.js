import * as SecureStore from 'expo-secure-store';

const STORE_KEY = 'BUDGET_APP_GEMINI_KEY';

const MODEL = 'gemini-2.5-flash';

const ENDPOINT =
`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ─────────────────────────────────────────────
// Key storage
// ─────────────────────────────────────────────

export const saveApiKey = async (key) => {
  return SecureStore.setItemAsync(STORE_KEY, key);
};

export const getStoredApiKey = async () => {
  return SecureStore.getItemAsync(STORE_KEY);
};

export const clearApiKey = async () => {
  return SecureStore.deleteItemAsync(STORE_KEY);
};

// ─────────────────────────────────────────────
// Budget context
// ─────────────────────────────────────────────

const buildContext = (budgetData, expenses = []) => {

  if (!budgetData)
    return 'No budget data available';

  const categories =
    Object.values(budgetData.categories || {})
      .map(cat => {

        const spent = cat.spent || 0;
        const budgeted = cat.budgeted || 0;

        return `${cat.name}: spent R${spent}, budget R${budgeted}`;

      })
      .join('\n');

  return `
Budget: R${budgetData.totalBudget || 0}

Spent: R${budgetData.spentTotal || 0}

Categories:
${categories}

Recent expenses:
${expenses
  .slice(0,5)
  .map(e => `R${e.amount} ${e.category}`)
  .join('\n')}
`;
};

// ─────────────────────────────────────────────
// Insights
// ─────────────────────────────────────────────

export const generateInsights = async (
  budgetData,
  expenses,
  apiKey
) => {

  const context =
    buildContext(budgetData, expenses);

  try {

    const res = await fetch(
      `${ENDPOINT}?key=${apiKey}`,
      {
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        body:JSON.stringify({

          contents:[
            {
              parts:[
                {
                  text:`
Return ONLY JSON.

{
 "score":75,
 "scoreLabel":"Good",
 "summary":"summary text",
 "insights":[
   {
    "id":"1",
    "type":"tip",
    "emoji":"💡",
    "title":"title",
    "message":"message",
    "action":"action"
   }
 ]
}

Generate exactly 4 insights.

Budget:

${context}
`
                }
              ]
            }
          ],

          generationConfig:{
            temperature:0.3,
            responseMimeType:"application/json"
          }

        })
      }
    );

    const data=await res.json();

    const text =
      data.candidates?.[0]
      ?.content?.parts?.[0]
      ?.text;

    console.log("RAW AI:",text);

    if(!text)
      throw new Error("No response");

    return JSON.parse(text);

  }

  catch(error){

    console.log(
      "generateInsights:",
      error
    );

    throw error;
  }

};

// ─────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────

export const streamChatMessage = async (
  messages,
  budgetData,
  expenses,
  apiKey,
  onChunk,
  onDone,
  onError
)=>{

try{

const context =
buildContext(
budgetData,
expenses
);

const prompt=`

You are Fin, a student budgeting advisor.

Budget:

${context}

Conversation:

${messages
.map(
m=>`${m.role}: ${m.content}`
)
.join('\n')}

Reply briefly.
`;

const res=await fetch(
`${ENDPOINT}?key=${apiKey}`,
{
method:'POST',

headers:{
'Content-Type':'application/json'
},

body:JSON.stringify({

contents:[
{
parts:[
{
text:prompt
}
]
}
],

generationConfig:{
temperature:0.7
}

})
}
);

const data =
await res.json();

const text =
data.candidates?.[0]
?.content?.parts?.[0]
?.text;

if(!text){

throw new Error(
'Empty response'
);

}

onChunk(
text,
text
);

onDone(
text
);

}

catch(error){

console.log(
'Chat error:',
error
);

onError(
error
);

}

};