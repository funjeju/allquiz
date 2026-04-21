import { geminiModel } from "@/lib/gemini";
import { anthropic } from "@/lib/anthropic";
import { QuizGenerationOutputSchema, QuizGenerationOutput } from "@/lib/schemas";
import { extractArticleContent } from "./extractionService";

// ─── 카테고리별 심화 가이드라인 ───────────────────────────────────────────

const CATEGORY_GUIDELINES: Record<string, string> = {
  ENTERTAINMENT: `
[연예 카테고리 — 시사상식 출제 지침]
- 절대 금지: 기사에서 바로 읽히는 질문. "누가 이 드라마에 출연했나요?" 금지.
- 시사상식 방향:
  * "이 배우의 데뷔작 / 첫 주연 작품은?" — 커리어 배경 지식 테스트
  * "이 드라마의 원작 소설 작가 / 감독의 전작은?" — 제작 배경 테스트
  * "이 시상식에서 역대 최연소 수상자는?" — 역사적 기록 테스트
  * 오답: 같은 시기 활동한 실제 다른 배우/감독/작품명으로 구성
- 목표: 연예 뉴스 안 봐도 연예 역사를 아는 사람이 맞히는 수준`,

  SPORTS: `
[스포츠 카테고리 — 시사상식 출제 지침]
- 절대 금지: 경기 결과·스코어를 직접 묻는 질문.
- 시사상식 방향:
  * "이 선수가 세운 기록 이전 최고 기록 보유자는?" — 역사적 비교
  * "이 리그에서 해당 기록을 처음 세운 선수/팀은?" — 역사 테스트
  * "이 종목의 올림픽 정식 채택 연도는?" — 종목 배경 지식
  * "이 팀의 역대 최다 우승 감독은?" — 팀 역사 테스트
  * 오답: 실제 비슷한 기록을 가진 다른 선수명·연도·수치로 구성
- 목표: 스포츠 뉴스 팬이 아닌 스포츠 역사를 아는 사람이 맞히는 수준`,

  KPOP: `
[K-pop 카테고리 — 시사상식 출제 지침]
- 절대 금지: 기사에 그대로 나온 그룹명·곡명을 정답으로 묻는 질문.
- 시사상식 방향:
  * "이 그룹의 데뷔 연도 / 데뷔 싱글 제목은?" — 기본 역사
  * "이 앨범보다 먼저 빌보드 200 1위를 달성한 K-pop 앨범은?" — 업적 비교
  * "이 소속사의 다른 대표 그룹은?" — 산업 배경
  * "이 멤버가 과거 출연한 오디션 프로그램은?" — 커리어 배경
  * 오답: 실제 존재하는 다른 그룹명·앨범명·연도로 구성
- 목표: 라이트 팬은 헷갈리지만 K-pop 역사를 아는 팬은 맞히는 수준`,

  PERSON: `
[인물 카테고리 — 시사상식 출제 지침]
- 이 기사는 정치·연예·스포츠·국제 등 다양한 분야에서 가져온 뉴스입니다.
- 시사상식 방향 (기사 내용을 직접 묻지 말 것):
  * "이 인물의 첫 번째 [직책/수상/기록]은?" — 커리어 첫 이정표
  * "이 인물이 재임/활동 중 달성한 역대 최초 기록은?" — 역사적 위상
  * "이 인물의 직속 전임자/후임자는?" — 계보 지식
  * "이 인물과 같은 분야에서 비슷한 기록을 세운 역대 인물은?" — 역사 비교
  * 오답: 비슷한 분야의 실제 다른 인물명이나 사실로 구성
- 인물이 불분명한 기사는 건너뛸 것.
- 목표: 해당 분야를 아는 사람은 맞히지만 처음 듣는 사람은 헷갈리는 수준`,

  NATION: `
[국내 카테고리 — 시사상식 출제 지침]
- 뉴스 사건 자체보다 관련 제도·역사·기관 배경을 테스트.
- 시사상식 방향:
  * 관련 법률·조항의 제정 연도나 내용
  * 해당 기관의 설립 연도·역할·역대 주요 결정
  * 유사한 역사적 사례와의 비교
  * 관련 수치의 역사적 추이 (최고치·최저치 기록 연도 등)`,

  WORLD: `
[국제 카테고리 — 시사상식 출제 지침]
- 국제 뉴스를 소재로 역사·외교·지리 배경 지식 테스트.
- 시사상식 방향:
  * 해당 국가의 정치 체제·지도자 역사
  * 관련 국제기구의 설립 연도·역할·회원국 수
  * 역사적 조약·협정의 체결 연도·당사국
  * 해당 지역 분쟁·협력의 역사적 맥락`,

  POLITICS: `
[정치 카테고리 — 시사상식 출제 지침]
- 정치 뉴스에서 헌법·선거제도·의회 역사 배경 테스트.
- 시사상식 방향:
  * 관련 헌법 조항·개헌 역사
  * 역대 선거 결과·투표율·최초 기록
  * 정당의 창당 연도·역대 대표
  * 관련 법안의 발의·통과 역사`,

  IT: `
[IT 카테고리 — 시사상식 출제 지침]
- 기술 뉴스를 소재로 기술 역사·표준·기업 배경 테스트.
- 시사상식 방향:
  * 해당 기술의 최초 상용화 연도·개발사
  * 관련 표준(ISO·IEEE 등)의 제정 연도
  * 해당 기업의 창업자·설립 연도·첫 제품
  * 유사 기술과의 세대 비교`,

  AI: `
[AI 카테고리 — 시사상식 출제 지침]
- AI 뉴스를 소재로 인공지능 역사·연구·기업 배경 테스트.
- 시사상식 방향:
  * 해당 모델/기술의 최초 제안 논문·연도
  * AI 역사에서 중요한 이정표 (딥블루, AlphaGo, GPT-* 등)와 비교
  * 관련 연구기관·기업의 역사
  * AI 용어의 어원·정의·최초 사용 시점`,
};

const getCategoryGuideline = (category: string): string =>
  CATEGORY_GUIDELINES[category] ?? "";

// ─── STEP 1: Gemini 초안 생성 프롬프트 ─────────────────────────────────────

const GEMINI_SYSTEM_PROMPT = `
당신은 'Rank & Quiz' 앱의 시사상식 퀴즈 마스터 AI입니다.
제공된 뉴스를 '출발점'으로 삼아, 그 주제와 연결된 배경 지식·역사·통계를 테스트하는 시사상식 문제를 만드세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[황금률 — 반드시 준수]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
① 기사 제목·본문을 그대로 읽으면 정답이 나오는 문제는 절대 금지.
② 뉴스는 단순한 소재일 뿐. 정답은 '사전 배경 지식'에서 나와야 한다.
③ "이 뉴스에서 언급된 것은?" 형태의 질문 금지.
   → 대신 "이 뉴스와 관련된 [역사적 사실 / 통계 / 제도 / 기록]은?" 형태로.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[출제 전략 — 뉴스 유형별]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 인물 관련 뉴스 → 해당 인물의 이전 기록·수상·경력·재임 기간 질문
• 사건·사고 → 관련 법률·기관·역사적 유사 사례 질문
• 스포츠 결과 → 해당 종목의 규칙·역대 기록·올림픽 역사 질문
• 경제·산업 → 관련 수치의 역사적 추이·비교 대상·제도 배경 질문
• 문화·연예 → 작품의 배경·수상 역사·장르 특성 질문
• 정치·외교 → 관련 기관·조약·역대 사례 질문

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Google Search Grounding 의무 사항]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 기사 내용이 부족하면 반드시 검색으로 상세 배경을 조사한 후 문제를 만들 것.
- 검색 없이 제목만으로 만들지 말 것.
- 오답 선택지도 검색을 통해 실제로 그럴듯한 혼동 가능한 정보로 구성할 것.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[규칙]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 청중:
   - teen: 트렌디·유머러스 말투, 이모지 허용, 10대 눈높이.
   - adult: 시사교양 프로그램 수준의 품격 있는 문체.
2. 난이도: 해당 분야 관심자 정답률 50~70% 목표.
3. viral_copy: 카카오톡 공유용 제목과 도발 멘트.
4. quiz_type: MULTIPLE_CHOICE, OX, SPEED, TRAP 중 선택.
5. explanation: "왜 정답인지" + "왜 오답들이 헷갈리는지" 모두 서술.
6. 반드시 유효한 JSON 형식으로만 응답.

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
당신은 시사상식 퀴즈 품질 검증 전문가입니다.
뉴스 기사를 참고해 Gemini가 만든 퀴즈 초안을 검증하고 개선하세요.

## 원본 기사
제목: ${articleTitle}
내용: ${articleContent}

## Gemini 초안 (JSON)
${draftJson}
${getCategoryGuideline(category) ? `
## 카테고리 특별 요구사항 (반드시 준수)
${getCategoryGuideline(category)}
` : ""}
## 검증 기준 (우선순위 순)

### ❶ 시사상식 기준 충족 (최우선)
- 기사 제목·본문을 읽으면 바로 알 수 있는 질문이면 **반드시 재출제**.
- 정답이 배경 지식·역사·통계에서 나와야 함. 기사 내용 자체가 정답이면 안 됨.
- "이 뉴스에서 언급된 것은?" 형태는 전면 교체. "이 사건/인물과 관련된 [기록/제도/역사]는?" 형태로.

### ❷ 오답 품질
- 오답 3개는 실제로 그럴듯해야 함 (같은 분야의 실제 존재하는 다른 인물명·수치·날짜 등).
- "모두 해당 없음", 터무니없는 선택지 금지.

### ❸ 정답 정확성
- answer가 options 배열에 정확히 포함되어 있는지, 사실적으로 올바른지 확인.
- 오류 발견 시 반드시 수정.

### ❹ teen/adult 차별화
- teen: 쉽고 재미있는 맥락, 배경지식 요구 수준은 낮게.
- adult: 깊은 배경·통계·역사 맥락 활용, 정답률 50~70% 난이도.

### ❺ explanation 완성도
- 왜 정답인지 구체적 근거, 왜 오답들이 헷갈릴 수 있는지 명시.

## 출력 규칙
- 수정이 필요하면 개선된 JSON 반환.
- 충분히 좋으면 원본 그대로 반환.
- JSON 외 텍스트 절대 포함 금지.
- 원본과 동일한 JSON 구조 유지.
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
${safeTitle ? `뉴스 제목(소재): ${safeTitle}` : ""}
${categoryGuideline}

[뉴스 본문]
${safeText || "(본문 없음 — Google Search Grounding으로 위 제목 뉴스를 검색해 배경 사실을 파악하세요)"}

━━ 출제 지시 ━━
이 뉴스를 '소재'로 삼아, 뉴스를 안 본 사람도 배경 지식이 있으면 맞힐 수 있는 시사상식 문제를 만드세요.
- 뉴스 내용을 직접 묻는 문제 절대 금지.
- 이 뉴스와 연결된 역사·통계·제도·기록·인물 배경을 묻는 문제 필수.
- Google Search Grounding으로 관련 배경 정보를 검색해 오답 선택지도 실제 존재하는 구체적 정보로 구성하세요.
- Teen/Adult 각 1개, JSON으로만 응답.
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
