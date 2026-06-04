import * as SecureStore from 'expo-secure-store';

const STORE_KEY = 'BUDGET_APP_GEMINI_KEY';

// ================= MODEL =================
const MODEL = 'gemini-2.5-flash';

const ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const STREAM_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent`;


// ================= KEY MANAGEMENT =================
export const saveApiKey = (key) =>
  SecureStore.setItemAsync(STORE_KEY, key);

export const getStoredApiKey = () =>
  SecureStore.getItemAsync(STORE_KEY);

export const clearApiKey = () =>
  SecureStore.deleteItemAsync(STORE_KEY);


// ================= BUILD BUDGET CONTEXT =================
const buildContext = (budgetData, expenses = []) => {
  if (!budgetData) return 'No budget data available yet';

  const catLines = Object.entries(
    budgetData.categories || {}
  )
    .map(([id, c]) => {
      const spent = c.spent || 0;
      const budgeted = c.budgeted || 0;

      const pct =
        budgeted > 0
          ? Math.round((spent / budgeted) * 100)
          : 0;

      return `• ${c.name || id}: R${spent} spent / R${budgeted} (${pct}%)`;
    })
    .join('\n');

  const topSpend = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(
      e =>
        `• R${e.amount} - ${e.category}${
          e.note ? ` (${e.note})` : ''
        }`
    )
    .join('\n');

  const total = budgetData.totalBudget || 0;
  const spent = budgetData.spentTotal || 0;
  const remaining = total - spent;

  return `
Monthly Budget: R${total}
Spent: R${spent}
Remaining: R${remaining}

Savings:
R${budgetData.categories?.savings?.budgeted || 0}

Category Breakdown:
${catLines || 'No categories'}

Top Expenses:
${topSpend || 'No expenses'}
`.trim();
};


// ================= ERROR HANDLER =================
const parseError = (err, status) => {
  const message = err?.error?.message || '';

  if (
    message.includes('quota') ||
    message.includes('limit: 0')
  ) {
    return 'No Gemini quota available. Create a new API key/project.';
  }

  if (
    message.includes('API key not valid') ||
    status === 403
  ) {
    return 'Invalid Gemini API key.';
  }

  if (status === 429) {
    return 'Too many requests. Please wait.';
  }

  return message || `Gemini error ${status}`;
};


// ================= GENERATE INSIGHTS =================
export const generateInsights = async (budgetData, expenses, apiKey) => {
  const context = buildContext(budgetData, expenses);

  const prompt = `
You are Fin, a friendly budget advisor for South African university students.

Return ONLY JSON.

{
  "score":0,
  "scoreLabel":"",
  "summary":"",
  "insights":[
    {
      "id":"1",
      "type":"warning",
      "emoji":"⚠️",
      "title":"",
      "message":"",
      "action":""
    }
  ]
}

Rules:
- Exactly 4 insights
- One must be positive
- Keep each message under 20 words
- Keep summary under 15 words
- No markdown
- No extra text

Budget:
${context}
`;

  try {
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000, // increased
          responseMimeType: "application/json"
        }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data?.error?.message ||
        `Gemini ${res.status}`
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Empty response");
    }

    console.log("RAW AI:", text);

    try {
      return JSON.parse(text);
    } catch {
      console.log("Bad JSON:", text);

      return {
        score: 70,
        scoreLabel: "Good",
        summary: "Budget analysed successfully",
        insights: [
          {
            id:"1",
            type:"tip",
            emoji:"💡",
            title:"AI Formatting Issue",
            message:"The AI returned incomplete data.",
            action:"Refresh"
          }
        ]
      };
    }

  } catch(error) {
    console.log("generateInsights:", error);
    throw error;
  }
};


// ================= STREAM CHAT =================
export const streamChatMessage = async (
  messages,
  budgetData,
  expenses,
  apiKey,
  onChunk,
  onDone,
  onError
) => {

  const context =
    buildContext(
      budgetData,
      expenses
    );

  const contents = [
    {
      role: 'user',
      parts: [{
        text: `
You are Fin.

Budget data:

${context}

Rules:
- Max 3 sentences
- Friendly
- Practical
- Never mention AI
        `
      }]
    },
    {
      role: 'model',
      parts: [{
        text:
        'Ready to help.'
      }]
    }
  ];

  messages.forEach(msg => {
    contents.push({
      role:
        msg.role === 'assistant'
          ? 'model'
          : 'user',

      parts: [{
        text: msg.content
      }]
    });
  });

  try {

    const res = await fetch(
      `${STREAM_ENDPOINT}?alt=sse&key=${apiKey}`,
      {
        method:'POST',

        headers:{
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          contents,

          generationConfig:{
            temperature:0.75,
            topP:0.95,
            topK:40,
            maxOutputTokens:500
          }
        })
      }
    );

    if(!res.ok){

      const err=
      await res.json()
      .catch(()=>({}));

      throw new Error(
        parseError(
          err,
          res.status
        )
      );
    }

    const reader=
      res.body.getReader();

    const decoder=
      new TextDecoder();

    let fullText='';

    while(true){

      const {
        done,
        value
      }=
      await reader.read();

      if(done) break;

      const chunk=
      decoder.decode(
        value,
        {
          stream:true
        }
      );

      const lines=
      chunk.split('\n');

      for(
        const line
        of lines
      ){

        if(
          !line.startsWith(
            'data:'
          )
        )
        continue;

        try{

          const json=
          JSON.parse(
            line.replace(
              'data:',
              ''
            )
          );

          const text=
          json
          ?.candidates?.[0]
          ?.content?.parts?.[0]
          ?.text;

          if(text){

            fullText+=text;

            onChunk(
              text,
              fullText
            );
          }

        }catch{
          // ignore malformed chunks
        }
      }
    }

    onDone(fullText);

  } catch(error){

    console.log(
      'Stream error:',
      error
    );

    onError(error);
  }
};