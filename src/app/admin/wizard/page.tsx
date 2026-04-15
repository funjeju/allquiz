"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { QuizGenerationOutput } from "@/lib/schemas";
import { saveQuizToFirestore } from "@/services/quizService";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wand2, 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  Link as LinkIcon,
  Play,
  Trash2,
  CheckCircle,
  Layout
} from "lucide-react";

export default function QuizWizard() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Step State
  const [step, setStep] = useState(1); // 1: Config, 2: Editing, 3: Review
  
  // Session Config
  const [config, setConfig] = useState({
    category: "IT",
    count: 5,
  });

  // Quiz Session Data
  const [quizzes, setQuizzes] = useState<QuizGenerationOutput[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Magic Fill State
  const [magicUrl, setMagicUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State (Single Question)
  const [currentForm, setCurrentForm] = useState<any>({
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

  const handleMagicFill = async () => {
    if (!magicUrl) return;
    setIsGenerating(true);
    try {
      const type = magicUrl.includes("youtube.com") || magicUrl.includes("youtu.be") ? "YOUTUBE" : "ARTICLE";
      const res = await fetch("/api/admin/generate-draft", {
        method: "POST",
        body: JSON.stringify({ url: magicUrl, category: config.category, type }),
      });
      const draft = await res.json();
      
      if (draft.error) throw new Error(draft.error);

      setCurrentForm({
        base_fact: draft.base_fact,
        teen_question: draft.quizzes.teen.question,
        teen_options: draft.quizzes.teen.options,
        teen_answer: draft.quizzes.teen.answer,
        adult_question: draft.quizzes.adult.question,
        adult_options: draft.quizzes.adult.options,
        adult_answer: draft.quizzes.adult.answer,
        kakao_title: draft.viral_copy.kakao_title,
        kakao_taunt: draft.viral_copy.kakao_taunt,
      });
    } catch (err: any) {
      alert(`AI 생성 실패: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToSession = () => {
    const newQuiz: QuizGenerationOutput = {
      category: config.category,
      source_url: magicUrl || "manual",
      base_fact: currentForm.base_fact,
      quizzes: {
        teen: { question: currentForm.teen_question, options: currentForm.teen_options, answer: currentForm.teen_answer },
        adult: { question: currentForm.adult_question, options: currentForm.adult_options, answer: currentForm.adult_answer }
      },
      viral_copy: { kakao_title: currentForm.kakao_title, kakao_taunt: currentForm.kakao_taunt },
      quiz_type: "MULTIPLE_CHOICE"
    };

    const newQuizzes = [...quizzes];
    newQuizzes[currentIdx] = newQuiz;
    setQuizzes(newQuizzes);

    if (currentIdx < config.count - 1) {
      setCurrentIdx(currentIdx + 1);
      setMagicUrl("");
      setCurrentForm({
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
    } else {
      setStep(3);
    }
  };

  const batchPublish = async () => {
    try {
      for (const q of quizzes) {
        await saveQuizToFirestore(q);
      }
      alert("전체 문항이 성공적으로 저장되었습니다!");
      router.push("/admin");
    } catch (err) {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-12">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step === s ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-muted text-muted-foreground"
            }`}>
              {s}
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest ${step === s ? "text-primary" : "text-muted-foreground"}`}>
              {s === 1 ? "Setup" : s === 2 ? "Authoring" : "Publish"}
            </span>
            {s < 3 && <div className="w-12 h-0.5 bg-muted mx-4" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="bg-card p-10 rounded-3xl border border-border shadow-2xl">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                <Layout className="text-primary" />
                CREATE NEW QUIZ SESSION
            </h2>
            <div className="space-y-6">
                <div>
                    <label className="text-xs font-bold uppercase text-primary mb-2 block">Category</label>
                    <select value={config.category} onChange={e => setConfig({...config, category: e.target.value})} className="w-full bg-background border border-border p-4 rounded-xl outline-none font-bold">
                        <option>IT</option><option>AI</option><option>KPOP</option><option>제주</option><option>시사</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-primary mb-2 block">Number of Questions</label>
                    <input type="number" value={config.count} onChange={e => setConfig({...config, count: parseInt(e.target.value)})} className="w-full bg-background border border-border p-4 rounded-xl font-bold" />
                </div>
                <button onClick={() => setStep(2)} className="w-full bg-primary text-white font-black py-5 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 mt-8">
                    Start Session <ArrowRight className="w-5 h-5" />
                </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">QUESTION {currentIdx + 1} / {config.count}</h2>
                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                    Editing Mode
                </div>
            </div>

            {/* Magic Scraper */}
            <div className="bg-secondary/10 border border-secondary/20 p-6 rounded-3xl space-y-4">
                <label className="text-xs font-black uppercase text-secondary flex items-center gap-2">
                    <Wand2 className="w-4 h-4" />
                    MAGIC AI DRAFT GENERATOR
                </label>
                <div className="flex gap-2">
                    <div className="flex-1 bg-white border border-secondary/30 rounded-xl px-4 py-3 flex items-center gap-3">
                        {magicUrl.includes("youtube") ? <Play className="text-red-500" /> : <LinkIcon className="text-muted-foreground" />}
                        <input 
                            value={magicUrl} 
                            onChange={e => setMagicUrl(e.target.value)}
                            placeholder="뉴스 링크 또는 유튜브 URL을 붙여넣으세요..."
                            className="bg-transparent border-none outline-none flex-1 text-sm font-medium"
                        />
                    </div>
                    <button 
                        onClick={handleMagicFill}
                        disabled={isGenerating}
                        className="bg-secondary text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-secondary/10 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isGenerating ? "Analyzing..." : "AI 초안 생성"}
                    </button>
                </div>
            </div>

            {/* Fast Editor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
                    <h3 className="font-bold text-primary flex items-center gap-2 text-sm uppercase"><ArrowRight className="w-4 h-4"/> Teen Version</h3>
                    <input value={currentForm.teen_question} onChange={e => setCurrentForm({...currentForm, teen_question: e.target.value})} className="w-full bg-background border p-3 rounded-lg text-sm" placeholder="10대 맞춤형 질문" />
                    <div className="grid grid-cols-2 gap-2">
                        {currentForm.teen_options.map((opt: string, i: number) => (
                            <input key={i} value={opt} onChange={e => {
                                const newOpts = [...currentForm.teen_options];
                                newOpts[i] = e.target.value;
                                setCurrentForm({...currentForm, teen_options: newOpts});
                            }} className="w-full bg-background border p-2 rounded-lg text-xs" placeholder={`옵션 ${i+1}`} />
                        ))}
                    </div>
                </div>
                <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
                    <h3 className="font-bold text-primary flex items-center gap-2 text-sm uppercase"><ArrowRight className="w-4 h-4"/> Adult Version</h3>
                    <input value={currentForm.adult_question} onChange={e => setCurrentForm({...currentForm, adult_question: e.target.value})} className="w-full bg-background border p-3 rounded-lg text-sm" placeholder="성인 맞춤형 질문" />
                    <div className="grid grid-cols-2 gap-2">
                        {currentForm.adult_options.map((opt: string, i: number) => (
                            <input key={i} value={opt} onChange={e => {
                                const newOpts = [...currentForm.adult_options];
                                newOpts[i] = e.target.value;
                                setCurrentForm({...currentForm, adult_options: newOpts});
                            }} className="w-full bg-background border p-2 rounded-lg text-xs" placeholder={`옵션 ${i+1}`} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} className="flex-1 bg-muted p-4 rounded-xl font-bold flex items-center justify-center gap-2">
                    <ArrowLeft className="w-5 h-5" /> Previous
                </button>
                <button onClick={saveToSession} className="flex-[2] bg-primary text-white p-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-xl shadow-primary/20">
                    Next Question <ArrowRight className="w-5 h-5" />
                </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-8">
            <div className="bg-card p-10 rounded-[40px] border-2 border-primary/20 shadow-2xl text-center">
                <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-accent" />
                </div>
                <h2 className="text-3xl font-black mb-2">READY TO PUBLISH</h2>
                <p className="text-muted-foreground mb-8 font-medium">총 {quizzes.length}개의 고퀄리티 문항이 준비되었습니다.<br />데이터베이스에 즉시 반영하시겠습니까?</p>
                <div className="space-y-3 mb-8 text-left border rounded-3xl p-6 bg-muted/30">
                    {quizzes.map((q, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm font-medium">
                            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black">{i+1}</span>
                            <span className="truncate">{q.quizzes.teen.question}</span>
                        </div>
                    ))}
                </div>
                <button onClick={batchPublish} className="w-full bg-primary text-white py-6 rounded-3xl font-black text-xl shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-95 transition-all">
                    <Save className="w-6 h-6" />
                    전체 발행 및 세션 종료
                </button>
                <button onClick={() => setStep(2)} className="mt-4 text-sm font-bold text-muted-foreground hover:underline">
                    내용 수정하기
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
