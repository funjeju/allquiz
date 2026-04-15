import { NextRequest, NextResponse } from "next/server";
import { extractArticleContent } from "@/services/extractionService";
import { extractYoutubeTranscript } from "@/services/youtubeService";
import { generateQuizFromText } from "@/services/aiService";

export async function POST(req: NextRequest) {
  try {
    const { url, category, type } = await req.json();
    
    let text = "";
    let title = "";

    if (type === "YOUTUBE") {
      text = await extractYoutubeTranscript(url);
      title = "YouTube Video Analysis";
    } else {
      const article = await extractArticleContent(url);
      text = article.content ?? "";
      title = article.title ?? "";
    }

    const draft = await generateQuizFromText(category, text, url, title);
    
    return NextResponse.json(draft);
  } catch (error: any) {
    console.error("Draft Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
