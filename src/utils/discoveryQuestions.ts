import { competitorPainDatabase, type LmsId } from '../data';

export function discoveryQuestions(lmsId: LmsId, vertical: string, hasCredential: boolean): string[] {
  const profile = competitorPainDatabase[lmsId] ?? competitorPainDatabase.unsure_research;
  const credentialQuestion = hasCredential
    ? 'How are you tracking completion, CE credit, renewal, and exceptions today?'
    : 'What learning outcomes do leaders ask you to report beyond completions?';

  return [
    `Where does ${profile.name === 'Unsure Research' ? 'your current learning setup' : profile.name} create the most admin work today?`,
    credentialQuestion,
    `For ${vertical || 'this audience'}, what would make the learner experience feel meaningfully better this year?`,
    'If you changed platforms, what would need to be protected during migration?'
  ];
}
