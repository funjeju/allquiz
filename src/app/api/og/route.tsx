import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 파라미터 추출
    const nickname = searchParams.get("nickname") || "익명의 도전자";
    const rank = searchParams.get("rank") || "??";
    const taunt = searchParams.get("taunt") || "너, 나보다 똑똑해? ㅋ";
    const category = searchParams.get("category") || "상식 배틀";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0A0A0A", // Obsidian Background
            backgroundImage: "radial-gradient(circle at 50% 50%, #2D1B4D 0%, #0A0A0A 100%)",
            padding: "40px",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: "bold",
              color: "#A855F7", // Electric Purple
              marginBottom: "20px",
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            🏆 Rank & Quiz :: Daily Battle
          </div>

          {/* Main Card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "30px",
              padding: "40px 60px",
              border: "1px solid rgba(168, 85, 247, 0.3)",
              boxShadow: "0 0 50px rgba(168, 85, 247, 0.2)",
            }}
          >
            <div style={{ display: "flex", fontSize: 32, color: "#FFFFFF", marginBottom: "10px" }}>
              {nickname}님의 도전장
            </div>
            
            <div style={{ display: "flex", fontSize: 72, fontWeight: "900", color: "#FACC15", margin: "10px 0" }}>
              {category} {rank}위
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 36,
                color: "#10B981", // Neon Green
                textAlign: "center",
                marginTop: "20px",
                fontStyle: "italic",
              }}
            >
              "{taunt}"
            </div>
          </div>

          {/* Footer Nudge */}
          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: "rgba(255, 255, 255, 0.5)",
              marginTop: "40px",
            }}
          >
            지금 접속해서 이 기록을 깨버리세요!
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error(e.message);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
