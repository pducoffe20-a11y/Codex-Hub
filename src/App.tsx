import { useMemo, useState } from 'react';
import type React from 'react';
import { AlertTriangle, BarChart3, Clipboard, FileSpreadsheet, Mail, RefreshCw, RotateCcw, Search, Sparkles, UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import { competitorPainDatabase, statuses, voiceGuidelines, type LmsId, type OutreachStatus } from './data';
import { defaultTargets, type TargetAccount } from './defaultTargets';
import { matchCustomerStories } from './utils/storyMatcher';
import { discoveryQuestions } from './utils/discoveryQuestions';
import OutreachMetrics from './components/OutreachMetrics';

type ResearchResult = {
  source?: string;
  rateLimited?: boolean;
  lmsId?: LmsId;
  lmsName?: string;
  confidence?: number;
  signals?: string[];
  recommendedAngle?: string;
};

type OutreachDraft = { subject: string; body: string; ps?: string; source?: string; rateLimited?: boolean };

const emptyDraft: OutreachDraft = { subject: '', body: '', ps: '' };

function normalizeImportedRow(row: Record<string, unknown>, index: number): TargetAccount {
  const get = (...keys: string[]) => {
    const found = Object.entries(row).find(([key]) => keys.includes(key.toLowerCase().replace(/\s+/g, '')));
    return String(found?.[1] ?? '').trim();
  };
  const notes = get('notes') || JSON.stringify(row);
  return {
    id: `upload-${Date.now()}-${index}`,
    accountName: get('account', 'accountname', 'company', 'organization', 'name') || `Imported account ${index + 1}`,
    website: get('website', 'domain', 'url'),
    vertical: get('vertical', 'industry', 'segment') || 'association credentialing',
    contactName: get('contact', 'contactname', 'name'),
    title: get('title', 'role', 'jobtitle'),
    email: get('email', 'emailaddress'),
    lmsId: 'unsure_research',
    hasCredential: /credential|certification|ce\b|cpe|cme|certificate/i.test(`${notes} ${get('vertical', 'industry')}`),
    status: 'Not started',
    notes
  };
}

async function postJson<T>(url: string, body: unknown): Promise<{ cached: boolean; data: T }> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${url} failed with ${response.status}`);
  return response.json();
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [targets, setTargets] = useState<TargetAccount[]>(defaultTargets);
  const [selectedId, setSelectedId] = useState(defaultTargets[0].id);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | OutreachStatus>('All');
  const [persona, setPersona] = useState('Association education leader');
  const [guardrails, setGuardrails] = useState(['Do not assert current LMS unless verified', 'Use one soft CTA']);
  const [research, setResearch] = useState<ResearchResult>({});
  const [drafts, setDrafts] = useState<Record<string, OutreachDraft>>({});
  const [loading, setLoading] = useState('');
  const [rateLimited, setRateLimited] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const selected = targets.find((target) => target.id === selectedId) ?? targets[0];
  const profile = competitorPainDatabase[selected.lmsId] ?? competitorPainDatabase.unsure_research;
  const stories = matchCustomerStories(selected.vertical, selected.hasCredential);
  const questions = discoveryQuestions(selected.lmsId, selected.vertical, selected.hasCredential);
  const draft = drafts[selected.id] ?? emptyDraft;

  const filteredTargets = useMemo(() => targets.filter((target) => {
    const haystack = `${target.accountName} ${target.website} ${target.vertical} ${target.contactName}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (statusFilter === 'All' || target.status === statusFilter);
  }), [targets, search, statusFilter]);

  const kpis = useMemo(() => ({
    total: targets.length,
    drafted: targets.filter((target) => ['Drafted', 'Copied', 'Sent'].includes(target.status)).length,
    credentials: targets.filter((target) => target.hasCredential).length,
    sent: targets.filter((target) => target.status === 'Sent').length
  }), [targets]);

  function updateSelected(patch: Partial<TargetAccount>) {
    setTargets((current) => current.map((target) => target.id === selected.id ? { ...target, ...patch } : target));
  }

  async function handleResearch() {
    setLoading('research');
    try {
      const result = await postJson<ResearchResult>('/api/research-lms', selected);
      setResearch(result.data);
      setRateLimited(Boolean(result.data.rateLimited));
      if (result.data.lmsId) updateSelected({ lmsId: result.data.lmsId, status: 'Researching' });
    } finally {
      setLoading('');
    }
  }

  async function handleGenerate(force = false) {
    if (!force && drafts[selected.id]?.body) return;
    setLoading('generate');
    const painPoint = profile.pains[0]?.label;
    const story = stories[0] ? `${stories[0].organization}: ${stories[0].headline}` : '';
    try {
      const result = await postJson<OutreachDraft>('/api/generate-outreach', { ...selected, lmsName: profile.name, painPoint, story, persona, guardrails });
      setDrafts((current) => ({ ...current, [selected.id]: result.data }));
      setRateLimited(Boolean(result.data.rateLimited));
      updateSelected({ status: 'Drafted' });
    } finally {
      setLoading('');
    }
  }

  async function handleCopy() {
    const text = `Subject: ${draft.subject}\n\n${draft.body}${draft.ps ? `\n\n${draft.ps}` : ''}`;
    await navigator.clipboard.writeText(text);
    updateSelected({ status: 'Copied' });
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setLoading('upload');
    setUploadMessage('');
    try {
      if (/\.(xlsx|xls|csv)$/i.test(file.name)) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
        const normalized = rows.map(normalizeImportedRow);
        setTargets(normalized);
        if (normalized[0]) setSelectedId(normalized[0].id);
        setUploadMessage(`Parsed ${rows.length} rows in the browser.`);
      } else {
        const base64 = await fileToBase64(file);
        const result = await postJson<{ rows: Record<string, unknown>[]; source?: string }>('/api/parse-messy-file', { filename: file.name, base64 });
        const rows = (result.data.rows || []).map(normalizeImportedRow);
        setTargets(rows.length ? rows : targets);
        if (rows[0]) setSelectedId(rows[0].id);
        setUploadMessage(`Backend parsed ${rows.length} rows (${result.data.source || 'fallback'}).`);
      }
    } catch (error) {
      setUploadMessage((error as Error).message);
    } finally {
      setLoading('');
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="pill border-blue-200 bg-blue-50 text-blue-700"><Sparkles size={14} /> D2L Brightspace outreach studio</div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">LMS research, story matching, and email drafting in one runnable app.</h1>
              <p className="mt-3 max-w-3xl text-slate-600">Works with Claude when <code>ANTHROPIC_API_KEY</code> is present and falls back to deterministic heuristics when it is not.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Kpi label="Accounts" value={kpis.total} />
              <Kpi label="Drafted" value={kpis.drafted} />
              <Kpi label="Credentials" value={kpis.credentials} />
              <Kpi label="Sent" value={kpis.sent} />
            </div>
          </div>
          {rateLimited && <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="mr-2 inline" size={16} /> Claude is rate-limited or overloaded; heuristic fallback is active.</div>}
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-bold"><FileSpreadsheet /> Tracker</h2>
              <button onClick={() => { setTargets(defaultTargets); setSelectedId(defaultTargets[0].id); }} className="pill border-slate-200 bg-white"><RotateCcw size={14} /> Reset defaults</button>
            </div>
            <div className="mt-4 rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50/60 p-5 text-center" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void handleFiles(e.dataTransfer.files); }}>
              <UploadCloud className="mx-auto text-blue-600" />
              <p className="mt-2 font-semibold">Drop XLSX, CSV, PDF, or messy prospect text export</p>
              <input type="file" className="mt-3" onChange={(e) => void handleFiles(e.target.files)} />
              {uploadMessage && <p className="mt-2 text-sm text-slate-600">{uploadMessage}</p>}
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <label className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accounts" className="w-full rounded-2xl border border-slate-200 py-2 pl-9 pr-3" /></label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-2xl border border-slate-200 px-3 py-2"><option>All</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
            </div>
            <div className="mt-4 overflow-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">Account</th><th className="p-3">Vertical</th><th className="p-3">LMS</th><th className="p-3">Status</th></tr></thead>
                <tbody>{filteredTargets.map((target) => <tr key={target.id} onClick={() => setSelectedId(target.id)} className={`cursor-pointer border-t border-slate-100 ${target.id === selected.id ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'}`}><td className="p-3 font-semibold">{target.accountName}<div className="text-xs font-normal text-slate-500">{target.contactName || 'No contact'} · {target.website}</div></td><td className="p-3">{target.vertical}</td><td className="p-3">{competitorPainDatabase[target.lmsId]?.name}</td><td className="p-3"><span className="pill border-slate-200 bg-white">{target.status}</span></td></tr>)}</tbody>
              </table>
            </div>
          </div>

          <aside className="card space-y-4 p-5">
            <h2 className="text-xl font-bold">Active target details</h2>
            <Field label="Account" value={selected.accountName} onChange={(value) => updateSelected({ accountName: value })} />
            <Field label="Website" value={selected.website} onChange={(value) => updateSelected({ website: value })} />
            <Field label="Vertical" value={selected.vertical} onChange={(value) => updateSelected({ vertical: value })} />
            <Field label="Contact" value={selected.contactName} onChange={(value) => updateSelected({ contactName: value })} />
            <Field label="Title" value={selected.title} onChange={(value) => updateSelected({ title: value })} />
            <label className="text-sm font-semibold">LMS<select value={selected.lmsId} onChange={(e) => updateSelected({ lmsId: e.target.value as LmsId })} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">{Object.values(competitorPainDatabase).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.hasCredential} onChange={(e) => updateSelected({ hasCredential: e.target.checked })} /> Has credential / CE signal</label>
            <button disabled={loading === 'research'} onClick={() => void handleResearch()} className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-60"><Sparkles className="mr-2 inline" size={17} /> {loading === 'research' ? 'Researching…' : 'AI LMS research'}</button>
            {research.lmsName && <div className="rounded-2xl bg-slate-50 p-3 text-sm"><b>{research.lmsName}</b> · confidence {Math.round((research.confidence || 0) * 100)}%<ul className="mt-2 list-disc pl-5">{research.signals?.map((signal) => <li key={signal}>{signal}</li>)}</ul><p className="mt-2">{research.recommendedAngle}</p></div>}
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <InfoCard title="Persona and guardrails"><Field label="Persona" value={persona} onChange={setPersona} /><textarea value={guardrails.join('\n')} onChange={(e) => setGuardrails(e.target.value.split('\n').filter(Boolean))} className="mt-3 min-h-28 w-full rounded-2xl border border-slate-200 p-3 text-sm" /></InfoCard>
          <InfoCard title={`Pain catalog: ${profile.name}`}><p className="text-sm text-slate-600">{profile.summary}</p><ul className="mt-3 space-y-2">{profile.pains.map((pain) => <li key={pain.id} className="rounded-2xl bg-slate-50 p-3 text-sm"><b>{pain.label}</b><p>{pain.d2lAngle}</p></li>)}</ul></InfoCard>
          <InfoCard title="Story and discovery"><b>{stories[0]?.organization}</b><p className="text-sm text-slate-600">{stories[0]?.headline}</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{questions.slice(0, 3).map((question) => <li key={question}>{question}</li>)}</ul></InfoCard>
        </section>

        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-bold"><Mail /> Outreach workspace</h2><div className="flex gap-2"><button onClick={() => void handleGenerate(true)} className="pill border-blue-200 bg-blue-50 text-blue-700"><RefreshCw size={14} /> Regenerate</button><button onClick={() => void handleCopy()} disabled={!draft.body} className="pill border-emerald-200 bg-emerald-50 text-emerald-700"><Clipboard size={14} /> Copy to email</button><select value={selected.status} onChange={(e) => updateSelected({ status: e.target.value as OutreachStatus })} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold">{statuses.map((status) => <option key={status}>{status}</option>)}</select></div></div>
          {!draft.body ? <button onClick={() => void handleGenerate()} className="mt-4 rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white"><Sparkles className="mr-2 inline" size={17} /> Generate cached draft</button> : null}
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <div className="space-y-3"><Field label="Subject" value={draft.subject} onChange={(value) => setDrafts((current) => ({ ...current, [selected.id]: { ...draft, subject: value } }))} /><label className="text-sm font-semibold">Body<textarea value={draft.body} onChange={(e) => setDrafts((current) => ({ ...current, [selected.id]: { ...draft, body: e.target.value } }))} className="mt-1 min-h-44 w-full rounded-2xl border border-slate-200 p-3" /></label><Field label="P.S." value={draft.ps || ''} onChange={(value) => setDrafts((current) => ({ ...current, [selected.id]: { ...draft, ps: value } }))} /></div>
            <div className="space-y-4"><OutreachMetrics body={`${draft.body} ${draft.ps || ''}`} /><div className="rounded-2xl bg-slate-50 p-4 text-sm"><h3 className="mb-2 flex items-center gap-2 font-bold"><BarChart3 size={16} /> Voice guidelines</h3><ul className="list-disc pl-5">{voiceGuidelines.principles.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-3"><b>Openers:</b> {voiceGuidelines.approvedOpeners.slice(0, 2).join(' · ')}</p><p className="mt-2"><b>Soft CTAs:</b> {voiceGuidelines.softCtas.slice(0, 2).join(' · ')}</p></div></div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="text-2xl font-black">{value}</div><div className="text-xs uppercase text-slate-500">{label}</div></div>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-sm font-semibold">{label}<input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" /></label>; }
function InfoCard({ title, children }: { title: string; children: React.ReactNode }) { return <div className="card p-5"><h2 className="mb-3 text-lg font-bold">{title}</h2>{children}</div>; }
