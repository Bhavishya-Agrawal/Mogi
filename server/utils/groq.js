const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MAX_ATTEMPTS = 5;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateWithRetry(prompt) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        }),
      });
    } catch (error) {
      throw new Error(`Groq request failed: ${error.message}`, { cause: error });
    }

    if (!response.ok) {
      const body = await response.text();
      let detail = body;
      try {
        detail = JSON.parse(body).error?.message || body;
      } catch {
        // Keep the response text when the API returns a non-JSON error body.
      }

      const error = new Error(`Groq returned ${response.status}: ${detail}`);
      error.status = response.status;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === MAX_ATTEMPTS) throw error;

      const delayMs = 1000 * 2 ** (attempt - 1);
      console.warn(`Groq returned ${response.status}; retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
      await delay(delayMs);
      continue;
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('Groq response did not contain message content');
    }
    return content;
  }
}

async function generateJSON(prompt) {
  const raw = await generateWithRetry(prompt);
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
  }
}

async function transcribeAudio(buffer, filename, mimeType) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), filename);
  form.append('model', 'whisper-large-v3-turbo');
  form.append('response_format', 'json');
  form.append('language', 'en');

  let response;
  try {
    response = await fetch(TRANSCRIPTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: form,
    });
  } catch (error) {
    throw new Error(`Groq transcription request failed: ${error.message}`, { cause: error });
  }

  if (!response.ok) {
    const body = await response.text();
    let detail = body;
    try {
      detail = JSON.parse(body).error?.message || body;
    } catch {
      // Keep the response text when the API returns a non-JSON error body.
    }
    const error = new Error(`Groq transcription returned ${response.status}: ${detail}`);
    error.status = response.status;
    throw error;
  }

  const result = await response.json();
  if (typeof result.text !== 'string') {
    throw new Error('Groq transcription response did not contain text');
  }
  return result.text;
}

module.exports = { generateJSON, transcribeAudio };
