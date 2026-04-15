"use client";

import { motion } from "framer-motion";

interface TimerBarProps {
  duration: number; // in seconds
  onTimeUp: () => void;
  isActive: boolean;
}

export function TimerBar({ duration, onTimeUp, isActive }: TimerBarProps) {
  return (
    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
      {isActive && (
        <motion.div
          initial={{ width: "100%", backgroundColor: "#10B981" }} // Initial Neon Green
          animate={{ 
            width: "0%", 
            backgroundColor: ["#10B981", "#FACC15", "#EF4444"] // Green -> Yellow -> Red
          }}
          transition={{ 
            duration: duration, 
            ease: "linear"
          }}
          onAnimationComplete={onTimeUp}
          className="h-full"
        />
      )}
    </div>
  );
}
