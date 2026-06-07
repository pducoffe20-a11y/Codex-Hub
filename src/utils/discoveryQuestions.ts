import type { PainSignal } from '../data';

const baseQuestions = [
  'What changed recently that made this problem a priority now?',
  'How are reps handling this workflow today?',
  'What would improve if the team solved this in the next quarter?'
];

export function getDiscoveryQuestions(industry: string, pains: PainSignal[]) {
  const questions = new Set<string>(baseQuestions);

  if (/fintech|payments|bank/i.test(industry)) {
    questions.add('Where do compliance or risk checks slow down revenue follow-up today?');
  }

  if (/saas|software/i.test(industry)) {
    questions.add('Which funnel conversion point is most sensitive to better account research?');
  }

  for (const pain of pains) {
    if (pain.id === 'manual-handoff') questions.add('Which manual handoff creates the longest delay between signal and seller action?');
    if (pain.id === 'tool-sprawl') questions.add('Which system is the team least confident using as the source of truth?');
    if (pain.id === 'pipeline-quality') questions.add('What makes forecast or pipeline quality difficult to trust right now?');
    if (pain.id === 'rep-ramp') questions.add('What does a new rep need to know before they can personalize effectively?');
  }

  return Array.from(questions).slice(0, 6);
}
