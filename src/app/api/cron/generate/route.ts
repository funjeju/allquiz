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
const CATEGORY_CONCURRENCY = 3;
const ITEM_CONCURRENCY = 3;

export async function GET(req: NextRequest) {
  // Vercel Cron은 Authorization 헤더로 CRON_SECRET을 자동 전송
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    console.log("[Cron] Starting daily quiz generation — KST 06:00");

    const [currentCounts, usedUrls] = await Promise.all([
      getCategoryCounts(),
      getUsedUrls(),
    ]);

    const results: any[] = [];

    for (let i = 0; i < CATEGORIES.length; i += CATEGORY_CONCURRENCY) {
      const batch = CATEGORIES.slice(i, i + CATEGORY_CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async (cat) => {
          const gap = DAILY_TARGET - (currentCounts[cat] || 0);
          if (gap <= 0) return { category: cat, status: "full" };

          const allNews = await fetchNewsByCategory(cat);
          const freshNews = allNews.filter(n => n.link && !usedUrls.includes(n.link));
          const targetNews = freshNews.slice(0, gap);

          console.log(`[Cron] ${cat}: gap=${gap}, fresh=${freshNews.length}, target=${targetNews.length}`);

          let filled = 0;
          for (let j = 0; j < targetNews.length; j += ITEM_CONCURRENCY) {
            const items = targetNews.slice(j, j + ITEM_CONCURRENCY);
            const res = await Promise.allSettled(
              items.map(async (news) => {
                const quiz = await generateQuizFromNews(cat, news);
                if (quiz) { await saveQuizToFirestore(quiz); return true; }
                return false;
              })
            );
            filled += res.filter(r => r.status === "fulfilled" && r.value).length;
          }

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
