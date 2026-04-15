import { NextResponse } from "next/server";
import { fetchNewsByCategory, NewsCategory } from "@/services/rssService";

export const dynamic = "force-dynamic";

const CATEGORIES: NewsCategory[] = [
  "NATION", "WORLD", "SPORTS", "ENTERTAINMENT", "KPOP",
  "IT", "AI", "POLITICS", "TRAVEL", "PERSON", "JEJU", "REGION"
];

export async function GET() {
  const results: { category: string; count: number; items: any[]; error?: string }[] = [];

  for (const cat of CATEGORIES) {
    try {
      const news = await fetchNewsByCategory(cat);
      results.push({
        category: cat,
        count: news.length,
        items: news.slice(0, 5).map(n => ({
          title: n.title,
          link: n.link,
          pubDate: n.pubDate,
          hasContent: !!(n.content || (n as any).contentSnippet),
        })),
      });
    } catch (err: any) {
      results.push({
        category: cat,
        count: 0,
        items: [],
        error: err.message || String(err),
      });
    }
  }

  return NextResponse.json({ results });
}
