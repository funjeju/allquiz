"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { QuizGenerationOutput } from "@/lib/schemas";
import { getQuizzesByCategory, getQuizDataByDate } from "@/services/quizService";
import { saveQuizResult, calcPoints } from "@/services/scoreService";
import { motion } from "framer-motion";
import {
  Trophy, AlertCircle, Home, Share2, Zap,
  CheckCircle2, XCircle, ExternalLink, BookOpen,
  ChevronDown, ChevronUp, History,
} from "lucide-react";
import { ReportButton } from "@/components/ReportModal";

const CATEGORY_LABELS: Record<string, string> = {
  NATION: "시사/종합", WORLD: "국제뉴스", IT: "IT/테크", AI: "인공지능",
  SPORTS: "스포츠", ENTERTAINMENT: "연예", KPOP: "K-pop",
  JEJU: "제주 특화", PERSON: "히어로/인물", POLITICS: "정치",
  TRAVEL: "여행", REGION: "지역",
};

type GameState = "READY" | "PLAYING" | "FEEDBACK" | "RESULT" | "REVIEW";

export default function QuizPlayPage() {
  const { category } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();

  const pastDate = searchParams.get("date");
  const isPastMode = !!pastDate;

  const [questions, setQuestions] = useState<QuizGenerationOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<GameState>("READY");
  const [current, setCurrent] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<{ correct: boolean; selected: string }[]>([]);
  const [expandedReview, setExpandedReview] = useState<number | null>(null);

  const currentRef = useRef(0);
  const questionsRef = useRef<QuizGenerationOutput[]>([]);
  const scoreRef = useRef(0);

  useEffect(() => {
    const fetchFn = isPastMode && pastDate
      ? getQuizDataByDate(pastDate).then(r => r.data[category as string] ?? [])
      : getQuizzesByCategory(category as string);
    fetchFn.then(data => {
      setQuestions(data);
      questionsRef.current = data;
      setLoading(false);
    });
  }, [category, isPastMode, pastDate]);

  const getTargetQuiz = (q: QuizGenerationOutput) => {
    const isTeen = profile?.demographics?.age_range === "10대";
    return isTeen ? q.quizzes.teen : q.quizzes.adult;
  };

  const handleAnswer = (option: string) => {
    if (gameState !== "PLAYING") return;
    const q = questionsRef.current[currentRef.current];
    const tq = getTargetQuiz(q);
    const correct = option.trim() === tq.answer.trim();

    setSelectedOption(option);
    setIsCorrect(correct);
    if (correct) { setScore(s => { scoreRef.current = s + 1; return s + 1; }); }
    setAnswers(prev => [...prev, { correct, selected: option }]);
    setGameState("FEEDBACK");

    setTimeout(() => {
      const nextIdx = currentRef.current + 1;
      if (nextIdx >= questionsRef.current.length) {
        const finalScore = scoreRef.current;
        const total = questionsRef.current.length;
        if (user && profile && !isPastMode) {
          const kstDate = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
          }).format(new Date());
          saveQuizResult({
            uid: user.uid,
            nickname: profile.nickname,
            date: kstDate,
            category: category as string,
            score: finalScore,
            total,
            pct: Math.round((finalScore / total) * 100),
            points_earned: calcPoints(finalScore, total),
          });
        }
        setGameState("RESULT");
      } else {
        currentRef.current = nextIdx;
        setCurrent(nextIdx);
        setSelectedOption(null);
        setIsCorrect(null);
        setGameState("PLAYING");
      }
    }, 1800);
  };

  const catLabel = CATEGORY_LABELS[category as string] || (category as string);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Zap className="w-12 h-12 text-primary animate-pulse" />
      <p className="font-black text-primary uppercase tracking-widest animate-pulse">Loading...</p>
    </div>
  );

  if (questions.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-black mb-2">준비된 문제가 없습니다</h2>
      <p className="text-muted-foreground mb-8 font-medium">현재 이 카테고리에 오늘의 문제가 없습니다.<br />잠시 후 다시 시도해주세요.</p>
      <button onClick={() => router.push("/")} className="bg-primary text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2">
        <Home className="w-5 h-5" /> 메인으로
      </button>
    </div>
  );

  // READY
  if (gameState === "READY") return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full text-center">
        <div className="bg-card border-2 border-primary/20 p-10 rounded-[48px] shadow-2xl">
          <Zap className="w-16 h-16 text-primary mx-auto mb-6" />
          <p className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-2">{catLabel} BATTLE</p>
          <h2 className="text-3xl font-black mb-4 leading-tight">준비되셨나요?</h2>
          {isPastMode && (
            <div className="flex items-center justify-center gap-2 bg-muted text-muted-foreground text-xs font-black px-4 py-2 rounded-full mb-6">
              <History className="w-3.5 h-3.5" /> 과거 퀴즈 · {pastDate} · 랭킹 반영 없음
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-8 text-left">
            <div className="bg-muted/50 p-4 rounded-2xl border border-border">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">문제 수</p>
              <p className="text-2xl font-black text-primary">{questions.length}문제</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-2xl border border-border">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">카테고리</p>
              <p className="text-lg font-black text-primary">{catLabel}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setGameState("PLAYING")}
            className="w-full bg-primary text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-primary/30"
          >
            ENTER ARENA
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
          <div className="bg-card border-2 border-primary/30 p-10 rounded-[48px] shadow-2xl text-center">
            <Trophy className={`w-20 h-20 mx-auto mb-4 ${pct >= 60 ? "text-secondary drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" : "text-muted-foreground/30"}`} />
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Battle Analysis Result</p>
            <div className="text-7xl font-black tracking-tighter mb-1">{grade}</div>
            <div className="text-2xl font-black text-primary mb-6">{score} / {questions.length}문제 정답</div>

            <div className="flex justify-center gap-1.5 flex-wrap mb-8">
              {answers.map((a, i) => (
                <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${a.correct ? "bg-accent/20 text-accent border border-accent/30" : "bg-destructive/20 text-destructive border border-destructive/30"}`}>
                  {i + 1}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-muted/50 p-4 rounded-2xl border border-border">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">정답률</p>
                <p className="text-2xl font-black text-primary">{pct}%</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-2xl border border-border">
                <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">획득 포인트</p>
                <p className="text-2xl font-black text-accent">+{calcPoints(score, questions.length)} pts</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setGameState("REVIEW")}
                className="w-full bg-primary text-white py-5 rounded-2xl font-black flex items-center justify-center gap-2"
              >
                <BookOpen className="w-5 h-5" /> 전체 정답 & 해설 보기
              </button>
              <button
                onClick={() => window.alert("카카오톡 공유 준비 중입니다!")}
                className="w-full bg-secondary text-secondary-foreground py-4 rounded-2xl font-black flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> 나를 도발해봐 (카톡 공유)
              </button>
              <button onClick={() => router.push("/")} className="w-full bg-card border border-border py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-muted-foreground">
                <Home className="w-4 h-4" /> 배틀룸 나가기
              </button>
            </div>
          </div>
          <p className="mt-6 text-xs font-bold text-muted-foreground italic text-center">"모든 유행은 여기서 시작된다, Rank & Quiz"</p>
        </motion.div>
      </div>
    );
  }

  // REVIEW
  if (gameState === "REVIEW") {
    return (
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
              const tq = getTargetQuiz(item);
              const userAnswer = answers[i];
              const isOpen = expandedReview === i;

              return (
                <div key={i} className={`bg-card border-2 rounded-3xl overflow-hidden ${userAnswer?.correct ? "border-accent/30" : "border-destructive/30"}`}>
                  <button
                    onClick={() => setExpandedReview(isOpen ? null : i)}
                    className="w-full flex items-start gap-4 p-5 text-left"
                  >
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${userAnswer?.correct ? "bg-accent/20 text-accent" : "bg-destructive/20 text-destructive"}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {userAnswer?.correct
                          ? <span className="text-[10px] font-black text-accent">정답</span>
                          : <span className="text-[10px] font-black text-destructive">오답 · 정답: {tq.answer}</span>
                        }
                      </div>
                      <p className="text-sm font-bold leading-snug line-clamp-2">{tq.question}</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
                  </button>

                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="border-t border-border/50 px-5 pb-5 pt-4 space-y-4"
                    >
                      <div className="space-y-2">
                        {tq.options.map((opt, oi) => (
                          <div key={oi} className={`text-sm px-4 py-2.5 rounded-2xl font-medium flex items-center gap-2 ${
                            opt.trim() === tq.answer.trim()
                              ? "bg-accent/15 text-accent border border-accent/30 font-black"
                              : opt === userAnswer?.selected && !userAnswer?.correct
                                ? "bg-destructive/10 text-destructive border border-destructive/20"
                                : "bg-muted/40 border border-border"
                          }`}>
                            {opt.trim() === tq.answer.trim() && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                            {opt === userAnswer?.selected && !userAnswer?.correct && <XCircle className="w-4 h-4 shrink-0" />}
                            {opt}
                          </div>
                        ))}
                      </div>

                      <div className="bg-muted/30 rounded-2xl p-4 space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase">팩트</p>
                        <p className="text-sm font-medium">{item.base_fact}</p>
                        {item.explanation?.correct && (
                          <>
                            <p className="text-[10px] font-black text-muted-foreground uppercase mt-3">해설</p>
                            <p className="text-sm text-muted-foreground">{item.explanation.correct}</p>
                          </>
                        )}
                      </div>

                      {item.source_url && (
                        <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs font-black text-primary hover:underline">
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
  }

  // PLAYING / FEEDBACK
  const currentItem = questions[current];
  const currentQuiz = getTargetQuiz(currentItem);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* 진행바 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">{catLabel}</span>
            <span className="text-sm font-black text-primary">{current + 1} / {questions.length}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <motion.div
              className="bg-primary h-2 rounded-full"
              animate={{ width: `${((current + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* 질문 카드 */}
        <motion.div key={current} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.25 }}>
          <div className="bg-card border border-border p-8 rounded-[40px] shadow-xl mb-3 relative min-h-[120px] flex items-center">
            <p className="text-xl font-black leading-snug">{currentQuiz.question}</p>
            {gameState === "FEEDBACK" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-card/90 backdrop-blur-sm rounded-[40px]"
              >
                {isCorrect ? (
                  <div className="flex flex-col items-center gap-2 text-accent">
                    <CheckCircle2 className="w-16 h-16" />
                    <span className="text-xl font-black">정답!</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-destructive text-center">
                    <XCircle className="w-16 h-16" />
                    <span className="text-xl font-black">오답</span>
                    <p className="text-sm font-bold bg-destructive/10 px-4 py-2 rounded-2xl">
                      정답: <span className="text-accent">{currentQuiz.answer}</span>
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* 출처: 답 선택 후(FEEDBACK)에만 표시 — 힌트 방지 */}
          <div className="mb-4 px-2 flex items-center justify-between gap-2">
            {gameState === "FEEDBACK" && currentItem.source_url ? (
              <a href={currentItem.source_url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 font-bold truncate">
                <ExternalLink className="w-3 h-3 shrink-0" />
                {currentItem.base_fact}
              </a>
            ) : <span />}
            <ReportButton
              date={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())}
              category={category as string}
              baseFact={currentItem.base_fact}
              sourceUrl={currentItem.source_url || ""}
              question={currentQuiz.question}
            />
          </div>

          {/* 선택지 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentQuiz.options.map((opt, i) => (
              <motion.button
                key={i}
                whileHover={gameState === "PLAYING" ? { y: -3 } : {}}
                whileTap={gameState === "PLAYING" ? { scale: 0.98 } : {}}
                disabled={gameState === "FEEDBACK"}
                onClick={() => handleAnswer(opt)}
                className={`p-5 rounded-3xl border-2 text-left transition-all ${
                  gameState === "FEEDBACK" && opt === currentQuiz.answer
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

        {/* 점수 */}
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
