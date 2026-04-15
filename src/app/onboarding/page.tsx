"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { updateUserDemographics } from "@/services/userService";
import { motion } from "framer-motion";
import { MapPin, User, Calendar, ArrowRight } from "lucide-react";

const REGIONS = ["서울", "부산", "인천", "대구", "광주", "대전", "울산", "제주", "기타"];

export default function OnboardingPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  
  const [region, setRegion] = useState("서울");
  const [gender, setGender] = useState("M");
  const [birthYear, setBirthYear] = useState(1995);

  // 이미 온보딩 정보가 있으면 대시보드로 이동
  useEffect(() => {
    if (!loading && profile?.demographics) {
      router.push("/");
    }
  }, [profile, loading, router]);

  const handleSubmit = async () => {
    if (!user) return;
    try {
      await updateUserDemographics(user.uid, {
        region,
        gender,
        birth_year: birthYear,
      });
      router.push("/");
    } catch (error) {
      alert("정보 저장 중 오류가 발생했습니다.");
    }
  };

  if (loading) return null;

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-6 py-12">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-12 text-center"
      >
        <h1 className="text-3xl font-black mb-4">맞춤형 랭킹을 위해<br />정보를 입력해 주세요</h1>
        <p className="text-muted-foreground font-medium">
          당신의 지역과 연령대에서 1위를 차지해 보세요!
        </p>
      </motion.div>

      <div className="space-y-8">
        {/* Region */}
        <section>
          <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary mb-4">
            <MapPin className="w-4 h-4" />
            거주 지역
          </label>
          <div className="grid grid-cols-3 gap-2">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`py-3 rounded-xl border-2 font-bold transition-all ${
                  region === r ? "bg-primary border-primary text-white" : "border-border hover:border-primary/50"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </section>

        {/* Gender */}
        <section>
          <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary mb-4">
            <User className="w-4 h-4" />
            성별
          </label>
          <div className="flex gap-2">
            {["M", "F", "Other"].map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all ${
                  gender === g ? "bg-primary border-primary text-white" : "border-border hover:border-primary/50"
                }`}
              >
                {g === "M" ? "남성" : g === "F" ? "여성" : "기타"}
              </button>
            ))}
          </div>
        </section>

        {/* Birth Year */}
        <section>
          <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary mb-4">
            <Calendar className="w-4 h-4" />
            출생년도
          </label>
          <input
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(parseInt(e.target.value))}
            className="w-full bg-card border-border border-2 p-4 rounded-xl font-bold text-center text-xl focus:border-primary outline-none"
            min="1950"
            max="2020"
          />
        </section>

        <button
          onClick={handleSubmit}
          className="w-full bg-primary text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 mt-12 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          시작하기
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
