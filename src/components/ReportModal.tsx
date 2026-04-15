"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, X, Send, CheckCircle2 } from "lucide-react";
import { reportQuiz, ReportReason } from "@/services/reportService";
import { useAuth } from "@/hooks/useAuth";

const REASONS: ReportReason[] = [
  "정답 오류",
  "사실 오류",
  "문제 수준 부적절",
  "부적절한 내용",
  "기타",
];

interface Props {
  date: string;
  category: string;
  baseFact: string;
  sourceUrl: string;
  question: string;
}

export function ReportButton(props: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!reason || !user) return;
    setSending(true);
    try {
      await reportQuiz({
        date: props.date,
        category: props.category,
        base_fact: props.baseFact,
        source_url: props.sourceUrl,
        question: props.question,
        reason,
        note,
        reported_by: user.uid,
      });
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setReason(null);
        setNote("");
      }, 1800);
    } catch {
      alert("신고 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/50 hover:text-destructive/70 transition-colors"
        title="문제 신고하기"
      >
        <Flag className="w-3 h-3" />
        신고
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              {done ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-12 h-12 text-accent mx-auto mb-3" />
                  <p className="font-black text-lg">신고가 접수됐습니다</p>
                  <p className="text-sm text-muted-foreground mt-1">검토 후 반영됩니다</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-destructive" />
                      <h3 className="font-black text-lg">문제 신고</h3>
                    </div>
                    <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground bg-muted/40 rounded-2xl p-3 mb-5 leading-relaxed line-clamp-2">
                    {props.question}
                  </p>

                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-3">신고 사유</p>
                  <div className="space-y-2 mb-5">
                    {REASONS.map(r => (
                      <button
                        key={r}
                        onClick={() => setReason(r)}
                        className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                          reason === r
                            ? "border-destructive bg-destructive/10 text-destructive"
                            : "border-border hover:border-destructive/30"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="추가 의견 (선택)"
                    rows={2}
                    className="w-full bg-muted/30 border border-border rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary mb-4"
                  />

                  <button
                    onClick={handleSubmit}
                    disabled={!reason || sending}
                    className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${
                      reason && !sending
                        ? "bg-destructive text-white hover:scale-[1.02]"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    {sending ? "전송 중..." : "신고 제출"}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
