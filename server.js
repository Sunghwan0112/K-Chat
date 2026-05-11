const dotenv = require('dotenv');
const path = require('path');
const runtimeEnvPath = process.env.KCHAT_ENV_PATH || path.join(__dirname, '.env');
dotenv.config({ path: runtimeEnvPath });
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

const BUNDLED_ROOT = __dirname;
const RUNTIME_ROOT = process.env.KCHAT_RUNTIME_ROOT || BUNDLED_ROOT;
const isExternalRuntime = RUNTIME_ROOT !== BUNDLED_ROOT;

function bundledPath(...parts) {
  return path.join(BUNDLED_ROOT, ...parts);
}

/** Real disk path for packaged characters (fs.cpSync cannot read dirs inside app.asar). */
function bundledCharactersSourceDir() {
  if (/\.asar$/i.test(BUNDLED_ROOT)) {
    const unpacked = path.join(`${BUNDLED_ROOT}.unpacked`, 'characters');
    if (fs.existsSync(unpacked)) return unpacked;
  }
  return bundledPath('characters');
}

function runtimePath(...parts) {
  return path.join(RUNTIME_ROOT, ...parts);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function runtimeHasCharacterJsonFiles(charactersRoot) {
  for (const gender of ['female', 'male']) {
    const dir = path.join(charactersRoot, gender);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.json')) return true;
    }
  }
  return false;
}

function seedRuntimeDirectory(relativeDir) {
  const src =
    relativeDir === 'characters'
      ? bundledCharactersSourceDir()
      : bundledPath(relativeDir);
  const dest = runtimePath(relativeDir);
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  const alreadySeeded =
    relativeDir === 'characters'
      ? runtimeHasCharacterJsonFiles(dest)
      : fs.readdirSync(dest).length > 0;
  if (alreadySeeded) return;
  fs.cpSync(src, dest, { recursive: true });
}

function ensureRuntimeStorageReady() {
  if (!isExternalRuntime) return;
  ensureDir(RUNTIME_ROOT);
  ensureDir(runtimePath('characters'));
  ensureDir(runtimePath('data'));
  ensureDir(runtimePath('public'));
  seedRuntimeDirectory('characters');
}

ensureRuntimeStorageReady();

const app = express();
let AI_PROVIDER = 'hf';

const HF_MODEL_PRESETS = {
  low: 'google/gemma-2-2b-it',
  mid: 'google/gemma-2-9b-it',
  high: 'google/gemma-4-31B-it',
};
const OPENAI_MODEL_PRESETS = {
  low: 'gpt-5.4-mini',
  mid: 'gpt-5.4',
  high: 'gpt-5.5',
};
const ANTHROPIC_MODEL_PRESETS = {
  low: 'claude-haiku-4-5',
  mid: 'claude-sonnet-4-6',
  high: 'claude-opus-4-7',
};

let MODEL_PRESET = 'high';
let MODEL_TEMPERATURE = 0.6;
let HF_MODEL = HF_MODEL_PRESETS.high;
let OPENAI_MODEL = OPENAI_MODEL_PRESETS.high;
let ANTHROPIC_MODEL = ANTHROPIC_MODEL_PRESETS.high;

function resolveModelByLang(lang = 'en') {
  if (AI_PROVIDER === 'openai') return OPENAI_MODEL;
  if (AI_PROVIDER === 'anthropic') return ANTHROPIC_MODEL;
  return HF_MODEL;
}

function fallbackModelByLang(lang = 'en') {
  return HF_MODEL_PRESETS[MODEL_PRESET] || HF_MODEL_PRESETS.mid;
}

function isUnsupportedModelError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('requested model') && msg.includes('not supported');
}

function isModelNotFoundError(err) {
  const status = err?.status ?? 0;
  const msg = String(err?.message || '').toLowerCase();
  return status === 404 && (msg.includes('model:') || msg.includes('not_found_error'));
}

let hfClient = null;
let openaiClient = null;
let anthropicClient = null;

function loadRuntimeConfig() {
  AI_PROVIDER = (process.env.AI_PROVIDER || 'hf').toLowerCase();
  MODEL_PRESET = (process.env.MODEL_PRESET || 'high').toLowerCase();
  MODEL_TEMPERATURE = Number(process.env.MODEL_TEMPERATURE || 0.6);
  HF_MODEL =
    (process.env.HF_MODEL || '').trim()
    || (process.env.GEMMA_MODEL || '').trim()
    || HF_MODEL_PRESETS[MODEL_PRESET]
    || HF_MODEL_PRESETS.high;
  OPENAI_MODEL =
    (process.env.OPENAI_MODEL || '').trim()
    || OPENAI_MODEL_PRESETS[MODEL_PRESET]
    || OPENAI_MODEL_PRESETS.high;
  ANTHROPIC_MODEL =
    (process.env.ANTHROPIC_MODEL || '').trim()
    || ANTHROPIC_MODEL_PRESETS[MODEL_PRESET]
    || ANTHROPIC_MODEL_PRESETS.high;

  hfClient = new OpenAI({
    apiKey: process.env.HF_TOKEN || 'missing',
    baseURL: 'https://router.huggingface.co/v1',
  });
  openaiClient = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;
  anthropicClient = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;
}
loadRuntimeConfig();

function getProviderClient() {
  if (AI_PROVIDER === 'openai') return openaiClient;
  if (AI_PROVIDER === 'anthropic') return anthropicClient;
  return hfClient;
}

function assertProviderReady() {
  if (AI_PROVIDER === 'openai' && !openaiClient) {
    throw new Error('OPENAI_API_KEY is missing');
  }
  if (AI_PROVIDER === 'anthropic' && !anthropicClient) {
    throw new Error('ANTHROPIC_API_KEY is missing');
  }
  if (AI_PROVIDER === 'hf' && !process.env.HF_TOKEN) {
    throw new Error('HF_TOKEN is missing');
  }
}

function toAnthropicMessages(messages = []) {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: m.content }));
}

async function createNonStreamingCompletion({ model, maxTokens, messages, lang }) {
  assertProviderReady();

  if (AI_PROVIDER === 'anthropic') {
    const res = await anthropicClient.messages.create({
      model,
      max_tokens: maxTokens,
      messages: toAnthropicMessages(messages),
    });
    return (res.content || [])
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('')
      .trim();
  }

  const client = getProviderClient();
  const completionTokenLimit = AI_PROVIDER === 'openai'
    ? { max_completion_tokens: maxTokens }
    : { max_tokens: maxTokens };
  const samplingOptions = AI_PROVIDER === 'openai'
    ? {}
    : { temperature: MODEL_TEMPERATURE };
  const res = await client.chat.completions.create({
    model,
    ...completionTokenLimit,
    ...samplingOptions,
    messages,
  });
  return (res.choices?.[0]?.message?.content || '').trim();
}

app.use(express.json({ limit: '2mb' }));
app.use(express.static(runtimePath('public'), {
  setHeaders: (res, filePath) => {
    if (/\.(png|jpe?g|webp)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    }
  },
}));
app.use(express.static(bundledPath('public'), {
  setHeaders: (res, filePath) => {
    if (/\.(png|jpe?g|webp)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    }
  },
}));
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function envFilePath() {
  return process.env.KCHAT_ENV_PATH || runtimePath('.env');
}

function envExampleFilePath() {
  return process.env.KCHAT_ENV_EXAMPLE_PATH || bundledPath('.env.example');
}

function ensureEnvFileExists() {
  const envPath = envFilePath();
  if (fs.existsSync(envPath)) return;
  const examplePath = envExampleFilePath();
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    return;
  }
  fs.writeFileSync(envPath, 'AI_PROVIDER=hf\nHF_TOKEN=\nOPENAI_API_KEY=\nANTHROPIC_API_KEY=\nMODEL_PRESET=high\nPORT=3000\nHOST=localhost\n');
}

function configNeedsSetup() {
  const provider = (process.env.AI_PROVIDER || 'hf').toLowerCase();
  if (provider === 'openai') return !String(process.env.OPENAI_API_KEY || '').trim();
  if (provider === 'anthropic') return !String(process.env.ANTHROPIC_API_KEY || '').trim();
  return !String(process.env.HF_TOKEN || '').trim();
}

function buildEnvFileText(input) {
  const provider = ['hf', 'openai', 'anthropic'].includes(input.aiProvider) ? input.aiProvider : 'hf';
  const modelPreset = ['low', 'mid', 'high'].includes(input.modelPreset) ? input.modelPreset : 'high';
  const host = String(input.host || 'localhost').trim() || 'localhost';
  const port = String(input.port || '3000').trim() || '3000';
  const hf = String(input.hfToken || '').trim();
  const oa = String(input.openaiApiKey || '').trim();
  const an = String(input.anthropicApiKey || '').trim();
  return [
    '# K-Chat runtime provider config',
    `AI_PROVIDER=${provider}`,
    `HF_TOKEN=${hf}`,
    `OPENAI_API_KEY=${oa}`,
    `ANTHROPIC_API_KEY=${an}`,
    `MODEL_PRESET=${modelPreset}`,
    `PORT=${port}`,
    `HOST=${host}`,
    '',
  ].join('\n');
}

// ── Load all characters from characters/ directory ──
function loadCharacters() {
  const characters = [];
  const genders = ['female', 'male'];
  for (const gender of genders) {
    const dir = runtimePath('characters', gender);
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
console.log(`[init] provider=${AI_PROVIDER} model preset(default)=${MODEL_PRESET}`);
console.log(`[init] active model=${resolveModelByLang('en')}`);

function findCharacter(id) {
  return CHARACTERS.find(c => c.id === id) ?? null;
}

function getCharacterFilePath(characterId) {
  for (const gender of ['female', 'male']) {
    const file = runtimePath('characters', gender, `${characterId}.json`);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function toSlug(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'character';
}

function buildUniqueCharacterId(baseName) {
  const base = toSlug(baseName);
  let candidate = base;
  let n = 2;
  while (findCharacter(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

function isValidHexColor(input) {
  return /^#[0-9a-fA-F]{6}$/.test(String(input || '').trim());
}

function sanitizeCharacterEditPayload(payload) {
  const asText = (v, fallback = '') => String(v ?? fallback).trim();
  const age = Number(payload.age);
  const lang = asText(payload.lang || 'en').toLowerCase();
  const normalized = {
    name: asText(payload.name),
    koreanName: asText(payload.koreanName),
    tagline: asText(payload.tagline),
    role: asText(payload.role),
    group: asText(payload.group),
    age: Number.isFinite(age) ? Math.floor(age) : NaN,
    category: asText(payload.category).toLowerCase(),
    gender: asText(payload.gender).toLowerCase(),
    color: asText(payload.color),
    color2: asText(payload.color2),
    systemPrompt: String(payload.systemPrompt ?? '').trim(),
    lang,
  };

  if (!normalized.name || normalized.name.length > 40) throw new Error('name must be 1-40 chars');
  if (!normalized.koreanName || normalized.koreanName.length > 40) throw new Error('koreanName must be 1-40 chars');
  if (!normalized.tagline || normalized.tagline.length > 140) throw new Error('tagline must be 1-140 chars');
  if (!normalized.role || normalized.role.length > 80) throw new Error('role must be 1-80 chars');
  if (!normalized.group || normalized.group.length > 80) throw new Error('group must be 1-80 chars');
  if (!Number.isInteger(normalized.age) || normalized.age < 0 || normalized.age > 120) throw new Error('age must be 0-120');
  if (!['idol', 'friend'].includes(normalized.category)) throw new Error('category must be idol or friend');
  if (!['female', 'male'].includes(normalized.gender)) throw new Error('gender must be female or male');
  if (!['en', 'ko', 'ja', 'es', 'zh'].includes(normalized.lang)) throw new Error('unsupported language');
  if (!isValidHexColor(normalized.color) || !isValidHexColor(normalized.color2)) throw new Error('color must be #RRGGBB');
  if (!normalized.systemPrompt || normalized.systemPrompt.length > 20000) throw new Error('systemPrompt must be 1-20000 chars');

  return normalized;
}

// ── Per-character history files ──
function dataFile(characterId) {
  const dir = runtimePath('data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `history_${characterId}.json`);
}

function userProfileFile() {
  const dir = runtimePath('data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'user_profile.json');
}

const DEFAULT_USER_PROFILE = {
  baseProfile: {
    nameKo: '',
    nameEn: '',
    job: 'Programmer',
    education: 'CMU graduate',
    residence: 'Studying abroad in the United States',
    nationality: 'Korean',
    userTimeMode: 'auto',
    userTimeZone: 'Asia/Seoul',
    characterTimeZone: 'Asia/Seoul',
    weekendRoutine: 'Goes to church on weekends',
    interests: ['music', 'singing', 'guitar'],
    gender: 'male',
  },
  perCharacter: {},
};

function normalizeProfileInput(raw) {
  const base = raw?.baseProfile || {};
  const perCharacter = raw?.perCharacter || {};
  const asText = (v, fallback = '') => String(v ?? fallback).trim();
  const toArray = (v) => {
    if (Array.isArray(v)) return v.map(x => asText(x)).filter(Boolean).slice(0, 12);
    if (typeof v === 'string') {
      return v.split(',').map(x => x.trim()).filter(Boolean).slice(0, 12);
    }
    return [];
  };

  const normalized = {
    baseProfile: {
      nameKo: asText(base.nameKo || ''),
      nameEn: asText(base.nameEn || base.name || ''),
      job: asText(base.job),
      education: asText(base.education),
      residence: asText(base.residence),
      nationality: asText(base.nationality),
      userTimeMode: asText(base.userTimeMode || 'auto').toLowerCase(),
      userTimeZone: asText(base.userTimeZone || 'Asia/Seoul'),
      characterTimeZone: asText(base.characterTimeZone || 'Asia/Seoul'),
      weekendRoutine: asText(base.weekendRoutine),
      interests: toArray(base.interests),
      gender: asText(base.gender).toLowerCase() || 'unspecified',
    },
    perCharacter: {},
  };

  for (const [characterId, conf] of Object.entries(perCharacter)) {
    if (!characterId || typeof conf !== 'object' || !conf) continue;
    normalized.perCharacter[characterId] = {
      gender: asText(conf.gender).toLowerCase(),
      notes: asText(conf.notes),
      characterTimeZone: asText(conf.characterTimeZone || ''),
    };
  }

  return normalized;
}

function loadUserProfile() {
  try {
    const file = userProfileFile();
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(DEFAULT_USER_PROFILE, null, 2));
      return DEFAULT_USER_PROFILE;
    }
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return normalizeProfileInput(parsed);
  } catch (_) {
    return DEFAULT_USER_PROFILE;
  }
}

function saveUserProfile(profile) {
  const normalized = normalizeProfileInput(profile);
  fs.writeFileSync(userProfileFile(), JSON.stringify(normalized, null, 2));
  return normalized;
}

function buildUserProfileSystemPrompt(profile, characterId, lang = 'en') {
  const base = profile?.baseProfile || {};
  const perChar = profile?.perCharacter?.[characterId] || {};
  const effectiveGender = perChar.gender || base.gender || 'unspecified';
  const character = findCharacter(characterId);
  const characterGender = character?.gender || 'unspecified';
  const preferredName = lang === 'ko' ? base.nameKo : base.nameEn;
  const fallbackName = lang === 'ko' ? base.nameEn : base.nameKo;

  let relationContext = 'auto';
  if (effectiveGender !== 'unspecified' && characterGender !== 'unspecified') {
    relationContext = effectiveGender === characterGender
      ? 'same-gender romantic context'
      : 'different-gender romantic context';
  }

  const facts = [];
  if (preferredName) {
    const nameLabel = lang === 'ko' ? '주 사용 이름' : 'Primary name to use';
    facts.push(`- ${nameLabel}: ${preferredName}`);
  } else if (fallbackName) {
    const fallbackLabel = lang === 'ko' ? '대체 이름' : 'Fallback name';
    facts.push(`- ${fallbackLabel}: ${fallbackName}`);
  }
  if (base.job) facts.push(`- Job: ${base.job}`);
  if (base.education) facts.push(`- Education: ${base.education}`);
  if (base.residence) facts.push(`- Current location/status: ${base.residence}`);
  if (base.nationality) facts.push(`- Nationality: ${base.nationality}`);
  if (base.weekendRoutine) facts.push(`- Weekend routine: ${base.weekendRoutine}`);
  if (Array.isArray(base.interests) && base.interests.length) {
    facts.push(`- Interests: ${base.interests.join(', ')}`);
  }

  const profileLabel = lang === 'ko' ? '## 유저 프로필 (내부 설정)' : '## User Profile (internal)';
  const guidanceLabel = lang === 'ko'
    ? '아래 프로필에 맞춰 호칭, 공감 포인트, 대화 소재를 자연스럽게 맞춘다. 설정보다 실제 대화 흐름을 우선한다.'
    : 'Adapt tone, references, and emotional context to this profile naturally. Prioritize real conversation flow over rigid template use.';
  const nameUsageLabel = lang === 'ko'
    ? '- 한국어 답변에서는 nameKo만 사용하고 nameEn은 사용하지 않는다. (유저가 영어 이름을 직접 요청한 경우만 예외)'
    : '- In English replies, use only nameEn and do not use nameKo. (Only exception: user explicitly asks for Korean name)';
  const relationLabel = lang === 'ko'
    ? `- 유저 성별: ${effectiveGender}\n- 캐릭터 성별: ${characterGender}\n- 관계 맥락: ${relationContext}\n- 성적지향 라벨을 직접 언급하지 말고, 현재 관계를 자연스럽게 따른다.`
    : `- User gender: ${effectiveGender}\n- Character gender: ${characterGender}\n- Relationship context: ${relationContext}\n- Do not explicitly label sexual orientation; follow the current relationship naturally.`;
  const perCharNotes = perChar.notes
    ? (lang === 'ko' ? `- 캐릭터별 메모: ${perChar.notes}` : `- Character-specific note: ${perChar.notes}`)
    : '';

  return `\n\n${profileLabel}\n${facts.join('\n')}\n${relationLabel}\n${nameUsageLabel}${perCharNotes ? `\n${perCharNotes}` : ''}\n${guidanceLabel}`;
}

function buildCharacterGenderSystemPrompt(character, lang = 'en') {
  const gender = character?.gender || 'unspecified';
  const koGender = gender === 'female' ? '여성' : gender === 'male' ? '남성' : '지정 안 됨';
  const enGender = gender === 'female' ? 'female' : gender === 'male' ? 'male' : 'unspecified';

  if (lang === 'ko') {
    return `\n\n## 캐릭터 고정 정체성 (내부 규칙)\n- 너(${character?.name || '캐릭터'})의 성별은 ${koGender}이다.\n- 대화 말투/자기지칭/분위기는 이 성별 정체성과 캐릭터 설정을 일관되게 따른다.\n- 성별을 헷갈리거나 바꿔 말하지 않는다.`;
  }

  return `\n\n## Character Identity Lock (internal)\n- Your gender is ${enGender}.\n- Keep wording, self-reference, and vibe consistent with this identity and character profile.\n- Do not switch or confuse gender identity mid-conversation.`;
}

// ── Time context injected into every user message ──
function normalizeTimeZone(inputTz) {
  if (!inputTz || typeof inputTz !== 'string') return 'America/New_York';
  try {
    // Throws if timezone is invalid.
    Intl.DateTimeFormat('en-US', { timeZone: inputTz }).format(new Date());
    return inputTz;
  } catch (_) {
    return 'America/New_York';
  }
}

function getTimeContext(timeZone = 'America/New_York') {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const d = new Date(new Date().toLocaleString('en-US', { timeZone }));
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `[Current time (${timeZone}) — ${days[d.getDay()]} ${ampm} ${h % 12 || 12}:${String(m).padStart(2, '0')}]`;
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

function getTimeSystemPrompt(timeZone = 'America/New_York') {
  return `## Time Context (internal)\n${getTimeContext(timeZone)}\nUse this only to adjust natural tone/schedule references. Never output this time context line verbatim.`;
}

function getDualTimeSystemPrompt(userTimeZone, characterTimeZone, lang = 'en') {
  if (lang === 'ko') {
    return `## 시간 컨텍스트 (내부)\n- 유저 기준: ${getTimeContext(userTimeZone)}\n- 캐릭터 기준: ${getTimeContext(characterTimeZone)}\n유저 시간대와 캐릭터 시간대를 모두 참고해서 자연스럽게 말해. 이 시간 문구를 그대로 출력하지 마.`;
  }
  return `## Time Context (internal)\n- User local: ${getTimeContext(userTimeZone)}\n- Character local: ${getTimeContext(characterTimeZone)}\nUse both user and character local times naturally. Never output these lines verbatim.`;
}

function stripLeadingTimeMeta(text) {
  let out = text;
  const patterns = [
    /^\s*\[[^\]\n]{0,120}(?:EST|AM|PM|오전|오후|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[^\]\n]*\]\s*/i,
    /^\s*\([^\)\n]{0,120}(?:EST|AM|PM|오전|오후|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[^\)\n]*\)\s*/i,
  ];

  // Remove repeated leading time/meta wrappers.
  while (true) {
    let changed = false;
    for (const re of patterns) {
      const next = out.replace(re, '');
      if (next !== out) {
        out = next;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return out;
}

// ── Rolling summary helpers ──
const SUMMARY_INTERVAL = 10;
const SUMMARY_MAX_CHARS = 500;

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

  let summary = await createNonStreamingCompletion({
    model: resolveModelByLang(lang),
    maxTokens: 300,
    lang,
    messages: [{
      role: 'user',
      content: `${existing}Conversation:\n${conversation}\n\nCombine the above into a concise 3–5 sentence summary of key relationship facts, memorable moments, and personal details about the user. Drop unimportant small talk. Keep it under 500 characters. ${langInstruction}`
    }],
  });
  if (summary.length > SUMMARY_MAX_CHARS) {
    summary = await recompressSummary(summary, lang);
  }
  return summary;
}

async function recompressSummary(summary, lang = 'en') {
  const langInstruction = SUMMARY_LANG_INSTRUCTION[lang] ?? SUMMARY_LANG_INSTRUCTION.en;
  return createNonStreamingCompletion({
    model: resolveModelByLang(lang),
    maxTokens: 200,
    lang,
    messages: [{
      role: 'user',
      content: `Compress this relationship summary to under 500 characters, keeping only the most important facts. ${langInstruction}\n\n${summary}`
    }],
  });
}

// Keep message history to last N (always starting with user turn)
const MAX_MESSAGES = 20;
function trimMessages(messages) {
  if (messages.length <= MAX_MESSAGES) return messages;
  const trimmed = messages.slice(-MAX_MESSAGES);
  return trimmed[0].role === 'assistant' ? trimmed.slice(1) : trimmed;
}

// ── Resolve localized field: i18n[lang] → i18n.en → top-level fallback ──
function localize(char, lang, field, fallback = '') {
  return char.i18n?.[lang]?.[field]
    ?? char.i18n?.en?.[field]
    ?? char[field]
    ?? fallback;
}

function resolveLocalizedGroup(char, lang) {
  const localizedGroup = char.i18n?.[lang]?.group ?? char.i18n?.en?.group ?? '';
  if (localizedGroup) return localizedGroup;

  const rawGroup = char.group || '';
  // Hide Korean-only group labels when rendering non-Korean UI to avoid mixed-language meta lines.
  if (lang !== 'ko' && /[가-힣]/.test(rawGroup)) return '';
  return rawGroup;
}

app.get('/api/runtime-config', (_req, res) => {
  ensureEnvFileExists();
  res.json({
    aiProvider: (process.env.AI_PROVIDER || 'hf').toLowerCase(),
    modelPreset: (process.env.MODEL_PRESET || 'high').toLowerCase(),
    host: process.env.HOST || 'localhost',
    port: process.env.PORT || '3000',
    hasHfToken: Boolean(String(process.env.HF_TOKEN || '').trim()),
    hasOpenAiKey: Boolean(String(process.env.OPENAI_API_KEY || '').trim()),
    hasAnthropicKey: Boolean(String(process.env.ANTHROPIC_API_KEY || '').trim()),
    needsSetup: configNeedsSetup(),
  });
});

app.post('/api/runtime-config', (req, res) => {
  try {
    ensureEnvFileExists();
    const body = req.body || {};
    const next = {
      ...body,
      // Empty inputs mean "unchanged" so provider/model switches do not wipe existing keys.
      hfToken: String(body.hfToken || '').trim() || String(process.env.HF_TOKEN || '').trim(),
      openaiApiKey: String(body.openaiApiKey || '').trim() || String(process.env.OPENAI_API_KEY || '').trim(),
      anthropicApiKey: String(body.anthropicApiKey || '').trim() || String(process.env.ANTHROPIC_API_KEY || '').trim(),
    };
    const envText = buildEnvFileText(next);
    fs.writeFileSync(envFilePath(), envText);
    process.env.AI_PROVIDER = next.aiProvider || process.env.AI_PROVIDER || 'hf';
    process.env.HF_TOKEN = next.hfToken || '';
    process.env.OPENAI_API_KEY = next.openaiApiKey || '';
    process.env.ANTHROPIC_API_KEY = next.anthropicApiKey || '';
    process.env.MODEL_PRESET = next.modelPreset || 'high';
    process.env.HOST = next.host || 'localhost';
    process.env.PORT = String(next.port || '3000');
    loadRuntimeConfig();
    res.json({ ok: true, needsSetup: configNeedsSetup() });
  } catch (err) {
    res.status(500).json({ error: err.message || 'failed to save runtime config' });
  }
});

// ── API: list characters (localized by ?lang=) ──
app.get('/api/characters', (req, res) => {
  const lang = req.query.lang || 'en';
  res.json(CHARACTERS.map(c => ({
    id:         c.id,
    name:       c.name,
    koreanName: c.koreanName,
    gender:     c.gender,
    category:   c.category ?? 'idol',
    age:        c.age,
    group:      resolveLocalizedGroup(c, lang),
    role:       localize(c, lang, 'role'),
    tagline:    localize(c, lang, 'tagline'),
    color:      c.color  ?? '#6366f1',
    color2:     c.color2 ?? '#a855f7',
  })));
});

app.get('/api/characters/:characterId/edit', (req, res) => {
  const { characterId } = req.params;
  const lang = String(req.query.lang || 'en').toLowerCase();
  const file = getCharacterFilePath(characterId);
  if (!file) return res.status(404).json({ error: 'Character not found' });
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const localized = raw?.i18n?.[lang] || raw?.i18n?.en || {};
    res.json({
      ...raw,
      role: localized.role ?? raw.role ?? '',
      tagline: localized.tagline ?? raw.tagline ?? '',
      systemPrompt: localized.systemPrompt ?? raw.systemPrompt ?? '',
    });
  } catch (_) {
    res.status(500).json({ error: 'failed to load character config' });
  }
});

app.post('/api/characters/:characterId/edit', avatarUpload.single('avatar'), (req, res) => {
  const { characterId } = req.params;
  const file = getCharacterFilePath(characterId);
  if (!file) return res.status(404).json({ error: 'Character not found' });
  try {
    const rawPayload = JSON.parse(String(req.body?.payload || '{}'));
    const payload = sanitizeCharacterEditPayload(rawPayload);
    const current = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const next = {
      ...current,
      id: characterId,
      name: payload.name,
      koreanName: payload.koreanName,
      tagline: payload.tagline,
      role: payload.role,
      group: payload.group,
      age: payload.age,
      // Category is fixed after creation (idol/friend cannot be moved in edit mode).
      category: current.category || payload.category,
      gender: payload.gender,
      color: payload.color,
      color2: payload.color2,
    };
    const nextI18n = { ...(current.i18n || {}) };
    const targetLang = payload.lang || 'en';
    nextI18n[targetLang] = {
      ...(nextI18n[targetLang] || {}),
      role: payload.role,
      tagline: payload.tagline,
      systemPrompt: payload.systemPrompt,
    };
    next.i18n = nextI18n;

    if (targetLang === 'en') {
      next.role = payload.role;
      next.tagline = payload.tagline;
      next.systemPrompt = payload.systemPrompt;
    }

    fs.writeFileSync(file, JSON.stringify(next, null, 2));

    if (req.file) {
      const mime = req.file.mimetype || '';
      const ext = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : '';
      if (!ext) return res.status(400).json({ error: 'avatar must be image/png or image/jpeg' });
      const publicDir = runtimePath('public');
      const nextPath = path.join(publicDir, `${characterId}.${ext}`);
      fs.writeFileSync(nextPath, req.file.buffer);
      const otherExt = ext === 'png' ? 'jpg' : 'png';
      const otherPath = path.join(publicDir, `${characterId}.${otherExt}`);
      if (fs.existsSync(otherPath)) fs.unlinkSync(otherPath);
    }

    CHARACTERS = loadCharacters();
    const updated = findCharacter(characterId);
    res.json({ ok: true, character: updated });
  } catch (err) {
    res.status(400).json({ error: err.message || 'invalid edit payload' });
  }
});

app.post('/api/characters', avatarUpload.single('avatar'), (req, res) => {
  try {
    const rawPayload = JSON.parse(String(req.body?.payload || '{}'));
    const payload = sanitizeCharacterEditPayload(rawPayload);
    const id = buildUniqueCharacterId(payload.name);
    const folder = payload.gender === 'female' ? 'female' : 'male';
    const file = runtimePath('characters', folder, `${id}.json`);
    const localizedPack = {
      role: payload.role,
      tagline: payload.tagline,
      systemPrompt: payload.systemPrompt,
    };
    const i18n = { en: { ...localizedPack } };
    if (payload.lang && payload.lang !== 'en') {
      i18n[payload.lang] = { ...localizedPack };
    }
    const next = {
      id,
      category: payload.category,
      name: payload.name,
      koreanName: payload.koreanName,
      age: payload.age,
      group: payload.group,
      color: payload.color,
      color2: payload.color2,
      role: payload.role,
      tagline: payload.tagline,
      systemPrompt: payload.systemPrompt,
      i18n,
    };
    fs.writeFileSync(file, JSON.stringify(next, null, 2));

    if (req.file) {
      const mime = req.file.mimetype || '';
      const ext = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : '';
      if (!ext) return res.status(400).json({ error: 'avatar must be image/png or image/jpeg' });
      const publicDir = runtimePath('public');
      fs.writeFileSync(path.join(publicDir, `${id}.${ext}`), req.file.buffer);
    }

    CHARACTERS = loadCharacters();
    res.json({ ok: true, character: findCharacter(id) });
  } catch (err) {
    res.status(400).json({ error: err.message || 'failed to create character' });
  }
});

app.delete('/api/characters/:characterId', (req, res) => {
  const { characterId } = req.params;
  const file = getCharacterFilePath(characterId);
  if (!file) return res.status(404).json({ error: 'Character not found' });
  try {
    fs.unlinkSync(file);
    const publicDir = runtimePath('public');
    for (const ext of ['jpg', 'png']) {
      const img = path.join(publicDir, `${characterId}.${ext}`);
      if (fs.existsSync(img)) fs.unlinkSync(img);
    }
    const hist = path.join(runtimePath('data'), `history_${characterId}.json`);
    if (fs.existsSync(hist)) fs.unlinkSync(hist);
    CHARACTERS = loadCharacters();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'failed to delete character' });
  }
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

app.get('/api/user-profile', (req, res) => {
  const characterId = req.query.characterId ? String(req.query.characterId) : '';
  const profile = loadUserProfile();
  const base = profile.baseProfile || {};
  const perCharacter = profile.perCharacter || {};
  const override = characterId ? (perCharacter[characterId] || {}) : {};
  const effectiveProfile = {
    ...base,
    gender: override.gender || base.gender || 'unspecified',
    notes: override.notes || '',
  };
  res.json({ baseProfile: base, perCharacter, effectiveProfile });
});

app.post('/api/user-profile', (req, res) => {
  try {
    const saved = saveUserProfile(req.body || {});
    res.json({ ok: true, profile: saved });
  } catch (_) {
    res.status(500).json({ error: 'failed to save user profile' });
  }
});

// ── API: save chat history for a character ──
app.post('/api/history/:characterId', async (req, res) => {
  const { characterId } = req.params;
  if (!findCharacter(characterId)) return res.status(404).json({ error: 'Character not found' });
  try {
    const { apiHistory, uiHistory, lang = 'en' } = req.body;

    let summaryMap = {};
    let summaryMessageCount = 0;
    const file = dataFile(characterId);
    if (fs.existsSync(file)) {
      try {
        const existing = JSON.parse(fs.readFileSync(file, 'utf-8'));
        if (typeof existing.summary === 'string') {
          summaryMap = { en: existing.summary };
        } else {
          summaryMap = existing.summary || {};
        }
        summaryMessageCount = existing.summaryMessageCount || 0;
      } catch (_) { /* start fresh */ }
    }

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

  const lines = messages.map((m, i) => `${i}|||${m.text}`).join('\n');

  try {
    const translatedText = await createNonStreamingCompletion({
      model: resolveModelByLang(targetLang),
      maxTokens: 4096,
      lang: targetLang,
      messages: [{
        role: 'user',
        content: `Translate each chat message below to ${langName}. Keep the casual texting tone, slang, and emotional nuance. Do NOT translate proper nouns (names, group names). Return ONLY the translated lines in the exact same format: index|||translation\n\n${lines}`
      }],
    });

    const translated = [...messages];
    for (const line of translatedText.split('\n')) {
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
  en: '\n\n## Response Language\nAlways respond in natural conversational English only. Do not mix Korean, Japanese, Spanish, or Chinese unless explicitly requested.',
  ko: '\n\n## Response Language\nAlways respond in Korean (한국어) only. Do NOT use English interjections, slang, or mixed Korean-English phrasing unless the user explicitly asks for it. Even if examples in the prompt contain English words, output must remain natural Korean. Use natural KakaoTalk-style wording that matches the character. Avoid stiff template greetings like "안녕하세요~ [name],". Avoid malformed Korean phrasing (e.g., duplicated words/syllables like "밤 밤낮낮").',
  ja: '\n\n## Response Language\nAlways respond in natural Japanese (日本語, ため口) only. Do not mix English unless explicitly requested.',
  es: '\n\n## Response Language\nAlways respond in natural conversational Spanish (Español) only. Do not mix English unless explicitly requested.',
  zh: '\n\n## Response Language\nAlways respond in natural Simplified Chinese (中文) only. Do not mix English unless explicitly requested.',
};

function normalizeOutputByLang(text, lang) {
  if (!text) return text;

  // Strip common leaked reasoning markers across models.
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*thoughts?\s*[:：]\s*/gim, '')
    .replace(/^\s*analysis\s*[:：]\s*/gim, '');
}

// ── API: streaming chat ──
app.post('/api/chat', async (req, res) => {
  const { messages, characterId, lang, timeZone, characterTimeZone } = req.body;

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

  const langPrompt = character.i18n?.[lang]?.systemPrompt;
  const enPrompt   = character.i18n?.en?.systemPrompt ?? character.systemPrompt;
  if (!langPrompt && !enPrompt) {
    return res.status(500).json({ error: `Character '${characterId}' has no systemPrompt` });
  }
  let userTimeZone = normalizeTimeZone(timeZone);
  let charTimeZone = normalizeTimeZone(characterTimeZone || 'Asia/Seoul');

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

  let userProfileBlock = '';
  try {
    const profile = loadUserProfile();
    userProfileBlock = buildUserProfileSystemPrompt(profile, characterId, lang);
    const base = profile?.baseProfile || {};
    const per = profile?.perCharacter?.[characterId] || {};
    if (!timeZone && base.userTimeMode === 'manual') {
      userTimeZone = normalizeTimeZone(base.userTimeZone || 'Asia/Seoul');
    }
    if (!characterTimeZone) {
      charTimeZone = normalizeTimeZone(per.characterTimeZone || base.characterTimeZone || 'Asia/Seoul');
    }
  } catch (_) { /* ignore read errors */ }

  const characterGenderBlock = buildCharacterGenderSystemPrompt(character, lang);

  const systemPrompt = (langPrompt ?? (enPrompt + (LANG_INSTRUCTIONS[lang] ?? '')))
    + characterGenderBlock
    + summaryBlock
    + userProfileBlock;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const chatModel = resolveModelByLang(lang);
    const chatMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: getDualTimeSystemPrompt(userTimeZone, charTimeZone, lang) },
      ...trimMessages(messages),
    ];

    let started = false;
    let headBuffer = '';

    if (AI_PROVIDER === 'anthropic') {
      assertProviderReady();
      const systemText = chatMessages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n\n');
      const anthroMessages = toAnthropicMessages(chatMessages);
      let stream;
      try {
        stream = await anthropicClient.messages.create({
          model: chatModel,
          max_tokens: 1024,
          system: systemText,
          messages: anthroMessages,
          stream: true,
        });
      } catch (err) {
        const fallback = ANTHROPIC_MODEL_PRESETS.mid;
        if (!isModelNotFoundError(err) || chatModel === fallback) throw err;
        console.warn(`[chat] anthropic model "${chatModel}" not found; retrying with "${fallback}"`);
        stream = await anthropicClient.messages.create({
          model: fallback,
          max_tokens: 1024,
          system: systemText,
          messages: anthroMessages,
          stream: true,
        });
      }

      for await (const event of stream) {
        if (event.type !== 'content_block_delta' || event.delta?.type !== 'text_delta') continue;
        const text = event.delta?.text || '';
        if (!text) continue;
        const normalized = normalizeOutputByLang(text, lang);

        if (!started) {
          headBuffer += normalized;
          headBuffer = stripLeadingTimeMeta(headBuffer);
          if (
            /^\s*[\[(]/.test(headBuffer) &&
            !/[\])]/.test(headBuffer) &&
            headBuffer.length < 160
          ) continue;
          if (!headBuffer) continue;
          res.write(`data: ${JSON.stringify({ type: 'delta', text: headBuffer })}\n\n`);
          started = true;
          headBuffer = '';
          continue;
        }
        res.write(`data: ${JSON.stringify({ type: 'delta', text: normalized })}\n\n`);
      }
    } else {
      const client = getProviderClient();
      if (AI_PROVIDER === 'openai') {
        const completion = await client.chat.completions.create({
          model: chatModel,
          max_completion_tokens: 1024,
          messages: chatMessages,
        });
        const fullText = completion.choices?.[0]?.message?.content || '';
        const normalized = normalizeOutputByLang(fullText, lang);
        const cleaned = stripLeadingTimeMeta(normalized);
        if (cleaned) {
          res.write(`data: ${JSON.stringify({ type: 'delta', text: cleaned })}\n\n`);
        }
      } else {
        let stream;
        const completionTokenLimit = { max_tokens: 1024 };
        const samplingOptions = { temperature: MODEL_TEMPERATURE };
        try {
          stream = await client.chat.completions.create({
            model: chatModel,
            ...completionTokenLimit,
            ...samplingOptions,
            stream: true,
            messages: chatMessages,
          });
        } catch (err) {
          // HF router may reject unsupported models; retry once with fallback preset.
          const fallback = fallbackModelByLang(lang);
          if (!isUnsupportedModelError(err) || chatModel === fallback) throw err;

          console.warn(`[chat] model "${chatModel}" unsupported; retrying with "${fallback}"`);
          stream = await client.chat.completions.create({
            model: fallback,
            ...completionTokenLimit,
            ...samplingOptions,
            stream: true,
            messages: chatMessages,
          });
        }

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (!text) continue;
          const normalized = normalizeOutputByLang(text, lang);

          if (!started) {
            headBuffer += normalized;
            headBuffer = stripLeadingTimeMeta(headBuffer);

            if (
              /^\s*[\[(]/.test(headBuffer) &&
              !/[\])]/.test(headBuffer) &&
              headBuffer.length < 160
            ) {
              continue;
            }

            if (!headBuffer) continue;
            res.write(`data: ${JSON.stringify({ type: 'delta', text: headBuffer })}\n\n`);
            started = true;
            headBuffer = '';
            continue;
          }

          res.write(`data: ${JSON.stringify({ type: 'delta', text: normalized })}\n\n`);
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

  } catch (err) {
    console.error('[chat error]', err.status ?? '', err.message);
    const status = err.status ?? 0;
    const msg    = err.message || '';
    let userMsg  = 'Something went wrong... try again?';
    if (status === 401 || msg.includes('401') || msg.includes('unauthorized')) {
      userMsg = AI_PROVIDER === 'hf'
        ? 'HF_TOKEN looks wrong — check your .env file'
        : AI_PROVIDER === 'openai'
          ? 'OPENAI_API_KEY looks wrong — check your .env file'
          : 'ANTHROPIC_API_KEY looks wrong — check your .env file';
    } else if (status === 429 || msg.includes('429')) {
      userMsg = 'Too many requests~ wait a moment and try again!';
    } else if (msg.includes('quota') || msg.includes('exceeded')) {
      userMsg = 'HuggingFace quota exceeded 🥺 Try again later';
    }
    res.write(`data: ${JSON.stringify({ type: 'error', message: userMsg })}\n\n`);
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const httpServer = app.listen(PORT, HOST, () => {
  console.log(`\n✅ K Chat → http://localhost:${PORT}\n`);
});
if (process.env.KCHAT_DESKTOP === '1') {
  global.__KCHAT_HTTP_SERVER__ = httpServer;
}
