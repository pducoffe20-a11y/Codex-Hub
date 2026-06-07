const bannedWords = ['synergy', 'disruptive', 'revolutionary', 'game changer', 'circle back', 'just checking in'];

function countSyllables(word: string) {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return 0;
  const groups = cleaned.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/i, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

function fleschKincaidGrade(text: string) {
  const sentences = Math.max(1, text.split(/[.!?]+/).filter((part) => part.trim().length > 0).length);
  const words = text.match(/\b[\w'-]+\b/g) ?? [];
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  if (!words.length) return 0;
  return 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
}

export function OutreachMetrics({ text }: { text: string }) {
  const words = text.match(/\b[\w'-]+\b/g) ?? [];
  const wordCount = words.length;
  const grade = fleschKincaidGrade(text);
  const questionCount = (text.match(/\?/g) ?? []).length;
  const foundBannedWords = bannedWords.filter((word) => text.toLowerCase().includes(word));
  const wordCountStatus = wordCount > 0 && wordCount <= 140;

  return (
    <section className="metrics-card" aria-label="Outreach quality metrics">
      <h3>Outreach metrics</h3>
      <div className="metric-grid">
        <div className={wordCountStatus ? 'metric good' : 'metric warn'}>
          <span>Words</span>
          <strong>{wordCount}</strong>
          <small>{wordCountStatus ? 'Within 140-word target' : 'Aim for 1-140 words'}</small>
        </div>
        <div className={grade <= 9 ? 'metric good' : 'metric warn'}>
          <span>FK grade</span>
          <strong>{grade.toFixed(1)}</strong>
          <small>{grade <= 9 ? 'Easy to read' : 'Simplify the language'}</small>
        </div>
        <div className={questionCount <= 2 ? 'metric good' : 'metric warn'}>
          <span>Questions</span>
          <strong>{questionCount}</strong>
          <small>{questionCount <= 2 ? 'Focused ask' : 'Too many asks'}</small>
        </div>
        <div className={foundBannedWords.length === 0 ? 'metric good' : 'metric warn'}>
          <span>Banned words</span>
          <strong>{foundBannedWords.length}</strong>
          <small>{foundBannedWords.length ? foundBannedWords.join(', ') : 'None detected'}</small>
        </div>
      </div>
    </section>
  );
}
