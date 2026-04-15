"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";

interface FeedbackOverlayProps {
  type: "correct" | "incorrect" | null;
}

export function FeedbackOverlay({ type }: FeedbackOverlayProps) {
  return (
    <AnimatePresence>
      {type && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {type === "correct" ? (
            <motion.div
              initial={{ rotate: -20 }}
              animate={{ rotate: 0 }}
              className="bg-accent/20 backdrop-blur-sm p-12 rounded-full border-4 border-accent shadow-[0_0_50px_rgba(34,197,94,0.3)]"
            >
              <CheckCircle2 className="w-32 h-32 text-accent" />
            </motion.div>
          ) : (
            <motion.div
              initial={{ x: -20 }}
              animate={{ x: 0 }}
              className="bg-destructive/20 backdrop-blur-sm p-12 rounded-full border-4 border-destructive shadow-[0_0_50px_rgba(239,68,68,0.3)]"
            >
              <XCircle className="w-32 h-32 text-destructive" />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
