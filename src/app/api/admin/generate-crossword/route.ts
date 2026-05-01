import { NextRequest, NextResponse } from "next/server";
import { generateAndSaveDailyCrossword } from "@/services/crosswordService";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({})) as { date?: string };
    const puzzle = await generateAndSaveDailyCrossword(body.date);

    return NextResponse.json({
      success: true,
      date: puzzle.date,
      title: puzzle.title,
      wordsPlaced: puzzle.words.length,
      gridSize: `${puzzle.rows}×${puzzle.cols}`,
    });
  } catch (err) {
    console.error("[generate-crossword]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
