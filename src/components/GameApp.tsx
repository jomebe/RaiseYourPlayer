"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRightLeft,
  Award,
  Banknote,
  BarChart3,
  BatteryCharging,
  BookOpen,
  ChevronRight,
  Cloud,
  Coins,
  Dumbbell,
  FastForward,
  Gamepad2,
  Gauge,
  HeartPulse,
  Home,
  Info,
  Medal,
  Play,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Upload,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getClub } from "../game/config/clubs";
import { getEnhancementStep } from "../game/config/enhancement";
import {
  CONDITION_LABELS,
  MAX_STAT,
  SEASON_WEEKS,
  XP_PER_ATTRIBUTE_POINT,
} from "../game/config/progression";
import { TRAINING } from "../game/config/training";
import { attemptEnhancement } from "../game/engine/enhancement";
import {
  autoAdvance,
  choosePostMatchBonus,
  chooseSeasonReward,
  finishSeason,
  performTraining,
  playNextMatch,
  resolveTransfer,
  startCareer,
} from "../game/engine/game";
import { calculateOvr, categoryAverage, STAT_GROUPS } from "../game/engine/ovr";
import { spendAttributePoint } from "../game/engine/progression";
import { parseGameSave } from "../game/save/validation";
import {
  type ActivePlayer,
  type GameSave,
  type MatchResult,
  type RetiredPlayer,
  type SeasonReward,
  type StatKey,
  type TrainingType,
} from "../game/types";
import { playSound } from "../lib/audio";
import { useGameStore } from "../store/gameStore";
import { MatchView } from "./MatchView";
import { PlayerCard } from "./PlayerCard";
import { SetupScreen } from "./SetupScreen";
import { EmptyState, Meter, Modal } from "./ui";

type NavId = "home" | "career" | "trophies" | "player" | "hall" | "settings";
type ModalId =
  | "training"
  | "recovery"
  | "enhancement"
  | "transfer"
  | "auto"
  | null;

const NAV = [
  { id: "home", label: "홈", icon: Home },
  { id: "career", label: "커리어", icon: BarChart3 },
  { id: "trophies", label: "트로피", icon: Trophy },
  { id: "player", label: "선수 정보", icon: UserRound },
  { id: "hall", label: "명예의 전당", icon: Medal },
  { id: "settings", label: "설정", icon: Settings },
] as const;

const STAT_LABELS: Record<StatKey, string> = {
  pace: "속력",
  acceleration: "가속력",
  dribbling: "드리블",
  ballControl: "볼 컨트롤",
  agility: "민첩성",
  balance: "밸런스",
  reactions: "반응 속도",
  shortPassing: "짧은 패스",
  longPassing: "긴 패스",
  vision: "시야",
  crossing: "크로스",
  curve: "커브",
  freeKick: "프리킥",
  finishing: "골 결정력",
  shotPower: "슛 파워",
  longShots: "중거리 슛",
  positioning: "위치 선정",
  volleys: "발리슛",
  penalties: "페널티 킥",
  marking: "대인 수비",
  standingTackle: "태클",
  interceptions: "가로채기",
  heading: "헤더",
  slidingTackle: "슬라이딩 태클",
  strength: "몸싸움",
  stamina: "스태미너",
  aggression: "적극성",
  jumping: "점프",
  composure: "침착성",
  gkDiving: "다이빙",
  gkHandling: "핸들링",
  gkKicking: "킥",
  gkReflexes: "GK 반응",
  gkPositioning: "GK 위치 선정",
};

const GROUP_LABELS: Record<string, string> = {
  speed: "스피드",
  dribbling: "드리블",
  passing: "패스",
  shooting: "슈팅",
  defending: "수비",
  physical: "피지컬",
  goalkeeping: "골키퍼",
};
const ALL_TROPHIES = [
  "리그 우승",
  "국내 컵 우승",
  "Continental Champions Cup 우승",
  "득점왕",
  "도움왕",
  "올해의 선수",
  "시즌 베스트 11",
];
const formatMoney = (value: number) =>
  new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
const averageRating = (player: ActivePlayer) =>
  player.careerTotals.matches
    ? player.careerTotals.ratingSum / player.careerTotals.matches
    : 0;

function LoadingScreen({
  error,
  retry,
}: {
  error?: string | null;
  retry: () => void;
}) {
  return (
    <main className="loading-screen">
      <div className="brand-mark">RYP</div>
      <div className="loading-orbit">
        <Cloud />
        <span />
      </div>
      <h1>{error ? "원격 세이브 연결 실패" : "커리어를 불러오는 중"}</h1>
      <p>
        {error ??
          "모든 선수 정보와 진행 상황을 Cloudflare D1에서 동기화하고 있습니다."}
      </p>
      {error && (
        <button className="primary-cta" onClick={retry}>
          <RefreshCw size={17} /> 다시 연결
        </button>
      )}
    </main>
  );
}

export default function GameApp() {
  const {
    game,
    status,
    error,
    initialize,
    commit,
    manualSave,
    resetSave,
    lastSavedAt,
  } = useGameStore();
  const [nav, setNav] = useState<NavId>("home");
  const [modal, setModal] = useState<ModalId>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [trainingBusy, setTrainingBusy] = useState<TrainingType | null>(null);
  const [enhancementOutcome, setEnhancementOutcome] = useState<ReturnType<
    typeof attemptEnhancement
  > | null>(null);
  const [matchSnapshot, setMatchSnapshot] = useState<{
    player: ActivePlayer;
    result: MatchResult;
  } | null>(null);
  const [playerTab, setPlayerTab] = useState<
    "stats" | "rewards" | "legacy" | "career"
  >("stats");
  const [selectedRetired, setSelectedRetired] = useState<RetiredPlayer | null>(
    null,
  );
  const [retirement, setRetirement] = useState<RetiredPlayer | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void initialize();
  }, [initialize]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!game || status === "idle" || status === "loading")
    return <LoadingScreen error={error} retry={() => void initialize()} />;
  if (status === "error" && !game)
    return <LoadingScreen error={error} retry={() => void initialize()} />;

  const doCommit = (next: GameSave) => {
    void commit(next);
  };
  const active = game.activePlayer;

  const onStart = (
    template: Parameters<typeof startCareer>[1],
    badges: string[],
  ) => {
    const next = startCareer(game, template, badges);
    playSound("kickoff", next.settings);
    doCommit(next);
    setNav("home");
  };

  const retirementModal = (
    <Modal
      open={Boolean(retirement)}
      title="커리어 완주"
      subtitle="당신의 선수가 다음 세대에 영구적인 유산을 남겼습니다."
      onClose={() => setRetirement(null)}
      wide
    >
      {retirement && (
        <div className="retirement-screen">
          <div className="retire-card">
            <div className="retire-ovr">
              <span>FINAL OVR</span>
              <strong>{retirement.finalOvr}</strong>
              <b>+{retirement.enhancementLevel}</b>
            </div>
            <h3>{retirement.name}</h3>
            <p>
              {retirement.position} · {retirement.nationality}
            </p>
          </div>
          <div className="retire-summary">
            <div className="summary-grid">
              <span>
                <small>통산 경기</small>
                <b>{retirement.careerTotals.matches}</b>
              </span>
              <span>
                <small>통산 득점</small>
                <b>{retirement.careerTotals.goals}</b>
              </span>
              <span>
                <small>통산 도움</small>
                <b>{retirement.careerTotals.assists}</b>
              </span>
              <span>
                <small>최고 주급</small>
                <b>{formatMoney(retirement.highestWage)}</b>
              </span>
              <span>
                <small>최종 명성</small>
                <b>{formatMoney(retirement.reputation)}</b>
              </span>
              <span>
                <small>최종 팬</small>
                <b>{formatMoney(retirement.fans)}</b>
              </span>
            </div>
            <div className="legacy-reveal">
              <Sparkles />
              <div>
                <span>NEW LEGACY</span>
                <h3>{retirement.legacyBadge.name}</h3>
                <p>{retirement.legacyBadge.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );

  if (!active)
    return (
      <>
        <SetupScreen save={game} onStart={onStart} />
        {retirementModal}
      </>
    );

  const club = getClub(active.clubId);
  const ovr = calculateOvr(
    active.stats,
    active.position,
    active.enhancementLevel,
  );
  const enhancementStep = getEnhancementStep(active.enhancementLevel + 1);
  const nextOpponent = getClub(active.nextOpponentClubId);

  const train = (type: TrainingType) => {
    playSound("click", game.settings);
    setTrainingBusy(type);
    window.setTimeout(
      () => {
        const result = performTraining(game, type);
        setTrainingBusy(null);
        setToast(result.message);
        if (result.save !== game) doCommit(result.save);
      },
      game.settings.trainingSpeed === 2 ? 350 : 650,
    );
  };

  const playMatch = () => {
    playSound("click", game.settings);
    const result = playNextMatch(game);
    if (result.error || !result.save.lastMatch) {
      setToast(result.error ?? "경기를 시작하지 못했습니다.");
      return;
    }
    setMatchSnapshot({ player: active, result: result.save.lastMatch });
    doCommit(result.save);
  };

  const enhance = () => {
    if (!enhancementStep || active.enhancementCurrency < enhancementStep.cost) {
      setToast("강화 재화가 부족합니다.");
      return;
    }
    const result = attemptEnhancement(active, game.randomSeed);
    const next = {
      ...game,
      activePlayer: result.player,
      randomSeed: game.randomSeed + 1,
      log: [
        `강화 +${active.enhancementLevel + 1} ${result.success ? "성공" : "실패"}`,
        ...game.log,
      ].slice(0, 60),
    };
    playSound(
      result.success ? "enhance-success" : "enhance-fail",
      game.settings,
    );
    setEnhancementOutcome(result);
    doCommit(next);
  };

  const endSeason = () => {
    const next = finishSeason(game);
    if (next !== game) {
      playSound("trophy", game.settings);
      doCommit(next);
    }
  };
  const seasonReward = (reward: SeasonReward) => {
    const before = game.activePlayer;
    const next = chooseSeasonReward(game, reward.id);
    if (before && !next.activePlayer) {
      const retired = next.retiredPlayers[0];
      setRetirement(retired);
      playSound("retire", next.settings);
    }
    doCommit(next);
  };
  const runAuto = (mode: "next" | "season" | "career") => {
    const result = autoAdvance(game, mode);
    const retired =
      result.save.retiredPlayers.length > game.retiredPlayers.length
        ? result.save.retiredPlayers[0]
        : null;
    if (retired) {
      setRetirement(retired);
      playSound("retire", result.save.settings);
    }
    setToast(`자동 진행 정지: ${result.stopReason}`);
    doCommit(result.save);
    setModal(null);
  };

  const updateSettings = (patch: Partial<GameSave["settings"]>) =>
    doCommit({ ...game, settings: { ...game.settings, ...patch } });
  const exportSave = () => {
    const blob = new Blob([JSON.stringify(game, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `raise-your-player-${active.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("저장 데이터를 내보냈습니다.");
  };
  const importSave = async (file: File) => {
    try {
      const value: unknown = JSON.parse(await file.text());
      const imported = parseGameSave(value);
      doCommit({ ...imported, updatedAt: new Date().toISOString() });
      setToast("저장 데이터를 원격 DB로 가져왔습니다.");
    } catch (importError) {
      setToast(
        importError instanceof Error
          ? importError.message
          : "저장 파일을 읽지 못했습니다.",
      );
    }
  };

  const homePanel = (
    <div className="panel-stack">
      <section
        className="hero-panel"
        style={
          {
            "--club-a": club.colors[0],
            "--club-b": club.colors[1],
          } as React.CSSProperties
        }
      >
        <div className="hero-copy">
          <span className="season-chip">
            SEASON {active.season} · WEEK {Math.min(active.week, 12)}
          </span>
          <p>
            NEXT FIXTURE ·{" "}
            {active.week > SEASON_WEEKS
              ? "시즌 결산"
              : active.week === 5 || active.week === 11
                ? "국내 컵"
                : active.week === 7 || active.week === 12
                  ? "CONTINENTAL CUP"
                  : active.league}
          </p>
          <h2>
            {active.week > SEASON_WEEKS
              ? "이번 시즌의 모든 여정이 끝났습니다"
              : `${club.name} vs ${nextOpponent.name}`}
          </h2>
          <div className="fixture-meta">
            <span>
              <Target size={15} /> 감독 미션: {active.mission?.title}
            </span>
            <span>
              <BarChart3 size={15} /> 현재 {active.currentRank}위
            </span>
          </div>
        </div>
        {active.week > SEASON_WEEKS ? (
          <button className="match-cta" onClick={endSeason}>
            <Trophy /> 시즌 결산
          </button>
        ) : (
          <button
            className="match-cta"
            onClick={playMatch}
            disabled={Boolean(active.injury) || active.stamina < 10}
          >
            <Play fill="currentColor" /> 경기 시작
          </button>
        )}
      </section>
      <section className="vitals-grid">
        <div className="vital">
          <div>
            <BatteryCharging size={18} />
            <span>체력</span>
            <b>{active.stamina}</b>
          </div>
          <Meter value={active.stamina} />
        </div>
        <div className="vital">
          <div>
            <Activity size={18} />
            <span>컨디션</span>
            <b>{CONDITION_LABELS[active.condition]}</b>
          </div>
          <Meter value={active.condition} max={5} tone="blue" />
        </div>
        <div className="vital">
          <div>
            <Zap size={18} />
            <span>성장 XP</span>
            <b>
              {active.xp}/{XP_PER_ATTRIBUTE_POINT}
            </b>
          </div>
          <Meter value={active.xp} max={XP_PER_ATTRIBUTE_POINT} tone="gold" />
        </div>
      </section>
      {active.injury && (
        <section className="injury-banner">
          <HeartPulse />
          <div>
            <b>
              {active.injury.severity} 부상 · {active.injury.remainingWeeks}주
            </b>
            <span>
              경기와 일반 훈련이 제한됩니다. 재활 또는 휴식을 진행하세요.
            </span>
          </div>
          <button onClick={() => setModal("recovery")}>재활 열기</button>
        </section>
      )}
      <section>
        <div className="section-title">
          <div>
            <span className="eyebrow">ACTIONS</span>
            <h2>이번 주 행동</h2>
          </div>
          <span>모든 행동은 즉시 원격 저장</span>
        </div>
        <div className="action-grid">
          <button onClick={() => setModal("training")}>
            <Dumbbell />
            <span>
              <b>훈련</b>
              <small>능력치 성장</small>
            </span>
            <ChevronRight />
          </button>
          <button
            onClick={playMatch}
            disabled={active.week > SEASON_WEEKS || Boolean(active.injury)}
          >
            <Gamepad2 />
            <span>
              <b>경기</b>
              <small>시뮬레이션</small>
            </span>
            <ChevronRight />
          </button>
          <button onClick={() => setModal("recovery")}>
            <HeartPulse />
            <span>
              <b>회복</b>
              <small>체력·부상</small>
            </span>
            <ChevronRight />
          </button>
          <button onClick={() => setModal("enhancement")}>
            <Sparkles />
            <span>
              <b>강화 +{active.enhancementLevel}</b>
              <small>최대 +13</small>
            </span>
            <ChevronRight />
          </button>
          <button onClick={() => setModal("transfer")}>
            <ArrowRightLeft />
            <span>
              <b>이적</b>
              <small>
                {active.pendingOffers.length
                  ? `${active.pendingOffers.length}개 제안`
                  : "시장 확인"}
              </small>
            </span>
            <ChevronRight />
          </button>
          <button onClick={() => setModal("auto")}>
            <FastForward />
            <span>
              <b>자동 진행</b>
              <small>전략 기반</small>
            </span>
            <ChevronRight />
          </button>
        </div>
      </section>
      <section className="activity-card">
        <div className="section-title">
          <div>
            <span className="eyebrow">LIVE LOG</span>
            <h2>커리어 피드</h2>
          </div>
        </div>
        {game.log.slice(0, 6).map((line, index) => (
          <div className="log-row" key={`${line}-${index}`}>
            <span>{index + 1}</span>
            <p>{line}</p>
          </div>
        ))}
      </section>
    </div>
  );

  const careerPanel = (
    <div className="panel-stack">
      <section className="page-heading">
        <span className="eyebrow">CAREER</span>
        <h1>커리어 기록</h1>
        <p>{active.name}의 시즌별 성장과 누적 퍼포먼스입니다.</p>
      </section>
      <div className="summary-grid six">
        <span>
          <small>통산 경기</small>
          <b>{active.careerTotals.matches}</b>
        </span>
        <span>
          <small>득점</small>
          <b>{active.careerTotals.goals}</b>
        </span>
        <span>
          <small>도움</small>
          <b>{active.careerTotals.assists}</b>
        </span>
        <span>
          <small>평균 평점</small>
          <b>{averageRating(active).toFixed(2)}</b>
        </span>
        <span>
          <small>팬</small>
          <b>{formatMoney(active.fans)}</b>
        </span>
        <span>
          <small>명성</small>
          <b>{formatMoney(active.reputation)}</b>
        </span>
      </div>
      <section className="timeline-card">
        <h2>시즌 타임라인</h2>
        {active.seasonRecords.map((record) => (
          <div className="season-row" key={record.season}>
            <div className="season-index">S{record.season}</div>
            <div>
              <b>{getClub(record.clubId).name}</b>
              <span>
                {record.matches}경기 · {record.goals}골 · {record.assists}도움 ·
                평점{" "}
                {(record.ratingSum / Math.max(1, record.matches)).toFixed(2)}
              </span>
            </div>
            <strong>
              OVR {record.ovr}
              <small>+{record.enhancementLevel}</small>
            </strong>
          </div>
        ))}
        <div className="season-row current">
          <div className="season-index">S{active.season}</div>
          <div>
            <b>{club.name} · 진행 중</b>
            <span>
              {active.currentSeason.matches}경기 · {active.currentSeason.goals}
              골 · {active.currentSeason.assists}도움
            </span>
          </div>
          <strong>OVR {ovr}</strong>
        </div>
      </section>
      <section className="timeline-card">
        <h2>소속 구단 이력</h2>
        <div className="club-history">
          {active.clubHistory.map((id, index) => (
            <div key={`${id}-${index}`}>
              <span style={{ background: getClub(id).colors[0] }} />
              <b>{getClub(id).name}</b>
              <small>{getClub(id).league}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const trophiesPanel = (
    <div className="panel-stack">
      <section className="page-heading">
        <span className="eyebrow">TROPHY ROOM</span>
        <h1>트로피 현황</h1>
        <p>팀 우승과 개인 수상을 한곳에서 확인하세요.</p>
      </section>
      <div className="trophy-grid">
        {ALL_TROPHIES.map((name) => {
          const won =
            active.trophies.some((item) =>
              item.includes(name.replace("리그 ", "")),
            ) || active.awards.includes(name);
          return (
            <motion.div
              key={name}
              className={won ? "trophy won" : "trophy locked"}
              whileHover={{ y: -4 }}
            >
              {won ? <Trophy /> : <Shield />}
              <b>{name}</b>
              <span>{won ? "획득 완료" : "미획득"}</span>
            </motion.div>
          );
        })}
      </div>
      <section className="timeline-card">
        <h2>획득 상세</h2>
        {[...active.trophies, ...active.awards].length ? (
          [...active.trophies, ...active.awards].map((item, index) => (
            <div className="achievement-row" key={`${item}-${index}`}>
              <Award />
              <div>
                <b>{item}</b>
                <span>커리어 영구 기록</span>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={<Trophy />}
            title="첫 트로피에 도전하세요"
            body="시즌에서 좋은 성적을 거두면 이곳에 기록됩니다."
          />
        )}
      </section>
    </div>
  );

  const playerPanel = (
    <div className="panel-stack">
      <section className="page-heading">
        <span className="eyebrow">PLAYER LAB</span>
        <h1>선수 정보</h1>
        <p>능력치 포인트를 직접 분배하고 성장 효과를 관리합니다.</p>
      </section>
      <div className="subtabs">
        <button
          className={playerTab === "stats" ? "active" : ""}
          onClick={() => setPlayerTab("stats")}
        >
          능력치
        </button>
        <button
          className={playerTab === "rewards" ? "active" : ""}
          onClick={() => setPlayerTab("rewards")}
        >
          시즌 보상
        </button>
        <button
          className={playerTab === "legacy" ? "active" : ""}
          onClick={() => setPlayerTab("legacy")}
        >
          레거시
        </button>
        <button
          className={playerTab === "career" ? "active" : ""}
          onClick={() => setPlayerTab("career")}
        >
          프로필
        </button>
      </div>
      {playerTab === "stats" && (
        <>
          <div className="point-banner">
            <div>
              <Sparkles />
              <span>사용 가능한 능력치 포인트</span>
            </div>
            <strong>{active.attributePoints}</strong>
          </div>
          <div className="stat-groups">
            {Object.entries(STAT_GROUPS)
              .filter(([key]) =>
                active.position === "GK"
                  ? key === "goalkeeping"
                  : key !== "goalkeeping",
              )
              .map(([group, keys]) => (
                <section key={group}>
                  <header>
                    <h3>{GROUP_LABELS[group]}</h3>
                    <b>{categoryAverage(active.stats, group)}</b>
                  </header>
                  {keys.map((key) => (
                    <div className="stat-row" key={key}>
                      <span>{STAT_LABELS[key]}</span>
                      <div className="mini-meter">
                        <i
                          style={{
                            width: `${(active.stats[key] / MAX_STAT) * 100}%`,
                          }}
                        />
                      </div>
                      <strong>{active.stats[key]}</strong>
                      <button
                        disabled={
                          active.attributePoints < 1 ||
                          active.stats[key] >= MAX_STAT
                        }
                        onClick={() =>
                          doCommit({
                            ...game,
                            activePlayer: spendAttributePoint(active, key),
                          })
                        }
                        aria-label={`${STAT_LABELS[key]} 1 증가`}
                      >
                        +
                      </button>
                    </div>
                  ))}
                </section>
              ))}
          </div>
        </>
      )}
      {playerTab === "rewards" && (
        <div className="inventory-grid">
          {active.seasonRewards.length ? (
            active.seasonRewards.map((reward) => (
              <div key={reward.id}>
                <Star />
                <span>{reward.rarity}</span>
                <h3>{reward.name}</h3>
                <p>{reward.description}</p>
              </div>
            ))
          ) : (
            <EmptyState
              icon={<Star />}
              title="아직 시즌 보상이 없습니다"
              body="시즌 결산에서 세 가지 보상 중 하나를 선택할 수 있습니다."
            />
          )}
        </div>
      )}
      {playerTab === "legacy" && (
        <div className="inventory-grid">
          {game.legacyBadges.length ? (
            game.legacyBadges.map((badge) => (
              <div
                className={
                  active.equippedLegacyBadgeIds.includes(badge.id)
                    ? "equipped"
                    : ""
                }
                key={badge.id}
              >
                <Medal />
                <span>
                  {active.equippedLegacyBadgeIds.includes(badge.id)
                    ? "적용 중"
                    : "보유"}
                </span>
                <h3>{badge.name}</h3>
                <p>{badge.description}</p>
              </div>
            ))
          ) : (
            <EmptyState
              icon={<Medal />}
              title="첫 레거시를 만드세요"
              body="선수가 은퇴하면 다음 세대에 적용되는 레거시 배지를 남깁니다."
            />
          )}
        </div>
      )}
      {playerTab === "career" && (
        <section className="profile-sheet">
          <PlayerCard player={active} />
          <dl>
            <div>
              <dt>나이</dt>
              <dd>{active.age}</dd>
            </div>
            <div>
              <dt>주발</dt>
              <dd>{active.preferredFoot}</dd>
            </div>
            <div>
              <dt>등번호</dt>
              <dd>{active.shirtNumber}</dd>
            </div>
            <div>
              <dt>세부 포지션</dt>
              <dd>{active.detailPosition}</dd>
            </div>
            <div>
              <dt>커리어 길이</dt>
              <dd>{active.careerLength}시즌</dd>
            </div>
            <div>
              <dt>최고 주급</dt>
              <dd>{formatMoney(active.highestWage)}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );

  const hallPanel = (
    <div className="panel-stack">
      <section className="page-heading">
        <span className="eyebrow">HALL OF FAME</span>
        <h1>명예의 전당</h1>
        <p>은퇴한 선수와 그들이 남긴 레거시를 다시 만나보세요.</p>
      </section>
      {game.retiredPlayers.length ? (
        <div className="hall-grid">
          {game.retiredPlayers.map((player) => (
            <button key={player.id} onClick={() => setSelectedRetired(player)}>
              <div className="hall-ovr">
                {player.finalOvr}
                <small>OVR</small>
              </div>
              <div>
                <h3>{player.name}</h3>
                <p>
                  {player.position} · {player.careerTotals.matches}경기 ·{" "}
                  {player.careerTotals.goals}골
                </p>
                <span>
                  <Medal size={14} />
                  {player.legacyBadge.name}
                </span>
              </div>
              <ChevronRight />
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Users />}
          title="명예의 전당이 비어 있습니다"
          body="첫 선수의 커리어를 완주하면 은퇴 기록이 이곳에 보존됩니다."
        />
      )}
    </div>
  );

  const settingsPanel = (
    <div className="panel-stack">
      <section className="page-heading">
        <span className="eyebrow">SYSTEM</span>
        <h1>게임 설정</h1>
        <p>자동 진행, 사운드와 원격 저장을 관리합니다.</p>
      </section>
      <section className="settings-card">
        <h2>사운드</h2>
        <div className="setting-row">
          <div>
            {game.settings.muted ? <VolumeX /> : <Volume2 />}
            <span>
              <b>효과음</b>
              <small>Web Audio API로 생성된 자체 효과음</small>
            </span>
          </div>
          <button
            className={`switch ${!game.settings.muted ? "on" : ""}`}
            onClick={() => updateSettings({ muted: !game.settings.muted })}
          >
            <i />
          </button>
        </div>
        <label className="range-row">
          음량{" "}
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={game.settings.volume}
            onChange={(event) =>
              updateSettings({ volume: Number(event.target.value) })
            }
          />
          <b>{Math.round(game.settings.volume * 100)}%</b>
        </label>
      </section>
      <section className="settings-card">
        <h2>자동 진행 정지 조건</h2>
        {Object.entries(game.settings.autoStops).map(([key, value]) => (
          <div className="setting-row" key={key}>
            <div>
              <Target />
              <span>
                <b>
                  {
                    {
                      attributePoint: "능력치 포인트 획득",
                      enhancementAvailable: "강화 가능",
                      transferOffer: "이적 제안",
                      seasonReward: "시즌 보상 선택",
                      final: "중요 결승전",
                      injury: "부상",
                      retirement: "은퇴",
                    }[key as keyof typeof game.settings.autoStops]
                  }
                </b>
                <small>중요 상황에서 자동 진행 일시 정지</small>
              </span>
            </div>
            <button
              className={`switch ${value ? "on" : ""}`}
              onClick={() =>
                updateSettings({
                  autoStops: { ...game.settings.autoStops, [key]: !value },
                })
              }
            >
              <i />
            </button>
          </div>
        ))}
      </section>
      <section className="settings-card">
        <h2>원격 저장</h2>
        <div className="cloud-status">
          <Cloud />
          <div>
            <b>
              {status === "saving" ? "D1 저장 중" : "Cloudflare D1 동기화됨"}
            </b>
            <span>
              {lastSavedAt
                ? new Date(lastSavedAt).toLocaleString("ko-KR")
                : "저장 기록 없음"}
            </span>
          </div>
        </div>
        <div className="settings-actions">
          <button onClick={() => void manualSave()}>
            <Save /> 수동 저장
          </button>
          <button onClick={exportSave}>
            <BookOpen /> JSON 내보내기
          </button>
          <button onClick={() => importRef.current?.click()}>
            <Upload /> JSON 불러오기
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importSave(file);
              event.target.value = "";
            }}
          />
        </div>
      </section>
      <section className="settings-card danger-zone">
        <h2>커리어 관리</h2>
        <button
          onClick={() => {
            if (
              confirm(
                "현재 선수 커리어를 종료하고 새 선수를 시작할까요? 명예의 전당과 레거시는 유지됩니다.",
              )
            )
              doCommit({
                ...game,
                activePlayer: null,
                pendingPostMatchBonuses: [],
                pendingSeasonRewards: [],
                lastMatch: null,
              });
          }}
        >
          새 선수 육성
        </button>
        <button
          onClick={() => {
            if (
              confirm(
                "모든 원격 저장, 은퇴 선수와 레거시를 완전히 초기화할까요?",
              )
            )
              void resetSave();
          }}
        >
          모든 저장 초기화
        </button>
      </section>
    </div>
  );

  const panels: Record<NavId, React.ReactNode> = {
    home: homePanel,
    career: careerPanel,
    trophies: trophiesPanel,
    player: playerPanel,
    hall: hallPanel,
    settings: settingsPanel,
  };

  return (
    <main className="game-shell">
      <header className="mobile-topbar">
        <div className="mini-brand">RYP</div>
        <div>
          <b>{active.name}</b>
          <span>
            {club.name} · S{active.season} W{Math.min(active.week, 12)}
          </span>
        </div>
        <strong>
          {ovr}
          <small>OVR</small>
        </strong>
      </header>
      <aside className="side-panel left-panel">
        <div className="desktop-brand">
          <div className="brand-mark">RYP</div>
          <span>RAISE YOUR PLAYER</span>
        </div>
        <PlayerCard player={active} />
        <div className="currency-list">
          <div>
            <Banknote />
            <span>보유 현금</span>
            <b>{formatMoney(active.cash)}</b>
          </div>
          <div>
            <Coins />
            <span>강화 재화</span>
            <b>{formatMoney(active.enhancementCurrency)}</b>
          </div>
          <div>
            <Star />
            <span>명성</span>
            <b>{formatMoney(active.reputation)}</b>
          </div>
        </div>
        <div className="save-indicator">
          <span className={status === "saving" ? "syncing" : ""} />
          <div>
            <b>{status === "saving" ? "원격 저장 중" : "자동 저장 완료"}</b>
            <small>Cloudflare D1</small>
          </div>
        </div>
      </aside>
      <section className="main-panel">
        <AnimatePresence mode="wait">
          <motion.div
            key={nav}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {panels[nav]}
          </motion.div>
        </AnimatePresence>
      </section>
      <aside className="side-panel right-panel">
        <section>
          <span className="eyebrow">NEXT MATCH</span>
          <h3>{nextOpponent.name}</h3>
          <p>
            {nextOpponent.league} · 전력 {nextOpponent.strength}
          </p>
          <div className="versus">
            <span style={{ background: club.colors[0] }}>
              {club.name.slice(0, 2)}
            </span>
            <b>VS</b>
            <span style={{ background: nextOpponent.colors[0] }}>
              {nextOpponent.name.slice(0, 2)}
            </span>
          </div>
        </section>
        <section>
          <span className="eyebrow">MANAGER MISSION</span>
          <h3>{active.mission?.title}</h3>
          <p>
            성공 시 강화 재화 +{active.mission?.currencyReward} · 명성 +
            {active.mission?.reputationReward}
          </p>
          <Meter
            value={active.mission?.difficulty ?? 1}
            max={3}
            tone="gold"
            label="난이도"
          />
        </section>
        <section>
          <span className="eyebrow">SEASON TRACK</span>
          <div className="season-track">
            {Array.from({ length: 12 }, (_, index) => (
              <i
                key={index}
                className={
                  index + 1 < active.week
                    ? "done"
                    : index + 1 === active.week
                      ? "current"
                      : ""
                }
              />
            ))}
          </div>
          <p>
            {active.week > 12
              ? "시즌 결산 가능"
              : `시즌 종료까지 ${13 - active.week}경기`}
          </p>
        </section>
      </aside>
      <nav className="bottom-nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={nav === id ? "active" : ""}
            onClick={() => {
              playSound("click", game.settings);
              setNav(id);
            }}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <Modal
        open={modal === "training"}
        title="훈련 센터"
        subtitle="훈련 속도와 보유 보너스가 즉시 결과에 반영됩니다."
        onClose={() => setModal(null)}
        wide
      >
        <div className="training-grid">
          {Object.values(TRAINING)
            .filter((item) => !["rest", "rehab"].includes(item.id))
            .map((item) => (
              <button
                key={item.id}
                disabled={
                  Boolean(trainingBusy) ||
                  Boolean(active.injury && item.id !== "rehab")
                }
                onClick={() => train(item.id)}
              >
                <div>
                  <Dumbbell />
                  <b>{item.name}</b>
                </div>
                <p>{item.description}</p>
                <span>
                  체력 -{item.staminaCost} · XP +{item.xp}
                </span>
                {trainingBusy === item.id && (
                  <motion.i
                    className="training-progress"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{
                      duration: game.settings.trainingSpeed === 2 ? 0.3 : 0.6,
                    }}
                  />
                )}
              </button>
            ))}
        </div>
        <div className="speed-pills">
          <button
            className={game.settings.trainingSpeed === 1 ? "active" : ""}
            onClick={() => updateSettings({ trainingSpeed: 1 })}
          >
            1배
          </button>
          <button
            className={game.settings.trainingSpeed === 2 ? "active" : ""}
            onClick={() => updateSettings({ trainingSpeed: 2 })}
          >
            2배
          </button>
        </div>
      </Modal>
      <Modal
        open={modal === "recovery"}
        title="회복 센터"
        subtitle="체력, 컨디션과 부상 상태를 관리합니다."
        onClose={() => setModal(null)}
      >
        <div className="recovery-hero">
          <HeartPulse />
          <div>
            <span>현재 체력</span>
            <strong>{active.stamina}</strong>
            <p>
              컨디션 {CONDITION_LABELS[active.condition]}{" "}
              {active.injury
                ? `· ${active.injury.severity} 부상 ${active.injury.remainingWeeks}주`
                : "· 부상 없음"}
            </p>
          </div>
        </div>
        <div className="recovery-actions">
          <button onClick={() => train("rest")}>
            <BatteryCharging />
            <div>
              <b>휴식</b>
              <span>체력 +35 · 컨디션 상승 · 무료</span>
            </div>
          </button>
          <button
            disabled={!active.injury || active.cash < TRAINING.rehab.cashCost}
            onClick={() => train("rehab")}
          >
            <HeartPulse />
            <div>
              <b>집중 재활</b>
              <span>
                부상 2주 단축 · ₩{formatMoney(TRAINING.rehab.cashCost)}
              </span>
            </div>
          </button>
        </div>
      </Modal>
      <Modal
        open={modal === "enhancement"}
        title="선수 강화"
        subtitle="실패해도 등급은 유지되며 누적 보정이 증가합니다."
        onClose={() => {
          setModal(null);
          setEnhancementOutcome(null);
        }}
      >
        <div
          className={`enhance-card ${enhancementOutcome ? (enhancementOutcome.success ? "success" : "failure") : ""}`}
        >
          <PlayerCard player={active} />
          {enhancementOutcome && (
            <motion.div
              className="enhance-outcome"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Sparkles />
              <strong>
                {enhancementOutcome.success ? "강화 성공" : "강화 실패"}
              </strong>
              <span>
                {enhancementOutcome.previousOvr} → {enhancementOutcome.nextOvr}
              </span>
            </motion.div>
          )}
        </div>
        {enhancementStep ? (
          <div className="enhance-info">
            <div>
              <span>목표 등급</span>
              <b>+{enhancementStep.level}</b>
            </div>
            <div>
              <span>성공 확률</span>
              <b>
                {Math.round(
                  (enhancementStep.successRate +
                    active.enhancementFailureBoost) *
                    100,
                )}
                %
              </b>
            </div>
            <div>
              <span>예상 OVR</span>
              <b>{ovr + enhancementStep.ovrBonus}</b>
            </div>
            <div>
              <span>예상 주급 증가</span>
              <b>+{enhancementStep.wagePercent}%</b>
            </div>
            <div>
              <span>필요 재화</span>
              <b>{formatMoney(enhancementStep.cost)}</b>
            </div>
            <div>
              <span>보유 재화</span>
              <b>{formatMoney(active.enhancementCurrency)}</b>
            </div>
          </div>
        ) : (
          <div className="max-level">
            <Sparkles />
            <h3>최고 강화 등급 달성</h3>
            <p>+13 단계의 모든 잠재력을 해방했습니다.</p>
          </div>
        )}
        <button
          className="primary-cta"
          disabled={
            !enhancementStep ||
            active.enhancementCurrency < (enhancementStep?.cost ?? Infinity)
          }
          onClick={enhance}
        >
          {enhancementStep
            ? `+${enhancementStep.level} 강화 시도`
            : "최고 등급"}
        </button>
      </Modal>
      <Modal
        open={modal === "transfer"}
        title="이적시장"
        subtitle="시즌 4주차와 9주차에 활발한 오퍼가 도착합니다."
        onClose={() => setModal(null)}
        wide
      >
        {active.pendingOffers.length ? (
          <div className="offer-grid">
            {active.pendingOffers.map((offer) => {
              const target = getClub(offer.clubId);
              return (
                <div
                  key={offer.id}
                  style={
                    { "--club-a": target.colors[0] } as React.CSSProperties
                  }
                >
                  <div className="offer-club">
                    <span>{target.name.slice(0, 2)}</span>
                    <div>
                      <h3>{target.name}</h3>
                      <p>
                        {target.league} · 전력 {target.strength}
                      </p>
                    </div>
                  </div>
                  <dl>
                    <div>
                      <dt>예상 선발</dt>
                      <dd>{offer.expectedStarts}%</dd>
                    </div>
                    <div>
                      <dt>주급</dt>
                      <dd>{formatMoney(offer.wage)}</dd>
                    </div>
                    <div>
                      <dt>계약</dt>
                      <dd>{offer.contractYears}년</dd>
                    </div>
                    <div>
                      <dt>리그 우승 가능성</dt>
                      <dd>{offer.titleChance}%</dd>
                    </div>
                    <div>
                      <dt>대륙 대회</dt>
                      <dd>{offer.continental ? "참가" : "미참가"}</dd>
                    </div>
                    <div>
                      <dt>역할</dt>
                      <dd>{offer.role}</dd>
                    </div>
                  </dl>
                  <button
                    onClick={() => {
                      doCommit(resolveTransfer(game, offer));
                      setModal(null);
                    }}
                  >
                    {target.name} 이적 수락
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<ArrowRightLeft />}
            title="현재 도착한 제안이 없습니다"
            body={`OVR, 명성, 시즌 성적이 높을수록 강팀의 제안이 등장합니다. 현재 ${active.week}주차입니다.`}
          />
        )}
        <button
          className="secondary-cta"
          disabled={!active.pendingOffers.length}
          onClick={() => {
            doCommit(resolveTransfer(game, null));
            setModal(null);
          }}
        >
          모든 제안 거절 · 현재 구단 잔류
        </button>
      </Modal>
      <Modal
        open={modal === "auto"}
        title="자동 진행"
        subtitle="현재 전략에 맞춰 훈련, 회복과 경기 결과를 자동 처리합니다."
        onClose={() => setModal(null)}
      >
        <label className="strategy-select">
          육성 전략
          <select
            value={game.settings.autoStrategy}
            onChange={(event) =>
              updateSettings({
                autoStrategy: event.target
                  .value as GameSave["settings"]["autoStrategy"],
              })
            }
          >
            <option value="recommended">포지션 추천</option>
            <option value="attack">공격 집중</option>
            <option value="balanced">균형 성장</option>
            <option value="defense">수비 집중</option>
            <option value="custom">직접 지정</option>
          </select>
        </label>
        <div className="auto-actions">
          <button onClick={() => runAuto("next")}>
            <Play />
            <div>
              <b>다음 경기까지</b>
              <span>훈련 1회와 다음 경기를 진행</span>
            </div>
          </button>
          <button onClick={() => runAuto("season")}>
            <Gauge />
            <div>
              <b>시즌 종료까지</b>
              <span>정지 조건까지 자동 진행</span>
            </div>
          </button>
          <button onClick={() => runAuto("career")}>
            <FastForward />
            <div>
              <b>전체 커리어</b>
              <span>은퇴 또는 정지 조건까지 진행</span>
            </div>
          </button>
        </div>
      </Modal>
      <Modal
        open={Boolean(matchSnapshot)}
        title="라이브 매치"
        subtitle="능력치, 체력, 팀 전력과 홈 어드밴티지가 반영된 결정적 시뮬레이션"
        onClose={() =>
          matchSnapshot?.result.events.length && setMatchSnapshot(null)
        }
        wide
      >
        {matchSnapshot && (
          <MatchView
            player={matchSnapshot.player}
            result={matchSnapshot.result}
            settings={game.settings}
            onClose={() => setMatchSnapshot(null)}
          />
        )}
      </Modal>
      <Modal
        open={!matchSnapshot && game.pendingPostMatchBonuses.length > 0}
        title="경기 후 여파"
        subtitle="세 가지 보너스 중 하나를 선택하세요."
        onClose={() => undefined}
      >
        <div className="reward-choice">
          {game.pendingPostMatchBonuses.map((reward) => (
            <button
              key={reward.id}
              onClick={() => doCommit(choosePostMatchBonus(game, reward.id))}
            >
              <Zap />
              <span>{reward.rarity}</span>
              <h3>{reward.name}</h3>
              <p>{reward.description}</p>
              <b>선택</b>
            </button>
          ))}
        </div>
      </Modal>
      <Modal
        open={game.pendingSeasonRewards.length > 0}
        title={`시즌 ${active.season} 보상`}
        subtitle="이번 커리어에 적용할 장비 하나를 선택하세요."
        onClose={() => undefined}
        wide
      >
        <div className="reward-choice season-rewards">
          {game.pendingSeasonRewards.map((reward) => (
            <button key={reward.id} onClick={() => seasonReward(reward)}>
              <Award />
              <span>{reward.rarity}</span>
              <h3>{reward.name}</h3>
              <p>{reward.description}</p>
              <b>보상 선택</b>
            </button>
          ))}
        </div>
      </Modal>
      <Modal
        open={Boolean(selectedRetired)}
        title="명예의 전당 기록"
        onClose={() => setSelectedRetired(null)}
        wide
      >
        {selectedRetired && (
          <div className="retired-detail">
            <div className="retired-head">
              <div className="hall-ovr">
                {selectedRetired.finalOvr}
                <small>FINAL OVR</small>
              </div>
              <div>
                <h2>{selectedRetired.name}</h2>
                <p>
                  {selectedRetired.position} · 강화 +
                  {selectedRetired.enhancementLevel} ·{" "}
                  {selectedRetired.careerTotals.matches}경기
                </p>
                <span>
                  <Medal />
                  {selectedRetired.legacyBadge.name}
                </span>
              </div>
            </div>
            <div className="summary-grid">
              <span>
                <small>득점</small>
                <b>{selectedRetired.careerTotals.goals}</b>
              </span>
              <span>
                <small>도움</small>
                <b>{selectedRetired.careerTotals.assists}</b>
              </span>
              <span>
                <small>트로피</small>
                <b>{selectedRetired.trophies.length}</b>
              </span>
              <span>
                <small>개인 수상</small>
                <b>{selectedRetired.awards.length}</b>
              </span>
            </div>
            <div className="retired-seasons">
              {selectedRetired.seasonRecords.map((record) => (
                <div key={record.season}>
                  <b>
                    S{record.season} · {getClub(record.clubId).name}
                  </b>
                  <span>
                    OVR {record.ovr} · +{record.enhancementLevel} ·{" "}
                    {record.goals}골 {record.assists}도움
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
      {retirementModal}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <Info />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
