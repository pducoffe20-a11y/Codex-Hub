import express from 'express';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.cwd();

function loadLocalEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadLocalEnv();

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT ?? 3000);
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8';
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';

type CacheEntry = { expiresAt: number; value: unknown };
type AiResult = { data: unknown; source: string; error?: string; cached?: boolean };
type TargetPayload = {
  company?: string;
  contactName?: string;
  title?: string;
  industry?: string;
  website?: string;
  linkedin?: string;
  notes?: string;
  pains?: Array<{ label?: string; evidence?: string; severity?: string }>;
  story?: { company?: string; pain?: string; outcome?: string; proofPoint?: string };
};

const app = express();
const cache = new Map<string, CacheEntry>();
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const providerPreference = (process.env.AI_PROVIDER ?? (openaiApiKey ? 'openai' : 'anthropic')).toLowerCase();

app.use(express.json({ limit: '10mb' }));

const stableHash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function setCached(key: string, value: unknown, ttlMs = 1000 * 60 * 20) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const firstObject = candidate.indexOf('{');
    const lastObject = candidate.lastIndexOf('}');
    const firstArray = candidate.indexOf('[');
    const lastArray = candidate.lastIndexOf(']');
    const objectSlice = firstObject >= 0 && lastObject > firstObject ? candidate.slice(firstObject, lastObject + 1) : '';
    const arraySlice = firstArray >= 0 && lastArray > firstArray ? candidate.slice(firstArray, lastArray + 1) : '';

    for (const slice of [objectSlice, arraySlice]) {
      if (!slice) continue;
      try {
        return JSON.parse(slice);
      } catch {
        // Continue trying other likely JSON spans.
      }
    }
  }

  throw new Error('Unable to extract JSON from model response.');
}

function textFromClaudeResponse(response: { content?: Array<{ type?: string; text?: string }> }) {
  return (response.content ?? [])
    .map((block) => (block.type === 'text' ? block.text ?? '' : ''))
    .filter(Boolean)
    .join('\n');
}

function textFromOpenAiResponse(response: { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) {
  if (response.output_text) return response.output_text;
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((block) => block.text ?? '')
    .filter(Boolean)
    .join('\n');
}

async function callClaudeJson(prompt: string): Promise<AiResult> {
  if (!anthropicApiKey) throw new Error('Anthropic API key is not configured.');

  const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1800,
      temperature: 0.2,
      messages: [{ role: 'user', content: `${prompt}\n\nReturn only valid JSON. Do not include markdown.` }]
    })
  });
  if (!apiResponse.ok) throw new Error(`Anthropic request failed with ${apiResponse.status}: ${await apiResponse.text()}`);
  const response = await apiResponse.json() as { content?: Array<{ type?: string; text?: string }> };
  return { data: extractJson(textFromClaudeResponse(response)), source: `anthropic:${CLAUDE_MODEL}` };
}

async function callOpenAiJson(prompt: string): Promise<AiResult> {
  if (!openaiApiKey) throw new Error('OpenAI API key is not configured.');

  const apiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: 'developer',
          content: 'You generate compact, production-ready JSON for a B2B outreach workflow. Return JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_output_tokens: 1800,
      text: {
        format: { type: 'json_object' }
      }
    })
  });
  if (!apiResponse.ok) throw new Error(`OpenAI request failed with ${apiResponse.status}: ${await apiResponse.text()}`);
  const response = await apiResponse.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  return { data: extractJson(textFromOpenAiResponse(response)), source: `openai:${OPENAI_MODEL}` };
}

async function callAiJson(prompt: string, fallback: () => unknown) {
  const cacheKey = `ai:${stableHash({ prompt, anthropicModel: CLAUDE_MODEL, openaiModel: OPENAI_MODEL, providerPreference })}`;
  const cached = getCached<AiResult>(cacheKey);
  if (cached) return { ...cached, cached: true };

  const providers = providerPreference === 'anthropic'
    ? [callClaudeJson, callOpenAiJson]
    : [callOpenAiJson, callClaudeJson];
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const value = await provider(prompt);
      setCached(cacheKey, value);
      return value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
    }
  }

  const error = errors.join(' | ');
  const rateLimited = /rate|429|overloaded|quota/i.test(error);
  const source = rateLimited ? 'fallback:rate-limited' : 'fallback:no-ai-provider';
  const value = { data: fallback(), source, error };
  setCached(cacheKey, value, 1000 * 60 * 5);
  return value;
}

function derivePains(text: string) {
  const normalized = text.toLowerCase();
  const pains = [];
  if (/manual|spreadsheet|handoff|routing|delay/.test(normalized)) {
    pains.push({ id: 'manual-handoff', label: 'Manual handoffs are delaying follow-up', evidence: 'The provided text references manual work, spreadsheets, handoffs, routing, or delays.', severity: 'high' });
  }
  if (/crm|tool|stack|fragment|data|system/.test(normalized)) {
    pains.push({ id: 'tool-sprawl', label: 'Revenue data is fragmented across tools', evidence: 'The provided text references CRM, systems, stack, tools, or fragmented data.', severity: 'medium' });
  }
  if (/forecast|pipeline|quality|conversion|efficiency/.test(normalized)) {
    pains.push({ id: 'pipeline-quality', label: 'Pipeline quality is difficult to trust', evidence: 'The provided text references forecast, pipeline, conversion, quality, or efficiency.', severity: 'high' });
  }
  if (/hire|hiring|ramp|enable|training|expansion/.test(normalized)) {
    pains.push({ id: 'rep-ramp', label: 'Rep ramp requires more repeatable workflows', evidence: 'The provided text references hiring, ramping, enablement, training, or expansion.', severity: 'medium' });
  }
  return pains.length ? pains : [{ id: 'general-priority', label: 'Growth priorities need sharper account context', evidence: 'The provided text suggests a general need for better prioritization and personalized outreach.', severity: 'medium' }];
}

function researchFallback(target: TargetPayload) {
  const text = `${target.company ?? ''} ${target.industry ?? ''} ${target.title ?? ''} ${target.notes ?? ''}`;
  return {
    summary: `${target.company || 'This account'} appears to be a ${target.industry || 'target'} account where the revenue team may benefit from sharper prioritization and personalized follow-up.`,
    pains: derivePains(text),
    buyingTriggers: ['Team growth or workflow change', 'Need for better account prioritization', 'Pressure to improve reply and meeting quality'],
    recommendedNextStep: 'Validate the strongest operational pain and ask how the team handles account research today.'
  };
}

function parseMessyFallback(content: string) {
  const rows = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 50);

  return {
    targets: rows.map((row, index) => {
      const parts = row.split(/[|,;\t]/).map((part) => part.trim()).filter(Boolean);
      return {
        company: parts[0] ?? `Imported Account ${index + 1}`,
        contactName: parts[1] ?? '',
        title: parts[2] ?? '',
        industry: parts[3] ?? '',
        website: parts.find((part) => /^https?:\/\//i.test(part)) ?? '',
        notes: parts.slice(4).join(' ') || row,
        status: 'new'
      };
    })
  };
}

function outreachFallback(target: TargetPayload) {
  const pain = target.pains?.[0]?.label ?? 'turn account research into higher-quality conversations';
  const story = target.story?.proofPoint ? ` Teams like ${target.story.company} used a similar workflow to reach ${target.story.proofPoint}.` : '';
  const name = target.contactName ? ` ${target.contactName}` : '';
  return {
    subject: `${target.company ?? 'your team'} and cleaner outbound priorities`,
    body: `Hi${name},\n\nI noticed ${target.company ?? 'your team'} is focused on ${target.industry ?? 'growth'} priorities, and the pattern that stood out was ${pain.toLowerCase()}. When that gets handled manually, good accounts can wait too long or receive generic follow-up.${story}\n\nWould it be unreasonable to compare how your team identifies the next best account signal today?`,
    rationale: 'Deterministic fallback using account fields, selected pain, and matched customer proof.'
  };
}

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  providerPreference,
  openaiModel: OPENAI_MODEL,
  anthropicModel: CLAUDE_MODEL,
  configuredProviders: {
    openai: Boolean(openaiApiKey),
    anthropic: Boolean(anthropicApiKey)
  },
  cacheEntries: cache.size
}));

app.post('/api/research-lms', async (req, res) => {
  const target = req.body?.target ?? req.body ?? {};
  const cacheKey = `research:${stableHash({ target, providerPreference, OPENAI_MODEL, CLAUDE_MODEL })}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  const result = await callAiJson(
    `Research this lead management / sales account from the supplied fields. Identify likely pains, buying triggers, and a recommended next step. Account: ${JSON.stringify(target)}`,
    () => researchFallback(target)
  );
  setCached(cacheKey, result);
  res.json(result);
});

app.post('/api/parse-messy-file', async (req, res) => {
  const content = String(req.body?.content ?? '');
  const cacheKey = `parse:${stableHash({ content, providerPreference, OPENAI_MODEL, CLAUDE_MODEL })}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  const result = await callAiJson(
    `Convert this messy prospect list into JSON with a targets array. Each target should include company, contactName, title, industry, website, linkedin, notes, and status. Content: ${content.slice(0, 16000)}`,
    () => parseMessyFallback(content)
  );
  setCached(cacheKey, result);
  res.json(result);
});

app.post('/api/generate-outreach', async (req, res) => {
  const target = req.body?.target ?? {};
  const cacheKey = `outreach:${stableHash({ target, providerPreference, OPENAI_MODEL, CLAUDE_MODEL })}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  const result = await callAiJson(
    `Write a concise B2B outbound email for this target. Include JSON fields subject, body, and rationale. Keep the body under 140 words, plain spoken, and anchored in the target pain and customer story. Target: ${JSON.stringify(target)}`,
    () => outreachFallback(target)
  );
  setCached(cacheKey, result);
  res.json(result);
});

async function attachFrontend() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
    return;
  }

  const clientDist = path.join(__dirname, 'client');
  app.use(express.static(clientDist));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

await attachFrontend();

app.listen(PORT, () => {
  console.log(`Codex Hub Outreach Lab listening on http://localhost:${PORT}`);
  console.log(`AI provider preference: ${providerPreference}; OpenAI=${openaiApiKey ? OPENAI_MODEL : 'not configured'}; Anthropic=${anthropicApiKey ? CLAUDE_MODEL : 'not configured'}`);
});
