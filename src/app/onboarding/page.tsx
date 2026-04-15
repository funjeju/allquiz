"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { updateUserDemographics } from "@/services/userService";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, User, Calendar, ArrowRight, Trophy,
  Globe, Plane, Smartphone, Microscope, Hash,
  Tv, Music, Landmark, CheckCircle2,
} from "lucide-react";

const REGIONS = ["서울", "경기/인천", "부산/경남", "대구/경북", "광주/전라", "대전/충청", "강원", "제주", "해외"];

const AGE_RANGES = ["10대", "20대", "30대", "40대", "50대", "60대+"];

const INTERESTS = [
  { id: "NATION", label: "시사/종합", icon: Globe },
  { id: "WORLD", label: "국제뉴스", icon: Plane },
  { id: "IT", label: "IT/테크", icon: Smartphone },
  { id: "AI", label: "인공지능", icon: Microscope },
  { id: "SPORTS", label: "스포츠", icon: Hash },
  { id: "ENTERTAINMENT", label: "연예", icon: Tv },
  { id: "KPOP", label: "K-pop", icon: Music },
  { id: "POLITICS", label: "정치", icon: Landmark },
];

const STEPS = ["나이대", "성별", "지역", "관심분야"];

export default function OnboardingPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [ageRange, setAgeRange] = useState("");
  const [gender, setGender] = useState("");
  const [region, setRegion] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && profile?.demographics) {
      router.push("/");
    }
  }, [profile, loading, router]);

  const toggleInterest = (id: string) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const canNext = () => {
    if (step === 0) return !!ageRange;
    if (step === 1) return !!gender;
    if (step === 2) return !!region;
    if (step === 3) return interests.length > 0;
    return false;
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep(s => s + 1);
    } else {
      if (!user) return;
      setSaving(true);
      try {
        await updateUserDemographics(user.uid, {
          age_range: ageRange,
          gender,
          region,
          interests,
        });
        router.push("/");
      } catch {
        alert("정보 저장 중 오류가 발생했습니다.");
        setSaving(false);
      }
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="max-w-md w-full">

        {/* 헤더 */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary/20">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black mb-2">랭킹 프로필 설정</h1>
          <p className="text-muted-foreground text-sm font-medium leading-relaxed">
            같은 나이대·지역·관심분야 유저들과<br />
            정확한 랭킹 비교를 위해 필요합니다
          </p>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={`w-full h-1.5 rounded-full transition-all duration-300 ${i <= step ? "bg-primary" : "bg-muted"}`} />
              <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${i === step ? "text-primary" : "text-muted-foreground/50"}`}>
                {s}
              </span>
            </div>
          ))}
        </div>

        {/* 스텝 컨텐츠 */}
        <AnimatePresence mode="wait">
          {/* STEP 0: 나이대 */}
          {step === 0 && (
            <motion.div key="age" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}>
              <div className="bg-card border border-border rounded-3xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-5">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h2 className="font-black text-lg">나이대를 선택해주세요</h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {AGE_RANGES.map(age => (
                    <button
                      key={age}
                      onClick={() => setAgeRange(age)}
                      className={`py-4 rounded-2xl border-2 font-black text-sm transition-all ${
                        ageRange === age
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                          : "border-border hover:border-primary/40 bg-background"
                      }`}
                    >
                      {age}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 1: 성별 */}
          {step === 1 && (
            <motion.div key="gender" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}>
              <div className="bg-card border border-border rounded-3xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-5">
                  <User className="w-4 h-4 text-primary" />
                  <h2 className="font-black text-lg">성별을 선택해주세요</h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[{ v: "M", label: "남성" }, { v: "F", label: "여성" }, { v: "N", label: "선택 안함" }].map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setGender(v)}
                      className={`py-5 rounded-2xl border-2 font-black text-sm transition-all ${
                        gender === v
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                          : "border-border hover:border-primary/40 bg-background"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: 지역 */}
          {step === 2 && (
            <motion.div key="region" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}>
              <div className="bg-card border border-border rounded-3xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-5">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h2 className="font-black text-lg">거주 지역을 선택해주세요</h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {REGIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => setRegion(r)}
                      className={`py-3.5 rounded-2xl border-2 font-bold text-xs transition-all ${
                        region === r
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                          : "border-border hover:border-primary/40 bg-background"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: 관심분야 */}
          {step === 3 && (
            <motion.div key="interests" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}>
              <div className="bg-card border border-border rounded-3xl p-6 mb-6">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    <h2 className="font-black text-lg">관심 분야를 선택해주세요</h2>
                  </div>
                  <span className="text-xs text-muted-foreground font-bold">{interests.length}개 선택</span>
                </div>
                <p className="text-xs text-muted-foreground mb-5">중복 선택 가능 · 최소 1개</p>
                <div className="grid grid-cols-2 gap-3">
                  {INTERESTS.map(({ id, label, icon: Icon }) => {
                    const selected = interests.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggleInterest(id)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                          selected
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-border hover:border-primary/40 bg-background"
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 text-left">{label}</span>
                        {selected && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 랭킹 안내 배너 */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 mb-5 flex items-start gap-3">
          <Trophy className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-primary/80 font-medium leading-relaxed">
            입력한 정보는 <span className="font-black">나이대·성별·지역별 랭킹</span>에 반영됩니다. 나중에 프로필에서 수정 가능합니다.
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-5 rounded-2xl border-2 border-border font-bold text-muted-foreground hover:border-primary/40 transition-colors"
            >
              이전
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleNext}
            disabled={!canNext() || saving}
            className={`flex-1 py-5 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${
              canNext() && !saving
                ? "bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {saving ? "저장 중..." : step === 3 ? "랭킹 시작하기" : "다음"}
            {!saving && <ArrowRight className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
