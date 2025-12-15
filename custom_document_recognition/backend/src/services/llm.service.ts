// Поддержка Groq API, Ollama и Gemini
const USE_GROQ = process.env.USE_GROQ === 'true' || !!process.env.GROQ_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_ENDPOINT = process.env.GROQ_ENDPOINT || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'mixtral-8x7b-32768';

const OLLAMA_ENDPOINT = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

const USE_GEMINI = process.env.USE_GEMINI === 'true' || !!process.env.GEMINI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input);
  } catch (e) {
    return null;
  }
}

// Индивидуальные функции для вызова каждой модели
async function callGemini(prompt: string, temperature: number = 0): Promise<string> {
  if (!USE_GEMINI || !GEMINI_API_KEY) {
    throw new Error('Gemini not configured');
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature,
      }
    })
  });
  if (!resp.ok) {
    throw new Error(`Gemini API error: ${resp.status}`);
  }
  const data = await resp.json();
  return (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
}

async function callGroq(prompt: string, temperature: number = 0): Promise<string> {
  if (!USE_GROQ || !GROQ_API_KEY) {
    throw new Error('Groq not configured');
  }
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
  if (!resp.ok) {
    throw new Error(`Groq API error: ${resp.status}`);
  }
  const data = await resp.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

async function callOllama(prompt: string, temperature: number = 0): Promise<string> {
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
  if (!resp.ok) {
    throw new Error(`Ollama API error: ${resp.status}`);
  }
  const data = await resp.json();
  return (data.response ?? '').trim();
}

// Функция для оценки качества ответа (для JSON ответов)
function scoreJsonResponse(response: string, expectedFields?: string[]): number {
  if (!response || response.trim().length === 0) return 0;
  
  const parsed = safeJsonParse(response);
  if (!parsed) return 0;
  
  let score = 10; // Базовый балл за валидный JSON
  
  if (expectedFields && Array.isArray(expectedFields)) {
    // Бонус за количество найденных полей
    const foundFields = Object.keys(parsed).length;
    const expectedCount = expectedFields.length;
    if (expectedCount > 0) {
      score += (foundFields / expectedCount) * 20;
    }
    
    // Бонус за структуру (наличие value, confidence и т.д.)
    for (const field of expectedFields) {
      if (parsed[field] && typeof parsed[field] === 'object') {
        if (parsed[field].value !== undefined) score += 2;
        if (parsed[field].confidence !== undefined) score += 1;
        if (parsed[field].inferred !== undefined) score += 1;
      }
    }
  } else {
    // Для общих JSON ответов - бонус за количество ключей
    const keyCount = Object.keys(parsed).length;
    score += Math.min(keyCount * 2, 20);
  }
  
  return score;
}

// Функция для оценки качества текстового ответа
function scoreTextResponse(response: string): number {
  if (!response || response.trim().length === 0) return 0;
  
  const trimmed = response.trim();
  let score = 5; // Базовый балл за непустой ответ
  
  // Бонус за длину (но не слишком длинный)
  if (trimmed.length >= 50 && trimmed.length <= 500) {
    score += 10;
  } else if (trimmed.length > 500) {
    score += 5; // Слишком длинный - меньше бонус
  }
  
  // Бонус за наличие нескольких предложений
  const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0);
  score += Math.min(sentences.length * 2, 10);
  
  return score;
}

// Функция для оценки качества массива
function scoreArrayResponse(response: string): number {
  if (!response || response.trim().length === 0) return 0;
  
  const parsed = safeJsonParse(response);
  if (!Array.isArray(parsed)) return 0;
  
  let score = 10; // Базовый балл за валидный массив
  
  // Бонус за количество элементов
  const validItems = parsed.filter(item => typeof item === 'string' && item.trim().length > 0);
  score += Math.min(validItems.length * 3, 30);
  
  return score;
}

// Основная функция вызова LLM с выбором лучшего результата
async function callLLM(prompt: string, temperature: number = 0, responseType: 'json' | 'text' | 'array' = 'text', expectedFields?: string[]): Promise<string> {
  const promises: Array<Promise<{ model: string; response: string; score: number }>> = [];
  
  // Добавляем вызовы всех доступных моделей
  if (USE_GEMINI && GEMINI_API_KEY) {
    promises.push(
      callGemini(prompt, temperature)
        .then(response => {
          let score = 0;
          if (responseType === 'json') {
            score = scoreJsonResponse(response, expectedFields);
          } else if (responseType === 'array') {
            score = scoreArrayResponse(response);
          } else {
            score = scoreTextResponse(response);
          }
          return { model: 'gemini', response, score };
        })
        .catch(err => {
          console.warn('Gemini call failed:', err.message);
          return { model: 'gemini', response: '', score: 0 };
        })
    );
  }
  
  if (USE_GROQ && GROQ_API_KEY) {
    promises.push(
      callGroq(prompt, temperature)
        .then(response => {
          let score = 0;
          if (responseType === 'json') {
            score = scoreJsonResponse(response, expectedFields);
          } else if (responseType === 'array') {
            score = scoreArrayResponse(response);
          } else {
            score = scoreTextResponse(response);
          }
          return { model: 'groq', response, score };
        })
        .catch(err => {
          console.warn('Groq call failed:', err.message);
          return { model: 'groq', response: '', score: 0 };
        })
    );
  }
  
  // Ollama всегда доступен (локальный)
  promises.push(
    callOllama(prompt, temperature)
      .then(response => {
        let score = 0;
        if (responseType === 'json') {
          score = scoreJsonResponse(response, expectedFields);
        } else if (responseType === 'array') {
          score = scoreArrayResponse(response);
        } else {
          score = scoreTextResponse(response);
        }
        return { model: 'ollama', response, score };
      })
      .catch(err => {
        console.warn('Ollama call failed:', err.message);
        return { model: 'ollama', response: '', score: 0 };
      })
  );
  
  // Ждем все результаты
  const results = await Promise.all(promises);

  // Без результатов — возвращаем пустую строку
  if (!results || results.length === 0) {
    return '';
  }
  
  // Выбираем лучший результат по score
  const [first, ...rest] = results;
  if (!first) {
    return '';
  }
  const best = rest.reduce((candidate, current) => {
    return current.score > candidate.score ? current : candidate;
  }, first);
  
  if (best.score > 0) {
    console.log(`[LLM] Best result from ${best.model} (score: ${best.score.toFixed(1)})`);
    return best.response;
  }
  
  // Если все провалились, возвращаем первый доступный ответ
  const firstValid = results.find(r => r.response && r.response.trim().length > 0);
  return firstValid?.response || '';
}

export async function describeField(field: string, contextText: string = ''): Promise<string> {
  const prompt = `You are a helpful assistant. Provide a brief but clear description (2-4 sentences) of what the field "${field}" usually contains in documents. If context text is provided, tailor the description to the document type. Respond in Russian if the field is in Russian, otherwise in English. Output plain text only.

Context (optional):
${contextText.slice(0, 1200)}`;

  try {
    const raw = await callLLM(prompt, 0.3, 'text');
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
    const raw = await callLLM(prompt, 0, 'json', fields);
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
    const raw = await callLLM(prompt, 0, 'array');
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
