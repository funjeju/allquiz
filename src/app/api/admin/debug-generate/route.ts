import { NextResponse } from "next/server";
import { fetchNewsByCategory } from "@/services/rssService";
import { geminiModel } from "@/lib/gemini";
import { QuizGenerationOutputSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. 뉴스 1개 가져오기
    const news = await fetchNewsByCategory("IT");
    const item = news[0];

    if (!item) {
      return NextResponse.json({ step: "rss", error: "뉴스 없음" });
    }

    const content = (item as any).content || (item as any).contentSnippet || item.title || "";

    // 2. Gemini 호출
    const SYSTEM_PROMPT = `당신은 퀴즈 마스터 AI입니다. 제공된 뉴스를 바탕으로 퀴즈를 생성하세요. 반드시 유효한 JSON만 응답하세요.`;
    const prompt = `
카테고리: IT
출처: ${item.link}
핵심 제목: ${item.title}
[분석 내용]
${content.slice(0, 3000) || "제목만 있습니다."}

아래 JSON 구조로만 응답하세요:
{
  "category": "IT",
  "source_url": "${item.link}",
  "base_fact": "...",
  "quizzes": {
    "teen": { "question": "...", "options": ["...", "...", "...", "..."], "answer": "..." },
    "adult": { "question": "...", "options": ["...", "...", "...", "..."], "answer": "..." }
  },
  "viral_copy": { "kakao_title": "...", "kakao_taunt": "..." },
  "quiz_type": "MULTIPLE_CHOICE"
}`;

    let rawResponse = "";
    try {
      const result = await geminiModel.generateContent([
        { text: SYSTEM_PROMPT },
        { text: prompt }
      ]);
      rawResponse = result.response.text();
    } catch (e: any) {
      return NextResponse.json({
        step: "gemini_call",
        error: e.message,
        newsItem: { title: item.title, link: item.link, hasContent: !!content },
      });
    }

    // 3. JSON 파싱
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        step: "json_parse",
        error: "JSON을 찾을 수 없음",
        rawResponse,
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e: any) {
      return NextResponse.json({
        step: "json_parse",
        error: e.message,
        rawResponse,
      });
    }

    // 4. Zod 검증
    try {
      const validated = QuizGenerationOutputSchema.parse({
        ...parsed,
        category: "IT",
        source_url: item.link,
        base_fact: item.title || parsed.base_fact,
      });
      return NextResponse.json({ step: "success", result: validated });
    } catch (e: any) {
      return NextResponse.json({
        step: "zod_validation",
        error: e.message,
        parsed,
      });
    }
  } catch (e: any) {
    return NextResponse.json({ step: "unknown", error: e.message });
  }
}
