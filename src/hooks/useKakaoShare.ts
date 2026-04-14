"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Kakao: any;
  }
}

export function useKakaoShare() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_APP_KEY;
    
    if (typeof window !== "undefined" && window.Kakao && !window.Kakao.isInitialized()) {
      if (kakaoKey) {
        window.Kakao.init(kakaoKey);
        setIsInitialized(true);
      } else {
        console.warn("Kakao SDK key is missing in environment variables.");
      }
    }
  }, []);

  const shareRanking = ({
    nickname,
    rank,
    taunt,
    category,
    shareUrl,
  }: {
    nickname: string;
    rank: string | number;
    taunt: string;
    category: string;
    shareUrl: string;
  }) => {
    if (!window.Kakao || !window.Kakao.isInitialized()) {
      console.error("Kakao SDK not initialized");
      return;
    }

    // Dynamic OG Image URL (Vercel deployment assumed for absolute URL)
    const ogImageUrl = `${window.location.origin}/api/og?nickname=${encodeURIComponent(
      nickname
    )}&rank=${rank}&taunt=${encodeURIComponent(taunt)}&category=${encodeURIComponent(category)}`;

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `🏆 ${nickname}님이 당신에게 도전장을 보냈습니다!`,
        description: taunt,
        imageUrl: ogImageUrl,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: "도전장 수락하기",
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
  };

  return { isInitialized, shareRanking };
}
