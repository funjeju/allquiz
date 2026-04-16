"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { CategoryCard } from "@/components/dashboard/CategoryCard";
import {
  Trophy, MapPin, Hash, Smartphone, Tv, Globe, Microscope,
  Plane, Music, User, Sword, LogOut, Landmark, Sun, Moon, LogIn, UserPlus,
  CalendarDays, CalendarRange, Zap,
} from "lucide-react";
import { logout } from "@/services/authService";
import { getCategoryCounts, getTodayQuizSummary, checkPeriodicQuizExists } from "@/services/quizService";
import { subscribeDailyBattle, BattleScore } from "@/services/scoreService";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [quizSummary, setQuizSummary] = useState<{ date: string; totalCount: number; categoryCount: number } | null>(null);
  const [battleScores, setBattleScores] = useState<BattleScore[]>([]);
  const [periodicExists, setPeriodicExists] = useState<{ weekly: boolean; monthly: boolean }>({ weekly: false, monthly: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 온보딩 미완료 시만 리다이렉트 (로그인 강제 없음)
  useEffect(() => {
    if (!loading && user && !profile?.demographics) {
      router.push("/onboarding");
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    const fetchCounts = async () => {
      const [data, summary, periodic] = await Promise.all([
        getCategoryCounts(),
        getTodayQuizSummary(),
        checkPeriodicQuizExists(),
      ]);
      setCounts(data);
      if (summary.totalCount > 0) setQuizSummary(summary);
      setPeriodicExists(periodic);
    };
    fetchCounts();

    const kstDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    const unsub = subscribeDailyBattle(kstDate, setBattleScores);
    return () => unsub();
  }, []);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const CATEGORIES = [
    { id: "NATION", name: "시사/종합", icon: <Globe />, count: counts["NATION"] || 0 },
    { id: "WORLD", name: "국제뉴스", icon: <Plane />, count: counts["WORLD"] || 0 },
    { id: "IT", name: "IT/테크", icon: <Smartphone />, count: counts["IT"] || 0 },
    { id: "AI", name: "인공지능", icon: <Microscope />, count: counts["AI"] || 0 },
    { id: "SPORTS", name: "스포츠", icon: <Hash />, count: counts["SPORTS"] || 0 },
    { id: "ENTERTAINMENT", name: "연예", icon: <Tv />, count: counts["ENTERTAINMENT"] || 0 },
    { id: "KPOP", name: "K-pop", icon: <Music />, count: counts["KPOP"] || 0 },
    { id: "JEJU", name: "제주 특화", icon: <MapPin />, count: counts["JEJU"] || 0 },
    { id: "PERSON", name: "히어로/인물", icon: <User />, count: counts["PERSON"] || 0 },
    { id: "POLITICS", name: "정치", icon: <Landmark />, count: counts["POLITICS"] || 0 },
  ];

  const handleStartQuiz = (categoryId: string) => {
    if (!user) {
      router.push("/login");
      return;
    }
    router.push(`/quiz/${categoryId}`);
  };

  const handleDailyQuiz = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    router.push("/quiz/daily");
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
    </div>
  );

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">

      {/* Header */}
      <section className="flex items-center justify-between mb-12">
        <div className="flex flex-col">
          {user && profile ? (
            <>
              <span className="text-muted-foreground text-sm font-medium">Welcome back,</span>
              <h1 className="text-2xl font-black">{profile.nickname}님</h1>
            </>
          ) : (
            <>
              <span className="text-muted-foreground text-sm font-medium">오늘의 뉴스 퀴즈</span>
              <h1 className="text-2xl font-black">Rank & Quiz</h1>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* 포인트 (로그인 시) */}
          {user && profile && (
            <div className="bg-card border border-border px-4 py-2 rounded-2xl flex items-center gap-2">
              <Trophy className="w-5 h-5 text-secondary" />
              <span className="font-bold">{(profile.inventory?.golden_tickets || 0).toLocaleString()} pts</span>
            </div>
          )}

          {/* 다크/라이트 토글 */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title={theme === "dark" ? "라이트 모드" : "다크 모드"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* 로그인 상태에 따라 다른 메뉴 */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-sm"
              >
                {profile?.nickname?.[0] || "U"}
              </button>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-12 bg-card border border-border rounded-2xl shadow-xl min-w-[160px] py-2 z-50"
                >
                  <div className="px-4 py-2 border-b border-border mb-1">
                    <p className="text-xs font-black text-muted-foreground">로그인됨</p>
                    <p className="text-sm font-bold truncate">{profile?.nickname}</p>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); router.push("/me"); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold hover:bg-muted/50 transition-colors"
                  >
                    <Trophy className="w-4 h-4 text-secondary" /> 나의 기록
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> 로그아웃
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/login")}
                className="flex items-center gap-1.5 bg-card border border-border px-4 py-2 rounded-2xl text-sm font-bold hover:border-primary/40 transition-colors"
              >
                <LogIn className="w-4 h-4" /> 로그인
              </button>
              <button
                onClick={() => router.push("/login")}
                className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-2xl text-sm font-bold shadow-lg shadow-primary/20"
              >
                <UserPlus className="w-4 h-4" /> 회원가입
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 퀴즈 업데이트 배너 */}
      {quizSummary && (
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 bg-accent/10 border border-accent/30 rounded-2xl px-5 py-3"
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
          <p className="text-sm font-bold text-accent">
            {quizSummary.date.replace(/-/g, ".")} 퀴즈 업데이트 완료
          </p>
          <span className="ml-auto text-xs font-black text-accent/70 bg-accent/10 px-3 py-1 rounded-full">
            {quizSummary.categoryCount}개 분야 · {quizSummary.totalCount}문제
          </span>
        </motion.section>
      )}

      {/* Hero — Quiz Hub */}
      <section className="relative overflow-hidden mb-12 rounded-[32px] bg-gradient-to-br from-primary to-primary/60 p-8 text-white">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <Sword className="w-4 h-4" />
            Quiz Hub
          </div>
          <h2 className="text-4xl font-black mb-2 leading-tight">Daily Quiz</h2>
          <p className="text-white/80 max-w-md mb-6 font-medium">
            어제의 뉴스를 오늘의 퀴즈로 — 전 분야 20문제로 오늘의 1위를 가려보세요.
          </p>

          {/* Daily 버튼 (풀너비) */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDailyQuiz}
            className="w-full bg-white text-primary font-black px-8 py-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 text-lg mb-3"
          >
            <Zap className="w-5 h-5 fill-primary" />
            {user ? "Daily — 대결 시작하기" : "Daily — 로그인하고 시작하기"}
          </motion.button>

          {/* Weekly / Monthly (생성된 경우에만 표시) */}
          {(periodicExists.weekly || periodicExists.monthly) && (
            <div className="flex gap-3">
              {periodicExists.weekly && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push("/quiz/weekly")}
                  className="flex-1 bg-white/20 backdrop-blur-sm text-white font-bold py-3 rounded-2xl border border-white/30 flex items-center justify-center gap-2"
                >
                  <CalendarDays className="w-4 h-4" /> Weekly
                </motion.button>
              )}
              {periodicExists.monthly && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push("/quiz/monthly")}
                  className="flex-1 bg-white/20 backdrop-blur-sm text-white font-bold py-3 rounded-2xl border border-white/30 flex items-center justify-center gap-2"
                >
                  <CalendarRange className="w-4 h-4" /> Monthly
                </motion.button>
              )}
            </div>
          )}
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="absolute right-20 bottom-0 w-32 h-32 bg-accent/20 rounded-full -mb-10 blur-2xl" />
      </section>

      {/* Categories Grid */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">카테고리 선택</h2>
          {!user && (
            <span className="text-xs text-muted-foreground font-medium bg-muted/50 px-3 py-1.5 rounded-full border border-border">
              로그인 후 플레이 가능
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat.name}
              count={cat.count}
              icon={cat.icon}
              active={cat.count > 0}
              hot={cat.count >= 8}
              onClick={() => handleStartQuiz(cat.id)}
            />
          ))}
        </div>
      </section>

      {/* 실시간 배틀 랭킹 */}
      <section className="bg-muted/50 rounded-3xl p-6 border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-secondary" />
            실시간 인기 배틀
          </h3>
          <span className="text-xs font-bold text-muted-foreground">
            {battleScores.length > 0 ? `${battleScores.length}명 참여 중` : "오늘 첫 참여자를 기다리는 중"}
          </span>
        </div>

        {battleScores.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="font-bold text-sm">아직 오늘의 참여자가 없습니다</p>
            <p className="text-xs mt-1">데일리 퀴즈를 풀면 여기에 표시됩니다</p>
            <button
              onClick={handleDailyQuiz}
              className="mt-4 bg-primary text-white px-5 py-2 rounded-2xl text-sm font-black"
            >
              지금 도전하기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {battleScores.slice(0, 5).map((s, i) => {
              const isMe = user && s.uid === user.uid;
              const rankColor = i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-muted-foreground/40";
              return (
                <div key={s.uid} className={`flex items-center justify-between p-3 rounded-2xl border ${isMe ? "bg-primary/10 border-primary/30" : "bg-card border-border/40"}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-black w-6 ${rankColor}`}>{i + 1}</span>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-black text-sm text-primary uppercase">
                      {s.nickname?.[0] || "U"}
                    </div>
                    <span className="font-bold text-sm">{isMe ? `${s.nickname} (나)` : s.nickname}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-black text-sm">{s.score}/{s.total}</p>
                    <p className="text-xs text-muted-foreground">{s.pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
