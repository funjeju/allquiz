export type Direction = 'across' | 'down';

export interface CrosswordCell {
  letter: string;
  isBlocked: boolean;
  number?: number;
  acrossWordId?: string;
  downWordId?: string;
}

export interface PlacedWord {
  id: string;
  word: string;
  clue: string;
  direction: Direction;
  startRow: number;
  startCol: number;
  number: number;
  category?: string;
}

export interface CrosswordPuzzle {
  date: string;
  title: string;
  grid: CrosswordCell[][];
  words: PlacedWord[];
  rows: number;
  cols: number;
}

export interface WordInput {
  word: string;
  clue: string;
  category?: string;
}

const GRID = 13;

function emptyGrid(size: number): CrosswordCell[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, (): CrosswordCell => ({ letter: '', isBlocked: true }))
  );
}

function inBounds(R: number, C: number, r: number, c: number): boolean {
  return r >= 0 && r < R && c >= 0 && c < C;
}

function canPlace(
  grid: CrosswordCell[][],
  chars: string[],
  row: number,
  col: number,
  dir: Direction,
  isFirst: boolean
): boolean {
  const R = grid.length, C = grid[0].length;
  const dr = dir === 'down' ? 1 : 0;
  const dc = dir === 'across' ? 1 : 0;
  const len = chars.length;

  if (!inBounds(R, C, row, col)) return false;
  if (!inBounds(R, C, row + dr * (len - 1), col + dc * (len - 1))) return false;

  // Cells immediately before and after the word must be wall/blocked
  if (inBounds(R, C, row - dr, col - dc) && !grid[row - dr][col - dc].isBlocked) return false;
  if (inBounds(R, C, row + dr * len, col + dc * len) && !grid[row + dr * len][col + dc * len].isBlocked) return false;

  let intersections = 0;

  for (let i = 0; i < len; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cell = grid[r][c];

    if (!cell.isBlocked) {
      // Occupied cell — must match and not belong to a word in the same direction
      if (cell.letter !== chars[i]) return false;
      if (dir === 'across' && cell.acrossWordId) return false;
      if (dir === 'down' && cell.downWordId) return false;
      intersections++;
    } else {
      // Empty cell — prevent adjacent parallel words
      if (dir === 'across') {
        if (inBounds(R, C, r - 1, c) && !grid[r - 1][c].isBlocked && grid[r - 1][c].acrossWordId) return false;
        if (inBounds(R, C, r + 1, c) && !grid[r + 1][c].isBlocked && grid[r + 1][c].acrossWordId) return false;
      } else {
        if (inBounds(R, C, r, c - 1) && !grid[r][c - 1].isBlocked && grid[r][c - 1].downWordId) return false;
        if (inBounds(R, C, r, c + 1) && !grid[r][c + 1].isBlocked && grid[r][c + 1].downWordId) return false;
      }
    }
  }

  return isFirst || intersections > 0;
}

function placeWord(
  grid: CrosswordCell[][],
  chars: string[],
  row: number,
  col: number,
  dir: Direction,
  id: string
): void {
  const dr = dir === 'down' ? 1 : 0;
  const dc = dir === 'across' ? 1 : 0;
  for (let i = 0; i < chars.length; i++) {
    const r = row + dr * i, c = col + dc * i;
    grid[r][c].isBlocked = false;
    grid[r][c].letter = chars[i];
    if (dir === 'across') grid[r][c].acrossWordId = id;
    else grid[r][c].downWordId = id;
  }
}

type PlacedInfo = { id: string; chars: string[]; row: number; col: number; dir: Direction };

function findPlacements(
  grid: CrosswordCell[][],
  chars: string[],
  placed: PlacedInfo[]
): Array<{ row: number; col: number; dir: Direction }> {
  const out: Array<{ row: number; col: number; dir: Direction }> = [];

  for (const pw of placed) {
    const opp: Direction = pw.dir === 'across' ? 'down' : 'across';
    const dr = pw.dir === 'down' ? 1 : 0;
    const dc = pw.dir === 'across' ? 1 : 0;
    const nDr = opp === 'down' ? 1 : 0;
    const nDc = opp === 'across' ? 1 : 0;

    for (let ni = 0; ni < chars.length; ni++) {
      for (let pi = 0; pi < pw.chars.length; pi++) {
        if (chars[ni] !== pw.chars[pi]) continue;
        const iR = pw.row + dr * pi;
        const iC = pw.col + dc * pi;
        const nRow = iR - nDr * ni;
        const nCol = iC - nDc * ni;
        if (canPlace(grid, chars, nRow, nCol, opp, false)) {
          out.push({ row: nRow, col: nCol, dir: opp });
        }
      }
    }
  }

  return out;
}

function assignNumbers(grid: CrosswordCell[][], words: PlacedWord[]): void {
  const R = grid.length, C = grid[0].length;
  const wmap = new Map(words.map(w => [w.id, w]));
  let n = 1;

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const cell = grid[r][c];
      if (cell.isBlocked) continue;

      const acrossStart =
        (c === 0 || grid[r][c - 1].isBlocked) &&
        c + 1 < C && !grid[r][c + 1].isBlocked &&
        !!cell.acrossWordId;
      const downStart =
        (r === 0 || grid[r - 1][c].isBlocked) &&
        r + 1 < R && !grid[r + 1][c].isBlocked &&
        !!cell.downWordId;

      if (acrossStart || downStart) {
        cell.number = n;
        if (acrossStart && cell.acrossWordId) { const w = wmap.get(cell.acrossWordId); if (w) w.number = n; }
        if (downStart && cell.downWordId) { const w = wmap.get(cell.downWordId); if (w) w.number = n; }
        n++;
      }
    }
  }
}

function trimGrid(
  grid: CrosswordCell[][],
  words: PlacedWord[]
): { grid: CrosswordCell[][]; words: PlacedWord[] } {
  const R = grid.length, C = grid[0].length;
  let r0 = R, r1 = 0, c0 = C, c1 = 0;

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (!grid[r][c].isBlocked) {
        if (r < r0) r0 = r;
        if (r > r1) r1 = r;
        if (c < c0) c0 = c;
        if (c > c1) c1 = c;
      }
    }
  }

  r0 = Math.max(0, r0 - 1);
  r1 = Math.min(R - 1, r1 + 1);
  c0 = Math.max(0, c0 - 1);
  c1 = Math.min(C - 1, c1 + 1);

  return {
    grid: grid.slice(r0, r1 + 1).map(row => row.slice(c0, c1 + 1)),
    words: words.map(w => ({ ...w, startRow: w.startRow - r0, startCol: w.startCol - c0 })),
  };
}

function runLayout(inputs: WordInput[]): { grid: CrosswordCell[][]; placed: PlacedWord[] } | null {
  if (!inputs.length) return null;

  const grid = emptyGrid(GRID);
  const placed: PlacedWord[] = [];
  const info: PlacedInfo[] = [];

  const first = inputs[0];
  const fChars = [...first.word];
  const midRow = Math.floor(GRID / 2);
  const startCol = Math.floor((GRID - fChars.length) / 2);

  if (!canPlace(grid, fChars, midRow, startCol, 'across', true)) return null;
  placeWord(grid, fChars, midRow, startCol, 'across', 'w0');
  placed.push({ id: 'w0', word: first.word, clue: first.clue, direction: 'across', startRow: midRow, startCol, number: 0, category: first.category });
  info.push({ id: 'w0', chars: fChars, row: midRow, col: startCol, dir: 'across' });

  for (let i = 1; i < inputs.length; i++) {
    const wi = inputs[i];
    const chars = [...wi.word];
    const placements = findPlacements(grid, chars, info);
    if (!placements.length) continue;

    const cx = GRID / 2;
    const best = placements.sort(
      (a, b) =>
        (Math.abs(a.row - cx) + Math.abs(a.col - cx)) -
        (Math.abs(b.row - cx) + Math.abs(b.col - cx))
    )[0];

    const wid = `w${i}`;
    placeWord(grid, chars, best.row, best.col, best.dir, wid);
    placed.push({ id: wid, word: wi.word, clue: wi.clue, direction: best.dir, startRow: best.row, startCol: best.col, number: 0, category: wi.category });
    info.push({ id: wid, chars, row: best.row, col: best.col, dir: best.dir });
  }

  return { grid, placed };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateCrossword(
  inputs: WordInput[],
  date: string,
  title: string
): CrosswordPuzzle | null {
  // Keep only pure Korean syllable words, 2–7 chars
  const valid = inputs.filter(w => {
    const chars = [...w.word];
    return chars.length >= 2 && chars.length <= 7 && chars.every(c => c >= '가' && c <= '힣');
  });

  if (valid.length < 3) return null;

  const byLen = [...valid].sort((a, b) => [...b.word].length - [...a.word].length);

  let best: { grid: CrosswordCell[][]; placed: PlacedWord[] } | null = null;

  // Try every word as the potential first word (different anchors give different intersection opportunities)
  for (const firstWord of byLen.slice(0, Math.min(byLen.length, 8))) {
    const rest = byLen.filter(w => w !== firstWord);
    const orderings: WordInput[][] = [
      [firstWord, ...rest],
      [firstWord, ...shuffle(rest)],
      [firstWord, ...[...rest].reverse()],
    ];
    for (const ord of orderings) {
      const result = runLayout(ord);
      if (result && (!best || result.placed.length > best.placed.length)) {
        best = result;
      }
      if (best && best.placed.length >= Math.min(valid.length, 10)) break;
    }
    if (best && best.placed.length >= Math.min(valid.length, 10)) break;
  }

  if (!best || best.placed.length < 3) return null;

  const { grid, words } = trimGrid(best.grid, best.placed);
  assignNumbers(grid, words);

  const acrossWords = words.filter(w => w.direction === 'across').sort((a, b) => a.number - b.number);
  const downWords = words.filter(w => w.direction === 'down').sort((a, b) => a.number - b.number);

  return {
    date,
    title,
    grid,
    words: [...acrossWords, ...downWords],
    rows: grid.length,
    cols: grid[0].length,
  };
}
