import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { CrosswordPuzzle, WordInput } from "@/lib/crossword";
import type { NewsCategory } from "./rssService";

const COLLECTION = "crossword_daily";

const FETCH_CATEGORIES: NewsCategory[] = [
  "NATION", "WORLD", "POLITICS", "IT", "AI", "SPORTS", "ENTERTAINMENT", "KPOP",
];

interface StoredCrossword extends CrosswordPuzzle {
  generatedAt: Timestamp;
}

export function getKSTDateString(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export async function getDailyCrossword(date?: string): Promise<CrosswordPuzzle | null> {
  const dateStr = date ?? getKSTDateString();
  const snap = await getDoc(doc(db, COLLECTION, dateStr));
  if (!snap.exists()) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { generatedAt, ...puzzle } = snap.data() as StoredCrossword;
  return puzzle as CrosswordPuzzle;
}

async function fetchHeadlines(): Promise<{ title: string; category: NewsCategory }[]> {
  // Server-only: dynamic import to avoid bundling rssService on the client
  const { fetchNewsByCategory } = await import("./rssService");
  const results = await Promise.allSettled(
    FETCH_CATEGORIES.map(async cat => {
      const news = await fetchNewsByCategory(cat);
      return news.slice(0, 6).map(n => ({ title: n.title ?? "", category: cat }));
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<{ title: string; category: NewsCategory }[]> => r.status === "fulfilled")
    .flatMap(r => r.value)
    .filter(n => n.title.length > 2);
}

async function extractKeywordsViaAI(
  headlines: { title: string; category: NewsCategory }[],
  dateStr: string
): Promise<{ title: string; keywords: WordInput[] }> {
  // Server-only: dynamic import so GEMINI_API_KEY is only checked at call time
  const { geminiModel } = await import("@/lib/gemini");
  const headlineText = headlines.map(h => `[${h.category}] ${h.title}`).join("\n");

  const prompt = `오늘(${dateStr}) 뉴스를 바탕으로 한국어 십자말풀이(낱말퀴즈)를 만들 단어 목록을 생성하세요.

뉴스 헤드라인:
${headlineText}

━━━ 핵심 조건 (매우 중요) ━━━
십자말풀이는 단어들이 공통 음절에서 수직·수평으로 교차해야 합니다.
따라서 단어를 다음 방식으로 선정하세요:

[STEP 1] 오늘 뉴스 핵심어 5~6개를 선정 (예: "정부", "경제", "관세")

[STEP 2] 각 핵심어와 공통 음절을 가진 연관 단어를 2~3개씩 추가
  예시:
  • "정부" → "정책"(정), "정치"(정), "부채"(부), "부담"(부)
  • "경제" → "경기"(경), "경쟁"(경), "제도"(제), "제품"(제)
  • "관세" → "관계"(관), "관심"(관), "세금"(세), "세계"(세)

[STEP 3] 총 16~18개 단어를 최종 선정
  - 순수 한글만 (영어·숫자·외래어 혼용 제외)
  - 2~6음절
  - 각 단어: 15~35자 힌트 (뉴스 맥락 반영, 정답 직접 언급 금지)

JSON만 출력 (설명 없이):
{
  "title": "${dateStr.replace(/-/g, '년 ').replace(/년 (\d+)/, '년 $1월 ').replace(/월 (\d+)$/, '월 $1일')} 오늘의 뉴스 낱말퀴즈",
  "keywords": [
    { "word": "정부", "clue": "국가 행정을 책임지는 최고 기관", "category": "POLITICS" },
    { "word": "정책", "clue": "정부가 사회 문제 해결을 위해 세운 방침", "category": "POLITICS" },
    { "word": "관세", "clue": "수입품에 부과하는 세금으로 무역 갈등의 핵심", "category": "WORLD" }
  ]
}`;

  const res = await geminiModel.generateContentGrounded([{ text: prompt }]);
  const raw = res.response.text();

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI response did not contain valid JSON");

  const parsed = JSON.parse(match[0]) as {
    title: string;
    keywords: Array<{ word: string; clue: string; category: string }>;
  };

  return {
    title: parsed.title,
    keywords: parsed.keywords.map(k => ({
      word: k.word.trim(),
      clue: k.clue.trim(),
      category: k.category,
    })),
  };
}

async function extractKeywordsWithSharedSyllables(
  headlines: { title: string; category: NewsCategory }[],
  dateStr: string
): Promise<{ title: string; keywords: WordInput[] }> {
  const { geminiModel } = await import("@/lib/gemini");

  // Pick 3 common Korean syllables that appear in news and build words around them
  const prompt = `오늘(${dateStr}) 뉴스: ${headlines.slice(0, 15).map(h => h.title).join(" | ")}

위 뉴스를 참고하되, 아래 규칙으로 십자말풀이 단어 목록을 만드세요.

규칙:
1. "가", "나", "다" 같은 공통 첫 음절을 중심으로 단어 클러스터를 구성하세요
2. 예: "경제", "경기", "경쟁", "경찰" — "경"으로 시작하는 뉴스 관련 단어들
3. 각 클러스터 3~4단어, 3~4개 클러스터 = 총 12~16개 단어
4. 클러스터마다 다른 첫 음절 사용 (예: "경~", "정~", "대~", "국~")
5. 모든 단어: 순수 한글 2~5음절, 힌트 15~35자

JSON만 출력:
{
  "title": "...",
  "keywords": [
    { "word": "경제", "clue": "국가의 생산·소비·분배 활동을 통칭하는 말", "category": "NATION" }
  ]
}`;

  const res = await geminiModel.generateContentGrounded([{ text: prompt }]);
  const raw = res.response.text();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { title: `${dateStr} 오늘의 뉴스 낱말퀴즈`, keywords: [] };

  const parsed = JSON.parse(match[0]) as {
    title: string;
    keywords: Array<{ word: string; clue: string; category: string }>;
  };

  return {
    title: parsed.title,
    keywords: parsed.keywords.map(k => ({
      word: k.word.trim(),
      clue: k.clue.trim(),
      category: k.category,
    })),
  };
}

export async function generateAndSaveDailyCrossword(date?: string): Promise<CrosswordPuzzle> {
  const dateStr = date ?? getKSTDateString();

  // Return existing if already generated
  const existing = await getDailyCrossword(dateStr);
  if (existing) return existing;

  const headlines = await fetchHeadlines();
  if (headlines.length < 5) throw new Error("Insufficient headlines to generate crossword");

  const { title, keywords } = await extractKeywordsViaAI(headlines, dateStr);
  if (keywords.length < 4) throw new Error("AI returned too few valid keywords");

  // Server-only: dynamic import for the layout algorithm
  const { generateCrossword } = await import("@/lib/crossword");

  // Try with original keywords, then with extra AI-generated connector words if needed
  let puzzle = generateCrossword(keywords, dateStr, title);
  if (!puzzle) {
    // Retry: ask AI again with stricter syllable-sharing instruction
    console.warn("[crossword] First layout attempt failed, retrying with stricter prompt...");
    const retry = await extractKeywordsWithSharedSyllables(headlines, dateStr);
    puzzle = generateCrossword(retry.keywords, dateStr, retry.title ?? title);
  }
  if (!puzzle) throw new Error("Could not produce a valid crossword layout from the keywords");

  const toStore: StoredCrossword = { ...puzzle, generatedAt: Timestamp.now() };
  await setDoc(doc(db, COLLECTION, dateStr), toStore);

  return puzzle;
}
