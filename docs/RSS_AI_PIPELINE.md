# 🤖 RSS & AI Pipeline (Content & Copywriting)
퀴즈 유형 다양화 (현재 단일 구조 → 게임형으로 확장)
"quiz_type": "MULTIPLE_CHOICE | OX | SPEED | TRAP",
"difficulty": "EASY | MEDIUM | HARD",
"time_limit": 5
② “틀린 유도 선택지” 필드 (핵심)
"trap_options": [
  "헷갈리는 오답1",
  "헷갈리는 오답2"
]

👉 GPT가 일부러 헷갈리게 만들도록

③ 공유용 “문제 단위 카피” 추가
"share_trigger": {
  "title": "이거 맞추면 인정",
  "taunt": "이걸 틀린다고? ㅋㅋ"
}

👉 결과 공유 말고 “문제 단위 공유” 가능하게

④ 정답 설명 강화
"explanation": {
  "correct": "정답 이유",
  "wrong": "틀리기 쉬운 이유"
}
## 1. 파이프라인 트리거 (Vercel Cron)
- **일정:** 매일 00:00 (KST)
- **작업:** 10개 카테고리(시사/국제/스포츠/연예/Kpop/IT/AI/정치/여행/인물) + 지역(제주 고정 + 1지역 로테이션) RSS 호출.

## 2. AI Prompt Schema (도발 멘트 자동화 추가)
Gemini 1.5 Flash에 던지는 프롬프트는 연령별 퀴즈 변주뿐만 아니라, **카카오톡 공유 시 활용할 숏폼(Short-form) 카피**까지 한 번에 생성하도록 설계합니다.

### AI Output JSON 포맷 (필수 준수 사항)
```json
{
  "category": "IT",
  "source_url": "[https://news.google.com/](https://news.google.com/)...",
  "base_fact": "애플의 차세대 비전프로 출시가 2027년으로 연기됨.",
  "quizzes": {
    "teen": {
      "question": "애플빠들 오열 ㅠㅠ 비전프로 다음 버전 언제 나온다고?",
      "options": ["2027년", "내년", "안 나옴", "이미 나옴"],
      "answer": "2027년"
    },
    "adult": {
      "question": "애플의 공간 컴퓨터 '비전프로' 차기작의 예상 출시 연도는?",
      "options": ["2027년", "2025년", "2026년", "2028년"],
      "answer": "2027년"
    }
  },
  "viral_copy": {
    "kakao_title": "애플 주주라면 무조건 알아야 할 오늘의 IT 이슈!",
    "kakao_taunt": "이것도 모르면 IT 트렌드 원시인 확정입니다."
  }
}