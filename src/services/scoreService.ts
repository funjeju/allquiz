import { db } from "@/lib/firebase";
import {
  doc, setDoc, getDoc, collection, getDocs,
  query, orderBy, limit, onSnapshot, updateDoc, increment,
} from "firebase/firestore";

function getKSTDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export interface QuizResult {
  uid: string;
  nickname: string;
  date: string;
  category: string;      // "DAILY" or category ID
  score: number;
  total: number;
  pct: number;
  points_earned: number;
  completed_at: string;
}

// 포인트 계산: 정답당 10pt + 완주 보너스 + 퍼센트 보너스
export function calcPoints(score: number, total: number): number {
  const base = score * 10;
  const completion = total >= 20 ? 50 : total >= 10 ? 20 : 0;
  const bonus = score === total && total > 0 ? Math.floor(total * 5) : 0;
  return base + completion + bonus;
}

// 퀴즈 결과 저장 + 유저 포인트 누적
export async function saveQuizResult(result: Omit<QuizResult, "completed_at">) {
  const docId = `${result.uid}_${result.date}_${result.category}`;

  // 이미 오늘 이 카테고리를 풀었으면 최고 점수만 갱신
  const ref = doc(db, "quiz_results", docId);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().score >= result.score) return;

  await setDoc(ref, { ...result, completed_at: new Date().toISOString() });

  // 유저 포인트 누적
  const userRef = doc(db, "users", result.uid);
  await updateDoc(userRef, {
    "inventory.golden_tickets": increment(result.points_earned),
  });

  // 데일리 배틀 랭킹 갱신 (category === "DAILY"일 때만)
  if (result.category === "DAILY") {
    await setDoc(
      doc(db, "daily_battles", result.date, "scores", result.uid),
      {
        uid: result.uid,
        nickname: result.nickname,
        score: result.score,
        total: result.total,
        pct: result.pct,
        completed_at: new Date().toISOString(),
      },
      { merge: true }
    );
  }
}

// 내 퀴즈 기록 조회
export async function getMyHistory(uid: string): Promise<QuizResult[]> {
  const q = query(
    collection(db, "quiz_results"),
    orderBy("completed_at", "desc"),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data() as QuizResult)
    .filter(r => r.uid === uid);
}

// 데일리 배틀 실시간 구독 (onSnapshot)
export function subscribeDailyBattle(
  date: string,
  callback: (scores: BattleScore[]) => void
) {
  const colRef = collection(db, "daily_battles", date, "scores");
  return onSnapshot(
    query(colRef, orderBy("score", "desc"), limit(20)),
    snap => {
      callback(snap.docs.map(d => d.data() as BattleScore));
    }
  );
}

export interface BattleScore {
  uid: string;
  nickname: string;
  score: number;
  total: number;
  pct: number;
  completed_at: string;
}
