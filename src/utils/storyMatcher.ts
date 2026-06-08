import type { CustomerStory, PainSignal, Target } from '../data';

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

export function scoreStoryForTarget(story: CustomerStory, target: Pick<Target, 'industry' | 'notes' | 'company'> & { pains: PainSignal[] }) {
  const haystack = normalize(`${target.company} ${target.industry} ${target.notes} ${target.pains.map((pain) => `${pain.label} ${pain.evidence}`).join(' ')}`);
  let score = 0;

  if (normalize(target.industry).includes(normalize(story.industry)) || normalize(story.industry).includes(normalize(target.industry))) {
    score += 4;
  }

  for (const keyword of story.keywords) {
    if (haystack.includes(normalize(keyword))) {
      score += 2;
    }
  }

  for (const pain of target.pains) {
    const painText = normalize(`${pain.label} ${pain.evidence}`);
    for (const keyword of story.keywords) {
      if (painText.includes(normalize(keyword))) {
        score += 1;
      }
    }
  }

  return score;
}

export function matchStories(target: Target, stories: CustomerStory[]) {
  return [...stories]
    .map((story) => ({ story, score: scoreStoryForTarget(story, target) }))
    .sort((a, b) => b.score - a.score || a.story.company.localeCompare(b.story.company));
}
