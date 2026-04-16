import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { QuizGenerationOutput } from "@/lib/schemas";

// ─── 주기별 퀴즈 키 계산 ────────────────────────────────────────────────────

// KST 기준 현재 시각을 Date로 반환
function getKSTNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
}

// 지난 완료된 주의 월요일 날짜 "YYYY-MM-DD" 반환
export function getWeeklyQuizKey(): string {
  const now = getKSTNow();
  const dow = now.getDay(); // 0=Sun, 1=Mon..6=Sat
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - daysSinceMonday - 7);
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(lastMonday);
}

// 지난달 키 "YYYY-MM" 반환
export function getMonthlyQuizKey(): string {
  const now = getKSTNow();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const str = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(prev);
  return str.slice(0, 7); // "YYYY-MM"
}

// 월요일 기준 7일치 날짜 배열 반환
function getWeekDates(mondayKey: string): string[] {
  const monday = new Date(mondayKey + "T00:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  });
}

// 해당 월의 전체 날짜 배열 반환
function getMonthDates(monthKey: string): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(y, m - 1, i + 1);
    return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  });
}

// 위클리 퀴즈 생성 & Firestore 저장
export async function generateAndSaveWeeklyQuiz(): Promise<{ count: number; key: string }> {
  const weekKey = getWeeklyQuizKey();
  const dates = getWeekDates(weekKey);
  const all = await getQuizzesFromDates(dates);
  const shuffled = seededShuffle(all, weekKey);
  const selected = shuffled.slice(0, 20);
  await setDoc(doc(db, "periodic_quizzes", `weekly_${weekKey}`), {
    type: "weekly",
    key: weekKey,
    from_date: dates[0],
    to_date: dates[6],
    quizzes: selected,
    total_count: selected.length,
    generated_at: new Date().toISOString(),
  });
  return { count: selected.length, key: weekKey };
}

// 먼슬리 퀴즈 생성 & Firestore 저장
export async function generateAndSaveMonthlyQuiz(): Promise<{ count: number; key: string }> {
  const monthKey = getMonthlyQuizKey();
  const dates = getMonthDates(monthKey);
  const all = await getQuizzesFromDates(dates);
  const shuffled = seededShuffle(all, monthKey);
  const selected = shuffled.slice(0, 20);
  await setDoc(doc(db, "periodic_quizzes", `monthly_${monthKey}`), {
    type: "monthly",
    key: monthKey,
    from_date: dates[0],
    to_date: dates[dates.length - 1],
    quizzes: selected,
    total_count: selected.length,
    generated_at: new Date().toISOString(),
  });
  return { count: selected.length, key: monthKey };
}

// 저장된 위클리 퀴즈 조회
export async function getStoredWeeklyQuiz(): Promise<{ quiz: QuizGenerationOutput; category: string }[] | null> {
  const weekKey = getWeeklyQuizKey();
  const snap = await getDoc(doc(db, "periodic_quizzes", `weekly_${weekKey}`));
  if (!snap.exists()) return null;
  return snap.data().quizzes ?? null;
}

// 저장된 먼슬리 퀴즈 조회
export async function getStoredMonthlyQuiz(): Promise<{ quiz: QuizGenerationOutput; category: string }[] | null> {
  const monthKey = getMonthlyQuizKey();
  const snap = await getDoc(doc(db, "periodic_quizzes", `monthly_${monthKey}`));
  if (!snap.exists()) return null;
  return snap.data().quizzes ?? null;
}

// 위클리/먼슬리 퀴즈 존재 여부 확인
export async function checkPeriodicQuizExists(): Promise<{ weekly: boolean; monthly: boolean }> {
  const [wSnap, mSnap] = await Promise.all([
    getDoc(doc(db, "periodic_quizzes", `weekly_${getWeeklyQuizKey()}`)),
    getDoc(doc(db, "periodic_quizzes", `monthly_${getMonthlyQuizKey()}`)),
  ]);
  return { weekly: wSnap.exists(), monthly: mSnap.exists() };
}

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

// 여러 날짜의 퀴즈를 합산해서 반환
async function getQuizzesFromDates(dates: string[]): Promise<{ quiz: QuizGenerationOutput; category: string }[]> {
  const snaps = await Promise.all(dates.map(d => getDoc(doc(db, "daily_quizzes", d))));
  const all: { quiz: QuizGenerationOutput; category: string }[] = [];
  snaps.forEach(snap => {
    if (!snap.exists()) return;
    const data = snap.data();
    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        data[key].forEach((q: QuizGenerationOutput) => all.push({ quiz: q, category: key }));
      }
    });
  });
  return all;
}

function getKSTDateOffsetted(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// 위클리 퀴즈: 최근 7일 퀴즈에서 35문제
export async function getWeeklyQuiz(): Promise<{ quiz: QuizGenerationOutput; category: string }[]> {
  const dates = Array.from({ length: 7 }, (_, i) => getKSTDateOffsetted(i + 1));
  const all = await getQuizzesFromDates(dates);
  const shuffled = seededShuffle(all, dates[0]);
  return shuffled.slice(0, 35);
}

// 먼스리 퀴즈: 최근 30일 퀴즈에서 60문제
export async function getMonthlyQuiz(): Promise<{ quiz: QuizGenerationOutput; category: string }[]> {
  const dates = Array.from({ length: 30 }, (_, i) => getKSTDateOffsetted(i + 1));
  const all = await getQuizzesFromDates(dates);
  const shuffled = seededShuffle(all, dates[0]);
  return shuffled.slice(0, 60);
}

// 특정 날짜의 데일리 퀴즈 (과거 재플레이용)
export async function getDailyQuizByDate(date: string): Promise<{ quiz: QuizGenerationOutput; category: string }[]> {
  const quizDocRef = doc(db, "daily_quizzes", date);
  try {
    const docSnap = await getDoc(quizDocRef);
    if (!docSnap.exists()) return [];
    const data = docSnap.data();
    const all: { quiz: QuizGenerationOutput; category: string }[] = [];
    Object.keys(data).forEach(key => {
      if (Array.isArray(data[key])) {
        data[key].forEach((q: QuizGenerationOutput) => all.push({ quiz: q, category: key }));
      }
    });
    return seededShuffle(all, date).slice(0, 20);
  } catch (error) {
    console.error("getDailyQuizByDate Error:", error);
    return [];
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

// 특정 날짜의 퀴즈 데이터 전체 조회 (어드민용)
export async function getQuizDataByDate(date: string): Promise<{ data: Record<string, QuizGenerationOutput[]>; totalCount: number }> {
  const quizDocRef = doc(db, "daily_quizzes", date);
  try {
    const docSnap = await getDoc(quizDocRef);
    if (!docSnap.exists()) return { data: {}, totalCount: 0 };

    const raw = docSnap.data();
    const data: Record<string, QuizGenerationOutput[]> = {};
    let totalCount = 0;

    Object.keys(raw).forEach(key => {
      if (Array.isArray(raw[key])) {
        data[key] = raw[key];
        totalCount += raw[key].length;
      }
    });

    return { data, totalCount };
  } catch (error) {
    console.error("getQuizDataByDate Error:", error);
    return { data: {}, totalCount: 0 };
  }
}

// 오늘 퀴즈 총 문제 수 (메인 배너용)
export async function getTodayQuizSummary(): Promise<{ date: string; totalCount: number; categoryCount: number }> {
  const kstDate = getKSTDate();
  const counts = await getCategoryCounts();
  const totalCount = Object.values(counts).reduce((s, n) => s + n, 0);
  const categoryCount = Object.keys(counts).filter(k => counts[k] > 0).length;
  return { date: kstDate, totalCount, categoryCount };
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
