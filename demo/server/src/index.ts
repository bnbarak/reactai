import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createReactAiRouter } from '@bnbarak/reactai/server';
import { ReactAiSdk } from '@bnbarak/reactai/sdk';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

const provider = (process.env.AI_PROVIDER ?? 'anthropic').toLowerCase();

if (provider === 'openai') {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required when AI_PROVIDER=openai');
} else {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required');
}

const model =
  provider === 'openai'
    ? openai('gpt-4o-mini')
    : anthropic('claude-haiku-4-5-20251001');

const sdk = new ReactAiSdk(model);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

const app = express();
app.use(cors());
app.use('/api', limiter);
app.use(
  '/api',
  createReactAiRouter({
    registryPath: './core/src/generated/registry.json',
    sdk,
  }),
);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT} (provider: ${provider})`),
);
