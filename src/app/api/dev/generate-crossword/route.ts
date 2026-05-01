import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Dev-only endpoint — returns 404 in production
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { generateAndSaveDailyCrossword } = await import("@/services/crosswordService");
    const puzzle = await generateAndSaveDailyCrossword();
    return NextResponse.json({
      success: true,
      date: puzzle.date,
      title: puzzle.title,
      wordsPlaced: puzzle.words.length,
      gridSize: `${puzzle.rows}×${puzzle.cols}`,
    });
  } catch (err) {
    console.error("[dev/generate-crossword]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
