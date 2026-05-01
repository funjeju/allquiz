"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { PlacedWord } from "@/lib/crossword";

interface Props {
  words: PlacedWord[];
  selectedWordId: string | null;
  correctWords: Set<string>;
  clueTab: "across" | "down";
  onTabChange: (tab: "across" | "down") => void;
  onSelectWord: (id: string) => void;
}

export function CrosswordClues({
  words,
  selectedWordId,
  correctWords,
  clueTab,
  onTabChange,
  onSelectWord,
}: Props) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedWordId]);

  const acrossWords = words.filter(w => w.direction === "across").sort((a, b) => a.number - b.number);
  const downWords = words.filter(w => w.direction === "down").sort((a, b) => a.number - b.number);
  const displayed = clueTab === "across" ? acrossWords : downWords;

  const acrossDone = acrossWords.filter(w => correctWords.has(w.id)).length;
  const downDone = downWords.filter(w => correctWords.has(w.id)).length;

  return (
    <div className="mt-2">
      {/* Tab bar */}
      <div className="flex bg-muted rounded-2xl p-1 gap-1 mb-3">
        {(["across", "down"] as const).map(tab => {
          const label = tab === "across" ? "가로" : "세로";
          const total = tab === "across" ? acrossWords.length : downWords.length;
          const done = tab === "across" ? acrossDone : downDone;
          const active = clueTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={[
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all duration-200",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
              <span
                className={[
                  "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                  done === total
                    ? "bg-accent/20 text-accent"
                    : active
                    ? "bg-primary/10 text-primary"
                    : "bg-border text-muted-foreground",
                ].join(" ")}
              >
                {done}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Clue list */}
      <div className="max-h-60 overflow-y-auto rounded-2xl space-y-px scroll-smooth">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={clueTab}
            initial={{ opacity: 0, x: clueTab === "across" ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-px"
          >
            {displayed.map(word => {
              const isSelected = word.id === selectedWordId;
              const isCorrect = correctWords.has(word.id);
              const label = `${word.number}${clueTab === "across" ? "가" : "세"}`;

              return (
                <motion.button
                  key={word.id}
                  ref={isSelected ? (selectedRef as React.RefObject<HTMLButtonElement>) : null}
                  onClick={() => onSelectWord(word.id)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.985 }}
                  className={[
                    "w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
                    isSelected
                      ? "bg-primary/10 ring-1 ring-primary/20"
                      : isCorrect
                      ? "opacity-50 hover:opacity-70"
                      : "hover:bg-muted",
                  ].join(" ")}
                >
                  {/* Number badge */}
                  <span
                    className={[
                      "shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-md mt-0.5 tabular-nums",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isCorrect
                        ? "bg-accent/15 text-accent"
                        : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {label}
                  </span>

                  {/* Clue text */}
                  <span
                    className={[
                      "text-xs leading-relaxed flex-1",
                      isSelected ? "text-foreground font-medium" : "text-muted-foreground",
                      isCorrect ? "line-through" : "",
                    ].join(" ")}
                  >
                    {word.clue}
                  </span>

                  {/* Correct checkmark */}
                  {isCorrect && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
