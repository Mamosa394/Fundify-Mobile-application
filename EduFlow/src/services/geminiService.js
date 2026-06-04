// src/services/geminiService.js

// Use a valid free tier model
const MODEL = 'gemini-2.0-flash-lite';  // 1,500 requests/day free

const ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const getApiKey = () => {
  if (!API_KEY) {
    console.error('EXPO_PUBLIC_GEMINI_API_KEY is not set');
    return null;
  }
  return API_KEY;
};

const buildContext = (budgetData, expenses = []) => {
  if (!budgetData) return 'No budget data available';

  const categories =
    Object.values(budgetData.categories || {})
      .map(cat => {
        const spent = cat.spent || 0;
        const budgeted = cat.budgeted || 0;
        return `${cat.name}: spent M${spent}, budget M${budgeted}`;
      })
      .join('\n');

  return `
Budget: M${budgetData.totalBudget || 0}
Spent: M${budgetData.spentTotal || 0}
Categories:
${categories}
Recent expenses:
${expenses.slice(0, 5).map(e => `M${e.amount} ${e.category}`).join('\n')}
`;
};

export const generateInsights = async (budgetData, expenses) => {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('Gemini API key missing');
  }

  const context = buildContext(budgetData, expenses);

  console.log('Sending to Gemini API. Model:', MODEL);

  try {
    const res = await fetch(
      `${ENDPOINT}?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Return ONLY valid JSON. No markdown, no extra text.

{
 "score": 75,
 "scoreLabel": "Good",
 "summary": "Your summary here",
 "insights": [
   {
    "id": "1",
    "type": "tip",
    "title": "Your title",
    "message": "Your message",
    "action": "Suggested action"
   }
 ]
}

Generate exactly 4 insights based on this student budget data in Lesotho with Maloti currency:

${context}

Important: Return ONLY the JSON. No other text.`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    console.log('Response status:', res.status);

    if (!res.ok) {
      const errorData = await res.text();
      console.error('API Error:', res.status, errorData);
      throw new Error(`API Error: ${res.status}`);
    }

    const data = await res.json();

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('No text in response');
      throw new Error('No response from Gemini');
    }

    // Clean markdown if present
    let cleanText = text;
    if (cleanText.includes('```json')) {
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanText.includes('```')) {
      cleanText = cleanText.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanText);
    console.log('Insights generated successfully');
    
    return parsed;

  } catch (error) {
    console.error('generateInsights error:', error.message);
    throw error;
  }
};

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
      onError(new Error('Gemini API key missing'));
      return;
    }

    const context = buildContext(budgetData, expenses);

    const conversationHistory = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const prompt = `You are Fin, a student budgeting advisor for students in Lesotho. Keep responses concise. Use M for Maloti currency.

Budget context:
${context}

Conversation:
${conversationHistory}

Provide a helpful response to the user's last message. Be encouraging and give specific, actionable advice. Keep it under 4 sentences. No emojis.`;

    const res = await fetch(
      `${ENDPOINT}?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        })
      }
    );

    if (!res.ok) {
      const errorData = await res.text();
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Empty response');
    }

    onChunk(text, text);
    onDone(text);

  } catch (error) {
    console.error('Chat error:', error);
    onError(error);
  }
};