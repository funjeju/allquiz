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

// PERSON 카테고리는 독립 URL 없음 — 다른 카테고리 뉴스에서 인물 기사를 추출
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
  JEJU: `https://news.google.com/rss/search?q=${encodeURIComponent("제주도 OR 제주시 OR 서귀포 OR 제주관광 OR 제주행정")}&hl=ko&gl=KR&ceid=KR:ko`,
};

// PERSON 피드를 구성하는 기반 카테고리 (재귀 방지를 위해 직접 URL 목록)
const PERSON_SOURCE_CATEGORIES: Array<keyof typeof CATEGORY_MAP> = [
  "NATION", "WORLD", "POLITICS", "ENTERTAINMENT", "SPORTS", "KPOP",
];

const REGIONS = ["서울", "부산", "인천", "대구", "광주", "대전", "울산"];

import { format, subDays, isSameDay } from "date-fns";

// 카테고리별 날짜 범위 (일수) — 기사량이 적은 카테고리는 범위를 넓힘
const CATEGORY_DATE_RANGE: Partial<Record<NewsCategory, number>> = {
  JEJU: 3,
  REGION: 3,
  PERSON: 2,
  TRAVEL: 2,
};

// 단일 URL로부터 뉴스 아이템 가져오기
async function fetchFromUrl(url: string, targetDate?: Date) {
  const feed = await parser.parseURL(url);
  const items = feed.items.map((item) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    content: item.contentSnippet || item.content,
  }));

  if (targetDate) {
    return items.filter(item => {
      if (!item.pubDate) return true;
      return isSameDay(new Date(item.pubDate), targetDate);
    });
  }
  return items;
}

export async function fetchNewsByCategory(category: NewsCategory, targetDate?: Date) {
  const searchDate = targetDate || subDays(new Date(), 1);
  const rangeDays = CATEGORY_DATE_RANGE[category] ?? 1;
  const fromDate = subDays(searchDate, rangeDays - 1);
  const dateStr = format(fromDate, "yyyy-MM-dd");
  const tomorrowStr = format(new Date(searchDate.getTime() + 86400000), "yyyy-MM-dd");

  type NewsItem = { title: string | undefined; link: string | undefined; pubDate: string | undefined; content: string | undefined };

  // PERSON: 다른 카테고리 뉴스를 합산해서 반환 (인물 기사 추출용)
  if (category === "PERSON") {
    const results = await Promise.allSettled(
      PERSON_SOURCE_CATEGORIES.map(cat => {
        let url = CATEGORY_MAP[cat];
        if (url.includes("/search?q=")) {
          url += `%20after:${dateStr}%20before:${tomorrowStr}`;
        }
        return fetchFromUrl(url, targetDate);
      })
    );
    const seen = new Set<string>();
    const merged: NewsItem[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") {
        for (const item of r.value) {
          if (item.link && !seen.has(item.link)) {
            seen.add(item.link);
            merged.push(item);
          }
        }
      }
    }
    return merged;
  }

  let url = CATEGORY_MAP[category];

  if (category === "REGION") {
    const today = new Date().getDay();
    const region = REGIONS[today % REGIONS.length];
    url = `https://news.google.com/rss/search?q=${encodeURIComponent(region + " 지역")}&hl=ko&gl=KR&ceid=KR:ko`;
  }

  if (!url) throw new Error(`Unknown category: ${category}`);

  // 검색 기반 URL에 날짜 필터 주입
  if (url.includes("/search?q=")) {
    url += `%20after:${dateStr}%20before:${tomorrowStr}`;
  }

  return fetchFromUrl(url, targetDate);
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
