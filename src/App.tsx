import { useEffect, useMemo, useState } from 'react';
import { OutreachMetrics } from './components/OutreachMetrics';
import { customerStories, painCatalog, type CustomerStory, type PainSignal, type Target } from './data';
import { defaultTargets, makeBlankTarget } from './defaultTargets';
import { getDiscoveryQuestions } from './utils/discoveryQuestions';
import { matchStories } from './utils/storyMatcher';

const STORAGE_KEY = 'codex-hub-outreach-targets';
const AUTOGEN_DELAY_MS = 850;

type ApiEnvelope<T> = { data: T; source?: string; cached?: boolean; error?: string };
type ResearchResponse = {
  summary?: string;
  pains?: PainSignal[];
  buyingTriggers?: string[];
  recommendedNextStep?: string;
};
type ParseResponse = { targets?: Partial<Target>[] };
type OutreachResponse = { subject?: string; body?: string; rationale?: string };

function normalizeImportedTarget(target: Partial<Target>, index: number): Target {
  const pains = Array.isArray(target.pains) ? target.pains : [];
  return {
    ...makeBlankTarget(),
    id: target.id ?? `imported-${Date.now()}-${index}`,
    company: target.company ?? `Imported Account ${index + 1}`,
    contactName: target.contactName ?? '',
    title: target.title ?? '',
    industry: target.industry ?? '',
    website: target.website ?? '',
    linkedin: target.linkedin ?? '',
    notes: target.notes ?? '',
    status: target.status ?? 'new',
    pains,
    selectedStoryId: target.selectedStoryId,
    generatedOutreach: target.generatedOutreach ?? '',
    researchSummary: target.researchSummary,
    discoveryQuestions: target.discoveryQuestions ?? getDiscoveryQuestions(target.industry ?? '', pains)
  };
}

async function postJson<T>(url: string, payload: unknown): Promise<ApiEnvelope<T>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`${url} failed with ${response.status}`);
  return response.json() as Promise<ApiEnvelope<T>>;
}

function App() {
  const [targets, setTargets] = useState<Target[]>(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return defaultTargets;
    try {
      const parsed = JSON.parse(cached) as Partial<Target>[];
      return parsed.map(normalizeImportedTarget);
    } catch {
      return defaultTargets;
    }
  });
  const [activeTargetId, setActiveTargetId] = useState(targets[0]?.id ?? '');
  const [rawIngest, setRawIngest] = useState('Acme Corp, Jamie Rivera, CRO, B2B SaaS, https://acme.example, Hiring SDRs and wrestling with CRM hygiene');
  const [apiStatus, setApiStatus] = useState('Ready');
  const [autoGenerate, setAutoGenerate] = useState(true);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
  }, [targets]);

  const activeTarget = targets.find((target) => target.id === activeTargetId) ?? targets[0];
  const selectedStory = customerStories.find((story) => story.id === activeTarget?.selectedStoryId) ?? (activeTarget ? matchStories(activeTarget, customerStories)[0]?.story : undefined);
  const storyMatches = activeTarget ? matchStories(activeTarget, customerStories) : [];

  const stats = useMemo(() => ({
    total: targets.length,
    researched: targets.filter((target) => target.status === 'researched').length,
    drafted: targets.filter((target) => target.generatedOutreach.trim()).length,
    sent: targets.filter((target) => target.status === 'sent' || target.status === 'replied').length
  }), [targets]);

  const updateActiveTarget = (patch: Partial<Target>) => {
    if (!activeTarget) return;
    setTargets((current) => current.map((target) => {
      if (target.id !== activeTarget.id) return target;
      const next = { ...target, ...patch };
      next.discoveryQuestions = getDiscoveryQuestions(next.industry, next.pains);
      return next;
    }));
  };

  const addTargetsFromRaw = async () => {
    setApiStatus('Parsing messy list...');
    try {
      const result = await postJson<ParseResponse>('/api/parse-messy-file', { content: rawIngest });
      const imported = (result.data.targets ?? []).map(normalizeImportedTarget);
      setTargets((current) => [...imported, ...current]);
      if (imported[0]) setActiveTargetId(imported[0].id);
      setApiStatus(`Imported ${imported.length} target(s) via ${result.source}${result.cached ? ' cache' : ''}.`);
    } catch (error) {
      setApiStatus(error instanceof Error ? error.message : 'Import failed.');
    }
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setRawIngest(text);
    setApiStatus(`Loaded ${file.name}. Click Parse targets to import.`);
  };

  const runResearch = async () => {
    if (!activeTarget) return;
    setApiStatus(`Researching ${activeTarget.company || 'target'}...`);
    try {
      const result = await postJson<ResearchResponse>('/api/research-lms', { target: activeTarget });
      const data = result.data;
      updateActiveTarget({
        status: 'researched',
        researchSummary: data.summary ?? activeTarget.researchSummary,
        pains: data.pains?.length ? data.pains : activeTarget.pains
      });
      setApiStatus(`Research complete via ${result.source}${result.cached ? ' cache' : ''}.`);
    } catch (error) {
      setApiStatus(error instanceof Error ? error.message : 'Research failed.');
    }
  };

  const generateOutreach = async () => {
    if (!activeTarget) return;
    setApiStatus(`Generating outreach for ${activeTarget.company || 'target'}...`);
    try {
      const story = customerStories.find((item) => item.id === (activeTarget.selectedStoryId ?? selectedStory?.id));
      const result = await postJson<OutreachResponse>('/api/generate-outreach', { target: { ...activeTarget, story } });
      const subject = result.data.subject ? `Subject: ${result.data.subject}\n\n` : '';
      updateActiveTarget({
        status: 'drafted',
        generatedOutreach: `${subject}${result.data.body ?? ''}`.trim(),
        selectedStoryId: story?.id,
        lastGeneratedAt: new Date().toISOString()
      });
      setApiStatus(`Draft generated via ${result.source}${result.cached ? ' cache' : ''}.`);
    } catch (error) {
      setApiStatus(error instanceof Error ? error.message : 'Generation failed.');
    }
  };

  useEffect(() => {
    if (!autoGenerate || !activeTarget?.company || !activeTarget.pains.length) return;
    const handle = window.setTimeout(() => {
      void generateOutreach();
    }, AUTOGEN_DELAY_MS);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, activeTarget?.id, activeTarget?.company, activeTarget?.industry, activeTarget?.notes, activeTarget?.pains.length, activeTarget?.selectedStoryId]);

  const togglePain = (pain: PainSignal) => {
    if (!activeTarget) return;
    const exists = activeTarget.pains.some((item) => item.id === pain.id);
    updateActiveTarget({ pains: exists ? activeTarget.pains.filter((item) => item.id !== pain.id) : [...activeTarget.pains, pain] });
  };

  const addBlank = () => {
    const blank = makeBlankTarget();
    setTargets((current) => [blank, ...current]);
    setActiveTargetId(blank.id);
  };

  if (!activeTarget) {
    return <main className="app-shell"><button onClick={addBlank}>Create first target</button></main>;
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Codex Hub</p>
          <h1>AI-assisted outreach command center</h1>
          <p>Parse messy account lists, research lead-management signals, match customer proof, and generate concise outbound drafts.</p>
        </div>
        <div className="hero-actions">
          <button onClick={addBlank}>New target</button>
          <label className="toggle"><input type="checkbox" checked={autoGenerate} onChange={(event) => setAutoGenerate(event.target.checked)} /> Debounced auto-generation</label>
        </div>
      </header>

      <section className="dashboard-grid">
        <article className="card stat"><span>Total targets</span><strong>{stats.total}</strong></article>
        <article className="card stat"><span>Researched</span><strong>{stats.researched}</strong></article>
        <article className="card stat"><span>Drafted</span><strong>{stats.drafted}</strong></article>
        <article className="card stat"><span>Sent / replied</span><strong>{stats.sent}</strong></article>
      </section>

      <section className="workspace">
        <aside className="panel tracker">
          <div className="section-heading">
            <h2>Target ingestion</h2>
            <button onClick={addTargetsFromRaw}>Parse targets</button>
          </div>
          <textarea value={rawIngest} onChange={(event) => setRawIngest(event.target.value)} rows={5} aria-label="Messy target list" />
          <input type="file" accept=".txt,.csv,.md" onChange={(event) => void handleFileUpload(event.target.files?.[0] ?? null)} />
          <p className="status">{apiStatus}</p>

          <h2>Tracker grid</h2>
          <div className="target-list">
            {targets.map((target) => (
              <button key={target.id} className={target.id === activeTarget.id ? 'target-row active' : 'target-row'} onClick={() => setActiveTargetId(target.id)}>
                <span><strong>{target.company || 'Untitled account'}</strong><small>{target.contactName || 'No contact'} · {target.title || 'No title'}</small></span>
                <em>{target.status}</em>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel editor">
          <div className="section-heading">
            <h2>Active target editor</h2>
            <button onClick={runResearch}>AI scraper workflow</button>
          </div>
          <div className="form-grid">
            <label>Company<input value={activeTarget.company} onChange={(event) => updateActiveTarget({ company: event.target.value })} /></label>
            <label>Contact<input value={activeTarget.contactName} onChange={(event) => updateActiveTarget({ contactName: event.target.value })} /></label>
            <label>Title<input value={activeTarget.title} onChange={(event) => updateActiveTarget({ title: event.target.value })} /></label>
            <label>Industry<input value={activeTarget.industry} onChange={(event) => updateActiveTarget({ industry: event.target.value })} /></label>
            <label>Website<input value={activeTarget.website} onChange={(event) => updateActiveTarget({ website: event.target.value })} /></label>
            <label>LinkedIn<input value={activeTarget.linkedin ?? ''} onChange={(event) => updateActiveTarget({ linkedin: event.target.value })} /></label>
          </div>
          <label>Notes<textarea value={activeTarget.notes} onChange={(event) => updateActiveTarget({ notes: event.target.value })} rows={4} /></label>
          {activeTarget.researchSummary && <p className="research-summary"><strong>Research:</strong> {activeTarget.researchSummary}</p>}

          <div className="two-column">
            <section>
              <h3>Pain catalog</h3>
              <div className="pill-list">
                {painCatalog.map((pain) => (
                  <button key={pain.id} className={activeTarget.pains.some((item) => item.id === pain.id) ? 'pill selected' : 'pill'} onClick={() => togglePain(pain)}>
                    {pain.label}
                  </button>
                ))}
              </div>
              <ul className="pain-list">
                {activeTarget.pains.map((pain) => <li key={pain.id}><strong>{pain.label}</strong><span>{pain.evidence}</span></li>)}
              </ul>
            </section>

            <section>
              <h3>Customer story matching</h3>
              {storyMatches.map(({ story, score }) => (
                <StoryOption key={story.id} story={story} score={score} selected={story.id === (activeTarget.selectedStoryId ?? selectedStory?.id)} onSelect={() => updateActiveTarget({ selectedStoryId: story.id })} />
              ))}
            </section>
          </div>

          <section className="questions">
            <h3>Discovery questions</h3>
            <ol>{activeTarget.discoveryQuestions.map((question) => <li key={question}>{question}</li>)}</ol>
          </section>
        </section>

        <aside className="panel outreach">
          <div className="section-heading">
            <h2>Outreach workspace</h2>
            <button onClick={generateOutreach}>Generate now</button>
          </div>
          <textarea className="outreach-textarea" value={activeTarget.generatedOutreach} onChange={(event) => updateActiveTarget({ generatedOutreach: event.target.value })} rows={16} aria-label="Generated outreach" />
          <OutreachMetrics text={activeTarget.generatedOutreach} />
          {activeTarget.lastGeneratedAt && <p className="status">Last generated {new Date(activeTarget.lastGeneratedAt).toLocaleString()}</p>}
        </aside>
      </section>
    </main>
  );
}

function StoryOption({ story, score, selected, onSelect }: { story: CustomerStory; score: number; selected: boolean; onSelect: () => void }) {
  return (
    <button className={selected ? 'story selected' : 'story'} onClick={onSelect}>
      <span><strong>{story.company}</strong><small>{story.industry} · score {score}</small></span>
      <p>{story.pain}</p>
      <em>{story.proofPoint}</em>
    </button>
  );
}

export default App;
