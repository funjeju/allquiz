import { geminiModel } from "@/lib/gemini";
import { anthropic } from "@/lib/anthropic";
import { QuizGenerationOutputSchema, QuizGenerationOutput } from "@/lib/schemas";
import { extractArticleContent } from "./extractionService";

// ─── 카테고리별 심화 가이드라인 ───────────────────────────────────────────

const CATEGORY_GUIDELINES: Record<string, string> = {
  ENTERTAINMENT: `
[연예 카테고리 특별 지침]
- 절대 금지: 기사 제목에서 바로 알 수 있는 질문 (예: "누가 이 드라마에 출연했나요?")
- 이런 방향으로 출제:
  * 해당 배우/가수의 이전 작품·수상 이력·데뷔 연도와 연결한 질문
  * 드라마/영화의 제작사, 감독, 방영 채널 등 주변 정보 활용
  * 오답 선택지는 비슷한 급의 다른 배우/작품으로 구성해 헷갈리게
- 목표 난이도: 연예 팬은 알지만 일반인은 찾아봐야 아는 수준`,

  SPORTS: `
[스포츠 카테고리 특별 지침]
- 절대 금지: "어느 팀이 이겼나요?", "최종 스코어는?" 같은 결과만 묻는 질문
- 이런 방향으로 출제:
  * 해당 선수의 통산 기록, 역대 순위, 특이 기록 관련 질문
  * 팀 역사, 감독 경력, 리그 맥락을 포함한 질문
  * 오답은 실제 비슷한 수치·시즌·선수명으로 구성해 스포츠 팬도 헷갈리게
- 목표 난이도: 중급 스포츠 팬 기준 정답률 50~70%`,

  KPOP: `
[K-pop 카테고리 특별 지침]
- 절대 금지: 기사에 그대로 나온 그룹명·곡명을 정답으로 묻는 질문
- 이런 방향으로 출제:
  * 멤버 수, 데뷔일, 소속사, 이전 앨범 타이틀 등 구체적 정보 활용
  * 빌보드/가온차트 순위, 음방 1위 횟수 등 수치 기반 질문
  * 멤버 개인 활동, 솔로 앨범, 수상 내역 등 팬덤 지식 활용
- 목표 난이도: 라이트 팬은 헷갈리지만 코어 팬은 아는 수준`,

  PERSON: `
[인물 카테고리 특별 지침]
- 이 기사는 다양한 분야(정치, 연예, 스포츠, 국제 등)에서 가져온 뉴스입니다.
- 핵심 방향: 기사에 등장하는 **특정 인물**을 주인공으로 퀴즈를 만드세요.
- 이런 방향으로 출제:
  * 해당 인물의 직책/직업/소속·경력 관련 질문
  * 인물이 이룬 업적, 기록, 발언, 수상 이력 관련 질문
  * "이 인물은 누구인가?" 형태보다 "이 인물이 한 일은?" 형태로
  * 오답 선택지는 비슷한 분야의 실제 인물명이나 사실로 구성
- 기사 내 인물이 불분명하거나 특정 인물이 없으면 다음 기사로 넘어가세요.
- 목표 난이도: 해당 분야 관심자는 알지만 일반인은 헷갈리는 수준`,
};

const getCategoryGuideline = (category: string): string =>
  CATEGORY_GUIDELINES[category] ?? "";

// ─── STEP 1: Gemini 초안 생성 프롬프트 ─────────────────────────────────────

const GEMINI_SYSTEM_PROMPT = `
당신은 'Rank & Quiz' 앱의 퀴즈 마스터 AI입니다.
제공된 뉴스 사실(Fact)을 바탕으로 동적인 퀴즈를 생성하세요.

[핵심 원칙 - 반드시 준수]
- **절대 금지**: 기사 제목만 읽어도 바로 알 수 있는 질문. 예: 제목이 "손흥민, 100호골 달성"이면 "손흥민이 달성한 것은?"은 금지.
- **필수**: 제목 너머의 배경 지식, 수치, 역사적 맥락, 관련 인물/기관 정보를 활용한 질문.
- **Google Search Grounding 적극 활용**: 기사 내용이 부족하면 반드시 구글 검색으로 해당 뉴스의 상세 사실을 직접 찾아서 퀴즈를 만드세요. 검색 없이 제목만으로 만들지 마세요.
- **난이도**: 해당 분야에 관심 있는 사람은 알지만, 관심 없는 사람은 헷갈리는 수준.

[규칙]
1. 청중은 'teen'(10대)과 'adult'(성인)로 나뉩니다.
   - teen: 트렌디하고 유머러스한 말투, 이모지 사용, 10대가 공감할 언어 사용.
   - adult: 품격 있고 신뢰감 있는 신문 기사형 문체.
2. viral_copy는 카카오톡 공유 시 사용될 제목과 도발 멘트입니다.
3. quiz_type은 MULTIPLE_CHOICE, OX, SPEED, TRAP 중 하나를 선택하세요.
4. explanation에 정답 근거와 틀리기 쉬운 이유를 명시하세요.
5. 반드시 유효한 JSON 형식으로만 응답하세요.

[JSON 구조]
{
  "category": "...",
  "source_url": "...",
  "base_fact": "...",
  "quizzes": {
    "teen": { "question": "...", "options": ["...", "...", "...", "..."], "answer": "..." },
    "adult": { "question": "...", "options": ["...", "...", "...", "..."], "answer": "..." }
  },
  "viral_copy": { "kakao_title": "...", "kakao_taunt": "..." },
  "explanation": { "correct": "...", "wrong": "..." },
  "quiz_type": "MULTIPLE_CHOICE",
  "trap_options": ["...", "..."]
}
`;

// ─── STEP 2: Claude 검증·개선 프롬프트 ────────────────────────────────────

const CLAUDE_REVIEW_PROMPT = (
  articleTitle: string,
  articleContent: string,
  draftJson: string,
  category: string
) => `
당신은 퀴즈 품질 검증 전문가입니다.
아래의 뉴스 기사를 바탕으로 Gemini AI가 생성한 퀴즈 초안을 검증하고 개선해주세요.

## 원본 기사
제목: ${articleTitle}
내용: ${articleContent}

## Gemini 초안 (JSON)
${draftJson}
${getCategoryGuideline(category) ? `
## 카테고리 특별 요구사항 (반드시 준수)
${getCategoryGuideline(category)}
` : ""}
## 검증 및 개선 기준
1. **제목 노출 금지 (최우선)**: 기사 제목을 그대로 읽으면 정답을 알 수 있는 문제는 반드시 수정. 배경 지식이나 추가 정보를 요구하는 질문으로 바꿀 것.
2. **정답 검증**: answer 값이 options 배열에 정확히 포함되어 있는지, 실제로 옳은 답인지 확인
3. **오답 설계**: 나머지 3개 선택지가 그럴듯하지만 명확히 틀린 오답인지 확인. 너무 뻔하거나 무관한 선택지는 개선
4. **문제 수준**: 너무 쉽거나(정답이 문제에 그대로 노출) 너무 어렵거나 모호한 문제는 수정
5. **사실 정확성**: 기사 내용과 다른 내용이 정답으로 설정된 경우 수정
6. **teen/adult 분리**: teen 버전은 쉽고 재미있게, adult 버전은 심층적이고 품격 있게 구분되었는지 확인
7. **explanation 완성도**: 왜 정답인지, 왜 오답들이 틀렸는지 명확하게 설명

## 출력 규칙
- 수정이 필요하면 개선된 JSON을 반환
- 이미 충분히 좋으면 원본 그대로 반환
- JSON 외에 다른 텍스트는 절대 포함하지 말 것
- 원본과 동일한 JSON 구조를 유지할 것
`;

// ─── Pipeline ──────────────────────────────────────────────────────────────

async function reviewWithClaude(
  articleTitle: string,
  articleContent: string,
  draft: QuizGenerationOutput
): Promise<QuizGenerationOutput> {
  // Claude API 키 없으면 Gemini 초안 그대로 반환
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("[Claude Review] ANTHROPIC_API_KEY not set, skipping review");
    return draft;
  }

  try {
    const draftJson = JSON.stringify(draft, null, 2);
    const prompt = CLAUDE_REVIEW_PROMPT(articleTitle, articleContent, draftJson, draft.category);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[Claude Review] No JSON in response, using Gemini draft");
      return draft;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const reviewed = QuizGenerationOutputSchema.parse({
      ...parsed,
      category: draft.category,
      source_url: draft.source_url,
    });

    console.log(`[Claude Review] ✓ Improved quiz for category: ${draft.category}`);
    return reviewed;
  } catch (error) {
    console.warn("[Claude Review] Failed, using Gemini draft:", error);
    return draft; // 실패해도 Gemini 초안으로 fallback
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function generateQuizFromText(
  category: string,
  text: string,
  sourceUrl: string,
  title?: string
): Promise<QuizGenerationOutput | null> {
  const safeText = (text || "").slice(0, 3000);
  const safeTitle = title || "";

  const categoryGuideline = getCategoryGuideline(category);

  const prompt = `
카테고리: ${category}
출처: ${sourceUrl}
${safeTitle ? `핵심 제목: ${safeTitle}` : ""}
${categoryGuideline}

[분석 내용]
${safeText || "(본문 없음 — Google Search Grounding으로 위 제목의 뉴스를 직접 검색해서 구체적인 사실과 배경 정보를 파악한 후 퀴즈를 만드세요. 제목에서 바로 알 수 있는 답은 절대 금지)"}

위 내용을 바탕으로 'Rank & Quiz' 고퀄리티 퀴즈(Teen/Adult용 각 1개)를 생성해줘. JSON으로만 대답해.
중요: 정답이 기사 제목에서 바로 읽히면 안 됩니다. 배경 지식을 요구하는 질문을 만드세요.
`;

  try {
    // STEP 1: Gemini가 Google Search Grounding으로 최신 정보 검색 후 초안 생성
    console.log(`[Gemini+Grounding] Generating draft for ${category}...`);
    const result = await geminiModel.generateContentGrounded([
      { text: GEMINI_SYSTEM_PROMPT },
      { text: prompt },
    ]);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Gemini response");

    const parsed = JSON.parse(jsonMatch[0]);
    const draft = QuizGenerationOutputSchema.parse({
      ...parsed,
      category,
      source_url: sourceUrl,
      base_fact: safeTitle || parsed.base_fact || category,
    });

    console.log(`[Gemini] ✓ Draft created for ${category}`);

    // STEP 2: Claude가 검증·개선
    const reviewed = await reviewWithClaude(safeTitle, safeText, draft);
    return reviewed;

  } catch (error) {
    console.error(`[Quiz Generation Error] [${category}]:`, error);
    return null;
  }
}

export async function generateQuizFromNews(
  category: string,
  newsItem: any
): Promise<QuizGenerationOutput | null> {
  let title = newsItem.title || "";
  let content = newsItem.content || newsItem.contentSnippet || "";

  // 기사 본문 직접 추출 시도 (실패 시 RSS snippet으로 fallback)
  if (newsItem.link) {
    try {
      const extracted = await extractArticleContent(newsItem.link);
      if (extracted?.content && extracted.content.length > 300) {
        content = extracted.content;
        if (extracted.title && extracted.title.length > title.length) {
          title = extracted.title;
        }
        console.log(`[Extract] ✓ ${category} 본문 추출 성공 (${content.length}자)`);
      } else {
        console.log(`[Extract] 본문 부족, RSS snippet 사용 (${category})`);
      }
    } catch {
      console.log(`[Extract] 추출 실패, RSS snippet 사용 (${category})`);
    }
  }

  return generateQuizFromText(category, content || title, newsItem.link, title);
}
