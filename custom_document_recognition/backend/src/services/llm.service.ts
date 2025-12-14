// Поддержка Groq API и Ollama
const USE_GROQ = process.env.USE_GROQ === 'true' || !!process.env.GROQ_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_ENDPOINT = process.env.GROQ_ENDPOINT || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';

const OLLAMA_ENDPOINT = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input);
  } catch (e) {
    return null;
  }
}

async function callLLM(prompt: string, temperature: number = 0): Promise<string> {
  if (USE_GROQ && GROQ_API_KEY) {
    // Groq API
    const resp = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        stream: false
      })
    });
    const data = await resp.json();
    return (data.choices?.[0]?.message?.content || '').trim();
  } else {
    // Ollama API
    const resp = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: OLLAMA_MODEL, 
        prompt, 
        stream: false, 
        options: { temperature } 
      })
    });
    const data = await resp.json();
    return (data.response ?? '').trim();
  }
}

export async function describeField(field: string, contextText: string = ''): Promise<string> {
  const prompt = `You are a helpful assistant. Provide a brief but clear description (2-4 sentences) of what the field "${field}" usually contains in documents. If context text is provided, tailor the description to the document type. Respond in Russian if the field is in Russian, otherwise in English. Output plain text only.

Context (optional):
${contextText.slice(0, 1200)}`;

  try {
    const raw = await callLLM(prompt, 0.3);
    return raw.split('\n').slice(0, 6).join(' ').trim();
  } catch (err) {
    console.error('LLM describeField failed:', err);
    return '';
  }
}

export async function queryLLM(fields: string[], text: string) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return {};
  }

  const fieldList = fields.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n');

  const prompt = `You are an extraction assistant. Extract values for the requested fields from the document text.

Fields:
${fieldList}

Instructions:
- Return STRICT JSON only (no extra commentary or surrounding text).
- For every requested field return an object with keys: "value" (string), "confidence" (0.0-1.0), "candidates" (array), and "inferred" (boolean).
- Normalise currency names/symbols to ISO codes when the field name hints at money (e.g. "валюта", "currency", "amount") and prefer RUB for "₽", "р", "руб".
- If you can find a clear, explicit value in the document, set "inferred": false and a high confidence.
- If the document does NOT contain an explicit value for a field, provide a best-effort GUESS for that field, set "inferred": true, and provide a conservative confidence (for example 0.2-0.4). Do not leave the field out.
- In candidates include alternative extracted texts or spans if available, with optional bbox metadata.
- Keep answers concise, avoid explanations.

Output format example:
{
  "FIELD_NAME": { "value": "...", "confidence": 0.0, "candidates":[{"text":"...","confidence":0.9,"bbox":[x,y,w,h]}], "inferred": false },
  ...
}

Document text:
${text}`;

  try {
    const raw = await callLLM(prompt, 0);
    const match = raw.match(/\{[\s\S]*\}$/);
    if (!match) return {};
    const parsed = safeJsonParse(match[0]);
    return parsed || {};
  } catch (err) {
    console.error('LLM call failed:', err);
    return {};
  }
}

export async function suggestFieldsFromText(text: string, maxFields: number = 10) {
  if (!text || text.trim().length < 20) return [];

  const prompt = `You are a document structure detector. From the following OCR text, propose ${Math.min(maxFields, 12)} concise field names (in the document language) that best describe the key attributes to extract. Always include money-related fields when amounts or currency symbols are present (e.g. "сумма", "валюта", "общая сумма"). Respond with a pure JSON array of strings, no comments.

Text:
${text}`;

  try {
    const raw = await callLLM(prompt, 0);
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = safeJsonParse(match[0]);
    if (Array.isArray(parsed)) {
      return parsed
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean)
        .slice(0, maxFields);
    }
    return [];
  } catch (err) {
    console.error('LLM suggestFields failed:', err);
    return [];
  }
}
