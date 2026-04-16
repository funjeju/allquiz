"use client";

import { signInWithGoogle } from "@/services/authService";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      router.push("/");
    } catch (e: any) {
      if (e?.code === "auth/popup-blocked") {
        setError("팝업이 차단됐습니다. 브라우저 팝업 허용 후 다시 시도해주세요.");
      } else if (e?.code === "auth/popup-closed-by-user") {
        // 유저가 직접 닫은 경우 — 에러 메시지 불필요
      } else {
        setError("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-primary/5">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/20">
          <Trophy className="w-12 h-12 text-white" />
        </div>

        <h1 className="text-4xl font-black mb-4 tracking-tight">RANK & QUIZ</h1>
        <p className="text-muted-foreground mb-12 font-medium">
          매일 새로운 뉴스 퀴즈로 지식을 증명하고<br />
          당신의 마이크로 랭킹을 차지하세요!
        </p>

        {error && (
          <p className="mb-4 text-sm font-bold text-destructive bg-destructive/10 rounded-2xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all border border-border disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <LogIn className="w-6 h-6" />
          {loading ? "로그인 중..." : "Google 계정으로 시작하기"}
        </button>

        <p className="mt-8 text-xs text-muted-foreground/60 leading-relaxed">
          로그인 시 서비스 이용약관 및 개인정보 처리방침에<br />
          동의하는 것으로 간주됩니다.
        </p>
      </motion.div>
    </div>
  );
}
