import parser from "@/lib/rss-parser";

export type NewsCategory =
  | "NATION"
  | "WORLD"
  | "SPORTS"
  | "ENTERTAINMENT"
  | "KPOP"
  | "IT"
  | "AI"
  | "POLITICS"
  | "TRAVEL"
  | "PERSON"
  | "JEJU"
  | "REGION";

const CATEGORY_MAP: Record<string, string> = {
  NATION: "https://news.google.com/rss/headlines/section/topic/NATION?hl=ko&gl=KR&ceid=KR:ko",
  WORLD: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=ko&gl=KR&ceid=KR:ko",
  SPORTS: "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko",
  ENTERTAINMENT: "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko",
  IT: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko",
  POLITICS: `https://news.google.com/rss/search?q=${encodeURIComponent("정치")}&hl=ko&gl=KR&ceid=KR:ko`,
  KPOP: "https://news.google.com/rss/search?q=Kpop&hl=ko&gl=KR&ceid=KR:ko",
  AI: `https://news.google.com/rss/search?q=${encodeURIComponent("인공지능")}&hl=ko&gl=KR&ceid=KR:ko`,
  TRAVEL: `https://news.google.com/rss/search?q=${encodeURIComponent("여행")}&hl=ko&gl=KR&ceid=KR:ko`,
  PERSON: `https://news.google.com/rss/search?q=${encodeURIComponent("인물")}&hl=ko&gl=KR&ceid=KR:ko`,
  JEJU: `https://news.google.com/rss/search?q=${encodeURIComponent("제주")}&hl=ko&gl=KR&ceid=KR:ko`,
};

const REGIONS = ["서울", "부산", "인천", "대구", "광주", "대전", "울산"];

import { format, subDays, isSameDay } from "date-fns";

export async function fetchNewsByCategory(category: NewsCategory, targetDate?: Date) {
  let url = CATEGORY_MAP[category];
  const searchDate = targetDate || subDays(new Date(), 1); // 기본값 어제
  const dateStr = format(searchDate, "yyyy-MM-dd");
  const tomorrowStr = format(new Date(searchDate.getTime() + 86400000), "yyyy-MM-dd");

  if (category === "REGION") {
    const today = new Date().getDay();
    const region = REGIONS[today % REGIONS.length];
    url = `https://news.google.com/rss/search?q=${encodeURIComponent(region + " 지역")}&hl=ko&gl=KR&ceid=KR:ko`;
  }

  // 검색 기반 URL에 날짜 필터 주입
  if (url && url.includes("/search?q=")) {
    url += `%20after:${dateStr}%20before:${tomorrowStr}`;
  }

  if (!url) throw new Error(`Unknown category: ${category}`);

  const feed = await parser.parseURL(url);
  const items = feed.items.map((item) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    content: item.contentSnippet || item.content,
  }));

  // 헤드라인/섹션 기반 뉴스(날짜 필터 주입 불가)는 수동 필터링
  if (targetDate) {
    return items.filter(item => {
        if (!item.pubDate) return true;
        return isSameDay(new Date(item.pubDate), targetDate);
    });
  }

  return items;
}

export async function fetchAllDailyNews(filterCategories?: NewsCategory[]) {
  const targetCategories = filterCategories || [
    "NATION", "WORLD", "SPORTS", "ENTERTAINMENT", "KPOP", 
    "IT", "AI", "POLITICS", "TRAVEL", "PERSON", "JEJU", "REGION"
  ];

  const results = await Promise.allSettled(
    targetCategories.map(async (cat) => {
      const news = await fetchNewsByCategory(cat);
      // Return full list to allow consumer to pick unique items based on requested count
      return { category: cat, news };
    })
  );

  return results
    .filter((res): res is PromiseFulfilledResult<{ category: NewsCategory; news: any[] }> => res.status === "fulfilled")
    .map((res) => res.value);
}
