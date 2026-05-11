require('dotenv').config();
const { OpenAI } = require('openai');

const client = new OpenAI({
  apiKey: process.env.HF_TOKEN,
  baseURL: 'https://router.huggingface.co/v1',
});

const MODELS = [
  { preset: 'low', model: 'meta-llama/Llama-3.2-1B-Instruct' },
  { preset: 'mid', model: 'Qwen/Qwen2.5-7B-Instruct' },
  { preset: 'high', model: 'google/gemma-4-31B-it' },
];

async function testModel({ preset, model }) {
  const started = Date.now();
  try {
    const res = await client.chat.completions.create({
      model,
      max_tokens: 80,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content:
            'Reply in one short sentence in Korean and one short sentence in English about how your day is going.',
        },
      ],
    });

    const elapsed = Date.now() - started;
    const text = (res.choices?.[0]?.message?.content || '').replace(/\s+/g, ' ').trim();
    const preview = text.slice(0, 120);
    console.log(`OK   [${preset}] ${model} (${elapsed}ms)`);
    console.log(`     ${preview}`);
  } catch (err) {
    const elapsed = Date.now() - started;
    const msg = err?.message || 'unknown error';
    console.log(`FAIL [${preset}] ${model} (${elapsed}ms)`);
    console.log(`     ${msg}`);
  }
}

async function main() {
  if (!process.env.HF_TOKEN) {
    console.error('HF_TOKEN is missing in .env');
    process.exit(1);
  }

  console.log('Running model smoke test...\n');
  for (const item of MODELS) {
    // sequential for easier reading and lower burst load
    // eslint-disable-next-line no-await-in-loop
    await testModel(item);
  }
}

main();
