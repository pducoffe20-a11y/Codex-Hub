import { customerStories, verticalStoryMatches, type CustomerStory } from '../data';

export function matchCustomerStories(vertical = '', hasCredential = false): CustomerStory[] {
  const normalized = vertical.toLowerCase();
  const ids = new Set<string>();
  Object.entries(verticalStoryMatches).forEach(([term, storyIds]) => {
    if (normalized.includes(term)) storyIds.forEach((id) => ids.add(id));
  });
  if (hasCredential) {
    ids.add('cpa-ontario');
    ids.add('american-academy');
  }
  const matched = customerStories.filter((story) => ids.has(story.id));
  return matched.length ? matched : customerStories.slice(0, 2);
}
