import { db } from "@/lib/firebase";
import {
  doc, setDoc, getDoc, collection, getDocs,
  query, where, orderBy, limit, onSnapshot, updateDoc, increment,
  getCountFromServer,
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
  category: string;
  score: number;
  total: number;
  pct: number;
  points_earned: number;
  completed_at: string;
}

export function calcPoints(score: number, total: number): number {
  const base = score * 10;
  const completion = total >= 20 ? 50 : total >= 10 ? 20 : 0;
  const bonus = score === total && total > 0 ? Math.floor(total * 5) : 0;
  return base + completion + bonus;
}

export interface SaveQuizResultOptions {
  time_taken_seconds?: number;
  age_range?: string;
  region?: string;
  gender?: string;
}

export async function saveQuizResult(
  result: Omit<QuizResult, "completed_at">,
  options: SaveQuizResultOptions = {}
) {
  const docId = `${result.uid}_${result.date}_${result.category}`;

  const ref = doc(db, "quiz_results", docId);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().score >= result.score) return;

  await setDoc(ref, { ...result, completed_at: new Date().toISOString() });

  const userRef = doc(db, "users", result.uid);
  await updateDoc(userRef, {
    "inventory.golden_tickets": increment(result.points_earned),
  });

  if (result.category === "DAILY") {
    const battleData: Record<string, unknown> = {
      uid: result.uid,
      nickname: result.nickname,
      score: result.score,
      total: result.total,
      pct: result.pct,
      completed_at: new Date().toISOString(),
    };
    if (options.time_taken_seconds != null) battleData.time_taken_seconds = options.time_taken_seconds;
    if (options.age_range) battleData.age_range = options.age_range;
    if (options.region) battleData.region = options.region;
    if (options.gender) battleData.gender = options.gender;

    await setDoc(
      doc(db, "daily_battles", result.date, "scores", result.uid),
      battleData,
      { merge: true }
    );
  }
}

// 내 퀴즈 기록 조회
export async function getMyHistory(uid: string): Promise<QuizResult[]> {
  const q = query(
    collection(db, "quiz_results"),
    where("uid", "==", uid),
    orderBy("completed_at", "desc"),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as QuizResult);
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

// 어드민 글로벌 통계
export interface GlobalStats {
  totalUsers: number;
  totalGames: number;
  todayParticipants: number;
  todayBattleGames: number;
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const kstDate = getKSTDate();
  const [usersSnap, gamesSnap, todaySnap, battleSnap] = await Promise.all([
    getCountFromServer(collection(db, "users")),
    getCountFromServer(collection(db, "quiz_results")),
    getCountFromServer(query(collection(db, "quiz_results"), where("date", "==", kstDate))),
    getCountFromServer(collection(db, "daily_battles", kstDate, "scores")),
  ]);
  return {
    totalUsers: usersSnap.data().count,
    totalGames: gamesSnap.data().count,
    todayParticipants: todaySnap.data().count,
    todayBattleGames: battleSnap.data().count,
  };
}

export interface BattleScore {
  uid: string;
  nickname: string;
  score: number;
  total: number;
  pct: number;
  completed_at: string;
  time_taken_seconds?: number;
  age_range?: string;
  region?: string;
  gender?: string;
}

export interface CumulativeRank {
  uid: string;
  nickname: string;
  total_points: number;
}

export interface WeeklyRank {
  uid: string;
  nickname: string;
  weekly_score: number;
  game_count: number;
}

export interface DemographicRankings {
  byAge: Record<string, BattleScore[]>;
  byRegion: Record<string, BattleScore[]>;
  byGender: Record<string, BattleScore[]>;
}

// 오늘 배틀 점수 전체 조회 (클라이언트 정렬용)
export async function getDailyBattleScores(date: string): Promise<BattleScore[]> {
  const q = query(
    collection(db, "daily_battles", date, "scores"),
    orderBy("score", "desc"),
    limit(200)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as BattleScore);
}

// 만점자 Top3 (속도순)
export async function getPerfectSpeedTop3(date: string): Promise<BattleScore[]> {
  const scores = await getDailyBattleScores(date);
  return scores
    .filter(s => s.score === s.total && s.time_taken_seconds != null)
    .sort((a, b) => (a.time_taken_seconds ?? 99999) - (b.time_taken_seconds ?? 99999))
    .slice(0, 3);
}

// 오늘 종합 Top3 (점수 -> 시간순 tie-break)
export async function getDailyTop3(date: string): Promise<BattleScore[]> {
  const scores = await getDailyBattleScores(date);
  return scores
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.time_taken_seconds ?? 99999) - (b.time_taken_seconds ?? 99999);
    })
    .slice(0, 3);
}

// 스피드 Top3 (전체, 풀이 시간 기준)
export async function getSpeedTop3(date: string): Promise<BattleScore[]> {
  const scores = await getDailyBattleScores(date);
  return scores
    .filter(s => s.time_taken_seconds != null)
    .sort((a, b) => (a.time_taken_seconds ?? 99999) - (b.time_taken_seconds ?? 99999))
    .slice(0, 3);
}

// 얼리버드 Top3 (가장 일찍 완료)
export async function getEarlyBirdTop3(date: string): Promise<BattleScore[]> {
  const scores = await getDailyBattleScores(date);
  return scores
    .sort((a, b) => a.completed_at.localeCompare(b.completed_at))
    .slice(0, 3);
}

// 누적 포인트 Top3
export async function getCumulativeTop3(): Promise<CumulativeRank[]> {
  const q = query(
    collection(db, "users"),
    orderBy("inventory.golden_tickets", "desc"),
    limit(3)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      uid: data.uid,
      nickname: data.nickname,
      total_points: data.inventory?.golden_tickets ?? 0,
    };
  });
}

// 이번 주 MVP Top3
function getKSTWeekStart(): string {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const day = kst.getDay();
  kst.setDate(kst.getDate() - (day === 0 ? 6 : day - 1));
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, "0")}-${String(kst.getDate()).padStart(2, "0")}`;
}

export async function getWeeklyTop3(): Promise<WeeklyRank[]> {
  const weekStart = getKSTWeekStart();
  const q = query(
    collection(db, "quiz_results"),
    where("category", "==", "DAILY"),
    where("date", ">=", weekStart),
    orderBy("date", "desc"),
    limit(500)
  );
  const snap = await getDocs(q);
  const map: Record<string, WeeklyRank> = {};
  snap.docs.forEach(d => {
    const data = d.data() as QuizResult;
    if (!map[data.uid]) {
      map[data.uid] = { uid: data.uid, nickname: data.nickname, weekly_score: 0, game_count: 0 };
    }
    map[data.uid].weekly_score += data.score;
    map[data.uid].game_count += 1;
  });
  return Object.values(map)
    .sort((a, b) => b.weekly_score - a.weekly_score)
    .slice(0, 3);
}

// 인구통계별 Top3 그룹 (오늘)
export async function getDemographicRankings(date: string): Promise<DemographicRankings> {
  const scores = await getDailyBattleScores(date);

  const groupTop3 = (key: keyof BattleScore): Record<string, BattleScore[]> => {
    const groups: Record<string, BattleScore[]> = {};
    scores.forEach(s => {
      const val = s[key] as string | undefined;
      if (!val) return;
      if (!groups[val]) groups[val] = [];
      if (groups[val].length < 3) groups[val].push(s);
    });
    return groups;
  };

  return {
    byAge: groupTop3("age_range"),
    byRegion: groupTop3("region"),
    byGender: groupTop3("gender"),
  };
}
