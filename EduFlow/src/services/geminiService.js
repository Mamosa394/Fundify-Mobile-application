// src/services/geminiService.js

const MODEL = 'gemini-2.5-flash';

const ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ─────────────────────────────────────────────
// API KEY (ENV ONLY - SAFE ACCESS)
// ─────────────────────────────────────────────

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const getApiKey = () => {
  if (!API_KEY) {
    console.warn('❌ Missing EXPO_PUBLIC_GEMINI_API_KEY in .env');
    return null;
  }
  return API_KEY;
};

// ─────────────────────────────────────────────
// BUDGET CONTEXT
// ─────────────────────────────────────────────

const buildContext = (budgetData, expenses = []) => {
  if (!budgetData) return 'No budget data available';

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
  .slice(0, 5)
  .map(e => `R${e.amount} ${e.category}`)
  .join('\n')}
`;
};

// ─────────────────────────────────────────────
// INSIGHTS
// ─────────────────────────────────────────────

export const generateInsights = async (budgetData, expenses) => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('Missing Gemini API key in .env');
  }

  const context = buildContext(budgetData, expenses);

  try {
    const res = await fetch(
      `${ENDPOINT}?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
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
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await res.json();

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error('No response');

    return JSON.parse(text);

  } catch (error) {
    console.log('generateInsights:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// CHAT - FIXED
// ─────────────────────────────────────────────

export const streamChatMessage = async (
  messages,
  budgetData,
  expenses,
  onChunk,
  onDone,
  onError
) => {
  try {
    const apiKey = getApiKey();

    if (!apiKey) {
      throw new Error('Missing Gemini API key in .env');
    }

    const context = buildContext(budgetData, expenses);

    // Build conversation history
    const conversationHistory = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const prompt = `You are Fin, a friendly and helpful student budgeting advisor. Keep your responses concise and practical.

Here is the user's current budget information:
${context}

Previous conversation:
${conversationHistory}

Provide a helpful response to the user's last message. Be encouraging and give specific, actionable advice based on their actual spending patterns. Keep it under 3-4 sentences unless they ask for detailed analysis.`;

    console.log('Chat prompt length:', prompt.length);
    console.log('Messages count:', messages.length);

    const res = await fetch(
      `${ENDPOINT}?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        })
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      console.error('API Error:', res.status, errorData);
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    console.log('Chat API response:', JSON.stringify(data, null, 2));

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('Empty response from Gemini');
      throw new Error('Empty response');
    }

    // Since we're not actually streaming, we simulate it
    onChunk(text, text);
    onDone(text);

  } catch (error) {
    console.log('Chat error:', error);
    onError(error);
  }
};