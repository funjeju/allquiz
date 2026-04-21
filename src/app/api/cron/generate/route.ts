import { NextRequest, NextResponse } from "next/server";
import { getCategoryCounts, getUsedUrls, saveQuizToFirestore, generateAndSaveWeeklyQuiz, generateAndSaveMonthlyQuiz, getWeeklyQuizKey, getMonthlyQuizKey } from "@/services/quizService";
import { fetchNewsByCategory, NewsCategory } from "@/services/rssService";
import { generateQuizFromNews } from "@/services/aiService";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel 최대 5분

const DAILY_TARGET = 10;
const CATEGORIES: NewsCategory[] = [
  "NATION", "WORLD", "SPORTS", "ENTERTAINMENT", "KPOP",
  "IT", "AI", "POLITICS", "TRAVEL", "PERSON", "JEJU", "REGION"
];
const CATEGORY_CONCURRENCY = 3; // 동시 처리 카테고리 수
const HALF_SIZE = 5;             // 카테고리 내 절반 단위 (5+5 동시 실행)

export async function GET(req: NextRequest) {
  // Vercel Cron은 Authorization 헤더로 CRON_SECRET을 자동 전송
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    console.log("[Cron] Starting daily quiz generation — KST 06:00");

    // ── 주기별 퀴즈 자동 생성 (월요일 = Weekly, 1일 = Monthly) ──────────────
    const kstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const isMonday = kstNow.getDay() === 1;
    const isFirstOfMonth = kstNow.getDate() === 1;

    if (isMonday) {
      const weekKey = getWeeklyQuizKey();
      const weekSnap = await getDoc(doc(db, "periodic_quizzes", `weekly_${weekKey}`));
      if (!weekSnap.exists()) {
        try {
          const r = await generateAndSaveWeeklyQuiz();
          console.log(`[Cron] Weekly quiz generated: ${r.count} questions (${r.key})`);
        } catch (e) {
          console.error("[Cron] Weekly generation failed:", e);
        }
      }
    }

    if (isFirstOfMonth) {
      const monthKey = getMonthlyQuizKey();
      const monthSnap = await getDoc(doc(db, "periodic_quizzes", `monthly_${monthKey}`));
      if (!monthSnap.exists()) {
        try {
          const r = await generateAndSaveMonthlyQuiz();
          console.log(`[Cron] Monthly quiz generated: ${r.count} questions (${r.key})`);
        } catch (e) {
          console.error("[Cron] Monthly generation failed:", e);
        }
      }
    }

    const [currentCounts, usedUrls] = await Promise.all([
      getCategoryCounts(),
      getUsedUrls(),
    ]);

    // 공유 URL 집합: 실행 중 각 카테고리가 URL을 선점해 중복 방지
    const claimedUrls = new Set<string>(usedUrls);

    // ── Phase 1: 순차적으로 각 카테고리의 뉴스 항목 선점 ──────────────────────
    type AllocationEntry = { cat: NewsCategory; news: any[] };
    const allocations: AllocationEntry[] = [];

    for (const cat of CATEGORIES) {
      const gap = DAILY_TARGET - (currentCounts[cat] || 0);
      if (gap <= 0) continue;

      const allNews = await fetchNewsByCategory(cat);
      const freshNews = allNews.filter(n => n.link && !claimedUrls.has(n.link));
      const targetNews = freshNews.slice(0, gap);

      // URL 선점 (다른 카테고리가 같은 기사를 가져가지 못하도록)
      targetNews.forEach(n => { if (n.link) claimedUrls.add(n.link); });

      console.log(`[Cron] ${cat}: gap=${gap}, fresh=${freshNews.length}, target=${targetNews.length}`);
      allocations.push({ cat, news: targetNews });
    }

    const results: any[] = [];

    // ── Phase 2: 배치 단위로 병렬 퀴즈 생성 ──────────────────────────────────
    for (let i = 0; i < allocations.length; i += CATEGORY_CONCURRENCY) {
      const batch = allocations.slice(i, i + CATEGORY_CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async ({ cat, news: targetNews }) => {
          if (targetNews.length === 0) return { category: cat, status: "no_fresh_news" };

          const processGroup = async (items: typeof targetNews) => {
            const res = await Promise.allSettled(
              items.map(async (newsItem) => {
                const quiz = await generateQuizFromNews(cat, newsItem);
                if (quiz) { await saveQuizToFirestore(quiz); return true; }
                return false;
              })
            );
            return res.filter(r => r.status === "fulfilled" && r.value).length;
          };

          const firstHalf = targetNews.slice(0, HALF_SIZE);
          const secondHalf = targetNews.slice(HALF_SIZE);

          const [count1, count2] = await Promise.all([
            processGroup(firstHalf),
            processGroup(secondHalf),
          ]);
          const filled = count1 + count2;

          return { category: cat, status: "filled", filled, total: (currentCounts[cat] || 0) + filled };
        })
      );

      batchResults.forEach(r => {
        if (r.status === "fulfilled") results.push(r.value);
        else results.push({ status: "error", error: String(r.reason) });
      });
    }

    console.log("[Cron] Completed:", results);
    return NextResponse.json({ message: "Daily quiz generation completed.", results });
  } catch (error) {
    console.error("[Cron] Critical Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
