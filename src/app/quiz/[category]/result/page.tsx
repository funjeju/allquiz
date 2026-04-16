"use client";

import { Suspense } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useKakaoShare } from "@/hooks/useKakaoShare";
import { Trophy, Share2, Home, RotateCcw, Crown, AlertTriangle } from "lucide-react";

function QuizResultInner() {
  const searchParams = useSearchParams();
  const { category } = useParams();
  const router = useRouter();
  const { shareRanking } = useKakaoShare();

  const score = parseInt(searchParams.get("score") || "0");
  const total = parseInt(searchParams.get("total") || "10");
  
  // 간단한 퍼센타일리 계산 로직 (모의)
  const percentile = Math.max(1, 100 - Math.floor((score / (total * 100)) * 100));
  const isTopTier = percentile <= 10;

  const handleShare = () => {
    shareRanking({
      nickname: "익명의 마스터",
      rank: percentile,
      taunt: isTopTier 
        ? "후... 오늘의 퀴즈 좀 쉽네? 너도 한 번 해봐 ㅋㅋ" 
        : "이 난이도 실화냐? 너 이거 다 맞추면 내 형이라 부름 ㅋ",
      category: category as string,
      shareUrl: window.location.origin,
    });
  };

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-12 flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-8"
      >
        <div className={`inline-flex p-6 rounded-full mb-6 ${isTopTier ? "bg-secondary/20 shadow-[0_0_50px_rgba(250,204,21,0.2)]" : "bg-primary/10"}`}>
            <Trophy className={`w-20 h-20 ${isTopTier ? "text-secondary" : "text-primary"}`} />
        </div>
        <h1 className="text-4xl font-black mb-2">BATTLE FINISHED</h1>
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">
            Category: {category}
        </p>
      </motion.div>

      {/* Main Score Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-card w-full border-2 border-border p-10 rounded-[40px] shadow-2xl relative overflow-hidden mb-8"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 -mr-16 -mt-16 rounded-full blur-2xl" />
        
        <div className="relative z-10">
            <div className="text-7xl font-black text-primary mb-4">
                {score.toLocaleString()}
                <span className="text-2xl text-muted-foreground ml-2">pts</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-xl font-bold text-accent mb-6">
                <Crown className="w-6 h-6 fill-accent" />
                상위 {percentile}% 랭크 달성!
            </div>

            <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${100 - percentile}%` }}
                    className="h-full bg-primary shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
                {isTopTier ? "당신은 이 구역의 지식 제왕입니다!" : "조금만 더 하면 랭커 진입이 가능해요!"}
            </p>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 w-full gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleShare}
          className="bg-secondary text-secondary-foreground font-black py-5 rounded-3xl flex items-center justify-center gap-3 shadow-xl shadow-secondary/20"
        >
          <Share2 className="w-6 h-6" />
          친구 도발하고 랭킹 사수하기
        </motion.button>

        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => router.push(`/quiz/${category}`)}
                className="bg-card border-2 border-border font-bold py-4 rounded-3xl flex items-center justify-center gap-2"
            >
                <RotateCcw className="w-5 h-5" />
                다시 도전
            </button>
            <button 
                onClick={() => router.push("/")}
                className="bg-card border-2 border-border font-bold py-4 rounded-3xl flex items-center justify-center gap-2"
            >
                <Home className="w-5 h-5" />
                대시보드
            </button>
        </div>
      </div>

      {/* Warning Tip */}
      <div className="mt-12 flex items-center gap-2 p-4 bg-destructive/5 rounded-2xl border border-destructive/10 text-destructive text-sm font-medium">
        <AlertTriangle className="w-4 h-4" />
        공유를 통해 '골든 티켓'을 획득하고 틀린그림찾기에 도전하세요!
      </div>
    </div>
  );
}

export default function QuizResult() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    }>
      <QuizResultInner />
    </Suspense>
  );
}
