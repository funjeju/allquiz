import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { geminiModel } from "@/lib/gemini";
import { generateCrossword, CrosswordPuzzle, WordInput } from "@/lib/crossword";
import { fetchNewsByCategory, NewsCategory } from "./rssService";

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
  const headlineText = headlines.map(h => `[${h.category}] ${h.title}`).join("\n");

  const prompt = `오늘(${dateStr}) 한국 주요 뉴스 헤드라인을 분석해서 낱말퀴즈(십자말풀이)에 적합한 키워드를 추출하세요.

뉴스 헤드라인:
${headlineText}

요구사항:
1. 순수 한글 낱말만 포함 (영어, 숫자, 외래어 혼용 단어는 제외)
2. 2~6글자 한글 낱말 (음절 단위로 계산)
3. 오늘 뉴스에서 핵심적으로 다뤄진 키워드 우선
4. 교차점 생성을 위해 공통 음절을 가진 단어 쌍을 의도적으로 포함 (예: "대통령" + "대화" → "대" 공유)
5. 각 단어에 15~35자 힌트 작성 (뉴스 맥락 반영, 정답 단어 직접 언급 금지)
6. 정확히 14개 키워드 추출

JSON 형식으로만 출력 (다른 설명 없이):
{
  "title": "${dateStr.replace(/-/g, '년 ').replace(/년 (\d+)/, '년 $1월 ').replace(/월 (\d+)$/, '월 $1일')} 오늘의 뉴스 낱말퀴즈",
  "keywords": [
    { "word": "관세", "clue": "트럼프가 무역 전쟁에서 상대국에 부과하는 수입 세금", "category": "WORLD" },
    { "word": "인공지능", "clue": "챗GPT로 대표되는 첨단 기술의 한국어 총칭", "category": "IT" }
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

export async function generateAndSaveDailyCrossword(date?: string): Promise<CrosswordPuzzle> {
  const dateStr = date ?? getKSTDateString();

  // Return existing if already generated
  const existing = await getDailyCrossword(dateStr);
  if (existing) return existing;

  const headlines = await fetchHeadlines();
  if (headlines.length < 5) throw new Error("Insufficient headlines to generate crossword");

  const { title, keywords } = await extractKeywordsViaAI(headlines, dateStr);
  if (keywords.length < 4) throw new Error("AI returned too few valid keywords");

  // Try generating — retry once with fresh shuffle if first attempt fails
  let puzzle = generateCrossword(keywords, dateStr, title);
  if (!puzzle) {
    puzzle = generateCrossword([...keywords].reverse(), dateStr, title);
  }
  if (!puzzle) throw new Error("Could not produce a valid crossword layout from the keywords");

  const toStore: StoredCrossword = { ...puzzle, generatedAt: Timestamp.now() };
  await setDoc(doc(db, COLLECTION, dateStr), toStore);

  return puzzle;
}
