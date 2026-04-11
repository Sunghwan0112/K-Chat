require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Load all characters from characters/ directory ──
function loadCharacters() {
  const characters = [];
  const genders = ['female', 'male'];
  for (const gender of genders) {
    const dir = path.join(__dirname, 'characters', gender);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).sort()) {
      if (!file.endsWith('.json')) continue;
      try {
        const char = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
        characters.push({ ...char, gender });
      } catch (e) {
        console.error(`[warn] failed to load ${file}:`, e.message);
      }
    }
  }
  return characters;
}

// Cache characters at startup (restart server to reload)
let CHARACTERS = loadCharacters();
console.log(`[init] loaded ${CHARACTERS.length} character(s):`, CHARACTERS.map(c => c.id).join(', '));

function findCharacter(id) {
  return CHARACTERS.find(c => c.id === id) ?? null;
}

// ── Per-character history files ──
function dataFile(characterId) {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `history_${characterId}.json`);
}

// ── Time context injected into every user message ──
function getTimeContext() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `[Current time (EST) — ${days[d.getDay()]} ${ampm} ${h % 12 || 12}:${String(m).padStart(2, '0')}]`;
}

function injectTimeContext(messages) {
  if (!messages.length) return messages;
  const copy = [...messages];
  const last = copy[copy.length - 1];
  if (last.role === 'user' && typeof last.content === 'string') {
    copy[copy.length - 1] = { ...last, content: `${getTimeContext()}\n${last.content}` };
  }
  return copy;
}

// ── Rolling summary helpers ──
const SUMMARY_INTERVAL = 10;   // summarize every N messages
const SUMMARY_MAX_CHARS = 500; // recompress if summary exceeds this

const SUMMARY_LANG_INSTRUCTION = {
  en: 'Write the summary in English.',
  ko: '요약을 한국어로 작성해.',
  ja: '要約を日本語で書いてください。',
  es: 'Escribe el resumen en español.',
  zh: '用中文写摘要。',
};

async function generateSummary(uiHistory, existingSummary, lang = 'en') {
  const conversation = uiHistory
    .map(m => `${m.type === 'sent' ? 'user' : 'character'}: ${m.text}`)
    .join('\n');

  const existing = existingSummary
    ? `Existing summary:\n${existingSummary}\n\n`
    : '';

  const langInstruction = SUMMARY_LANG_INSTRUCTION[lang] ?? SUMMARY_LANG_INSTRUCTION.en;

  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `${existing}Conversation:\n${conversation}\n\nCombine the above into a concise 3–5 sentence summary of key relationship facts, memorable moments, and personal details about the user. Drop unimportant small talk. Keep it under 500 characters. ${langInstruction}`
    }]
  });

  let summary = res.content[0].text.trim();
  if (summary.length > SUMMARY_MAX_CHARS) {
    summary = await recompressSummary(summary, lang);
  }
  return summary;
}

async function recompressSummary(summary, lang = 'en') {
  const langInstruction = SUMMARY_LANG_INSTRUCTION[lang] ?? SUMMARY_LANG_INSTRUCTION.en;
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Compress this relationship summary to under 500 characters, keeping only the most important facts. ${langInstruction}\n\n${summary}`
    }]
  });
  return res.content[0].text.trim();
}

// Keep API message history to last N (always starting with user turn)
const MAX_MESSAGES = 20;
function trimMessages(messages) {
  if (messages.length <= MAX_MESSAGES) return messages;
  const trimmed = messages.slice(-MAX_MESSAGES);
  return trimmed[0].role === 'assistant' ? trimmed.slice(1) : trimmed;
}

// Apply prompt caching to the second-to-last message
function buildCachedMessages(messages) {
  if (messages.length < 2) return messages;
  return messages.map((msg, i) => {
    if (i !== messages.length - 2) return msg;
    const text = typeof msg.content === 'string' ? msg.content : null;
    const content = text !== null
      ? [{ type: 'text', text, cache_control: { type: 'ephemeral' } }]
      : Array.isArray(msg.content)
        ? [...msg.content.slice(0, -1),
           { ...msg.content[msg.content.length - 1], cache_control: { type: 'ephemeral' } }]
        : msg.content;
    return { ...msg, content };
  });
}

// ── Resolve localized field: i18n[lang] → i18n.en → top-level fallback ──
function localize(char, lang, field, fallback = '') {
  return char.i18n?.[lang]?.[field]
    ?? char.i18n?.en?.[field]
    ?? char[field]
    ?? fallback;
}

// ── API: list characters (localized by ?lang=) ──
app.get('/api/characters', (req, res) => {
  const lang = req.query.lang || 'en';
  res.json(CHARACTERS.map(c => ({
    id:         c.id,
    name:       c.name,
    koreanName: c.koreanName,
    gender:     c.gender,
    age:        c.age,
    group:      c.group,
    role:       localize(c, lang, 'role'),
    tagline:    localize(c, lang, 'tagline'),
    color:      c.color  ?? '#6366f1',
    color2:     c.color2 ?? '#a855f7',
  })));
});

// ── API: get chat history for a character ──
app.get('/api/history/:characterId', (req, res) => {
  const { characterId } = req.params;
  if (!findCharacter(characterId)) return res.status(404).json({ error: 'Character not found' });
  try {
    const file = dataFile(characterId);
    if (!fs.existsSync(file)) return res.json({ apiHistory: [], uiHistory: [] });
    res.json(JSON.parse(fs.readFileSync(file, 'utf-8')));
  } catch (_) {
    res.json({ apiHistory: [], uiHistory: [] });
  }
});

// ── API: save chat history for a character ──
app.post('/api/history/:characterId', async (req, res) => {
  const { characterId } = req.params;
  if (!findCharacter(characterId)) return res.status(404).json({ error: 'Character not found' });
  try {
    const { apiHistory, uiHistory, lang = 'en' } = req.body;

    // Load existing data from disk
    let summaryMap = {};          // { en: "...", ko: "..." }
    let summaryMessageCount = 0;
    const file = dataFile(characterId);
    if (fs.existsSync(file)) {
      try {
        const existing = JSON.parse(fs.readFileSync(file, 'utf-8'));
        // backwards compat: old string summary → migrate to map
        if (typeof existing.summary === 'string') {
          summaryMap = { en: existing.summary };
        } else {
          summaryMap = existing.summary || {};
        }
        summaryMessageCount = existing.summaryMessageCount || 0;
      } catch (_) { /* start fresh */ }
    }

    // Trigger summarization every SUMMARY_INTERVAL messages
    const count = uiHistory?.length ?? 0;
    if (count > 0 && count % SUMMARY_INTERVAL === 0 && count > summaryMessageCount) {
      try {
        summaryMap[lang] = await generateSummary(uiHistory, summaryMap[lang] || '', lang);
        summaryMessageCount = count;
        console.log(`[${characterId}][${lang}] summary updated at ${count} messages (${summaryMap[lang].length} chars)`);
      } catch (err) {
        console.error(`[${characterId}] summary failed:`, err.message);
      }
    }

    fs.writeFileSync(file, JSON.stringify({ apiHistory, uiHistory, summary: summaryMap, summaryMessageCount }));
    res.json({ ok: true });
  } catch (_) {
    res.status(500).json({ error: 'save failed' });
  }
});

// ── API: translate uiHistory to a new language ──
app.post('/api/translate', async (req, res) => {
  const { messages, targetLang } = req.body;
  if (!Array.isArray(messages) || !targetLang) {
    return res.status(400).json({ error: 'messages array and targetLang required' });
  }

  const LANG_NAMES_FULL = { en: 'English', ko: 'Korean', ja: 'Japanese', es: 'Spanish', zh: 'Simplified Chinese' };
  const langName = LANG_NAMES_FULL[targetLang] ?? targetLang;

  // Build numbered list for batch translation
  const lines = messages.map((m, i) => `${i}|||${m.text}`).join('\n');

  try {
    const result = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Translate each chat message below to ${langName}. Keep the casual texting tone, slang, and emotional nuance. Do NOT translate proper nouns (names, group names). Return ONLY the translated lines in the exact same format: index|||translation\n\n${lines}`
      }]
    });

    const translated = [...messages];
    for (const line of result.content[0].text.split('\n')) {
      const sep = line.indexOf('|||');
      if (sep === -1) continue;
      const idx = parseInt(line.slice(0, sep));
      if (!isNaN(idx) && idx >= 0 && idx < translated.length) {
        translated[idx] = { ...translated[idx], text: line.slice(sep + 3).trim() };
      }
    }

    res.json({ messages: translated });
  } catch (err) {
    console.error('[translate error]', err.message);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// ── Language instruction appended to system prompt ──
const LANG_INSTRUCTIONS = {
  en: '\n\n## Response Language\nAlways respond in English. Do NOT use Korean in your replies, even though your speech style examples are written in Korean. Translate all expressions naturally into English casual texting style.',
  ko: '\n\n## Response Language\nAlways respond in Korean (한국어). Mix in English loanwords naturally as Korean speakers do, but the primary language must be Korean.',
  ja: '\n\n## Response Language\nAlways respond in Japanese (日本語). Use casual, young-person texting style (ため口, not です/ます). Mix in English as Japanese speakers naturally do.',
  es: '\n\n## Response Language\nAlways respond in Spanish (Español). Use casual, friendly Latin American Spanish texting style.',
  zh: '\n\n## Response Language\nAlways respond in Simplified Chinese (中文). Use casual texting style appropriate for a young person.',
};

// ── API: streaming chat ──
app.post('/api/chat', async (req, res) => {
  const { messages, characterId, lang } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }
  if (!characterId) {
    return res.status(400).json({ error: 'characterId required' });
  }

  const character = findCharacter(characterId);
  if (!character) {
    return res.status(404).json({ error: `Character '${characterId}' not found` });
  }

  // Use language-specific prompt if available; otherwise fall back to English + instruction
  const langPrompt = character.i18n?.[lang]?.systemPrompt;
  const enPrompt   = character.i18n?.en?.systemPrompt ?? character.systemPrompt;
  if (!langPrompt && !enPrompt) {
    return res.status(500).json({ error: `Character '${characterId}' has no systemPrompt` });
  }

  // Load persisted summary (per-lang) and inject into system prompt
  let summaryBlock = '';
  try {
    const histFile = dataFile(characterId);
    if (fs.existsSync(histFile)) {
      const hist = JSON.parse(fs.readFileSync(histFile, 'utf-8'));
      const summaryMap = typeof hist.summary === 'string'
        ? { en: hist.summary }
        : (hist.summary || {});
      const summary = summaryMap[lang] || summaryMap['en'] || '';
      if (summary) summaryBlock = `\n\n## Relationship Memory\n${summary}`;
    }
  } catch (_) { /* ignore read errors */ }

  const systemPrompt = (langPrompt ?? (enPrompt + (LANG_INSTRUCTIONS[lang] ?? ''))) + summaryBlock;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = client.messages.stream({
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-6',
      max_tokens: 1024,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: buildCachedMessages(injectTimeContext(trimMessages(messages))),
    });

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`);
    });

    stream.on('message', (msg) => {
      const u = msg.usage;
      if (u) {
        const cached  = u.cache_read_input_tokens    ?? 0;
        const written = u.cache_creation_input_tokens ?? 0;
        const fresh   = u.input_tokens               ?? 0;
        console.log(`[${characterId}] tokens fresh=${fresh} cache_write=${written} cache_hit=${cached}`);
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    });

    stream.on('error', (err) => {
      console.error('[stream error]', err.status ?? '', err.message);
      const status = err.status ?? 0;
      const msg    = err.message || '';
      let userMsg  = 'Something went wrong... try again?';
      if (msg.includes('credit balance') || msg.includes('billing')) {
        userMsg = 'API credits ran out 🥺 Please top up and try again';
      } else if (status === 401 || msg.includes('authentication_error')) {
        userMsg = 'API key looks wrong — check your .env file';
      } else if (status === 429) {
        userMsg = 'Too many requests~ wait a moment and try again!';
      }
      res.write(`data: ${JSON.stringify({ type: 'error', message: userMsg })}\n\n`);
      res.end();
    });

  } catch (err) {
    console.error('[chat error]', err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Server error occurred' })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
app.listen(PORT, HOST, () => {
  console.log(`\n✅ K Chat → http://localhost:${PORT}\n`);
});
