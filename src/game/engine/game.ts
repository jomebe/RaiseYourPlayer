import { CLUBS, getClub } from "../config/clubs";
import {
  DEFAULT_SETTINGS,
  MAX_STAT,
  SEASON_WEEKS,
} from "../config/progression";
import { makeMatchBonuses, makeRewards } from "../config/rewards";
import { selectMission } from "../config/missions";
import { TRAINING } from "../config/training";
import type {
  ActivePlayer,
  CareerTotals,
  CustomPlayerInput,
  GameSave,
  LegacyBadge,
  PlayerTemplate,
  RetiredPlayer,
  SeasonReward,
  StatKey,
  TrainingType,
  TransferOffer,
} from "../types";
import { addExperience } from "./progression";
import { calculateWage } from "./enhancement";
import {
  categoryAverage,
  calculateOvr,
  generateBaseStats,
  STAT_GROUPS,
} from "./ovr";
import { createRng, seededId } from "./rng";
import { simulateMatch } from "./match";
import { acceptTransfer, generateTransferOffers } from "./transfer";

export const SAVE_VERSION = 1 as const;
export const emptyTotals = (): CareerTotals => ({
  matches: 0,
  wins: 0,
  goals: 0,
  assists: 0,
  tackles: 0,
  saves: 0,
  ratingSum: 0,
  yellowCards: 0,
});

export function createEmptySave(seed = Date.now()): GameSave {
  return {
    version: SAVE_VERSION,
    updatedAt: new Date().toISOString(),
    activePlayer: null,
    retiredPlayers: [],
    legacyBadges: [],
    settings: structuredClone(DEFAULT_SETTINGS),
    pendingPostMatchBonuses: [],
    pendingSeasonRewards: [],
    lastMatch: null,
    randomSeed: seed,
    log: ["새로운 육성 기록이 생성되었습니다."],
  };
}

function applyLegacyBonuses(
  template: PlayerTemplate,
  badges: LegacyBadge[],
): ReturnType<typeof generateBaseStats> {
  const stats = generateBaseStats(
    template.targetOvr,
    template.position,
    template.id,
  );
  for (const badge of badges) {
    const keys =
      badge.category === "all"
        ? (Object.keys(stats) as StatKey[])
        : (STAT_GROUPS[badge.category] ?? []);
    for (const key of keys)
      stats[key] = Math.min(MAX_STAT, stats[key] + badge.statBonus);
  }
  return stats;
}

export function createActivePlayer(
  template: PlayerTemplate,
  allBadges: LegacyBadge[],
  selectedBadgeIds: string[] = [],
): ActivePlayer {
  const appliedBadges =
    template.careerLength === 5
      ? allBadges
      : allBadges.filter((badge) =>
          selectedBadgeIds.slice(0, 3).includes(badge.id),
        );
  const stats = applyLegacyBonuses(template, appliedBadges);
  const club = getClub(template.clubId);
  const base = {
    ...template,
    instanceId: crypto.randomUUID(),
    stats,
    enhancementLevel: 1,
    enhancementFailureBoost: 0,
    cash: 15000,
    enhancementCurrency: 4200,
    reputation: 300,
    fans: 1500,
    stamina: 100,
    condition: 3 as const,
    injury: null,
    xp: 0,
    attributePoints: 0,
    season: 1,
    week: 1,
    wage: template.baseWage,
    highestWage: template.baseWage,
    currentRank: 10,
    careerTotals: emptyTotals(),
    currentSeason: emptyTotals(),
    seasonRecords: [],
    trophies: [],
    awards: [],
    seasonRewards: [],
    equippedLegacyBadgeIds: appliedBadges.map((badge) => badge.id),
    clubHistory: [club.id],
    pendingOffers: [],
    mission: selectMission(template.position, 1),
    nextOpponentClubId:
      CLUBS.find(
        (candidate) =>
          candidate.league === club.league && candidate.id !== club.id,
      )?.id ?? CLUBS[0].id,
    trainingXp: {},
  } satisfies ActivePlayer;
  const wage = calculateWage(base, club.wageFactor);
  return { ...base, wage, highestWage: wage };
}

export function customTemplate(input: CustomPlayerInput): PlayerTemplate {
  return {
    id: `custom-${Date.now()}`,
    name: input.name.trim() || "New Player",
    nationality: input.nationality.trim() || "대한민국",
    age: 18,
    position: input.position,
    detailPosition: input.detailPosition.trim() || "유망주",
    preferredFoot: input.preferredFoot,
    shirtNumber: Math.max(1, Math.min(99, input.shirtNumber)),
    clubId: "tottenham",
    league: "Premier League",
    targetOvr: 68,
    baseWage: 32000,
    careerLength: 5,
    appearance: input.appearance,
  };
}

export function startCareer(
  save: GameSave,
  template: PlayerTemplate,
  selectedBadgeIds: string[] = [],
): GameSave {
  const player = createActivePlayer(
    template,
    save.legacyBadges,
    selectedBadgeIds,
  );
  return {
    ...save,
    updatedAt: new Date().toISOString(),
    activePlayer: player,
    pendingPostMatchBonuses: [],
    pendingSeasonRewards: [],
    lastMatch: null,
    log: [
      `${player.name}의 ${player.careerLength}시즌 커리어가 시작되었습니다.`,
      ...save.log,
    ].slice(0, 60),
  };
}

const clampCondition = (value: number) =>
  Math.max(1, Math.min(5, value)) as ActivePlayer["condition"];

export function performTraining(
  save: GameSave,
  type: TrainingType,
): { save: GameSave; message: string; gained: string[] } {
  const player = save.activePlayer;
  if (!player)
    return { save, message: "육성 중인 선수가 없습니다.", gained: [] };
  const config = TRAINING[type];
  if (player.injury && type !== "rehab" && type !== "rest")
    return {
      save,
      message: "부상 중에는 휴식 또는 재활만 가능합니다.",
      gained: [],
    };
  if (type === "rehab" && !player.injury)
    return { save, message: "현재 재활이 필요한 부상이 없습니다.", gained: [] };
  if (player.cash < config.cashCost)
    return { save, message: "재활 비용이 부족합니다.", gained: [] };
  if (config.staminaCost > 0 && player.stamina < config.staminaCost + 3)
    return { save, message: "체력이 부족합니다. 먼저 회복하세요.", gained: [] };

  const rng = createRng(save.randomSeed + player.week * 31 + type.length);
  const legacyBonus = save.legacyBadges
    .filter(
      (badge) =>
        player.equippedLegacyBadgeIds.includes(badge.id) &&
        (badge.category === type || badge.category === "all"),
    )
    .reduce((sum, badge) => sum + badge.trainingBonus, 0);
  const rewardBonus = player.seasonRewards
    .filter((reward) => reward.category === type)
    .reduce((sum, reward) => sum + reward.trainingBonus, 0);
  const totalXp = Math.round(
    config.xp * (1 + (legacyBonus + rewardBonus) / 100),
  );
  const stats = { ...player.stats };
  const gained: string[] = [];
  for (const key of config.stats) {
    const chance =
      0.18 + player.condition * 0.025 + Math.min(0.18, totalXp / 1200);
    if (stats[key] < MAX_STAT && rng() < chance) {
      stats[key] += 1;
      gained.push(key);
    }
  }

  let injury: ActivePlayer["injury"] = player.injury;
  if (
    !injury &&
    config.injuryChance > 0 &&
    rng() < config.injuryChance * (player.stamina < 35 ? 2.2 : 1)
  ) {
    const roll = rng();
    injury =
      roll > 0.96
        ? { severity: "심각" as const, remainingWeeks: 5 }
        : roll > 0.7
          ? { severity: "보통" as const, remainingWeeks: 3 }
          : { severity: "경미" as const, remainingWeeks: 1 };
  }
  if (type === "rehab" && injury)
    injury =
      injury.remainingWeeks <= 1
        ? null
        : { ...injury, remainingWeeks: injury.remainingWeeks - 2 };
  const stamina = Math.max(
    0,
    Math.min(100, player.stamina - config.staminaCost),
  );
  const condition = clampCondition(player.condition + config.conditionDelta);
  const withTraining = {
    ...player,
    stats,
    stamina,
    condition,
    injury,
    cash: player.cash - config.cashCost,
    trainingXp: {
      ...player.trainingXp,
      [type]: (player.trainingXp[type] ?? 0) + totalXp,
    },
  };
  const progressed = addExperience(withTraining, Math.round(totalXp * 0.32));
  const message = `${config.name} 완료 · 훈련 XP +${totalXp}${gained.length ? ` · 능력치 ${gained.length}개 상승` : ""}${injury && !player.injury ? ` · ${injury.severity} 부상` : ""}`;
  return {
    save: {
      ...save,
      updatedAt: new Date().toISOString(),
      activePlayer: progressed.player,
      randomSeed: save.randomSeed + 1,
      log: [message, ...save.log].slice(0, 60),
    },
    message,
    gained,
  };
}

function addTotals(
  base: CareerTotals,
  result: ReturnType<typeof simulateMatch>,
): CareerTotals {
  const stats = result.playerStats;
  return {
    matches: base.matches + 1,
    wins: base.wins + (result.won ? 1 : 0),
    goals: base.goals + stats.goals,
    assists: base.assists + stats.assists,
    tackles: base.tackles + stats.tackles,
    saves: base.saves + stats.saves,
    ratingSum: base.ratingSum + stats.rating,
    yellowCards: base.yellowCards + stats.yellowCards,
  };
}

export function playNextMatch(save: GameSave): {
  save: GameSave;
  error?: string;
  pointsEarned: number;
} {
  const player = save.activePlayer;
  if (!player)
    return { save, error: "육성 중인 선수가 없습니다.", pointsEarned: 0 };
  if (player.week > SEASON_WEEKS)
    return { save, error: "시즌 결산을 진행하세요.", pointsEarned: 0 };
  if (player.injury)
    return {
      save,
      error: "부상 중에는 경기에 출전할 수 없습니다.",
      pointsEarned: 0,
    };
  if (player.stamina < 10)
    return {
      save,
      error: "경기 출전에 필요한 체력이 부족합니다.",
      pointsEarned: 0,
    };
  const result = simulateMatch(player, save.randomSeed);
  const careerTotals = addTotals(player.careerTotals, result);
  const currentSeason = addTotals(player.currentSeason, result);
  const progressed = addExperience(player, result.xpEarned);
  const conditionDelta =
    result.playerStats.rating >= 8 ? 1 : result.playerStats.rating < 6 ? -1 : 0;
  const reputationReward =
    (result.missionSuccess ? (player.mission?.reputationReward ?? 0) : 0) +
    Math.round(result.playerStats.rating * 12) +
    (result.won ? 70 : 15);
  const offers = generateTransferOffers(
    { ...player, currentSeason },
    save.randomSeed + 9,
  );
  const sameLeague = CLUBS.filter(
    (club) =>
      club.league === getClub(player.clubId).league &&
      club.id !== player.clubId,
  );
  const nextOpponent =
    sameLeague[
      (player.week + player.season + save.randomSeed) % sameLeague.length
    ] ?? CLUBS[0];
  let injury: ActivePlayer["injury"] = null;
  const rng = createRng(save.randomSeed + 77);
  if (rng() < 0.025 * (player.stamina < 30 ? 2.5 : 1))
    injury = { severity: "경미", remainingWeeks: 1 };
  const updated: ActivePlayer = {
    ...progressed.player,
    careerTotals,
    currentSeason,
    cash: player.cash + result.cashEarned + player.wage,
    enhancementCurrency: player.enhancementCurrency + result.currencyEarned,
    reputation: player.reputation + reputationReward,
    fans:
      player.fans +
      Math.round(
        250 + result.playerStats.rating * 70 + result.playerStats.goals * 600,
      ),
    stamina: Math.max(0, player.stamina - 24),
    condition: clampCondition(player.condition + conditionDelta),
    injury,
    week: player.week + 1,
    currentRank: Math.max(
      1,
      Math.min(
        20,
        player.currentRank + (result.won ? -1 : result.drew ? 0 : 1),
      ),
    ),
    pendingOffers: offers,
    mission: selectMission(player.position, save.randomSeed + 1),
    nextOpponentClubId: nextOpponent.id,
  };
  const line = `${result.competition} ${result.homeScore}-${result.awayScore} · 평점 ${result.playerStats.rating.toFixed(1)} · XP +${result.xpEarned}`;
  return {
    pointsEarned: progressed.pointsEarned,
    save: {
      ...save,
      updatedAt: new Date().toISOString(),
      activePlayer: updated,
      lastMatch: result,
      pendingPostMatchBonuses: makeMatchBonuses(save.randomSeed),
      randomSeed: save.randomSeed + 1,
      log: [line, ...save.log].slice(0, 60),
    },
  };
}

function applyRewardStats(
  player: ActivePlayer,
  reward: SeasonReward,
): ActivePlayer {
  if (reward.statBonus <= 0) return player;
  const stats = { ...player.stats };
  for (const key of STAT_GROUPS[reward.category] ?? [])
    stats[key] = Math.min(MAX_STAT, stats[key] + reward.statBonus);
  return { ...player, stats };
}

export function choosePostMatchBonus(
  save: GameSave,
  rewardId: string,
): GameSave {
  const player = save.activePlayer;
  const reward = save.pendingPostMatchBonuses.find(
    (item) => item.id === rewardId,
  );
  if (!player || !reward) return save;
  let updated = applyRewardStats(player, reward);
  if (reward.name === "피로 회복")
    updated = { ...updated, stamina: Math.min(100, updated.stamina + 25) };
  if (reward.name === "컨디션 업")
    updated = { ...updated, condition: clampCondition(updated.condition + 1) };
  if (reward.name === "팬 서비스")
    updated = { ...updated, fans: updated.fans + 1200 };
  if (reward.name === "보호 테이핑")
    updated = { ...updated, stamina: Math.min(100, updated.stamina + 12) };
  if (reward.trainingBonus > 0)
    updated = { ...updated, seasonRewards: [...updated.seasonRewards, reward] };
  return {
    ...save,
    updatedAt: new Date().toISOString(),
    activePlayer: updated,
    pendingPostMatchBonuses: [],
    log: [`경기 후 보너스 '${reward.name}' 선택`, ...save.log].slice(0, 60),
  };
}

export function resolveTransfer(
  save: GameSave,
  offer: TransferOffer | null,
): GameSave {
  const player = save.activePlayer;
  if (!player) return save;
  const updated = offer
    ? acceptTransfer(player, offer)
    : { ...player, pendingOffers: [] };
  return {
    ...save,
    updatedAt: new Date().toISOString(),
    activePlayer: updated,
    log: [
      offer
        ? `${getClub(offer.clubId).name} 이적 제안을 수락했습니다.`
        : "이적 제안을 거절하고 현재 구단에 잔류했습니다.",
      ...save.log,
    ].slice(0, 60),
  };
}

function seasonHonours(
  player: ActivePlayer,
  seed: number,
): { trophies: string[]; awards: string[] } {
  const rng = createRng(seed);
  const avg = player.currentSeason.matches
    ? player.currentSeason.ratingSum / player.currentSeason.matches
    : 0;
  const trophies: string[] = [];
  if (
    player.currentSeason.wins >= 6 ||
    (player.currentSeason.wins >= 5 && rng() < 0.35)
  )
    trophies.push(`${player.league} 우승`);
  if (player.currentSeason.wins >= 7 && rng() < 0.65)
    trophies.push("국내 컵 우승");
  if (
    player.currentSeason.wins >= 8 &&
    getClub(player.clubId).continental &&
    rng() < 0.55
  )
    trophies.push("Continental Champions Cup 우승");
  const awards: string[] = [];
  if (player.currentSeason.goals >= 8) awards.push("득점왕");
  if (player.currentSeason.assists >= 6) awards.push("도움왕");
  if (avg >= 8.2) awards.push("올해의 선수");
  if (avg >= 7.5) awards.push("시즌 베스트 11");
  return { trophies, awards };
}

export function finishSeason(save: GameSave): GameSave {
  const player = save.activePlayer;
  if (
    !player ||
    player.week <= SEASON_WEEKS ||
    save.pendingSeasonRewards.length
  )
    return save;
  const honours = seasonHonours(player, save.randomSeed);
  const record = {
    ...player.currentSeason,
    season: player.season,
    clubId: player.clubId,
    ovr: calculateOvr(player.stats, player.position, player.enhancementLevel),
    enhancementLevel: player.enhancementLevel,
    trophies: honours.trophies,
    awards: honours.awards,
  };
  const updated = {
    ...player,
    seasonRecords: [...player.seasonRecords, record],
    trophies: [...player.trophies, ...honours.trophies],
    awards: [...player.awards, ...honours.awards],
  };
  return {
    ...save,
    updatedAt: new Date().toISOString(),
    activePlayer: updated,
    pendingSeasonRewards: makeRewards(save.randomSeed, player.season),
    randomSeed: save.randomSeed + 1,
    log: [
      `시즌 ${player.season} 결산 · ${honours.trophies.length ? honours.trophies.join(", ") : "도전은 계속됩니다"}`,
      ...save.log,
    ].slice(0, 60),
  };
}

function createLegacyBadge(player: ActivePlayer, seed: number): LegacyBadge {
  const categories: Array<Exclude<LegacyBadge["category"], "all">> = [
    "speed",
    "dribbling",
    "passing",
    "shooting",
    "defending",
    "physical",
  ];
  const category = categories.sort(
    (a, b) =>
      categoryAverage(player.stats, b) - categoryAverage(player.stats, a),
  )[0];
  const names: Record<Exclude<LegacyBadge["category"], "all">, string> = {
    speed: "질주의 감각",
    dribbling: "볼 터치의 감각",
    passing: "연결의 시야",
    shooting: "결정력의 본능",
    defending: "차단의 판단",
    physical: "신체의 완성",
  };
  const statBonus = Math.min(
    60,
    21 +
      Math.floor(
        calculateOvr(player.stats, player.position, player.enhancementLevel) /
          5,
      ),
  );
  const trainingBonus = 10 + Math.min(30, player.season * 3);
  return {
    id: seededId("legacy", seed),
    name: names[category],
    category,
    statBonus,
    trainingBonus,
    description: `${names[category]} · 관련 능력치 +${statBonus}, 훈련 경험치 +${trainingBonus}%`,
  };
}

function retire(
  save: GameSave,
  player: ActivePlayer,
  badge: LegacyBadge,
): GameSave {
  const retired: RetiredPlayer = {
    id: player.instanceId,
    name: player.name,
    position: player.position,
    nationality: player.nationality,
    finalOvr: calculateOvr(
      player.stats,
      player.position,
      player.enhancementLevel,
    ),
    enhancementLevel: player.enhancementLevel,
    clubHistory: player.clubHistory,
    seasonRecords: player.seasonRecords,
    careerTotals: player.careerTotals,
    trophies: player.trophies,
    awards: player.awards,
    highestWage: player.highestWage,
    reputation: player.reputation,
    fans: player.fans,
    legacyBadge: badge,
  };
  return {
    ...save,
    updatedAt: new Date().toISOString(),
    activePlayer: null,
    retiredPlayers: [retired, ...save.retiredPlayers],
    legacyBadges: [...save.legacyBadges, badge],
    pendingSeasonRewards: [],
    pendingPostMatchBonuses: [],
    lastMatch: null,
    log: [
      `${player.name} 은퇴 · 레거시 '${badge.name}' 획득`,
      ...save.log,
    ].slice(0, 60),
  };
}

export function chooseSeasonReward(save: GameSave, rewardId: string): GameSave {
  const player = save.activePlayer;
  const reward = save.pendingSeasonRewards.find((item) => item.id === rewardId);
  if (!player || !reward) return save;
  const rewarded = {
    ...applyRewardStats(player, reward),
    seasonRewards: [...player.seasonRewards, reward],
  };
  if (player.season >= player.careerLength)
    return retire(
      { ...save, activePlayer: rewarded },
      rewarded,
      createLegacyBadge(rewarded, save.randomSeed),
    );
  const next = {
    ...rewarded,
    age: rewarded.age + 1,
    season: rewarded.season + 1,
    week: 1,
    currentSeason: emptyTotals(),
    stamina: 100,
    condition: 3 as const,
    injury: null,
    pendingOffers: [],
    mission: selectMission(rewarded.position, save.randomSeed),
    currentRank: 10,
  };
  return {
    ...save,
    updatedAt: new Date().toISOString(),
    activePlayer: next,
    pendingSeasonRewards: [],
    lastMatch: null,
    randomSeed: save.randomSeed + 1,
    log: [
      `시즌 보상 '${reward.name}' 선택 · 시즌 ${next.season} 시작`,
      ...save.log,
    ].slice(0, 60),
  };
}

export type AutoMode = "next" | "season" | "career";
export function autoAdvance(
  save: GameSave,
  mode: AutoMode,
): { save: GameSave; stopReason: string } {
  let current = save;
  const startingSeason = save.activePlayer?.season ?? 0;
  let matches = 0;
  for (let guard = 0; guard < 120; guard += 1) {
    const player = current.activePlayer;
    if (!player)
      return {
        save: current,
        stopReason:
          current.retiredPlayers.length > save.retiredPlayers.length
            ? "은퇴"
            : "선수 없음",
      };
    if (current.pendingPostMatchBonuses.length)
      current = choosePostMatchBonus(
        current,
        current.pendingPostMatchBonuses[0].id,
      );
    if (player.pendingOffers.length && current.settings.autoStops.transferOffer)
      return { save: current, stopReason: "이적 제안" };
    if (player.attributePoints > 0 && current.settings.autoStops.attributePoint)
      return { save: current, stopReason: "능력치 포인트" };
    if (player.injury && current.settings.autoStops.injury)
      return { save: current, stopReason: "부상" };
    if (player.week > SEASON_WEEKS) {
      current = finishSeason(current);
      if (current.settings.autoStops.seasonReward)
        return { save: current, stopReason: "시즌 보상" };
      current = chooseSeasonReward(
        current,
        current.pendingSeasonRewards[0]?.id ?? "",
      );
      if (mode === "season" && current.activePlayer?.season !== startingSeason)
        return { save: current, stopReason: "시즌 완료" };
      continue;
    }
    if (player.week === SEASON_WEEKS && current.settings.autoStops.final)
      return { save: current, stopReason: "중요 결승전" };
    if (player.stamina < 38 || player.injury)
      current = performTraining(current, player.injury ? "rehab" : "rest").save;
    else
      current = performTraining(
        current,
        player.position === "GK"
          ? "goalkeeping"
          : ["ST", "LW", "RW", "CAM"].includes(player.position)
            ? "shooting"
            : ["CB", "LB", "RB", "CDM"].includes(player.position)
              ? "defending"
              : "passing",
      ).save;
    const played = playNextMatch(current);
    if (played.error) return { save: current, stopReason: played.error };
    current = played.save;
    matches += 1;
    if (mode === "next" && matches >= 1)
      return { save: current, stopReason: "다음 경기 완료" };
  }
  return { save: current, stopReason: "자동 진행 한도" };
}
