"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ArrowLeft, Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { getDailyCrossword } from "@/services/crosswordService";
import { CrosswordPuzzle, PlacedWord } from "@/lib/crossword";
import { CrosswordGrid } from "@/components/crossword/CrosswordGrid";
import { CrosswordClues } from "@/components/crossword/CrosswordClues";
import { CompletionOverlay } from "@/components/crossword/CompletionOverlay";

function getKSTDate(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const STORAGE_KEY = (date: string) => `crossword_progress_${date}`;

interface Progress {
  date: string;
  userGrid: string[][];
  correctWords: string[];
  elapsedSeconds: number;
}

export default function CrosswordPage() {
  const router = useRouter();
  const [puzzle, setPuzzle] = useState<CrosswordPuzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [correctWords, setCorrectWords] = useState<Set<string>>(new Set());
  const [showComplete, setShowComplete] = useState(false);
  const [clueTab, setClueTab] = useState<"across" | "down">("across");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isComposing = useRef(false);
  const puzzleRef = useRef<CrosswordPuzzle | null>(null);

  // ─── Load puzzle ─────────────────────────────────────────────────────────
  useEffect(() => {
    const date = getKSTDate();
    getDailyCrossword(date)
      .then(p => {
        if (!p) { setLoading(false); return; }
        setPuzzle(p);
        puzzleRef.current = p;

        const saved = localStorage.getItem(STORAGE_KEY(date));
        if (saved) {
          try {
            const prog: Progress = JSON.parse(saved);
            setUserGrid(prog.userGrid);
            setCorrectWords(new Set(prog.correctWords));
            setElapsedSeconds(prog.elapsedSeconds);
          } catch {
            setUserGrid(Array.from({ length: p.rows }, () => Array(p.cols).fill("")));
          }
        } else {
          setUserGrid(Array.from({ length: p.rows }, () => Array(p.cols).fill("")));
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ─── Timer ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!puzzle || showComplete) return;
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [puzzle, showComplete]);

  // ─── Persist progress ────────────────────────────────────────────────────
  useEffect(() => {
    if (!puzzle || !userGrid.length) return;
    const prog: Progress = {
      date: puzzle.date,
      userGrid,
      correctWords: [...correctWords],
      elapsedSeconds,
    };
    localStorage.setItem(STORAGE_KEY(puzzle.date), JSON.stringify(prog));
  }, [puzzle, userGrid, correctWords, elapsedSeconds]);

  // ─── Derived maps ────────────────────────────────────────────────────────
  const wordMap = useMemo(() => {
    if (!puzzle) return new Map<string, PlacedWord>();
    return new Map(puzzle.words.map(w => [w.id, w]));
  }, [puzzle]);

  const cellWordMap = useMemo(() => {
    if (!puzzle) return new Map<string, { across?: string; down?: string }>();
    const map = new Map<string, { across?: string; down?: string }>();
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        const cell = puzzle.grid[r][c];
        if (!cell.isBlocked) {
          map.set(`${r},${c}`, { across: cell.acrossWordId, down: cell.downWordId });
        }
      }
    }
    return map;
  }, [puzzle]);

  const selectedWord = useMemo(
    () => (selectedWordId ? wordMap.get(selectedWordId) ?? null : null),
    [selectedWordId, wordMap]
  );

  // ─── Cell helpers ─────────────────────────────────────────────────────────
  const getOffset = useCallback(
    (word: PlacedWord, row: number, col: number): number => {
      if (word.direction === "down") return row - word.startRow;
      return col - word.startCol;
    },
    []
  );

  const cellAt = useCallback(
    (word: PlacedWord, offset: number): { row: number; col: number } => {
      const dr = word.direction === "down" ? 1 : 0;
      const dc = word.direction === "across" ? 1 : 0;
      return { row: word.startRow + dr * offset, col: word.startCol + dc * offset };
    },
    []
  );

  // ─── Word completion check ────────────────────────────────────────────────
  const isWordCorrect = useCallback(
    (word: PlacedWord, grid: string[][]): boolean => {
      const chars = [...word.word];
      const dr = word.direction === "down" ? 1 : 0;
      const dc = word.direction === "across" ? 1 : 0;
      return chars.every((ch, i) => grid[word.startRow + dr * i]?.[word.startCol + dc * i] === ch);
    },
    []
  );

  // ─── Fill a cell with a Korean syllable ───────────────────────────────────
  const fillCell = useCallback(
    (syllable: string) => {
      if (!activeCell || !selectedWord) return;
      const { row, col } = activeCell;

      setUserGrid(prev => {
        const next = prev.map(r => [...r]);
        next[row][col] = syllable;

        // Defer word-check so we see the updated letter
        setTimeout(() => {
          const p = puzzleRef.current;
          if (!p) return;

          // Check across word at this cell
          const cw = p.grid[row][col];
          const toCheck: string[] = [];
          if (cw.acrossWordId) toCheck.push(cw.acrossWordId);
          if (cw.downWordId) toCheck.push(cw.downWordId);

          setCorrectWords(prev2 => {
            let changed = false;
            const s = new Set(prev2);
            for (const wid of toCheck) {
              const w = p.words.find(x => x.id === wid);
              if (w && !s.has(wid) && isWordCorrect(w, next)) {
                s.add(wid);
                changed = true;
              }
            }
            if (!changed) return prev2;
            if (p.words.every(w => s.has(w.id))) {
              setTimeout(() => setShowComplete(true), 500);
            }
            return s;
          });
        }, 30);

        return next;
      });

      // Advance to next cell in the word
      const offset = getOffset(selectedWord, row, col);
      const wordLen = [...selectedWord.word].length;
      if (offset + 1 < wordLen) {
        const next = cellAt(selectedWord, offset + 1);
        setActiveCell(next);
      }
    },
    [activeCell, selectedWord, getOffset, cellAt, isWordCorrect]
  );

  // ─── Delete current cell ──────────────────────────────────────────────────
  const deleteCell = useCallback(() => {
    if (!activeCell || !selectedWord) return;
    const { row, col } = activeCell;
    const offset = getOffset(selectedWord, row, col);

    setUserGrid(prev => {
      const next = prev.map(r => [...r]);
      if (prev[row][col]) {
        next[row][col] = "";
      } else if (offset > 0) {
        const prev_cell = cellAt(selectedWord, offset - 1);
        next[prev_cell.row][prev_cell.col] = "";
        setActiveCell(prev_cell);
      }
      return next;
    });
  }, [activeCell, selectedWord, getOffset, cellAt]);

  // ─── Jump to next incomplete word ─────────────────────────────────────────
  const jumpToNextWord = useCallback(() => {
    if (!puzzle || !selectedWord) return;
    const allWords = [...puzzle.words];
    const idx = allWords.findIndex(w => w.id === selectedWord.id);
    for (let i = 1; i <= allWords.length; i++) {
      const next = allWords[(idx + i) % allWords.length];
      if (!correctWords.has(next.id)) {
        setSelectedWordId(next.id);
        setActiveCell({ row: next.startRow, col: next.startCol });
        setClueTab(next.direction === "across" ? "across" : "down");
        inputRef.current?.focus();
        return;
      }
    }
  }, [puzzle, selectedWord, correctWords]);

  // ─── Cell click → select word ─────────────────────────────────────────────
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!puzzle) return;
      const cell = puzzle.grid[row][col];
      if (cell.isBlocked) return;

      const cw = cellWordMap.get(`${row},${col}`);
      if (!cw) return;

      // Clicking the active cell at an intersection toggles direction
      if (activeCell?.row === row && activeCell?.col === col && selectedWord) {
        const other = selectedWord.direction === "across" ? cw.down : cw.across;
        if (other) {
          setSelectedWordId(other);
          setClueTab(other === cw.across ? "across" : "down");
          inputRef.current?.focus();
          return;
        }
      }

      const preferred = clueTab === "across" ? cw.across : cw.down;
      const fallback = clueTab === "across" ? cw.down : cw.across;
      const wid = preferred ?? fallback;
      if (!wid) return;

      setSelectedWordId(wid);
      setActiveCell({ row, col });
      const w = wordMap.get(wid);
      if (w) setClueTab(w.direction === "across" ? "across" : "down");
      inputRef.current?.focus();
    },
    [puzzle, activeCell, selectedWord, cellWordMap, clueTab, wordMap]
  );

  // ─── Korean IME input handling ────────────────────────────────────────────
  const handleCompositionStart = useCallback(() => {
    isComposing.current = true;
  }, []);

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      isComposing.current = false;
      const composed = e.data ?? "";
      const syllables = [...composed].filter(c => c >= "가" && c <= "힣");
      if (syllables.length) {
        fillCell(syllables[syllables.length - 1]);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [fillCell]
  );

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      if (isComposing.current) return;
      const val = e.currentTarget.value;
      const syllables = [...val].filter(c => c >= "가" && c <= "힣");
      if (syllables.length) {
        fillCell(syllables[syllables.length - 1]);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [fillCell]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!selectedWord || !activeCell) return;
      const offset = getOffset(selectedWord, activeCell.row, activeCell.col);
      const wordLen = [...selectedWord.word].length;

      switch (e.key) {
        case "Backspace":
          if (!isComposing.current) {
            e.preventDefault();
            deleteCell();
          }
          break;
        case "Tab":
        case "Enter":
          e.preventDefault();
          jumpToNextWord();
          break;
        case "ArrowRight":
          if (selectedWord.direction === "across" && offset + 1 < wordLen) {
            e.preventDefault();
            setActiveCell(cellAt(selectedWord, offset + 1));
          }
          break;
        case "ArrowLeft":
          if (selectedWord.direction === "across" && offset > 0) {
            e.preventDefault();
            setActiveCell(cellAt(selectedWord, offset - 1));
          }
          break;
        case "ArrowDown":
          if (selectedWord.direction === "down" && offset + 1 < wordLen) {
            e.preventDefault();
            setActiveCell(cellAt(selectedWord, offset + 1));
          }
          break;
        case "ArrowUp":
          if (selectedWord.direction === "down" && offset > 0) {
            e.preventDefault();
            setActiveCell(cellAt(selectedWord, offset - 1));
          }
          break;
      }
    },
    [selectedWord, activeCell, getOffset, deleteCell, jumpToNextWord, cellAt]
  );

  // ─── Progress ─────────────────────────────────────────────────────────────
  const progressPct = puzzle ? (correctWords.size / puzzle.words.length) * 100 : 0;

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!puzzle) {
    const isDev = process.env.NODE_ENV === "development";

    const handleGenerate = async () => {
      setGenerating(true);
      setGenError(null);
      try {
        const res = await fetch("/api/dev/generate-crossword", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Generation failed");
        // Reload page to show the newly generated puzzle
        window.location.reload();
      } catch (e) {
        setGenError(e instanceof Error ? e.message : String(e));
        setGenerating(false);
      }
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-7xl select-none">📰</div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black">오늘의 낱말퀴즈 준비 중</h2>
          <p className="text-muted-foreground text-sm">매일 오전 7시, 주요 뉴스로 새 퀴즈가 올라옵니다.</p>
        </div>

        {isDev && (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-2xl font-black text-sm shadow-lg shadow-accent/20 disabled:opacity-50"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 생성 중… (30~60초)</>
              ) : (
                <><Zap className="w-4 h-4" /> 지금 바로 생성하기 (DEV)</>
              )}
            </button>
            {genError && (
              <p className="text-xs text-destructive max-w-xs">{genError}</p>
            )}
            <p className="text-[10px] text-muted-foreground">개발 환경 전용 버튼 — 프로덕션 미노출</p>
          </div>
        )}

        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-black text-sm shadow-lg shadow-primary/20"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hidden input — receives Korean keyboard on mobile */}
      <input
        ref={inputRef}
        type="text"
        className="fixed w-px h-px opacity-0 pointer-events-none"
        style={{ top: "50%", left: "50%" }}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onInput={handleInput}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        readOnly={false}
        inputMode="text"
        aria-hidden="true"
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                낱말퀴즈 — {format(new Date(puzzle.date.replace(/-/g, "/")), "M월 d일 (EEE)", { locale: ko })}
              </span>
              <span className="text-xs font-mono font-bold text-muted-foreground tabular-nums">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              />
            </div>
          </div>

          <span className="text-xs font-black text-muted-foreground shrink-0">
            {correctWords.size}/{puzzle.words.length}
          </span>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-32 space-y-4">
        {/* Grid */}
        <CrosswordGrid
          puzzle={puzzle}
          userGrid={userGrid}
          selectedWordId={selectedWordId}
          activeCell={activeCell}
          correctWords={correctWords}
          onCellClick={handleCellClick}
        />

        {/* Active clue */}
        <AnimatePresence mode="wait">
          {selectedWord && (
            <motion.div
              key={selectedWord.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
                  {selectedWord.number}{selectedWord.direction === "across" ? "가" : "세"}
                </span>
                <span className="text-[10px] text-muted-foreground font-bold">
                  {[...selectedWord.word].length}글자
                </span>
                {correctWords.has(selectedWord.id) && (
                  <span className="text-[10px] font-black text-accent ml-auto">✓ 정답</span>
                )}
              </div>
              <p className="text-sm font-medium leading-relaxed text-foreground">
                {selectedWord.clue}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clues panel */}
        <CrosswordClues
          words={puzzle.words}
          selectedWordId={selectedWordId}
          correctWords={correctWords}
          clueTab={clueTab}
          onTabChange={setClueTab}
          onSelectWord={id => {
            const w = wordMap.get(id);
            if (!w) return;
            setSelectedWordId(id);
            setActiveCell({ row: w.startRow, col: w.startCol });
            setClueTab(w.direction === "across" ? "across" : "down");
            inputRef.current?.focus();
          }}
        />
      </main>

      {/* ── Completion overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showComplete && (
          <CompletionOverlay
            puzzle={puzzle}
            elapsedSeconds={elapsedSeconds}
            onClose={() => setShowComplete(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
