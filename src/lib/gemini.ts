import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { apiVersion: "v1beta" },
});

const MODEL = "gemini-2.5-flash";

// 기본 설정 (thinking 비활성화 — 속도 우선)
const BASE_CONFIG = {
  thinkingConfig: { thinkingBudget: 0 },
};

// Google Search Grounding 포함 설정 — 최신 정보 실시간 검색
const GROUNDED_CONFIG = {
  thinkingConfig: { thinkingBudget: 0 },
  tools: [{ googleSearch: {} }],
};

export const geminiModel = {
  generateContent: async (parts: { text: string }[]) => {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: BASE_CONFIG,
    });
    return {
      response: {
        text: () => response.text ?? "",
      },
    };
  },
  // 실시간 Google 검색 grounding 포함 버전
  generateContentGrounded: async (parts: { text: string }[]) => {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: GROUNDED_CONFIG,
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
      config: BASE_CONFIG,
    });
    return response.text ?? "";
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}
