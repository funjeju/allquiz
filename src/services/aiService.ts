import { geminiModel } from "@/lib/gemini";
import { QuizGenerationOutputSchema, QuizGenerationOutput } from "@/lib/schemas";

const SYSTEM_PROMPT = `
당신은 'Rank & Quiz' 앱의 퀴즈 마스터 AI입니다. 
제공된 뉴스 사실(Fact)을 바탕으로 동적인 퀴즈를 생성하세요.

[규칙]
1. 청중은 'teen'(10대)과 'adult'(성인)로 나뉩니다. 
   - teen: 트렌디하고 유머러스한 말투, 이모지 사용, 10대가 공감할 언어 사용.
   - adult: 품격 있고 신뢰감 있는 신문 기사형 문체.
2. viral_copy는 카카오톡 공유 시 사용될 제목과 도발 멘트입니다. 강렬하고 클릭을 유도하도록 작성하세요.
3. quiz_type은 MULTIPLE_CHOICE, OX, SPEED, TRAP 중 하나를 선택하세요.
4. 설명(explanation)을 포함하여 정답 근거와 틀리기 쉬운 이유를 명시하세요.
5. 반드시 유효한 JSON 형식으로만 응답하세요.

[JSON 구조 예시]
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

export async function generateQuizFromNews(category: string, newsItem: any): Promise<QuizGenerationOutput | null> {
  const prompt = `
  카테고리: ${category}
  기사 제목: ${newsItem.title}
  기사 요약: ${newsItem.content}
  기사 링크: ${newsItem.link}

  위 정보를 바탕으로 퀴즈를 생성해줘. JSON으로만 대답해.
  `;

  try {
    const result = await geminiModel.generateContent([
      { text: SYSTEM_PROMPT },
      { text: prompt }
    ]);
    const response = await result.response;
    const text = response.text();
    
    // JSON 추출 (Gemini가 마크다운 블록에 가끔 넣는 경우 대비)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Zod 검증
    return QuizGenerationOutputSchema.parse({
      ...parsed,
      category,
      source_url: newsItem.link,
      base_fact: newsItem.title
    });
  } catch (error) {
    console.error(`AI Quiz Generation Error [${category}]:`, error);
    return null;
  }
}
