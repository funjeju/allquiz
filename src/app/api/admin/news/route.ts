import { NextRequest, NextResponse } from "next/server";
import { fetchNewsByCategory, NewsCategory } from "@/services/rssService";

/**
 * 어드민이 출제 전 최신 뉴스를 브라우징하기 위한 API
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = (searchParams.get("category") || "IT") as NewsCategory;

  try {
    const news = await fetchNewsByCategory(category);
    return NextResponse.json(news);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
