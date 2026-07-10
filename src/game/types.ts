export const POSITIONS = [
  "ST",
  "LW",
  "RW",
  "CAM",
  "CM",
  "CDM",
  "LB",
  "RB",
  "CB",
  "GK",
] as const;
export type Position = (typeof POSITIONS)[number];

export const STAT_KEYS = [
  "pace",
  "acceleration",
  "dribbling",
  "ballControl",
  "agility",
  "balance",
  "reactions",
  "shortPassing",
  "longPassing",
  "vision",
  "crossing",
  "curve",
  "freeKick",
  "finishing",
  "shotPower",
  "longShots",
  "positioning",
  "volleys",
  "penalties",
  "marking",
  "standingTackle",
  "interceptions",
  "heading",
  "slidingTackle",
  "strength",
  "stamina",
  "aggression",
  "jumping",
  "composure",
  "gkDiving",
  "gkHandling",
  "gkKicking",
  "gkReflexes",
  "gkPositioning",
] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export type Competition = "리그" | "국내 컵" | "Continental Champions Cup";
export type TrainingType =
  | "speed"
  | "dribbling"
  | "passing"
  | "shooting"
  | "defending"
  | "physical"
  | "goalkeeping"
  | "tactical"
  | "rest"
  | "rehab";
export type Condition = 1 | 2 | 3 | 4 | 5;
export type InjurySeverity = "경미" | "보통" | "심각";
export type RewardRarity = "일반" | "고급" | "희귀";

export interface Club {
  id: string;
  name: string;
  league: string;
  strength: number;
  colors: [string, string];
  continental: boolean;
  wageFactor: number;
}

export interface PlayerTemplate {
  id: string;
  name: string;
  nationality: string;
  age: number;
  position: Position;
  detailPosition: string;
  preferredFoot: "왼발" | "오른발";
  shirtNumber: number;
  clubId: string;
  league: string;
  targetOvr: number;
  baseWage: number;
  careerLength: 5 | 10;
  appearance: number;
}

export interface CareerTotals {
  matches: number;
  wins: number;
  goals: number;
  assists: number;
  tackles: number;
  saves: number;
  ratingSum: number;
  yellowCards: number;
}

export interface SeasonRecord extends CareerTotals {
  season: number;
  clubId: string;
  ovr: number;
  enhancementLevel: number;
  trophies: string[];
  awards: string[];
}

export interface LegacyBadge {
  id: string;
  name: string;
  description: string;
  category:
    | "speed"
    | "dribbling"
    | "passing"
    | "shooting"
    | "defending"
    | "physical"
    | "all";
  statBonus: number;
  trainingBonus: number;
}

export interface SeasonReward {
  id: string;
  name: string;
  category: Exclude<TrainingType, "tactical" | "rest" | "rehab">;
  rarity: RewardRarity;
  statBonus: number;
  trainingBonus: number;
  description: string;
}

export interface TransferOffer {
  id: string;
  clubId: string;
  wage: number;
  contractYears: number;
  expectedStarts: number;
  titleChance: number;
  continental: boolean;
  requiredOvr: number;
  role: string;
}

export type MissionMetric =
  | "goals"
  | "assists"
  | "tackles"
  | "saves"
  | "rating"
  | "win"
  | "cleanSheet"
  | "penaltySave";
export interface ManagerMission {
  id: string;
  title: string;
  metric: MissionMetric;
  target: number;
  currencyReward: number;
  reputationReward: number;
  difficulty: 1 | 2 | 3;
}

export interface MatchEvent {
  minute: number;
  type:
    | "kickoff"
    | "shot"
    | "save"
    | "goal"
    | "assist"
    | "tackle"
    | "yellow"
    | "injury"
    | "substitution"
    | "fulltime";
  team: "home" | "away";
  text: string;
  x: number;
  y: number;
}

export interface MatchPlayerStats {
  minutes: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passSuccess: number;
  tackles: number;
  saves: number;
  yellowCards: number;
  rating: number;
  penaltySave: boolean;
}

export interface MatchResult {
  id: string;
  seed: number;
  competition: Competition;
  opponentClubId: string;
  home: boolean;
  homeScore: number;
  awayScore: number;
  won: boolean;
  drew: boolean;
  cleanSheet: boolean;
  playerStats: MatchPlayerStats;
  events: MatchEvent[];
  xpEarned: number;
  cashEarned: number;
  currencyEarned: number;
  missionSuccess: boolean;
}

export interface ActivePlayer extends PlayerTemplate {
  instanceId: string;
  stats: Stats;
  enhancementLevel: number;
  enhancementFailureBoost: number;
  cash: number;
  enhancementCurrency: number;
  reputation: number;
  fans: number;
  stamina: number;
  condition: Condition;
  injury: { severity: InjurySeverity; remainingWeeks: number } | null;
  xp: number;
  attributePoints: number;
  season: number;
  week: number;
  wage: number;
  highestWage: number;
  currentRank: number;
  careerTotals: CareerTotals;
  currentSeason: CareerTotals;
  seasonRecords: SeasonRecord[];
  trophies: string[];
  awards: string[];
  seasonRewards: SeasonReward[];
  equippedLegacyBadgeIds: string[];
  clubHistory: string[];
  pendingOffers: TransferOffer[];
  mission: ManagerMission | null;
  nextOpponentClubId: string;
  trainingXp: Record<string, number>;
}

export interface RetiredPlayer {
  id: string;
  name: string;
  position: Position;
  nationality: string;
  finalOvr: number;
  enhancementLevel: number;
  clubHistory: string[];
  seasonRecords: SeasonRecord[];
  careerTotals: CareerTotals;
  trophies: string[];
  awards: string[];
  highestWage: number;
  reputation: number;
  fans: number;
  legacyBadge: LegacyBadge;
}

export interface GameSettings {
  volume: number;
  muted: boolean;
  matchSpeed: 1 | 2;
  trainingSpeed: 1 | 2;
  autoStrategy: "recommended" | "attack" | "balanced" | "defense" | "custom";
  autoStops: {
    attributePoint: boolean;
    enhancementAvailable: boolean;
    transferOffer: boolean;
    seasonReward: boolean;
    final: boolean;
    injury: boolean;
    retirement: boolean;
  };
}

export interface GameSave {
  version: 1;
  updatedAt: string;
  activePlayer: ActivePlayer | null;
  retiredPlayers: RetiredPlayer[];
  legacyBadges: LegacyBadge[];
  settings: GameSettings;
  pendingPostMatchBonuses: SeasonReward[];
  pendingSeasonRewards: SeasonReward[];
  lastMatch: MatchResult | null;
  randomSeed: number;
  log: string[];
}

export interface CustomPlayerInput {
  name: string;
  nationality: string;
  position: Position;
  detailPosition: string;
  preferredFoot: "왼발" | "오른발";
  shirtNumber: number;
  appearance: number;
}
