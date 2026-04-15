import { YoutubeTranscript } from "youtube-transcript";

/**
 * 유튜브 영상 ID를 추출합니다.
 */
function extractVideoId(url: string) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

/**
 * 유튜브 영상의 자막(Transcript)을 추출합니다.
 */
export async function extractYoutubeTranscript(url: string) {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: "ko" });
    // 단순 텍스트로 결합
    return transcript.map(t => t.text).join(" ");
  } catch (error) {
    console.error("YouTube Transcript Error:", error);
    // 한국어 자막이 없을 경우 대비 (영어 시도 등은 생략하고 에러 처리)
    throw new Error("자막을 가져올 수 없습니다. 자막이 설정된 영상인지 확인해 주세요.");
  }
}
