"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getStoredWeeklyQuiz, getWeeklyQuizKey } from "@/services/quizService";
import { QuizGenerationOutput } from "@/lib/schemas";
import { motion } from "framer-motion";
import {
  Trophy, Zap, Home, CheckCircle2, XCircle,
  ExternalLink, BookOpen, ChevronDown, ChevronUp, CalendarDays,
} from "lucide-react";
import { ReportButton } from "@/components/ReportModal";

type QuizItem = { quiz: QuizGenerationOutput; category: string };
type GameState = "READY" | "PLAYING" | "FEEDBACK" | "RESULT" | "REVIEW";

const CATEGORY_COLOR: Record<string, string> = {
  IT: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  AI: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  WORLD: "bg-green-500/10 text-green-400 border-green-500/20",
  NATION: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  SPORTS: "bg-red-500/10 text-red-400 border-red-500/20",
  ENTERTAINMENT: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  KPOP: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  JEJU: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  PERSON: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  POLITICS: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

function getKSTDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export default function WeeklyQuizPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [questions, setQuestions] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<GameState>("READY");
  const [current, setCurrent] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<{ correct: boolean; selected: string }[]>([]);
  const [expandedReview, setExpandedReview] = useState<number | null>(null);

  const currentRef = useRef(0);
  const questionsRef = useRef<QuizItem[]>([]);
  const scoreRef = useRef(0);
  const kstDate = getKSTDate();

  useEffect(() => {
    getStoredWeeklyQuiz().then(data => {
      const list = data ?? [];
      setQuestions(list);
      questionsRef.current = list;
      setLoading(false);
    });
  }, []);

  const getQuiz = (item: QuizItem) => {
    const isTeen = profile?.demographics?.age_range === "10대";
    return isTeen ? item.quiz.quizzes.teen : item.quiz.quizzes.adult;
  };

  const handleAnswer = (option: string) => {
    if (gameState !== "PLAYING") return;
    const quiz = getQuiz(questionsRef.current[currentRef.current]);
    const correct = option.trim() === quiz.answer.trim();

    setSelectedOption(option);
    setIsCorrect(correct);
    if (correct) setScore(s => { scoreRef.current = s + 1; return s + 1; });
    setAnswers(prev => [...prev, { correct, selected: option }]);
    setGameState("FEEDBACK");

    setTimeout(() => {
      const nextIdx = currentRef.current + 1;
      if (nextIdx >= questionsRef.current.length) {
        setGameState("RESULT");
      } else {
        currentRef.current = nextIdx;
        setCurrent(nextIdx);
        setSelectedOption(null);
        setIsCorrect(null);
        setGameState("PLAYING");
      }
    }, 1500);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <CalendarDays className="w-12 h-12 text-primary animate-pulse" />
      <p className="font-black text-primary uppercase tracking-widest animate-pulse">Loading Weekly Quiz...</p>
    </div>
  );

  if (questions.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-6">
      <CalendarDays className="w-16 h-16 text-muted-foreground" />
      <h2 className="text-2xl font-black">Weekly Quiz 준비 중</h2>
      <p className="text-muted-foreground">지난주 퀴즈가 아직 생성되지 않았습니다.<br />매주 월요일에 자동으로 생성됩니다.</p>
      <button onClick={() => router.push("/")} className="bg-primary text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2">
        <Home className="w-5 h-5" /> 메인으로
      </button>
    </div>
  );

  const weekKey = getWeeklyQuizKey();

  // READY
  if (gameState === "READY") return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full">
        <div className="bg-card border-2 border-primary/20 p-8 rounded-[48px] shadow-2xl text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-5">
            <CalendarDays className="w-4 h-4" /> Weekly Quiz
          </div>
          <h1 className="text-4xl font-black mb-1 tracking-tighter">Weekly Quiz</h1>
          <p className="text-muted-foreground font-medium mb-6">{weekKey} 주간 뉴스 퀴즈 모음</p>
          <div className="grid grid-cols-2 gap-3 mb-6 text-left">
            <div className="bg-muted/50 p-4 rounded-2xl border border-border">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">문제 수</p>
              <p className="text-2xl font-black text-primary">{questions.length}문제</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-2xl border border-border">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">기간</p>
              <p className="text-sm font-black text-primary">지난주 Daily</p>
            </div>
          </div>
          <div className="bg-muted/30 rounded-2xl px-4 py-3 mb-6 text-xs text-muted-foreground font-medium">
            랭킹 반영 없음 · Practice Mode
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setGameState("PLAYING")}
            className="w-full bg-primary text-white py-5 rounded-3xl font-black text-xl shadow-2xl shadow-primary/30"
          >
            시작하기
          </motion.button>
        </div>
      </motion.div>
    </div>
  );

  // RESULT
  if (gameState === "RESULT") {
    const pct = Math.round((score / questions.length) * 100);
    const grade = pct >= 90 ? "S" : pct >= 70 ? "A" : pct >= 50 ? "B" : pct >= 30 ? "C" : "F";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full">
          <div className="bg-card border-2 border-primary/30 p-8 rounded-[48px] shadow-2xl text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">
              <CalendarDays className="w-4 h-4" /> Weekly Result
            </div>
            <Trophy className={`w-16 h-16 mx-auto mb-3 ${pct >= 60 ? "text-secondary drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" : "text-muted-foreground/30"}`} />
            <div className="text-6xl font-black tracking-tighter mb-1">{grade}</div>
            <div className="text-xl font-black text-primary mb-6">{score} / {questions.length}문제 정답 · {pct}%</div>
            <div className="flex justify-center gap-1 flex-wrap mb-6">
              {answers.map((a, i) => (
                <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black ${a.correct ? "bg-accent/20 text-accent border border-accent/30" : "bg-destructive/20 text-destructive border border-destructive/30"}`}>
                  {i + 1}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => setGameState("REVIEW")} className="w-full bg-primary text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2">
                <BookOpen className="w-4 h-4" /> 전체 정답 & 해설
              </button>
              <button onClick={() => router.push("/")} className="w-full bg-card border border-border py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Home className="w-4 h-4" /> 메인으로
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // REVIEW
  if (gameState === "REVIEW") return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black">전체 정답 & 해설</h1>
            <p className="text-sm text-muted-foreground mt-1">{score}/{questions.length} 정답 · {Math.round((score / questions.length) * 100)}%</p>
          </div>
          <button onClick={() => router.push("/")} className="bg-card border border-border px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2">
            <Home className="w-4 h-4" /> 메인
          </button>
        </div>
        <div className="space-y-4">
          {questions.map((item, i) => {
            const quiz = getQuiz(item);
            const userAnswer = answers[i];
            const isOpen = expandedReview === i;
            const catColor = CATEGORY_COLOR[item.category] || "bg-primary/10 text-primary border-primary/20";
            return (
              <div key={i} className={`bg-card border-2 rounded-3xl overflow-hidden ${userAnswer?.correct ? "border-accent/30" : "border-destructive/30"}`}>
                <button onClick={() => setExpandedReview(isOpen ? null : i)} className="w-full flex items-start gap-4 p-5 text-left">
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${userAnswer?.correct ? "bg-accent/20 text-accent" : "bg-destructive/20 text-destructive"}`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${catColor}`}>{item.category}</span>
                      {userAnswer?.correct ? <span className="text-[10px] font-black text-accent">정답</span> : <span className="text-[10px] font-black text-destructive">오답</span>}
                    </div>
                    <p className="text-sm font-bold leading-snug line-clamp-2">{quiz.question}</p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
                </button>
                {isOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border-t border-border/50 px-5 pb-5 pt-4 space-y-4">
                    <div className="space-y-2">
                      {quiz.options.map((opt, oi) => (
                        <div key={oi} className={`text-sm px-4 py-2.5 rounded-2xl font-medium flex items-center gap-2 ${opt.trim() === quiz.answer.trim() ? "bg-accent/15 text-accent border border-accent/30 font-black" : opt === userAnswer?.selected && !userAnswer?.correct ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-muted/40 border border-border"}`}>
                          {opt.trim() === quiz.answer.trim() && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                          {opt === userAnswer?.selected && !userAnswer?.correct && <XCircle className="w-4 h-4 shrink-0" />}
                          {opt}
                        </div>
                      ))}
                    </div>
                    <div className="bg-muted/30 rounded-2xl p-4 space-y-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">팩트</p>
                      <p className="text-sm font-medium">{item.quiz.base_fact}</p>
                      {item.quiz.explanation?.correct && (<>
                        <p className="text-[10px] font-black text-muted-foreground uppercase mt-3">해설</p>
                        <p className="text-sm text-muted-foreground">{item.quiz.explanation.correct}</p>
                      </>)}
                    </div>
                    {item.quiz.source_url && (
                      <a href={item.quiz.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-black text-primary hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" /> 기사 원문 보기
                      </a>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-8">
          <button onClick={() => router.push("/")} className="w-full bg-primary text-white py-5 rounded-2xl font-black flex items-center justify-center gap-2">
            <Home className="w-5 h-5" /> 메인으로
          </button>
        </div>
      </div>
    </div>
  );

  // PLAYING / FEEDBACK
  const currentItem = questions[current];
  const currentQuiz = getQuiz(currentItem);
  const catColor = CATEGORY_COLOR[currentItem.category] || "bg-primary/10 text-primary border-primary/20";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Weekly Quiz</span>
            <span className="text-sm font-black text-primary">{current + 1} / {questions.length}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <motion.div className="bg-primary h-2 rounded-full" animate={{ width: `${((current + 1) / questions.length) * 100}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
        <div className="mb-3">
          <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase ${catColor}`}>{currentItem.category}</span>
        </div>
        <motion.div key={current} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.25 }}>
          <div className="bg-card border border-border p-8 rounded-[40px] shadow-xl mb-3 relative min-h-[120px] flex items-center">
            <p className="text-xl font-black leading-snug">{currentQuiz.question}</p>
            {gameState === "FEEDBACK" && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 flex items-center justify-center bg-card/90 backdrop-blur-sm rounded-[40px]">
                {isCorrect
                  ? <div className="flex flex-col items-center gap-2 text-accent"><CheckCircle2 className="w-16 h-16" /><span className="text-xl font-black">정답!</span></div>
                  : <div className="flex flex-col items-center gap-2 text-destructive text-center"><XCircle className="w-16 h-16" /><span className="text-xl font-black">오답</span><p className="text-sm font-bold bg-destructive/10 px-4 py-2 rounded-2xl">정답: <span className="text-accent">{currentQuiz.answer}</span></p></div>
                }
              </motion.div>
            )}
          </div>
          {gameState === "FEEDBACK" && currentItem.quiz.source_url && (
            <div className="mb-4 px-2 flex items-center justify-between gap-2">
              <a href={currentItem.quiz.source_url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 font-bold truncate">
                <ExternalLink className="w-3 h-3 shrink-0" />{currentItem.quiz.base_fact}
              </a>
              <ReportButton date={kstDate} category={currentItem.category} baseFact={currentItem.quiz.base_fact} sourceUrl={currentItem.quiz.source_url || ""} question={currentQuiz.question} />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentQuiz.options.map((opt, i) => (
              <motion.button
                key={i}
                whileHover={gameState === "PLAYING" ? { y: -3 } : {}}
                whileTap={gameState === "PLAYING" ? { scale: 0.98 } : {}}
                disabled={gameState === "FEEDBACK"}
                onClick={() => handleAnswer(opt)}
                className={`p-5 rounded-3xl border-2 text-left transition-all ${
                  gameState === "FEEDBACK" && opt.trim() === currentQuiz.answer.trim()
                    ? "bg-accent/10 border-accent"
                    : gameState === "FEEDBACK" && selectedOption === opt && !isCorrect
                      ? "bg-destructive/10 border-destructive"
                      : "bg-card border-border hover:border-primary/40"
                }`}
              >
                <span className="text-xs font-black text-muted-foreground block mb-1">0{i + 1}</span>
                <span className="font-bold">{opt}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
        <div className="mt-6 flex justify-end">
          <div className="bg-card border border-border px-4 py-2 rounded-2xl">
            <span className="text-xs font-black text-muted-foreground">점수 </span>
            <span className="font-black text-primary">{score}</span>
            <span className="text-xs text-muted-foreground"> / {current + 1}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
