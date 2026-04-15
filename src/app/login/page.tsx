"use client";

import { signInWithGoogle } from "@/services/authService";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      // 로그인 후 온보딩 체크를 위해 이동 (middleware나 layout에서 처리 가능하지만 명시적으로 이동)
      router.push("/");
    } catch (error) {
      alert("로그인 중 오류가 발생했습니다.");
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

        <button
          onClick={handleLogin}
          className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all border border-border"
        >
          <LogIn className="w-6 h-6" />
          Google 계정으로 시작하기
        </button>

        <p className="mt-8 text-xs text-muted-foreground/60 leading-relaxed">
          로그인 시 서비스 이용약관 및 개인정보 처리방침에<br />
          동의하는 것으로 간주됩니다.
        </p>
      </motion.div>
    </div>
  );
}
