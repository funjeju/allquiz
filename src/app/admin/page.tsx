"use client";

import { useState, useEffect } from "react";
import { submitManualQuiz } from "@/services/adminService";
import { getCategoryCounts, getLatestQuizByCategory } from "@/services/quizService";
import { db } from "@/lib/firebase";
import { QuizGenerationOutput } from "@/lib/schemas";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Save, AlertCircle, PlusCircle, CheckCircle, Zap, Search, Trash2, ListChecks, Gamepad2, ExternalLink, Bot, RefreshCw, CheckCircle2, XCircle, Newspaper, ChevronRight, Eye, EyeOff } from "lucide-react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { format } from "date-fns";

export default function AdminQuizPage() {
  const { user } = useAuth();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // published monitor state
  const [publishedQuizzes, setPublishedQuizzes] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    category: "IT",
    source_url: "https://",
    base_fact: "",
    teen_question: "",
    teen_options: ["", "", "", ""],
    teen_answer: "",
    adult_question: "",
    adult_options: ["", "", "", ""],
    adult_answer: "",
    kakao_title: "",
    kakao_taunt: "",
  });

  const fetchCurrentStatus = async () => {
    const data = await getCategoryCounts();
    setCounts(data);
  };

  useEffect(() => {
    // KST 날짜 (Asia/Seoul)
    const kstDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    fetchCurrentStatus();

    // 실시간 리스너 연결
    const unsubscribe = onSnapshot(doc(db, "daily_quizzes", kstDate), (docSnap) => {
        if (docSnap.exists()) {
            const raw = docSnap.data();
            const list: any[] = [];
            Object.keys(raw).forEach(cat => {
                if (Array.isArray(raw[cat])) {
                    raw[cat].forEach((q: any) => list.push({ ...q, category: cat }));
                }
            });
            setPublishedQuizzes(list.reverse());
        }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const quizPayload: QuizGenerationOutput = {
      category: formData.category,
      source_url: formData.source_url,
      base_fact: formData.base_fact,
      quizzes: {
        teen: {
          question: formData.teen_question,
          options: formData.teen_options as [string, string, string, string],
          answer: formData.teen_answer,
        },
        adult: {
          question: formData.adult_question,
          options: formData.adult_options as [string, string, string, string],
          answer: formData.adult_answer,
        },
      },
      viral_copy: {
        kakao_title: formData.kakao_title,
        kakao_taunt: formData.kakao_taunt,
      },
      quiz_type: "MULTIPLE_CHOICE",
    };

    try {
      await submitManualQuiz(quizPayload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("출제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const updateOption = (level: "teen" | "adult", idx: number, val: string) => {
    const key = level === "teen" ? "teen_options" : "adult_options";
    const newOptions = [...formData[key]];
    newOptions[idx] = val;
    setFormData({ ...formData, [key]: newOptions });
  };

  // news fetch state
  const [newsFetchLoading, setNewsFetchLoading] = useState(false);
  const [newsFetchResults, setNewsFetchResults] = useState<any[] | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleFetchAllNews = async () => {
    setNewsFetchLoading(true);
    setNewsFetchResults(null);
    try {
      const res = await fetch("/api/admin/news/fetch-all");
      const data = await res.json();
      setNewsFetchResults(data.results);
    } catch (err) {
      alert("뉴스 수집 중 오류가 발생했습니다.");
    } finally {
      setNewsFetchLoading(false);
    }
  };

  // auto-fill state
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [autoFillResults, setAutoFillResults] = useState<any[] | null>(null);

  const handleAutoFill = async () => {
    if (!confirm("모든 카테고리의 퀴즈를 AI가 자동으로 채웁니다.\n카테고리당 최대 10문제까지 생성되며, 시간이 걸릴 수 있습니다.\n계속할까요?")) return;
    setAutoFillLoading(true);
    setAutoFillResults(null);
    try {
      const res = await fetch("/api/admin/auto-fill", { method: "POST" });
      const data = await res.json();
      setAutoFillResults(data.summary);
      fetchCurrentStatus();
    } catch (err) {
      alert("자동 채우기 중 오류가 발생했습니다.");
    } finally {
      setAutoFillLoading(false);
    }
  };

  // automation state
  const [rssList, setRssList] = useState<any[]>([]);
  const [fetchingRss, setFetchingRss] = useState(false);
  const [triggeringAuto, setTriggeringAuto] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchCounts = async () => {
      const data = await getCategoryCounts();
      setCounts(data);
    };
    fetchCounts();
  }, []);
  
  // Bulk Config State
  const [bulkConfigs, setBulkConfigs] = useState<Record<string, number>>({
    IT: 3,
    AI: 3,
    JEJU: 0,
    KPOP: 0,
    NATION: 0
  });

  const handleFetchRss = async () => {
    setFetchingRss(true);
    try {
      const res = await fetch(`/api/admin/news?category=${formData.category}`);
      const data = await res.json();
      setRssList(data);
    } catch (err) {
      alert("뉴스를 가져오는데 실패했습니다.");
    } finally {
      setFetchingRss(false);
    }
  };

  const fillWithNews = (news: { title: string; link: string; category?: string; content?: string }) => {
    setFormData(prev => ({
      ...prev,
      source_url: news.link || prev.source_url,
      base_fact: news.title || prev.base_fact,
      ...(news.category ? { category: news.category } : {}),
    }));
    // 폼 위치로 스크롤
    document.querySelector("form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const [stagedNews, setStagedNews] = useState<any[]>([]);
  const [processingIdx, setProcessingIdx] = useState<number | null>(null);

  const handleGatherNews = async () => {
    setTriggeringAuto(true);
    try {
      const res = await fetch("/api/admin/news/gather", { method: "POST" });
      const data = await res.json();
      setStagedNews(data.drafts);
      if (data.drafts?.length === 0) alert("이미 목표 수량이 충족되었거나 새로운 뉴스가 없습니다.");
    } catch (err) {
      alert("뉴스 수집 중 오류가 발생했습니다.");
    } finally {
      setTriggeringAuto(false);
    }
  };

  const removeFromStaging = (idx: number) => {
    setStagedNews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleBatchGenerate = async () => {
    if (stagedNews.length === 0) return;
    if (!confirm(`선택한 ${stagedNews.length}개의 뉴스에 대해 AI 출제를 시작하시겠습니까?`)) return;

    setTriggeringAuto(true);
    let successCount = 0;

    for (let i = 0; i < stagedNews.length; i++) {
      setProcessingIdx(i);
      const news = stagedNews[i];
      try {
        const res = await fetch("/api/admin/rss/trigger", {
          method: "POST",
          body: JSON.stringify({ configs: [{ category: news.category, count: 1, specificLink: news.link }] })
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error("Batch error:", err);
      }
    }

    alert(`${successCount}개의 퀴즈가 성공적으로 생성되었습니다!`);
    setStagedNews([]);
    setProcessingIdx(null);
    setTriggeringAuto(false);
    
    fetchCurrentStatus();
  };

  const CATEGORIES = ["IT", "AI", "JEJU", "NATION", "WORLD", "KPOP", "SPORTS", "ENTERTAINMENT"];
  const DAILY_TARGET = 10;

  // 퀴즈 목록 — 카테고리별 그룹핑
  const quizzesByCategory = publishedQuizzes.reduce((acc: Record<string, any[]>, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {});
  const [expandedQuizCategory, setExpandedQuizCategory] = useState<string | null>(null);
  const [expandedQuizIdx, setExpandedQuizIdx] = useState<string | null>(null);

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">

      {/* AUTO PILOT — 원클릭 전체 자동 생성 */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 rounded-[48px] p-12 mb-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-primary/10 rounded-full -ml-40 -mt-40 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">
              <Bot className="w-4 h-4" />
              Auto Pilot
            </div>
            <h2 className="text-4xl font-black mb-2 tracking-tighter">전체 자동 생성</h2>
            <p className="text-muted-foreground font-medium max-w-sm">
              AI가 오늘의 뉴스를 수집하고 모든 카테고리 퀴즈를 자동으로 채웁니다.<br />
              <span className="text-xs opacity-60">매일 오전 6시 KST 자동 실행 · 수동 즉시 실행도 가능</span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            {/* Step 1 */}
            <button
              onClick={handleFetchAllNews}
              disabled={newsFetchLoading || autoFillLoading}
              className="bg-card border-2 border-primary/30 text-primary px-8 py-5 rounded-3xl font-black shadow-xl hover:bg-primary/5 transition-all disabled:opacity-60 flex items-center gap-3"
            >
              {newsFetchLoading
                ? <><RefreshCw className="w-5 h-5 animate-spin" /> 수집 중...</>
                : <><Newspaper className="w-5 h-5" /> Step 1. 뉴스 수집</>
              }
            </button>
            {/* Step 2 */}
            <button
              onClick={handleAutoFill}
              disabled={autoFillLoading || newsFetchLoading}
              className="bg-primary text-white px-10 py-5 rounded-3xl font-black text-base shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:scale-100 flex items-center gap-3"
            >
              {autoFillLoading
                ? <><RefreshCw className="w-5 h-5 animate-spin" /> AI 생성 중...</>
                : <><Zap className="w-5 h-5 fill-white" /> Step 2. 퀴즈 생성</>
              }
            </button>
          </div>
        </div>

        {/* Step 1 뉴스 수집 결과 */}
        {newsFetchResults && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 mt-8 pt-8 border-t border-primary/20"
          >
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
              뉴스 수집 결과 — 카테고리 클릭 시 기사 목록 확인
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {newsFetchResults.map((r: any) => (
                <div key={r.category} className="bg-card/50 border border-border/50 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === r.category ? null : r.category)}
                    className={`w-full flex items-center justify-between p-4 text-sm font-bold transition-colors hover:bg-primary/5 ${r.error ? "text-destructive" : r.count === 0 ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${r.error ? "bg-destructive/10 text-destructive" : r.count > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {r.category}
                      </span>
                      <span>
                        {r.error ? `오류: ${r.error}` : `${r.count}개 수집됨`}
                      </span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${expandedCategory === r.category ? "rotate-90" : ""}`} />
                  </button>
                  {expandedCategory === r.category && r.items.length > 0 && (
                    <div className="border-t border-border/30 divide-y divide-border/20">
                      {r.items.map((item: any, i: number) => (
                        <div key={i} className="px-4 py-3 flex items-start gap-3">
                          <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${item.hasContent ? "bg-accent" : "bg-yellow-500"}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{item.title}</p>
                            <p className="text-[10px] text-muted-foreground">{item.pubDate} · {item.hasContent ? "본문 있음" : "제목만"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2 퀴즈 생성 결과 */}
        {autoFillResults && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 mt-8 pt-8 border-t border-primary/20"
          >
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">생성 결과</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {autoFillResults.map((r: any, i: number) => (
                <div key={i} className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 ${r.status === "error" ? "bg-destructive/10 border-destructive/30 text-destructive" : r.status === "full" ? "bg-muted border-border text-muted-foreground" : "bg-accent/10 border-accent/30 text-accent"}`}>
                  <span className="uppercase">{r.category}</span>
                  <span className="flex items-center gap-1">
                    {r.status === "error"
                      ? <XCircle className="w-3.5 h-3.5" />
                      : r.status === "full"
                        ? <CheckCircle2 className="w-3.5 h-3.5" />
                        : <><CheckCircle2 className="w-3.5 h-3.5" />+{r.gap_filled}</>
                    }
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </section>

      {/* 오늘의 퀴즈 현황 */}
      {publishedQuizzes.length > 0 && (
        <section className="bg-card border border-border rounded-[40px] p-8 mb-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2">
                <ListChecks className="text-primary w-6 h-6" />
                오늘의 퀴즈 현황
              </h2>
              <p className="text-xs text-muted-foreground mt-1">총 {publishedQuizzes.length}문제 · 실시간 업데이트</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {Object.entries(quizzesByCategory).map(([cat, quizzes]) => (
                <span key={cat} className="text-[10px] font-black bg-primary/10 text-primary px-2 py-1 rounded-lg">
                  {cat} {quizzes.length}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(quizzesByCategory).map(([cat, quizzes]) => (
              <div key={cat} className="border border-border rounded-2xl overflow-hidden">
                {/* 카테고리 헤더 */}
                <button
                  onClick={() => setExpandedQuizCategory(expandedQuizCategory === cat ? null : cat)}
                  className="w-full flex items-center justify-between px-5 py-3 bg-muted/30 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black bg-primary text-white px-2.5 py-1 rounded-lg uppercase">{cat}</span>
                    <span className="text-sm font-bold">{quizzes.length}문제</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedQuizCategory === cat ? "rotate-90" : ""}`} />
                </button>

                {/* 퀴즈 목록 */}
                {expandedQuizCategory === cat && (
                  <div className="divide-y divide-border/50">
                    {quizzes.map((q, i) => {
                      const key = `${cat}-${i}`;
                      const isExpanded = expandedQuizIdx === key;
                      return (
                        <div key={i} className="px-5 py-3">
                          <button
                            onClick={() => setExpandedQuizIdx(isExpanded ? null : key)}
                            className="w-full flex items-start justify-between gap-4 text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground font-bold truncate mb-0.5">{q.base_fact}</p>
                              <p className="text-sm font-bold truncate">{q.quizzes?.adult?.question || q.quizzes?.teen?.question}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-black bg-muted px-2 py-0.5 rounded">{q.quiz_type}</span>
                              {isExpanded ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          </button>

                          {/* 상세 보기 */}
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                              {(["teen", "adult"] as const).map(level => {
                                const quiz = q.quizzes?.[level];
                                if (!quiz) return null;
                                return (
                                  <div key={level} className="bg-muted/30 rounded-2xl p-4 space-y-3">
                                    <span className="text-[10px] font-black uppercase text-primary">{level}</span>
                                    <p className="text-sm font-bold">{quiz.question}</p>
                                    <div className="space-y-1.5">
                                      {quiz.options?.map((opt: string, oi: number) => (
                                        <div key={oi} className={`text-xs px-3 py-2 rounded-xl font-medium ${opt === quiz.answer ? "bg-accent/20 text-accent font-black border border-accent/30" : "bg-card border border-border"}`}>
                                          {opt === quiz.answer && "✓ "}{opt}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                              {q.source_url && (
                                <div className="md:col-span-2">
                                  <a href={q.source_url} target="_blank" rel="noopener noreferrer"
                                    className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold">
                                    <ExternalLink className="w-3 h-3" /> 출처 보기
                                  </a>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 0. Smart Content Health Dashboard */}
      <section className="bg-primary/5 border border-primary/20 rounded-[48px] p-12 mb-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">
              <Zap className="w-4 h-4" />
              Content Staging Pipeline
            </div>
            <h2 className="text-4xl font-black mb-2 tracking-tighter">STAGING STUDIO</h2>
            <p className="text-muted-foreground font-medium">뉴스 후보를 먼저 수집하고, 검토한 뒤 일괄 출제합니다.</p>
          </div>
          <div className="flex gap-4">
            <button 
                onClick={handleGatherNews}
                disabled={triggeringAuto}
                className="bg-card border-2 border-primary/20 text-primary px-8 py-5 rounded-3xl font-black shadow-xl hover:bg-primary/5 transition-all flex items-center gap-3"
            >
                <Search className="w-5 h-5" /> 어제 뉴스 후보 수집
            </button>
            <button 
                onClick={handleBatchGenerate}
                disabled={triggeringAuto || stagedNews.length === 0}
                className="bg-primary text-white px-10 py-5 rounded-3xl font-black shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
            >
                {triggeringAuto ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <Zap className="fill-white" />}
                {stagedNews.length > 0 ? `최종 ${stagedNews.length}개 일괄 출제 승인` : "출제 대기 중..."}
            </button>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12 relative z-10 opacity-60">
            {CATEGORIES.slice(0, 4).map(cat => {
                const current = counts[cat] || 0;
                return (
                    <div key={cat} className="bg-card/30 p-4 rounded-2xl flex items-center justify-between border border-border/50">
                        <span className="text-[10px] font-black opacity-50">{cat}</span>
                        <span className="text-sm font-black">{current}/10</span>
                    </div>
                );
            })}
        </div>

        {/* Staging Queue */}
        {stagedNews.length > 0 && (
            <div className="bg-card/40 backdrop-blur-xl border border-primary/20 rounded-[32px] p-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black text-xl flex items-center gap-2">
                        <ListChecks className="text-primary" /> Reviewing {stagedNews.length} News Drafts
                    </h3>
                    <button onClick={() => setStagedNews([])} className="text-xs text-muted-foreground hover:text-destructive font-bold">CLEAR QUEUE</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                    {stagedNews.map((news, i) => (
                        <div key={i} className={`group relative bg-card border ${processingIdx === i ? 'border-primary shadow-lg shadow-primary/20 animate-pulse' : 'border-border/50'} p-5 rounded-3xl transition-all hover:border-primary/30`}>
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-lg uppercase">{news.category}</span>
                                <button onClick={() => removeFromStaging(i)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-full transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <h4 className="text-sm font-bold leading-tight line-clamp-2 mb-2">{news.title}</h4>
                            <p className="text-[10px] text-muted-foreground truncate italic mb-4">{news.link}</p>
                            
                            {processingIdx === i && (
                                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center rounded-3xl backdrop-blur-[2px]">
                                    <div className="bg-primary text-white text-[10px] font-black px-4 py-2 rounded-full flex items-center gap-2">
                                        <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                        GENERATING...
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* News Browser */}
        <div className="mt-8 pt-8 border-t border-primary/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-secondary fill-secondary" />
              Latest News Browser
            </h3>
            <button 
              onClick={handleFetchRss} 
              disabled={fetchingRss}
              className="text-xs font-bold text-primary hover:underline"
            >
              {fetchingRss ? "불러오는 중..." : "뉴우스 새로고침"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rssList.slice(0, 4).map((news, i) => (
              <div key={i} className="bg-card border border-border/50 p-4 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{news.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{news.link}</p>
                </div>
                <button 
                  onClick={() => fillWithNews(news)}
                  className="bg-muted px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-primary hover:text-white transition-all whitespace-nowrap"
                >
                  MAGIC FILL
                </button>
              </div>
            ))}
            {rssList.length === 0 && !fetchingRss && (
              <p className="text-xs text-muted-foreground italic">카테고리를 선택하고 뉴스를 불러와 보세요.</p>
            )}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-black mb-2 flex items-center gap-2">
            <PlusCircle className="text-primary" />
            HUMAN STUDIO (CMS)
          </h1>
          <p className="text-muted-foreground">직접 문제를 출제하거나 마법사로 채워진 내용을 검토합니다.</p>
        </div>
        {success && (
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-2 text-accent font-bold">
            <CheckCircle className="w-5 h-5" />
            출제 완료!
          </motion.div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Basic Info */}
        <section className="bg-card p-8 rounded-3xl border border-border space-y-6">
          <h2 className="text-xl font-bold border-b border-border pb-4">1. 기본 정보</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-primary">카테고리</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full bg-background border border-border p-3 rounded-xl outline-none"
              >
                <option>IT</option>
                <option>AI</option>
                <option>KPOP</option>
                <option>연예</option>
                <option>시사</option>
                <option>제주</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-primary">출처 URL</label>
              <input 
                type="url"
                value={formData.source_url}
                onChange={(e) => setFormData({...formData, source_url: e.target.value})}
                className="w-full bg-background border border-border p-3 rounded-xl outline-none"
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-primary">뉴스 요약 / 팩트</label>
            <textarea 
               value={formData.base_fact}
               onChange={(e) => setFormData({...formData, base_fact: e.target.value})}
               className="w-full bg-background border border-border p-4 rounded-xl outline-none h-24"
               placeholder="퀴즈의 근거가 되는 사실을 입력하세요."
            />
          </div>
        </section>

        {/* Quiz Content Tabs (Manual implementation) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Teen Quiz */}
            <section className="bg-card p-8 rounded-3xl border border-border space-y-6">
                <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Teen Level (10대)
                </h2>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase opacity-50">질문</label>
                    <input 
                        value={formData.teen_question}
                        onChange={(e) => setFormData({...formData, teen_question: e.target.value})}
                        className="w-full bg-background border border-border p-3 rounded-xl"
                        placeholder="이모지를 섞은 유머러스한 질문"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase opacity-50">선택지</label>
                    {formData.teen_options.map((opt, i) => (
                        <input 
                            key={i}
                            value={opt}
                            onChange={(e) => updateOption("teen", i, e.target.value)}
                            className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                            placeholder={`옵션 ${i+1}`}
                        />
                    ))}
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-accent">정답</label>
                    <input 
                        value={formData.teen_answer}
                        onChange={(e) => setFormData({...formData, teen_answer: e.target.value})}
                        className="w-full bg-background border border-accent/30 p-3 rounded-xl text-sm"
                        placeholder="정확한 정답 텍스트"
                    />
                </div>
            </section>

            {/* Adult Quiz */}
            <section className="bg-card p-8 rounded-3xl border border-border space-y-6">
                <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Adult Level (성인)
                </h2>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase opacity-50">질문</label>
                    <input 
                        value={formData.adult_question}
                        onChange={(e) => setFormData({...formData, adult_question: e.target.value})}
                        className="w-full bg-background border border-border p-3 rounded-xl"
                        placeholder="신뢰감 있는 기사형 질문"
                    />
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase opacity-50">선택지</label>
                    {formData.adult_options.map((opt, i) => (
                        <input 
                            key={i}
                            value={opt}
                            onChange={(e) => updateOption("adult", i, e.target.value)}
                            className="w-full bg-background border border-border px-3 py-2 rounded-lg text-sm"
                            placeholder={`옵션 ${i+1}`}
                        />
                    ))}
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-accent">정답</label>
                    <input 
                        value={formData.adult_answer}
                        onChange={(e) => setFormData({...formData, adult_answer: e.target.value})}
                        className="w-full bg-background border border-accent/30 p-3 rounded-xl text-sm"
                        placeholder="정확한 정답 텍스트"
                    />
                </div>
            </section>
        </div>

        {/* Viral Copy */}
        <section className="bg-secondary/5 p-8 rounded-3xl border border-secondary/20 space-y-6">
            <h2 className="text-xl font-bold text-secondary pb-4 border-b border-secondary/10">3. 바이럴 문구 (카카오톡)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase">카톡 제목 (AI 추천 스타일)</label>
                    <input 
                        value={formData.kakao_title}
                        onChange={(e) => setFormData({...formData, kakao_title: e.target.value})}
                        className="w-full bg-background border border-border p-3 rounded-xl"
                        placeholder="예: 이거 맞추면 인정 ㅋㅋ"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase">도발 멘트 (Taunt)</label>
                    <input 
                        value={formData.kakao_taunt}
                        onChange={(e) => setFormData({...formData, kakao_taunt: e.target.value})}
                        className="w-full bg-background border border-border p-3 rounded-xl"
                        placeholder="예: 넌 절대 못맞춤 ㅋ"
                    />
                </div>
            </div>
        </section>

        <button 
           type="submit"
           disabled={loading}
           className="w-full bg-primary text-white font-black py-6 rounded-3xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:scale-[1.01] transition-all disabled:opacity-50"
        >
          <Save className="w-6 h-6" />
          {loading ? "작업 중..." : "문제 출제 및 저장"}
        </button>
      </form>
    </div>
  );
}
