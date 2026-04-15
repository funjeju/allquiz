import { NextRequest, NextResponse } from "next/server";
import { getCategoryCounts, getUsedUrls } from "@/services/quizService";
import { fetchNewsByCategory, NewsCategory } from "@/services/rssService";
import { subDays } from "date-fns";

export const dynamic = "force-dynamic";

const DAILY_TARGET = 10;
const CATEGORIES: NewsCategory[] = [
  "IT", "AI", "JEJU", "NATION", "WORLD", "KPOP", "SPORTS", "ENTERTAINMENT"
];

/**
 * 갭(Gap)만큼 어제 날짜의 뉴스를 가져와 '스테이징(임시 저장)' 목록으로 반환하는 API
 */
export async function POST(req: NextRequest) {
  try {
    const currentCounts = await getCategoryCounts();
    const usedUrls = await getUsedUrls();
    const yesterday = subDays(new Date(), 1);
    
    const draftQueue: any[] = [];

    for (const cat of CATEGORIES) {
      try {
        const current = currentCounts[cat] || 0;
        const gap = DAILY_TARGET - current;

        if (gap <= 0) continue;

        // 1. 해당 카테고리 어제 뉴스 수집
        const allNews = await fetchNewsByCategory(cat, yesterday);
        // 이미 사용된 URL 제외
        const freshNews = allNews.filter(n => n.link && !usedUrls.includes(n.link));
        
        // 2. 필요한 만큼만 큐에 추가
        const targetNews = freshNews.slice(0, gap);

        targetNews.forEach(news => {
          draftQueue.push({
            ...news,
            category: cat,
            status: "pending"
          });
        });
      } catch (catError) {
        console.error(`[Gather] Failed for ${cat}:`, catError);
      }
    }

    return NextResponse.json({
      message: "News gathering completed.",
      drafts: draftQueue,
      date: yesterday.toISOString()
    });
  } catch (error) {
    console.error("Gather Critical Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
