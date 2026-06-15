import type { Clue, GuessEntry, TileClue } from '@/lib/game';

type StoredGuess = {
  id: string;
  digits: string;
  clues: string;
};

export function parseStoredGuess(g: StoredGuess): GuessEntry {
  const parsed = JSON.parse(g.clues) as
    | Clue[]
    | { clues: Clue[]; tileClues?: TileClue[] };

  const clues = Array.isArray(parsed) ? parsed : parsed.clues;
  const tileClues = Array.isArray(parsed) ? undefined : parsed.tileClues;

  return {
    id: g.id,
    digits: g.digits.split('').map(Number),
    clues,
    tileClues,
  };
}
