지역 카테고리 로테이션 로직
const regions = ["서울", "부산", "인천", "대구", "광주", "대전", "울산"];

const todayRegion = regions[new Date().getDay() % regions.length];

매일 수집 시 "제주" 키워드는 무조건 수집, todayRegion 변수에 할당된 지역을 추가 수집하여 전국 단위 유저의 랭킹 소속감을 자극.


---

### 4. `DATABASE_SCHEMA_FIREBASE.md` (바이럴 추적 및 하이퍼 랭킹 DB)

```markdown
# 🗄️ Firestore Database Schema

## 1. `users` Collection
유저의 세그먼트 정보와 바이럴 인플루언스 지수를 관리합니다.
- `uid` (Document ID)
- `nickname` (String)
- `demographics` (Map: `{ birth_year: 1995, region: "제주시", gender: "M" }`)
- `inventory` (Map: `{ golden_tickets: 5, shield_items: 2 }`)
- `viral_stats` (Map: `{ total_shared: 45, successful_invites: 12 }`)

## 2. `daily_quizzes` Collection
AI가 출제한 문제를 카테고리별로 캐싱합니다.
- `YYYY-MM-DD` (Document ID)
  - `KPOP` (Array of Quiz Objects including `viral_copy`)
  - `IT` (Array of Quiz Objects including `viral_copy`)
  - `JEJU` (Array of Quiz Objects)

## 3. `leaderboards` Collection (Realtime Aggregation)
쓰기 부하를 막기 위해 Firestore 확장 기능(Distributed Counters) 또는 Redis 병행 사용을 권장.
- `league_id` (예: `2026-04_KPOP_JEJU_30s`)
  - `top_100` (Array of `{uid, nickname, score, timestamp}`)
  - `total_participants` (Number)

## 4. `viral_logs` Collection (초대 보상 트래킹)
누가 누구를 초대해서 들어왔는지, 보상이 지급되었는지 검증합니다.
- `log_id` (Auto-generated)
- `sender_uid` (String)
- `receiver_uid` (String)
- `quiz_date` (String: YYYY-MM-DD)
- `status` (String: "PENDING" | "COMPLETED")

지역 경쟁 강화
const regionBattle = {
  "서울 vs 부산": true,
  "제주 vs 전국": true
};