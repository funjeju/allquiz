import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

/**
 * 일반 기사(Article) URL에서 본문 내용을 추출합니다.
 */
export async function extractArticleContent(url: string) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error("Failed to parse article content");
    }

    return {
      title: article.title,
      content: article.textContent,
      excerpt: article.excerpt,
      siteName: article.siteName,
    };
  } catch (error) {
    console.error("URL Extraction Error:", error);
    throw error;
  }
}
