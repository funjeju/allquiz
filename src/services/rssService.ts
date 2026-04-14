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
  POLITICS: "https://news.google.com/rss/search?q=정치&hl=ko&gl=KR&ceid=KR:ko",
  KPOP: "https://news.google.com/rss/search?q=Kpop&hl=ko&gl=KR&ceid=KR:ko",
  AI: "https://news.google.com/rss/search?q=인공지능&hl=ko&gl=KR&ceid=KR:ko",
  TRAVEL: "https://news.google.com/rss/search?q=여행&hl=ko&gl=KR&ceid=KR:ko",
  PERSON: "https://news.google.com/rss/search?q=인물&hl=ko&gl=KR&ceid=KR:ko",
  JEJU: "https://news.google.com/rss/search?q=제주&hl=ko&gl=KR&ceid=KR:ko",
};

const REGIONS = ["서울", "부산", "인천", "대구", "광주", "대전", "울산"];

export async function fetchNewsByCategory(category: NewsCategory) {
  let url = CATEGORY_MAP[category];

  if (category === "REGION") {
    const today = new Date().getDay();
    const region = REGIONS[today % REGIONS.length];
    url = `https://news.google.com/rss/search?q=${encodeURIComponent(region)}&hl=ko&gl=KR&ceid=KR:ko`;
  }

  if (!url) throw new Error(`Unknown category: ${category}`);

  const feed = await parser.parseURL(url);
  return feed.items.map((item) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    content: item.contentSnippet || item.content,
  }));
}

export async function fetchAllDailyNews() {
  const categories: NewsCategory[] = [
    "NATION", "WORLD", "SPORTS", "ENTERTAINMENT", "KPOP", 
    "IT", "AI", "POLITICS", "TRAVEL", "PERSON", "JEJU", "REGION"
  ];

  const results = await Promise.allSettled(
    categories.map(async (cat) => {
      const news = await fetchNewsByCategory(cat);
      // Get top 3 news per category to save tokens/complexity later
      return { category: cat, news: news.slice(0, 3) };
    })
  );

  return results
    .filter((res): res is PromiseFulfilledResult<{ category: NewsCategory; news: any[] }> => res.status === "fulfilled")
    .map((res) => res.value);
}
