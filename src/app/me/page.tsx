"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getMyHistory, QuizResult } from "@/services/scoreService";
import { motion } from "framer-motion";
import { Trophy, Home, Calendar, TrendingUp, CheckCircle2, XCircle, ChevronLeft } from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  DAILY: "데일리", NATION: "시사", WORLD: "국제", IT: "IT", AI: "AI",
  SPORTS: "스포츠", ENTERTAINMENT: "연예", KPOP: "K-pop",
  JEJU: "제주", PERSON: "인물", POLITICS: "정치", TRAVEL: "여행", REGION: "지역",
};

type Period = "7" | "30" | "all";

export default function MePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<QuizResult[]>([]);
  const [fetching, setFetching] = useState(true);
  const [period, setPeriod] = useState<Period>("30");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      getMyHistory(user.uid).then(data => {
        setHistory(data);
        setFetching(false);
      });
    }
  }, [user]);

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
    </div>
  );

  // 기간 필터
  const now = new Date();
  const filtered = history.filter(r => {
    if (period === "all") return true;
    const days = parseInt(period);
    const diff = (now.getTime() - new Date(r.completed_at).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= days;
  });

  // 통계 계산
  const totalGames = filtered.length;
  const totalCorrect = filtered.reduce((s, r) => s + r.score, 0);
  const totalQuestions = filtered.reduce((s, r) => s + r.total, 0);
  const totalPoints = filtered.reduce((s, r) => s + r.points_earned, 0);
  const avgPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // 카테고리별 통계
  const byCat: Record<string, { games: number; correct: number; total: number }> = {};
  filtered.forEach(r => {
    if (!byCat[r.category]) byCat[r.category] = { games: 0, correct: 0, total: 0 };
    byCat[r.category].games++;
    byCat[r.category].correct += r.score;
    byCat[r.category].total += r.total;
  });

  // 날짜별 그룹
  const byDate: Record<string, QuizResult[]> = {};
  filtered.forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  });
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push("/")} className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black">나의 퀴즈 기록</h1>
            <p className="text-sm text-muted-foreground">{profile?.nickname}</p>
          </div>
          <div className="ml-auto bg-card border border-border px-4 py-2 rounded-2xl flex items-center gap-2">
            <Trophy className="w-4 h-4 text-secondary" />
            <span className="font-black text-sm">{(profile?.inventory?.golden_tickets || 0).toLocaleString()} pts</span>
          </div>
        </div>

        {/* 기간 필터 */}
        <div className="flex gap-2 mb-6">
          {([["7", "7일"], ["30", "30일"], ["all", "전체"]] as [Period, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setPeriod(v)}
              className={`px-4 py-2 rounded-2xl text-sm font-black transition-all ${period === v ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:border-primary/40"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 요약 통계 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border border-border rounded-3xl p-5">
            <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">총 게임</p>
            <p className="text-3xl font-black text-primary">{totalGames}</p>
          </div>
          <div className="bg-card border border-border rounded-3xl p-5">
            <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">평균 정답률</p>
            <p className="text-3xl font-black text-primary">{avgPct}%</p>
          </div>
          <div className="bg-card border border-border rounded-3xl p-5">
            <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">총 정답</p>
            <p className="text-3xl font-black text-accent">{totalCorrect}</p>
          </div>
          <div className="bg-card border border-border rounded-3xl p-5">
            <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">획득 포인트</p>
            <p className="text-3xl font-black text-secondary">+{totalPoints}</p>
          </div>
        </div>

        {/* 카테고리별 성적 */}
        {Object.keys(byCat).length > 0 && (
          <div className="bg-card border border-border rounded-3xl p-5 mb-6">
            <h2 className="text-sm font-black mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> 카테고리별 성적
            </h2>
            <div className="space-y-3">
              {Object.entries(byCat).sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total)).map(([cat, stat]) => {
                const pct = Math.round((stat.correct / stat.total) * 100);
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black">{CATEGORY_LABEL[cat] || cat}</span>
                      <span className="text-xs font-black text-primary">{stat.correct}/{stat.total} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className={`h-1.5 rounded-full ${pct >= 80 ? "bg-accent" : pct >= 60 ? "bg-primary" : "bg-destructive"}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 날짜별 기록 */}
        <div>
          <h2 className="text-sm font-black mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> 날짜별 기록
          </h2>
          {sortedDates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="font-bold">아직 기록이 없습니다</p>
              <p className="text-sm mt-1">퀴즈를 풀면 여기에 기록됩니다</p>
              <button onClick={() => router.push("/quiz/daily")} className="mt-4 bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm">
                오늘의 퀴즈 도전하기
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDates.map(date => (
                <div key={date} className="bg-card border border-border rounded-3xl overflow-hidden">
                  <div className="px-5 py-3 bg-muted/30 border-b border-border">
                    <span className="text-xs font-black text-muted-foreground">{date}</span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {byDate[date].map((r, i) => {
                      const grade = r.pct >= 90 ? "S" : r.pct >= 70 ? "A" : r.pct >= 50 ? "B" : r.pct >= 30 ? "C" : "F";
                      return (
                        <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                          <div className={`w-8 h-8 rounded-2xl flex items-center justify-center font-black text-sm ${r.pct >= 70 ? "bg-accent/20 text-accent" : r.pct >= 50 ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
                            {grade}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-black">{CATEGORY_LABEL[r.category] || r.category}</p>
                            <p className="text-xs text-muted-foreground">{r.score}/{r.total} 정답 · {r.pct}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-accent">+{r.points_earned}</p>
                            <p className="text-[10px] text-muted-foreground">pts</p>
                          </div>
                          {r.pct === 100
                            ? <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                            : r.pct >= 70
                              ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                              : <XCircle className="w-4 h-4 text-destructive/40 shrink-0" />
                          }
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <button onClick={() => router.push("/")} className="w-full bg-card border border-border py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-muted-foreground">
            <Home className="w-4 h-4" /> 메인으로
          </button>
        </div>
      </div>
    </div>
  );
}
