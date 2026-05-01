"use client";

import { useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CrosswordPuzzle } from "@/lib/crossword";

interface Props {
  puzzle: CrosswordPuzzle;
  userGrid: string[][];
  selectedWordId: string | null;
  activeCell: { row: number; col: number } | null;
  correctWords: Set<string>;
  onCellClick: (row: number, col: number) => void;
}

export function CrosswordGrid({
  puzzle,
  userGrid,
  selectedWordId,
  activeCell,
  correctWords,
  onCellClick,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Scroll active cell into view on mobile
  useEffect(() => {
    if (!activeCell || !gridRef.current) return;
    const el = gridRef.current.querySelector(
      `[data-cell="${activeCell.row}-${activeCell.col}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeCell]);

  // Compute which cells belong to the currently selected word
  const selectedCells = useMemo(() => {
    if (!selectedWordId) return new Set<string>();
    const word = puzzle.words.find(w => w.id === selectedWordId);
    if (!word) return new Set<string>();
    const dr = word.direction === "down" ? 1 : 0;
    const dc = word.direction === "across" ? 1 : 0;
    const s = new Set<string>();
    [...word.word].forEach((_, i) =>
      s.add(`${word.startRow + dr * i},${word.startCol + dc * i}`)
    );
    return s;
  }, [selectedWordId, puzzle.words]);

  // Compute which cells belong to any correctly solved word
  const correctCells = useMemo(() => {
    const s = new Set<string>();
    for (const word of puzzle.words) {
      if (!correctWords.has(word.id)) continue;
      const dr = word.direction === "down" ? 1 : 0;
      const dc = word.direction === "across" ? 1 : 0;
      [...word.word].forEach((_, i) =>
        s.add(`${word.startRow + dr * i},${word.startCol + dc * i}`)
      );
    }
    return s;
  }, [correctWords, puzzle.words]);

  return (
    <div className="flex justify-center w-full">
      <div
        ref={gridRef}
        className="rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-black/20 w-full"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${puzzle.cols}, 1fr)`,
          maxWidth: Math.min(520, puzzle.cols * 44),
          margin: "0 auto",
        }}
      >
        {puzzle.grid.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`;
            const isActive = activeCell?.row === r && activeCell?.col === c;
            const inWord = selectedCells.has(key);
            const isCorrect = correctCells.has(key);
            const letter = userGrid[r]?.[c] ?? "";

            if (cell.isBlocked) {
              return (
                <div
                  key={key}
                  className="bg-foreground/85 dark:bg-foreground/70"
                  style={{ aspectRatio: "1" }}
                />
              );
            }

            return (
              <motion.button
                key={key}
                data-cell={`${r}-${c}`}
                onClick={() => onCellClick(r, c)}
                whileTap={{ scale: 0.88 }}
                className={[
                  "relative flex items-center justify-center border select-none cursor-pointer",
                  "transition-colors duration-100",
                  isActive
                    ? "bg-primary/25 border-primary/60 z-10 ring-1 ring-primary/40 ring-inset"
                    : isCorrect
                    ? "bg-accent/10 border-accent/25"
                    : inWord
                    ? "bg-primary/8 border-primary/15"
                    : "bg-card border-border/30 hover:bg-muted/60",
                ].join(" ")}
                style={{ aspectRatio: "1" }}
              >
                {/* Clue number */}
                {cell.number !== undefined && (
                  <span
                    className="absolute top-px left-px font-black text-muted-foreground/70 leading-none pointer-events-none"
                    style={{ fontSize: "clamp(6px, 1.5vw, 9px)" }}
                  >
                    {cell.number}
                  </span>
                )}

                {/* User letter */}
                <AnimatePresence mode="wait">
                  {letter ? (
                    <motion.span
                      key={`${key}-${letter}`}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 28 }}
                      className={[
                        "font-black leading-none pointer-events-none select-none",
                        isCorrect
                          ? "text-accent"
                          : isActive
                          ? "text-primary"
                          : "text-foreground",
                      ].join(" ")}
                      style={{ fontSize: "clamp(11px, 3.8vw, 22px)" }}
                    >
                      {letter}
                    </motion.span>
                  ) : isActive ? (
                    /* Blinking cursor when active and empty */
                    <motion.div
                      key="cursor"
                      className="w-px bg-primary rounded-full"
                      style={{ height: "55%" }}
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut" }}
                    />
                  ) : null}
                </AnimatePresence>

                {/* Correct word subtle glow */}
                {isCorrect && (
                  <motion.div
                    className="absolute inset-0 bg-accent/5 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                )}
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
