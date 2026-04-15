import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { QuizGenerationOutput } from "@/lib/schemas";

// KST 날짜 문자열 생성 함수 (전역 서버/클라이언트 시차 해결)
function getKSTDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function saveQuizToFirestore(quiz: QuizGenerationOutput) {
  const kstDate = getKSTDate();
  const quizDocRef = doc(db, "daily_quizzes", kstDate);

  try {
    const docSnap = await getDoc(quizDocRef);

    if (!docSnap.exists()) {
      await setDoc(quizDocRef, {
        [quiz.category]: [quiz],
        created_at: new Date().toISOString(),
      });
    } else {
      await updateDoc(quizDocRef, {
        [quiz.category]: arrayUnion(quiz),
        updated_at: new Date().toISOString(),
      });
    }
    console.log(`Successfully saved quiz for ${quiz.category}`);
  } catch (error) {
    console.error("Error saving quiz to Firestore:", error);
    throw error;
  }
}

export async function getLatestQuizByCategory(category: string): Promise<QuizGenerationOutput | null> {
  const kstDate = getKSTDate();
  const quizDocRef = doc(db, "daily_quizzes", kstDate);

  try {
    const docSnap = await getDoc(quizDocRef);
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    const catQuizzes = data[category];
    
    if (!catQuizzes || catQuizzes.length === 0) return null;

    return catQuizzes[catQuizzes.length - 1];
  } catch (error) {
    console.error("Fetch Latest Quiz Error:", error);
    return null;
  }
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
  const kstDate = getKSTDate();
  const quizDocRef = doc(db, "daily_quizzes", kstDate);

  try {
    const docSnap = await getDoc(quizDocRef);
    if (!docSnap.exists()) return {};

    const data = docSnap.data();
    const counts: Record<string, number> = {};

    Object.keys(data).forEach(key => {
      const val = data[key];
      if (Array.isArray(val)) {
        counts[key] = val.length;
      }
    });

    return counts;
  } catch (error) {
    console.error("Count Error:", error);
    return {};
  }
}

// 날짜 문자열을 시드로 배열을 결정론적으로 셔플 (같은 날 모든 유저에게 동일한 문제)
function seededShuffle<T>(array: T[], seed: string): T[] {
  const arr = [...array];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i;
    hash |= 0;
    const j = Math.abs(hash) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 오늘의 전 카테고리 퀴즈에서 날짜 시드로 랜덤 20문제 추출
export async function getDailyQuiz20(): Promise<{ quiz: QuizGenerationOutput; category: string }[]> {
  const kstDate = getKSTDate();
  const quizDocRef = doc(db, "daily_quizzes", kstDate);

  try {
    const docSnap = await getDoc(quizDocRef);
    if (!docSnap.exists()) return [];

    const data = docSnap.data();
    const allQuizzes: { quiz: QuizGenerationOutput; category: string }[] = [];

    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        data[key].forEach((q: QuizGenerationOutput) => {
          allQuizzes.push({ quiz: q, category: key });
        });
      }
    });

    // 날짜 시드로 셔플 후 20문제 슬라이스
    const shuffled = seededShuffle(allQuizzes, kstDate);
    return shuffled.slice(0, 20);
  } catch (error) {
    console.error("getDailyQuiz20 Error:", error);
    return [];
  }
}

export async function getQuizzesByCategory(category: string): Promise<QuizGenerationOutput[]> {
  const kstDate = getKSTDate();
  const quizDocRef = doc(db, "daily_quizzes", kstDate);

  try {
    const docSnap = await getDoc(quizDocRef);
    if (!docSnap.exists()) return [];
    const data = docSnap.data();
    return Array.isArray(data[category]) ? data[category] : [];
  } catch (error) {
    console.error("getQuizzesByCategory Error:", error);
    return [];
  }
}

export async function getUsedUrls(): Promise<string[]> {
  const kstDate = getKSTDate();
  const quizDocRef = doc(db, "daily_quizzes", kstDate);

  try {
    const docSnap = await getDoc(quizDocRef);
    if (!docSnap.exists()) return [];

    const data = docSnap.data();
    const urls: string[] = [];

    Object.keys(data).forEach(key => {
      const val = data[key];
      if (Array.isArray(val)) {
        val.forEach((q: any) => {
          if (q.source_url) urls.push(q.source_url);
        });
      }
    });

    return urls;
  } catch (error) {
    console.error("Get Used URLs Error:", error);
    return [];
  }
}
