// src/services/geminiService.js

// Using the correct free tier model
const MODEL = 'gemini-2.5-flash'; 

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

// Helper utility to pause execution during rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fail-safe utility to repair truncated or incomplete JSON strings.
 * Safely closes brackets/braces to prevent "Unexpected end of input" crashes.
 */
const safelyRepairJSON = (jsonString) => {
  let cleaned = jsonString.trim();
  
  // If it's already syntactically complete, return it
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (e) {
    // Continue to repair steps if parsing fails
  }

  // Remove trailing commas or dangling partial keys/values at the cutoff point
  cleaned = cleaned.replace(/,\s*$/, "");
  cleaned = cleaned.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  cleaned = cleaned.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, "");

  // Track balance of structural brackets
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;

  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '"' && cleaned[i - 1] !== '\\') {
      inString = !inString;
    }
    if (!inString) {
      if (cleaned[i] === '{') braceCount++;
      if (cleaned[i] === '}') braceCount--;
      if (cleaned[i] === '[') bracketCount++;
      if (cleaned[i] === ']') bracketCount--;
    }
  }

  // If inside an open quote at the end of truncation, close it
  if (inString) {
    cleaned += '"';
  }

  // Close dangling array items if cut off inside the insights array
  if (bracketCount > 0 && cleaned.endsWith('}')) {
    cleaned += ']';
    bracketCount--;
  } else if (bracketCount > 0 && !cleaned.endsWith(']')) {
    cleaned += '}]';
    braceCount = Math.max(0, braceCount - 1);
  }

  // Close remaining top-level object braces
  while (braceCount > 0) {
    cleaned += '}';
    braceCount--;
  }

  return cleaned;
};

export const generateInsights = async (budgetData, expenses, retries = 2) => {
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
                  text: `Generate exactly 4 brief budget insights based on this student budget data in Lesotho with Maloti currency:

${context}

Keep insight messages and actions extremely short (1 sentence max) to guarantee the text fits cleanly inside a small response stream.`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                score: { type: "INTEGER" },
                scoreLabel: { type: "STRING" },
                summary: { type: "STRING" },
                insights: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      id: { type: "STRING" },
                      type: { type: "STRING" },
                      title: { type: "STRING" },
                      message: { type: "STRING" },
                      action: { type: "STRING" }
                    },
                    required: ["id", "type", "title", "message", "action"]
                  }
                }
              },
              required: ["score", "scoreLabel", "summary", "insights"]
            }
          }
        })
      }
    );

    console.log('Response status:', res.status);

    if (res.status === 429 && retries > 0) {
      console.warn(`Rate limit hit (429). Retrying in 5 seconds... (${retries} retries left)`);
      await delay(5000);
      return await generateInsights(budgetData, expenses, retries - 1);
    }

    if (!res.ok) {
      const errorData = await res.text();
      console.error('API Error:', res.status, errorData);
      throw new Error(`API Error: ${res.status}`);
    }

    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('No text in response');
      throw new Error('No response from Gemini');
    }

    // Pass the text through the repair logic to patch up any truncation issues
    const safeText = safelyRepairJSON(text);

    const parsed = JSON.parse(safeText);
    console.log('Insights processed and parsed successfully');
    
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