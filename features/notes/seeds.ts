import type { NoteInput } from './model';
export const seedNotes: (NoteInput & { date: string })[] = [
  {
    title: 'React Performance Optimization',
    tags: ['Dev', 'React'],
    archived: false,
    date: '2026-10-22T09:40:00.000Z',
    content:
      'Key performance optimization techniques:\n\n1. Code Splitting\n   • Use React.lazy() for route-based splitting\n   • Implement dynamic imports for heavy components\n\n2. Memoization\n   • useMemo for expensive calculations\n   • useCallback for function props\n   • React.memo for component optimization\n\n3. Virtual List Implementation\n   • Use react-window for long lists\n   • Implement infinite scrolling\n\nNext steps\nBenchmark the current application and identify bottlenecks. Start with the React Profiler, measure first, and optimize what matters.',
  },
  {
    title: 'Japan Travel Planning',
    tags: ['Travel', 'Personal'],
    archived: false,
    date: '2026-10-21T16:20:00.000Z',
    content:
      'Two weeks in Japan\n\nTokyo · 5 days\nExplore the neighborhoods of Shibuya and Shimokitazawa. Visit the teamLab exhibition and find a quiet coffee shop.\n\nKyoto · 4 days\nAn early morning at Fushimi Inari, then a walk along the Philosopher’s Path.\n\nOsaka · 3 days\nStreet food in Dotonbori and a day trip to Nara.\n\nBefore we go\n• Book accommodation\n• Check train routes\n• Make a small list of local phrases',
  },
  {
    title: 'Favorite Pasta Recipes',
    tags: ['Cooking', 'Recipes'],
    archived: false,
    date: '2026-10-20T11:15:00.000Z',
    content:
      'A little collection of weeknight favorites.\n\nLemon & parmesan pasta\nSpaghetti, a lemon, good olive oil, parmesan, and a little pasta water. Finish with cracked black pepper.\n\nSlow Sunday tomato sauce\nGently cook garlic in olive oil. Add tomatoes, a pinch of salt, and fresh basil. Give it time.\n\nRemember: save a cup of pasta water before draining!',
  },
  {
    title: 'Weekly Workout Plan',
    tags: ['Fitness', 'Health'],
    archived: false,
    date: '2026-10-19T08:30:00.000Z',
    content:
      'Small steps, consistent progress.\n\nMonday — Upper body\nWednesday — Easy run, 30 minutes\nFriday — Lower body\nSaturday — Long walk outdoors\n\nDaily reminders\n• Ten minutes of mobility\n• Drink enough water\n• Prioritize good sleep',
  },
  {
    title: 'Meal Prep Ideas',
    tags: ['Cooking', 'Health', 'Recipes'],
    archived: false,
    date: '2026-10-18T14:10:00.000Z',
    content:
      'Make the week a little easier.\n\nBreakfast\nOvernight oats with berries and chia seeds.\n\nLunch\nRoasted vegetables, brown rice, and a lemon tahini dressing.\n\nDinner\nA big pot of lentil soup, served with crusty bread.\n\nShopping list\nOats, berries, lentils, carrots, sweet potatoes, tahini, lemons.',
  },
  {
    title: 'Reading List',
    tags: ['Personal', 'Dev'],
    archived: false,
    date: '2026-10-17T10:00:00.000Z',
    content:
      'Books to make time for\n\n• Designing Data-Intensive Applications — Martin Kleppmann\n• A Philosophy of Software Design — John Ousterhout\n• The Creative Act — Rick Rubin\n\nTake notes as you read. The best ideas are the ones you put into practice.',
  },
  {
    title: 'A calmer morning',
    tags: ['Personal', 'Health'],
    archived: false,
    date: '2026-10-16T07:00:00.000Z',
    content:
      'A simple morning routine\n\n1. Open the curtains\n2. Drink a glass of water\n3. Write down one thing to look forward to\n4. A short walk, without a phone\n\nLeave a little space before the day begins.',
  },
  {
    title: 'TypeScript Patterns',
    tags: ['Dev', 'TypeScript'],
    archived: false,
    date: '2026-10-15T13:00:00.000Z',
    content:
      'Patterns worth keeping close\n\nDiscriminated unions\nMake invalid states impossible. Model loading, success, and failure as separate states.\n\nValidate at boundaries\nTypeScript types do not validate untrusted runtime input. Parse incoming requests with a schema.\n\nPrefer inference\nLet the compiler do the repetitive work. Annotate public interfaces.',
  },
  {
    title: 'Summer project retrospective',
    tags: ['Dev', 'Personal'],
    archived: true,
    date: '2026-09-02T10:00:00.000Z',
    content:
      'What went well\nWe shipped a smaller, focused version and learned from real feedback.\n\nWhat to improve\nBring accessibility checks into the process earlier.\n\nFor next time\nWrite down the tradeoffs while they are still fresh.',
  },
];
