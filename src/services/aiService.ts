import { geminiModel } from "@/lib/gemini";
import { anthropic } from "@/lib/anthropic";
import { QuizGenerationOutputSchema, QuizGenerationOutput } from "@/lib/schemas";

// ─── STEP 1: Gemini 초안 생성 프롬프트 ─────────────────────────────────────

const GEMINI_SYSTEM_PROMPT = `
당신은 'Rank & Quiz' 앱의 퀴즈 마스터 AI입니다.
제공된 뉴스 사실(Fact)을 바탕으로 동적인 퀴즈를 생성하세요.

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
  draftJson: string
) => `
당신은 퀴즈 품질 검증 전문가입니다.
아래의 뉴스 기사를 바탕으로 Gemini AI가 생성한 퀴즈 초안을 검증하고 개선해주세요.

## 원본 기사
제목: ${articleTitle}
내용: ${articleContent}

## Gemini 초안 (JSON)
${draftJson}

## 검증 및 개선 기준
1. **정답 검증**: answer 값이 options 배열에 정확히 포함되어 있는지, 실제로 옳은 답인지 확인
2. **오답 설계**: 나머지 3개 선택지가 그럴듯하지만 명확히 틀린 오답인지 확인. 너무 뻔하거나 무관한 선택지는 개선
3. **문제 수준**: 너무 쉽거나(정답이 문제에 그대로 노출) 너무 어렵거나 모호한 문제는 수정
4. **사실 정확성**: 기사 내용과 다른 내용이 정답으로 설정된 경우 수정
5. **teen/adult 분리**: teen 버전은 쉽고 재미있게, adult 버전은 심층적이고 품격 있게 구분되었는지 확인
6. **explanation 완성도**: 왜 정답인지, 왜 오답들이 틀렸는지 명확하게 설명

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
    const prompt = CLAUDE_REVIEW_PROMPT(articleTitle, articleContent, draftJson);

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

  const prompt = `
카테고리: ${category}
출처: ${sourceUrl}
${safeTitle ? `핵심 제목: ${safeTitle}` : ""}

[분석 내용]
${safeText || "제목 정보만 있습니다. 제목을 바탕으로 퀴즈를 생성해주세요."}

위 내용을 바탕으로 'Rank & Quiz' 고퀄리티 퀴즈(Teen/Adult용 각 1개)를 생성해줘. JSON으로만 대답해.
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
  const content = newsItem.content || newsItem.contentSnippet || newsItem.title || "";
  return generateQuizFromText(category, content, newsItem.link, newsItem.title);
}
