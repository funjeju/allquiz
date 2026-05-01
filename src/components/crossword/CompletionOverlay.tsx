"use client";

import { motion } from "framer-motion";
import { Share2, X, Trophy } from "lucide-react";
import { CrosswordPuzzle } from "@/lib/crossword";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Props {
  puzzle: CrosswordPuzzle;
  elapsedSeconds: number;
  onClose: () => void;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}분 ${s % 60}초` : `${s}초`;
}

// Confetti particle
function Particle({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm pointer-events-none"
      style={{ backgroundColor: color, left: `${x}%`, top: 0 }}
      initial={{ y: -20, opacity: 1, rotate: 0, scale: 1 }}
      animate={{
        y: ["0%", "120vh"],
        opacity: [1, 1, 0],
        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
        x: [`0px`, `${(Math.random() - 0.5) * 120}px`],
      }}
      transition={{ duration: 2 + Math.random(), delay, ease: "easeIn" }}
    />
  );
}

const COLORS = ["#a855f7", "#22c55e", "#eab308", "#3b82f6", "#f43f5e", "#8b5cf6"];
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  delay: Math.random() * 0.6,
  x: Math.random() * 100,
  color: COLORS[i % COLORS.length],
}));

export function CompletionOverlay({ puzzle, elapsedSeconds, onClose }: Props) {
  const timeStr = formatTime(elapsedSeconds);
  const dateLabel = format(new Date(puzzle.date.replace(/-/g, "/")), "M월 d일", { locale: ko });

  const handleShare = async () => {
    const text = [
      `📰 오늘의 뉴스 낱말퀴즈 완성!`,
      `🗓 ${dateLabel}   🕐 ${timeStr}`,
      `단어 ${puzzle.words.length}개 전부 맞췄어요`,
      ``,
      `https://allquiz.vercel.app/crossword`,
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        alert("클립보드에 복사되었습니다!");
      }
    } catch {
      // user cancelled share — no-op
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-background/75 backdrop-blur-md"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map(p => (
          <Particle key={p.id} delay={p.delay} x={p.x} color={p.color} />
        ))}
      </div>

      {/* Sheet */}
      <motion.div
        className="relative w-full max-w-sm bg-card border border-border/60 rounded-3xl p-6 shadow-2xl shadow-black/30"
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Trophy icon */}
        <div className="flex justify-center mb-5">
          <motion.div
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.25)]"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          >
            <Trophy className="w-10 h-10 text-primary" />
          </motion.div>
        </div>

        {/* Title */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-3xl font-black text-foreground mb-1">완성!</h2>
          <p className="text-sm text-muted-foreground">
            {dateLabel} 낱말퀴즈 — 단어 {puzzle.words.length}개 완파
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 gap-3 mb-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="bg-muted rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-foreground tabular-nums">{timeStr}</div>
            <div className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mt-1">완성 시간</div>
          </div>
          <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/15 rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-accent tabular-nums">{puzzle.words.length}</div>
            <div className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mt-1">단어 완성</div>
          </div>
        </motion.div>

        {/* Share button */}
        <motion.button
          onClick={handleShare}
          whileHover={{ scale: 1.02, boxShadow: "0 8px 30px rgba(139,92,246,0.35)" }}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-2.5 bg-primary text-primary-foreground py-4 rounded-2xl font-black text-base shadow-lg shadow-primary/25"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Share2 className="w-5 h-5" />
          결과 공유하기
        </motion.button>

        <motion.button
          onClick={onClose}
          className="w-full mt-2 py-3 text-sm text-muted-foreground font-bold hover:text-foreground transition-colors"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          닫기
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
