import { NextRequest, NextResponse } from "next/server";
import { generateAndSaveWeeklyQuiz, generateAndSaveMonthlyQuiz } from "@/services/quizService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { type } = await req.json() as { type: "weekly" | "monthly" | "both" };

  try {
    const results: Record<string, any> = {};

    if (type === "weekly" || type === "both") {
      results.weekly = await generateAndSaveWeeklyQuiz();
    }
    if (type === "monthly" || type === "both") {
      results.monthly = await generateAndSaveMonthlyQuiz();
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("[generate-periodic] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
