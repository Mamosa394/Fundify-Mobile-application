import * as SecureStore from 'expo-secure-store';

const STORE_KEY  = 'BUDGET_APP_OPENAI_KEY';
const ENDPOINT   = 'https://api.openai.com/v1/chat/completions';
const MODEL      = 'gpt-4o-mini';

// ─── Key management ───────────────────────────────────────────────────────────
export const saveApiKey      = (key) => SecureStore.setItemAsync(STORE_KEY, key);
export const getStoredApiKey = ()    => SecureStore.getItemAsync(STORE_KEY);
export const clearApiKey     = ()    => SecureStore.deleteItemAsync(STORE_KEY);

// ─── Build context string from live budget data ───────────────────────────────
const buildContext = (budgetData, expenses = []) => {
  if (!budgetData) return 'No budget data available yet.';

  const catLines = Object.entries(budgetData.categories || {})
    .map(([id, c]) => {
      const pct = c.budgeted > 0 ? Math.round((c.spent / c.budgeted) * 100) : 0;
      return `  • ${c.name || id}: R${c.spent || 0} spent / R${c.budgeted || 0} budgeted (${pct}%)`;
    }).join('\n');

  const topSpend = [...(expenses || [])]
    .sort((a, b) => b.amount - a.amount).slice(0, 5)
    .map(e => `  • R${e.amount} — ${e.category}${e.note ? ` (${e.note})` : ''}`)
    .join('\n');

  const total     = budgetData.totalBudget || 0;
  const spent     = budgetData.spentTotal  || 0;
  const remaining = total - spent;

  return `
Monthly Budget: R${total} | Spent: R${spent} | Remaining: R${remaining}
Savings allocated: R${budgetData.categories?.savings?.budgeted || 0}

Category Breakdown:
${catLines || '  No categories yet.'}

Recent Top Expenses:
${topSpend || '  No expenses yet.'}`.trim();
};

// ─── Generate structured insight cards (returns JSON) ─────────────────────────
export const generateInsights = async (budgetData, expenses, apiKey) => {
  const context = buildContext(budgetData, expenses);

  const res = await fetch(ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model:           MODEL,
      response_format: { type: 'json_object' },
      temperature:     0.7,
      max_tokens:      900,
      messages: [
        {
          role: 'system',
          content: `You are Fin, a friendly budget advisor for South African university students.
Analyse the student's budget and return ONLY valid JSON in this exact structure:
{
  "score": <integer 0-100>,
  "scoreLabel": "<Excellent|Good|Fair|Needs Work>",
  "summary": "<2 sentences on overall budget health>",
  "insights": [
    {
      "id": "<1-4>",
      "type": "<warning|tip|positive|alert>",
      "emoji": "<single emoji>",
      "title": "<max 6 words>",
      "message": "<2-3 practical sentences. Use SA student context: taxi, data bundles, cafeteria, Checkers/Pick n Pay specials, campus shuttle.>",
      "action": "<one concrete action, max 8 words>"
    }
  ]
}
Generate exactly 4 insights. Always include at least one "positive" type. Be encouraging, not preachy.`,
        },
        {
          role:    'user',
          content: `My budget data:\n\n${context}\n\nGive me personalised insights.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI error ${res.status}`);
  }

  const data    = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');
  return JSON.parse(content);
};

// ─── Streaming chat (SSE) ─────────────────────────────────────────────────────
export const streamChatMessage = async (
  messages,        // [{role, content}]
  budgetData,
  expenses,
  apiKey,
  onChunk,         // (token, fullTextSoFar) => void
  onDone,          // (finalText) => void
  onError,         // (Error) => void
) => {
  const context = buildContext(budgetData, expenses);

  const sysMsg = {
    role:    'system',
    content: `You are Fin, a friendly budget advisor for South African university students.
Live budget data:
${context}

Rules:
- Max 3 sentences per reply
- Be warm, practical, and encouraging
- Use SA context: taxi/Uber, data bundles, campus cafeteria, Woolies/Checkers
- Refer to the student's ACTUAL numbers when relevant
- Never mention being an AI`,
  };

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model:       MODEL,
        stream:      true,
        max_tokens:  320,
        temperature: 0.75,
        messages:    [sysMsg, ...messages],
      }),
    });
  } catch (e) { onError(e); return; }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    onError(new Error(err.error?.message || `OpenAI error ${res.status}`));
    return;
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText  = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const raw   = decoder.decode(value, { stream: true });
      const lines = raw.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const payload = line.slice(6);
        if (payload === '[DONE]') { onDone(fullText); return; }
        try {
          const parsed = JSON.parse(payload);
          const token  = parsed.choices?.[0]?.delta?.content ?? '';
          if (token) { fullText += token; onChunk(token, fullText); }
        } catch (_) { /* skip malformed chunk */ }
      }
    }
    onDone(fullText);
  } catch (e) { onError(e); }
};