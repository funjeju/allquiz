import { NextRequest, NextResponse } from "next/server";
import { getCategoryCounts, getUsedUrls, saveQuizToFirestore } from "@/services/quizService";
import { fetchNewsByCategory, NewsCategory } from "@/services/rssService";
import { generateQuizFromNews } from "@/services/aiService";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel 최대 5분

const DAILY_TARGET = 10;
const CATEGORIES: NewsCategory[] = [
  "NATION", "WORLD", "SPORTS", "ENTERTAINMENT", "KPOP",
  "IT", "AI", "POLITICS", "TRAVEL", "PERSON", "JEJU", "REGION"
];

const CATEGORY_CONCURRENCY = 3; // 동시 처리 카테고리 수
const HALF_SIZE = 5;             // 카테고리 내 5+5 동시 실행

async function processCategory(
  cat: NewsCategory,
  currentCount: number,
  usedUrls: string[]
): Promise<{ category: string; status: string; gap_filled?: number; total_now?: number; error?: string }> {
  const gap = DAILY_TARGET - currentCount;

  if (gap <= 0) {
    return { category: cat, status: "full", total_now: currentCount };
  }

  try {
    const allNews = await fetchNewsByCategory(cat);
    const freshNews = allNews.filter(n => n.link && !usedUrls.includes(n.link));
    const targetNews = freshNews.slice(0, gap);

    console.log(`[Auto-Fill] ${cat}: gap=${gap}, fetched=${allNews.length}, fresh=${freshNews.length}, target=${targetNews.length}`);

    // 카테고리 내 10문제를 5+5로 쪼개서 두 그룹 동시 실행
    const processGroup = async (items: typeof targetNews) => {
      const res = await Promise.allSettled(
        items.map(async (news) => {
          const quiz = await generateQuizFromNews(cat, news);
          if (quiz) { await saveQuizToFirestore(quiz); return true; }
          return false;
        })
      );
      return res.filter(r => r.status === "fulfilled" && r.value).length;
    };

    const [count1, count2] = await Promise.all([
      processGroup(targetNews.slice(0, HALF_SIZE)),
      processGroup(targetNews.slice(HALF_SIZE)),
    ]);
    const filled = count1 + count2;

    return { category: cat, status: "filled", gap_filled: filled, total_now: currentCount + filled };
  } catch (e: any) {
    console.error(`[Auto-Fill] Category failed: ${cat}`, e);
    return { category: cat, status: "error", error: e.message };
  }
}

export async function POST(req: NextRequest) {
  try {
    const [currentCounts, usedUrls] = await Promise.all([
      getCategoryCounts(),
      getUsedUrls(),
    ]);

    const results: any[] = [];

    // 카테고리를 CATEGORY_CONCURRENCY 단위로 병렬 처리
    for (let i = 0; i < CATEGORIES.length; i += CATEGORY_CONCURRENCY) {
      const batch = CATEGORIES.slice(i, i + CATEGORY_CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(cat => processCategory(cat, currentCounts[cat] || 0, usedUrls))
      );
      batchResults.forEach(r => {
        if (r.status === "fulfilled") results.push(r.value);
        else results.push({ category: "unknown", status: "error", error: r.reason });
      });
    }

    return NextResponse.json({ message: "Self-healing process completed.", summary: results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Auto-Fill Critical Error:", error);
    return NextResponse.json({ error: "Internal Server Error", detail: msg, stack }, { status: 500 });
  }
}
