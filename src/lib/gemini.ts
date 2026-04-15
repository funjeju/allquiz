import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { apiVersion: "v1beta" },
});

const MODEL = "gemini-2.5-flash";
// thinking 비활성화 — 퀴즈 생성처럼 속도가 중요한 작업에서 불필요한 추론 제거
const GENERATION_CONFIG = {
  thinkingConfig: { thinkingBudget: 0 },
};

export const geminiModel = {
  generateContent: async (parts: { text: string }[]) => {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: GENERATION_CONFIG,
    });
    return {
      response: {
        text: () => response.text ?? "",
      },
    };
  },
};

export async function generateContent(prompt: string) {
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: GENERATION_CONFIG,
    });
    return response.text ?? "";
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}
