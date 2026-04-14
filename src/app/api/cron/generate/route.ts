import { NextRequest, NextResponse } from "next/server";
import { fetchAllDailyNews } from "@/services/rssService";
import { generateQuizFromNews } from "@/services/aiService";
import { saveQuizToFirestore } from "@/services/quizService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // 간단한 보안 체크 (Vercel Cron Secret 사용 가능)
  const authHeader = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    console.log("Starting full AI Pipeline...");
    const dailyNews = await fetchAllDailyNews();
    const generationResults = [];

    for (const item of dailyNews) {
      const topNews = item.news[0]; // 카테고리별 1순위 기사 선택
      if (!topNews) continue;

      console.log(`Generating quiz for category: ${item.category}...`);
      const quiz = await generateQuizFromNews(item.category, topNews);
      
      if (quiz) {
        await saveQuizToFirestore(quiz);
        generationResults.push({ category: item.category, status: "success" });
      } else {
        generationResults.push({ category: item.category, status: "failed" });
      }
    }

    return NextResponse.json({
      message: "AI Pipeline completion",
      results: generationResults,
    });
  } catch (error) {
    console.error("AI Pipeline Critical Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
