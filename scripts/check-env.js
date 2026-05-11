require('dotenv').config();

const provider = (process.env.AI_PROVIDER || 'hf').trim().toLowerCase();
const allowedProviders = new Set(['hf', 'openai', 'anthropic']);

if (!allowedProviders.has(provider)) {
  console.error(
    `[check-env] Invalid AI_PROVIDER="${process.env.AI_PROVIDER}". Use one of: hf | openai | anthropic`,
  );
  process.exit(1);
}

const requiredByProvider = {
  hf: ['HF_TOKEN'],
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
};

const missing = requiredByProvider[provider].filter((name) => {
  const value = (process.env[name] || '').trim();
  return !value || value.includes('your_') || value.includes('_here');
});

if (missing.length > 0) {
  console.error(
    `[check-env] Missing ${provider} credentials: ${missing.join(', ')}`,
  );
  console.error('[check-env] Copy .env.example to .env and fill real keys.');
  process.exit(1);
}

console.log(`[check-env] OK: provider=${provider}`);
