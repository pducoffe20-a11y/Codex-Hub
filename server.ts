import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import * as XLSX from 'xlsx';
import pdfParse from 'pdf-parse';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const MODEL = 'claude-opus-4-8';
const cache = new Map<string, unknown>();
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

type AnyObject = Record<string, unknown>;

type ResearchInput = {
  accountName?: string;
  website?: string;
  vertical?: string;
  notes?: string;
};

type OutreachInput = ResearchInput & {
  contactName?: string;
  title?: string;
  lmsName?: string;
  painPoint?: string;
  story?: string;
  persona?: string;
  guardrails?: string[];
  hasCredential?: boolean;
};

function cacheKey(route: string, body: unknown) {
  return `${route}:${JSON.stringify(body)}`;
}

function isRateLimit(error: unknown) {
  const status = (error as { status?: number })?.status;
  const message = String((error as Error)?.message || error || '').toLowerCase();
  return status === 429 || message.includes('429') || message.includes('rate_limit') || message.includes('rate limit') || message.includes('overloaded');
}

function stripCodeFences(text: string) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function extractJson(text: string) {
  const stripped = stripCodeFences(text);
  try {
    return JSON.parse(stripped);
  } catch {
    const firstObj = stripped.indexOf('{');
    const lastObj = stripped.lastIndexOf('}');
    const firstArr = stripped.indexOf('[');
    const lastArr = stripped.lastIndexOf(']');
    const objCandidate = firstObj >= 0 && lastObj > firstObj ? stripped.slice(firstObj, lastObj + 1) : '';
    const arrCandidate = firstArr >= 0 && lastArr > firstArr ? stripped.slice(firstArr, lastArr + 1) : '';
    for (const candidate of [objCandidate, arrCandidate]) {
      if (!candidate) continue;
      try { return JSON.parse(candidate); } catch { /* continue */ }
    }
  }
  throw new Error('Claude response did not contain valid JSON');
}

async function claudeJson(prompt: string) {
  if (!anthropic) return null;
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1600,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }]
  });
  const text = message.content.map((part) => part.type === 'text' ? part.text : '').join('\n');
  return extractJson(text);
}

function detectLms(input: ResearchInput) {
  const haystack = `${input.accountName || ''} ${input.website || ''} ${input.vertical || ''} ${input.notes || ''}`.toLowerCase();
  const vendors: [string, string][] = [
    ['docebo', 'docebo'], ['moodle', 'moodle'], ['litmos', 'litmos'], ['topclass', 'topclass'], ['forj', 'forj'],
    ['thought industries', 'thought_industries'], ['blue sky', 'blue_sky'], ['crowd wisdom', 'crowd_wisdom'], ['homegrown', 'homegrown_none']
  ];
  return vendors.find(([term]) => haystack.includes(term))?.[1] || 'unsure_research';
}

function fallbackResearch(input: ResearchInput, reason = 'heuristic') {
  const lmsId = detectLms(input);
  const credentialSignal = /credential|certification|certificate|ce\b|cpe|cme|continuing/i.test(`${input.vertical || ''} ${input.notes || ''}`);
  return {
    source: reason,
    rateLimited: reason === 'rate_limited',
    lmsId,
    lmsName: lmsId === 'unsure_research' ? 'Unknown / needs verification' : lmsId.replaceAll('_', ' '),
    confidence: lmsId === 'unsure_research' ? 0.35 : 0.7,
    signals: [
      credentialSignal ? 'Credential or continuing education signal found.' : 'Learning program signal found; credentialing should be verified.',
      input.website ? `Website reviewed from provided domain: ${input.website}.` : 'No website provided; using account context only.'
    ],
    recommendedAngle: credentialSignal
      ? 'Ask how the team tracks credential, CE, renewal, and learner progress today.'
      : 'Ask what learning operations are hardest to report or scale today.'
  };
}

function fallbackOutreach(input: OutreachInput, reason = 'heuristic') {
  const opener = input.hasCredential
    ? `Noticed ${input.accountName || 'your team'} appears to put real emphasis on credential or continuing education programs.`
    : `I was looking at ${input.accountName || 'your organization'} and your learning programs stood out.`;
  const pain = input.painPoint || 'tracking learner progress, reporting outcomes, and keeping the experience easy for busy professionals';
  const story = input.story || 'D2L works with organizations running rigorous professional learning at scale';
  const body = `${opener} Teams in similar settings often reach a point where ${pain} becomes harder than it should be. ${story}, and I thought Brightspace might be relevant if you are reviewing how learning is managed today. Would it be useful to compare notes on the current setup?`;
  return {
    source: reason,
    rateLimited: reason === 'rate_limited',
    subject: `${input.accountName || 'Your'} learning programs`,
    body,
    ps: input.hasCredential ? 'P.S. Happy to share the Fusion agenda items most relevant to CE and credential programs.' : ''
  };
}

function fallbackRows(text: string, reason = 'heuristic') {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 50);
  const rows = lines.map((line, index) => {
    const parts = line.split(/,|\t|\s{2,}/).map((part) => part.trim()).filter(Boolean);
    return {
      id: `import-${index + 1}`,
      accountName: parts[0] || line,
      website: parts.find((part) => /\./.test(part)) || '',
      vertical: parts.slice(1, 3).join(' ') || 'association credentialing',
      contactName: parts[3] || '',
      title: parts[4] || '',
      email: parts.find((part) => /@/.test(part)) || '',
      lmsId: 'unsure_research',
      hasCredential: /credential|certification|ce\b|cpe|cme/i.test(line),
      status: 'Not started',
      notes: line
    };
  });
  return { source: reason, rows };
}

async function parseUploaded(body: AnyObject) {
  const filename = String(body.filename || '').toLowerCase();
  const base64 = String(body.base64 || '');
  const text = String(body.text || '');
  if (base64 && /xlsx|xls|csv/.test(filename)) {
    const buffer = Buffer.from(base64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }
  if (base64 && filename.endsWith('.pdf')) {
    const parsed = await pdfParse(Buffer.from(base64, 'base64'));
    return parsed.text;
  }
  if (base64) return Buffer.from(base64, 'base64').toString('utf8');
  return text;
}

async function withCache(req: express.Request, res: express.Response, route: string, handler: () => Promise<unknown>) {
  const key = cacheKey(route, req.body);
  if (cache.has(key)) return res.json({ cached: true, data: cache.get(key) });
  const data = await handler();
  cache.set(key, data);
  return res.json({ cached: false, data });
}

async function main() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.post('/api/research-lms', (req, res) => withCache(req, res, 'research-lms', async () => {
    const input = req.body as ResearchInput;
    try {
      const result = await claudeJson(`Return only JSON. Research the likely LMS for this account and include lmsId, lmsName, confidence, signals array, recommendedAngle. Valid lmsId values: forj, topclass, docebo, thought_industries, blue_sky, litmos, crowd_wisdom, moodle, homegrown_none, unsure_research. Account: ${JSON.stringify(input)}`);
      return result ?? fallbackResearch(input, 'no_api_key');
    } catch (error) {
      return fallbackResearch(input, isRateLimit(error) ? 'rate_limited' : 'heuristic_after_error');
    }
  }));

  app.post('/api/parse-messy-file', (req, res) => withCache(req, res, 'parse-messy-file', async () => {
    try {
      const parsed = await parseUploaded(req.body as AnyObject);
      if (Array.isArray(parsed)) return { source: 'xlsx', rows: parsed };
      const text = String(parsed || '');
      try {
        const result = await claudeJson(`Return only JSON with a rows array. Convert this messy prospect list into accountName, website, vertical, contactName, title, email, lmsId, hasCredential, status, notes. Use lmsId unsure_research when unclear. Text: ${text.slice(0, 12000)}`);
        return result ?? fallbackRows(text, 'no_api_key');
      } catch (error) {
        return fallbackRows(text, isRateLimit(error) ? 'rate_limited' : 'heuristic_after_error');
      }
    } catch (error) {
      return { source: 'parse_error', rows: [], error: (error as Error).message };
    }
  }));

  app.post('/api/generate-outreach', (req, res) => withCache(req, res, 'generate-outreach', async () => {
    const input = req.body as OutreachInput;
    try {
      const result = await claudeJson(`Return only JSON with subject, body, ps. Write a concise D2L Brightspace outbound email. Body must be 60-90 words, peer-like, one concrete observation, one plausible pain, one soft question, no hype words. Context: ${JSON.stringify(input)}`);
      return result ?? fallbackOutreach(input, 'no_api_key');
    } catch (error) {
      return fallbackOutreach(input, isRateLimit(error) ? 'rate_limited' : 'heuristic_after_error');
    }
  }));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const clientDir = path.join(__dirname, 'client');
    app.use(express.static(clientDir));
    app.get(/.*/, (_req, res) => res.sendFile(path.join(clientDir, 'index.html')));
  }

  app.listen(PORT, () => console.log(`D2L Outreach Studio listening on ${PORT}`));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
