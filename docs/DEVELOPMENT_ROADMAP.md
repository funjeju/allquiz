# 🛠 Implementation Roadmap & Milestones

### Phase 1: Core Engine & DB Setup (Week 1)
- Firebase 프로젝트 세팅 및 Next.js 14 환경 구성.
- `firebase.ts` 초기화 및 Firestore 스키마(`users`, `daily_quizzes`) 인덱스 생성.
- 구글 RSS 파싱 모듈 구현 (`xml2js` 또는 `rss-parser` 패키지 활용).

### Phase 2: AI Automation Pipeline (Week 2)
- `@google/generative-ai` SDK 연동.
- 카테고리 10개 + 지역 RSS를 순회하며 Gemini 1.5 Flash로 프롬프트 전송 로직 작성.
- 응답받은 JSON 구조를 유효성 검사(Zod 라이브러리 추천) 후 Firestore에 일괄 적재.
- Vercel Cron Job (`/api/cron/generate`) 설정 (매일 00:00).

### Phase 3: Kakao Viral & Vercel OG (Week 3) -> 🔥 핵심
- `@vercel/og` 세팅: JSX를 활용해 랭킹과 닉네임이 동적으로 박히는 썸네일 생성 엔드포인트(`/api/og`) 개발.
- Kakao JavaScript SDK (`kakao.min.js`) `_document.tsx`에 로드 및 초기화.
- 공유하기 버튼 클릭 시 `Kakao.Share.sendDefault` 호출 로직 작성. 템플릿에 `viral_copy` 동적 삽입.

### Phase 4: UI/UX & Gamification (Week 4)
- shadcn/ui 기반 컴포넌트 조립 (타이머 바, 4지선다 버튼, 결과 카드).
- '틀린그림찾기' Canvas API 기반 좌표 판정 로직 추가.
- 최종 QA, Vercel Production 배포 및 카카오 디벨로퍼스 도메인 등록.

Phase 2.5 추가 (🔥 핵심)
### Phase 2.5: Quiz Gamification Layer

- 문제 유형 다양화 (OX, 타임어택)
- 틀린 문제 통계 수집
- 문제 단위 공유 기능 구현
- 사용자 행동 로그 수집
Phase 3 수정 (바이럴 강화)
- Question-level share 추가
- A/B 테스트 (도발 문구)