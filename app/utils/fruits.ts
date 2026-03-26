export const FRUITS = [
  '🍎', '🍌', '🍇', '🍓', '🍒', '🍍', '🥝', '🍑',
];

export function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function generateDeck() {
  const pairs = [...FRUITS, ...FRUITS];
  const shuffled = shuffle(pairs);
  return shuffled.map((fruit, index) => ({
    id: index,
    fruit,
    isFlipped: false,
    isMatched: false,
  }));
}
