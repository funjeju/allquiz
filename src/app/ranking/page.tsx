"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  Trophy, Zap, Sunrise, Calendar, Crown, Users,
  MapPin, User, ChevronRight, Loader2, Medal,
} from "lucide-react";
import {
  BattleScore, CumulativeRank, WeeklyRank, DemographicRankings,
  getPerfectSpeedTop3, getDailyTop3, getSpeedTop3, getEarlyBirdTop3,
  getCumulativeTop3, getWeeklyTop3, getDemographicRankings,
} from "@/services/scoreService";
import { BottomNav } from "@/components/BottomNav";

function getKSTDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function formatTime(seconds?: number) {
  if (seconds == null) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

function formatCompletedAt(iso: string) {
  const d = new Date(iso);
  const kst = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
  return kst;
}

const RANK_COLORS = ["text-yellow-400", "text-gray-300", "text-amber-600"];
const RANK_BG = ["bg-yellow-400/10 border-yellow-400/30", "bg-gray-400/10 border-gray-400/30", "bg-amber-600/10 border-amber-600/30"];
const MEDAL_ICONS = ["🥇", "🥈", "🥉"];

type Tab = "today" | "weekly" | "alltime" | "demo";

interface RankCardProps {
  rank: number;
  nickname: string;
  sub?: string;
  value?: string;
  isMe?: boolean;
}

function RankCard({ rank, nickname, sub, value, isMe }: RankCardProps) {
  const i = rank - 1;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl border ${isMe ? "bg-primary/10 border-primary/30" : i < 3 ? RANK_BG[i] : "bg-muted/30 border-border/40"}`}>
      <span className={`text-xl w-7 text-center ${i < 3 ? RANK_COLORS[i] : "text-muted-foreground"} font-black`}>
        {i < 3 ? MEDAL_ICONS[i] : `${rank}`}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{nickname}{isMe ? " (나)" : ""}</p>
        {sub && <p className="text-[10px] text-muted-foreground font-medium">{sub}</p>}
      </div>
      {value && <span className="text-sm font-black text-primary shrink-0">{value}</span>}
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  children: React.ReactNode;
}

function Section({ title, icon, badge, children }: SectionProps) {
  return (
    <div className="bg-card border border-border rounded-3xl p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black flex items-center gap-2 text-foreground">
          {icon} {title}
        </h3>
        {badge && (
          <span className="text-[10px] font-black text-muted-foreground bg-muted px-2.5 py-1 rounded-full uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-4 text-muted-foreground">
      <p className="text-xs font-bold">{text}</p>
    </div>
  );
}

const AGE_ORDER = ["10대", "20대", "30대", "40대", "50대", "60대+"];
const GENDER_LABEL: Record<string, string> = { M: "남성", F: "여성", male: "남성", female: "여성" };

export default function RankingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("today");
  const [loading, setLoading] = useState(true);
  const kstDate = getKSTDate();

  const [perfectTop3, setPerfectTop3] = useState<BattleScore[]>([]);
  const [dailyTop3, setDailyTop3] = useState<BattleScore[]>([]);
  const [speedTop3, setSpeedTop3] = useState<BattleScore[]>([]);
  const [earlyTop3, setEarlyTop3] = useState<BattleScore[]>([]);
  const [weeklyTop3, setWeeklyTop3] = useState<WeeklyRank[]>([]);
  const [cumulTop3, setCumulTop3] = useState<CumulativeRank[]>([]);
  const [demoRanks, setDemoRanks] = useState<DemographicRankings | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [perfect, daily, speed, early, weekly, cumul, demo] = await Promise.all([
        getPerfectSpeedTop3(kstDate),
        getDailyTop3(kstDate),
        getSpeedTop3(kstDate),
        getEarlyBirdTop3(kstDate),
        getWeeklyTop3(),
        getCumulativeTop3(),
        getDemographicRankings(kstDate),
      ]);
      setPerfectTop3(perfect);
      setDailyTop3(daily);
      setSpeedTop3(speed);
      setEarlyTop3(early);
      setWeeklyTop3(weekly);
      setCumulTop3(cumul);
      setDemoRanks(demo);
      setLoading(false);
    };
    load();
  }, [kstDate]);

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "today", label: "오늘", icon: <Zap className="w-3.5 h-3.5" /> },
    { id: "weekly", label: "주간", icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: "alltime", label: "전체", icon: <Crown className="w-3.5 h-3.5" /> },
    { id: "demo", label: "그룹별", icon: <Users className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <Trophy className="w-5 h-5 text-secondary" /> 랭킹
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{kstDate.replace(/-/g, ".")} 기준</p>
          </div>
          <button
            onClick={() => router.push("/quiz/daily")}
            className="bg-primary text-white px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5"
          >
            도전하기 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-6 pb-3 flex gap-2">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black transition-colors ${
                tab === t.id ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-bold">랭킹 불러오는 중...</p>
          </div>
        ) : (
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {/* ── 오늘 탭 ── */}
            {tab === "today" && (
              <>
                {/* 챔피언 섹션 */}
                <Section title="오늘의 챔피언" icon={<Trophy className="w-4 h-4 text-yellow-400" />} badge="만점 + 최속">
                  {perfectTop3.length === 0 ? (
                    <EmptyState text="아직 만점자가 없습니다 — 20문제 전부 맞혀보세요!" />
                  ) : (
                    <div className="space-y-2">
                      {perfectTop3.map((s, i) => (
                        <RankCard
                          key={s.uid}
                          rank={i + 1}
                          nickname={s.nickname}
                          sub={`${s.score}/${s.total} · ${formatTime(s.time_taken_seconds)}`}
                          value={formatTime(s.time_taken_seconds)}
                          isMe={user?.uid === s.uid}
                        />
                      ))}
                    </div>
                  )}
                </Section>

                {/* 종합 순위 */}
                <Section title="오늘의 종합 순위" icon={<Medal className="w-4 h-4 text-primary" />} badge="점수 → 속도">
                  {dailyTop3.length === 0 ? (
                    <EmptyState text="오늘 아직 참여자가 없습니다" />
                  ) : (
                    <div className="space-y-2">
                      {dailyTop3.map((s, i) => (
                        <RankCard
                          key={s.uid}
                          rank={i + 1}
                          nickname={s.nickname}
                          sub={s.time_taken_seconds ? formatTime(s.time_taken_seconds) : undefined}
                          value={`${s.score}/${s.total}`}
                          isMe={user?.uid === s.uid}
                        />
                      ))}
                    </div>
                  )}
                </Section>

                {/* 스피드 킹 */}
                <Section title="⚡ 스피드 킹" icon={<Zap className="w-4 h-4 text-accent" />} badge="가장 빠른 완료">
                  {speedTop3.length === 0 ? (
                    <EmptyState text="시간 측정 데이터가 없습니다" />
                  ) : (
                    <div className="space-y-2">
                      {speedTop3.map((s, i) => (
                        <RankCard
                          key={s.uid}
                          rank={i + 1}
                          nickname={s.nickname}
                          sub={`${s.score}/${s.total} 정답`}
                          value={formatTime(s.time_taken_seconds)}
                          isMe={user?.uid === s.uid}
                        />
                      ))}
                    </div>
                  )}
                </Section>

                {/* 얼리버드 */}
                <Section title="🌅 얼리버드" icon={<Sunrise className="w-4 h-4 text-orange-400" />} badge="가장 일찍 도전">
                  {earlyTop3.length === 0 ? (
                    <EmptyState text="오늘 아직 참여자가 없습니다" />
                  ) : (
                    <div className="space-y-2">
                      {earlyTop3.map((s, i) => (
                        <RankCard
                          key={s.uid}
                          rank={i + 1}
                          nickname={s.nickname}
                          sub={`${s.score}/${s.total} 정답`}
                          value={formatCompletedAt(s.completed_at)}
                          isMe={user?.uid === s.uid}
                        />
                      ))}
                    </div>
                  )}
                </Section>
              </>
            )}

            {/* ── 주간 탭 ── */}
            {tab === "weekly" && (
              <Section title="이번 주 MVP" icon={<Calendar className="w-4 h-4 text-primary" />} badge="주간 누적 점수">
                {weeklyTop3.length === 0 ? (
                  <EmptyState text="이번 주 데이터가 없습니다" />
                ) : (
                  <div className="space-y-2">
                    {weeklyTop3.map((r, i) => (
                      <RankCard
                        key={r.uid}
                        rank={i + 1}
                        nickname={r.nickname}
                        sub={`${r.game_count}일 참여`}
                        value={`${r.weekly_score}점`}
                        isMe={user?.uid === r.uid}
                      />
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* ── 전체 탭 ── */}
            {tab === "alltime" && (
              <Section title="누적 포인트 왕" icon={<Crown className="w-4 h-4 text-secondary" />} badge="전체 기간">
                {cumulTop3.length === 0 ? (
                  <EmptyState text="데이터가 없습니다" />
                ) : (
                  <div className="space-y-2">
                    {cumulTop3.map((r, i) => (
                      <RankCard
                        key={r.uid}
                        rank={i + 1}
                        nickname={r.nickname}
                        value={`${r.total_points.toLocaleString()} pts`}
                        isMe={user?.uid === r.uid}
                      />
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* ── 그룹별 탭 ── */}
            {tab === "demo" && demoRanks && (
              <>
                {/* 연령대별 */}
                <Section title="연령대별 랭킹" icon={<User className="w-4 h-4 text-blue-400" />} badge="오늘 기준">
                  {Object.keys(demoRanks.byAge).length === 0 ? (
                    <EmptyState text="연령대 데이터가 없습니다" />
                  ) : (
                    <div className="space-y-4">
                      {AGE_ORDER.filter(age => demoRanks.byAge[age]?.length > 0).map(age => (
                        <div key={age}>
                          <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2 px-1">{age}</p>
                          <div className="space-y-1.5">
                            {demoRanks.byAge[age].map((s, i) => (
                              <RankCard
                                key={s.uid}
                                rank={i + 1}
                                nickname={s.nickname}
                                sub={s.time_taken_seconds ? formatTime(s.time_taken_seconds) : undefined}
                                value={`${s.score}/${s.total}`}
                                isMe={user?.uid === s.uid}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* 성별 랭킹 */}
                <Section title="성별 랭킹" icon={<Users className="w-4 h-4 text-pink-400" />} badge="오늘 기준">
                  {Object.keys(demoRanks.byGender).length === 0 ? (
                    <EmptyState text="성별 데이터가 없습니다" />
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(demoRanks.byGender).map(([gender, scores]) => (
                        <div key={gender}>
                          <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2 px-1">
                            {GENDER_LABEL[gender] ?? gender}
                          </p>
                          <div className="space-y-1.5">
                            {scores.map((s, i) => (
                              <RankCard
                                key={s.uid}
                                rank={i + 1}
                                nickname={s.nickname}
                                sub={s.time_taken_seconds ? formatTime(s.time_taken_seconds) : undefined}
                                value={`${s.score}/${s.total}`}
                                isMe={user?.uid === s.uid}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* 지역별 랭킹 */}
                <Section title="지역별 랭킹" icon={<MapPin className="w-4 h-4 text-green-400" />} badge="오늘 기준">
                  {Object.keys(demoRanks.byRegion).length === 0 ? (
                    <EmptyState text="지역 데이터가 없습니다" />
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(demoRanks.byRegion).map(([region, scores]) => (
                        <div key={region}>
                          <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-2 px-1">{region}</p>
                          <div className="space-y-1.5">
                            {scores.map((s, i) => (
                              <RankCard
                                key={s.uid}
                                rank={i + 1}
                                nickname={s.nickname}
                                sub={s.time_taken_seconds ? formatTime(s.time_taken_seconds) : undefined}
                                value={`${s.score}/${s.total}`}
                                isMe={user?.uid === s.uid}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </>
            )}
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
