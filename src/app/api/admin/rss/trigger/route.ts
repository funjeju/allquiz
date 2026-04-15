import { NextRequest, NextResponse } from "next/server";
import { fetchNewsByCategory, NewsCategory } from "@/services/rssService";
import { generateQuizFromNews } from "@/services/aiService";
import { saveQuizToFirestore } from "@/services/quizService";

export const dynamic = "force-dynamic";

interface GenerationConfig {
  category: NewsCategory;
  count: number;
  specificLink?: string; // 특정 뉴스로만 생성하고 싶을 때 사용 (스테이징용)
}

/**
 * 정밀 자동 출제 트리거
 */
export async function POST(req: NextRequest) {
  try {
    const { configs }: { configs: GenerationConfig[] } = await req.json();
    
    if (!configs || configs.length === 0) {
      return NextResponse.json({ error: "No generation configs provided." }, { status: 400 });
    }

    const overallResults = [];

    for (const config of configs) {
      console.log(`Processing precision bulk for ${config.category}...`);
      
      let targetNews: any[] = [];

      if (config.specificLink) {
        // 1-1. 특정 링크가 주어진 경우 (스테이징 승인건)
        // RSS 전체를 가져온 뒤 해당 링크만 필터링 (가장 안전한 방법)
        const allNews = await fetchNewsByCategory(config.category);
        const match = allNews.find(n => n.link === config.specificLink);
        if (match) targetNews = [match];
      } else {
        // 1-2. 수량만 주어진 경우 (벌크 자동화건)
        const allNews = await fetchNewsByCategory(config.category);
        targetNews = allNews.slice(0, config.count);
      }

      const categoryResults = [];

      // 2. 뉴스별로 문항 생성
      for (const newsItem of targetNews) {
        try {
          const quiz = await generateQuizFromNews(config.category, newsItem);
          if (quiz) {
            await saveQuizToFirestore(quiz);
            categoryResults.push({ status: "success", title: newsItem.title });
          }
        } catch (e) {
          categoryResults.push({ status: "error", error: String(e) });
        }
      }

      overallResults.push({
        category: config.category,
        requested: config.count,
        generated: categoryResults.filter(r => r.status === "success").length,
        details: categoryResults
      });
    }

    return NextResponse.json({
      message: "Precision bulk generation completed.",
      summary: overallResults,
    });
  } catch (error) {
    console.error("Precision Trigger Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
