import { z } from "zod";
import { POSITIONS, STAT_KEYS, type GameSave } from "../types";

const totalsSchema = z.object({
  matches: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  goals: z.number().int().nonnegative(),
  assists: z.number().int().nonnegative(),
  tackles: z.number().int().nonnegative(),
  saves: z.number().int().nonnegative(),
  ratingSum: z.number().nonnegative(),
  yellowCards: z.number().int().nonnegative(),
});
const positionSchema = z.enum(POSITIONS);
const trainingCategorySchema = z.enum([
  "speed",
  "dribbling",
  "passing",
  "shooting",
  "defending",
  "physical",
  "goalkeeping",
]);
const rewardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: trainingCategorySchema,
  rarity: z.enum(["일반", "고급", "희귀"]),
  statBonus: z.number().nonnegative(),
  trainingBonus: z.number().nonnegative(),
  description: z.string(),
});
const legacySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  category: z.enum([
    "speed",
    "dribbling",
    "passing",
    "shooting",
    "defending",
    "physical",
    "all",
  ]),
  statBonus: z.number().nonnegative(),
  trainingBonus: z.number().nonnegative(),
});
const seasonRecordSchema = totalsSchema.extend({
  season: z.number().int().min(1).max(10),
  clubId: z.string().min(1),
  ovr: z.number().min(1).max(160),
  enhancementLevel: z.number().int().min(1).max(13),
  trophies: z.array(z.string()),
  awards: z.array(z.string()),
});
const offerSchema = z.object({
  id: z.string(),
  clubId: z.string(),
  wage: z.number().nonnegative(),
  contractYears: z.number().int().positive(),
  expectedStarts: z.number().min(0).max(100),
  titleChance: z.number().min(0).max(100),
  continental: z.boolean(),
  requiredOvr: z.number(),
  role: z.string(),
});
const missionSchema = z.object({
  id: z.string(),
  title: z.string(),
  metric: z.enum([
    "goals",
    "assists",
    "tackles",
    "saves",
    "rating",
    "win",
    "cleanSheet",
    "penaltySave",
  ]),
  target: z.number().nonnegative(),
  currencyReward: z.number().nonnegative(),
  reputationReward: z.number().nonnegative(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
const activePlayerSchema = z.object({
  id: z.string(),
  instanceId: z.string().min(1),
  name: z.string().min(1),
  nationality: z.string(),
  age: z.number().int().positive(),
  position: positionSchema,
  detailPosition: z.string(),
  preferredFoot: z.enum(["왼발", "오른발"]),
  shirtNumber: z.number().int().min(1).max(99),
  clubId: z.string(),
  league: z.string(),
  targetOvr: z.number().min(1).max(160),
  baseWage: z.number().nonnegative(),
  careerLength: z.union([z.literal(5), z.literal(10)]),
  appearance: z.number().int().nonnegative(),
  stats: z.record(z.enum(STAT_KEYS), z.number().min(0).max(160)),
  enhancementLevel: z.number().int().min(1).max(13),
  enhancementFailureBoost: z.number().min(0).max(1),
  cash: z.number().nonnegative(),
  enhancementCurrency: z.number().nonnegative(),
  reputation: z.number().nonnegative(),
  fans: z.number().nonnegative(),
  stamina: z.number().min(0).max(100),
  condition: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  injury: z
    .object({
      severity: z.enum(["경미", "보통", "심각"]),
      remainingWeeks: z.number().int().positive(),
    })
    .nullable(),
  xp: z.number().nonnegative(),
  attributePoints: z.number().int().nonnegative(),
  season: z.number().int().min(1).max(10),
  week: z.number().int().min(1).max(13),
  wage: z.number().nonnegative(),
  highestWage: z.number().nonnegative(),
  currentRank: z.number().int().min(1).max(20),
  careerTotals: totalsSchema,
  currentSeason: totalsSchema,
  seasonRecords: z.array(seasonRecordSchema),
  trophies: z.array(z.string()),
  awards: z.array(z.string()),
  seasonRewards: z.array(rewardSchema),
  equippedLegacyBadgeIds: z.array(z.string()),
  clubHistory: z.array(z.string()),
  pendingOffers: z.array(offerSchema),
  mission: missionSchema.nullable(),
  nextOpponentClubId: z.string(),
  trainingXp: z.record(z.string(), z.number().nonnegative()),
});
const retiredPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: positionSchema,
  nationality: z.string(),
  finalOvr: z.number().min(1).max(160),
  enhancementLevel: z.number().int().min(1).max(13),
  clubHistory: z.array(z.string()),
  seasonRecords: z.array(seasonRecordSchema),
  careerTotals: totalsSchema,
  trophies: z.array(z.string()),
  awards: z.array(z.string()),
  highestWage: z.number().nonnegative(),
  reputation: z.number().nonnegative(),
  fans: z.number().nonnegative(),
  legacyBadge: legacySchema,
});
const matchStatsSchema = z.object({
  minutes: z.number().nonnegative(),
  goals: z.number().int().nonnegative(),
  assists: z.number().int().nonnegative(),
  shots: z.number().int().nonnegative(),
  shotsOnTarget: z.number().int().nonnegative(),
  passes: z.number().int().nonnegative(),
  passSuccess: z.number().min(0).max(100),
  tackles: z.number().int().nonnegative(),
  saves: z.number().int().nonnegative(),
  yellowCards: z.number().int().nonnegative(),
  rating: z.number().min(0).max(10),
  penaltySave: z.boolean(),
});
const matchSchema = z.object({
  id: z.string(),
  seed: z.number(),
  competition: z.enum(["리그", "국내 컵", "Continental Champions Cup"]),
  opponentClubId: z.string(),
  home: z.boolean(),
  homeScore: z.number().int().nonnegative(),
  awayScore: z.number().int().nonnegative(),
  won: z.boolean(),
  drew: z.boolean(),
  cleanSheet: z.boolean(),
  playerStats: matchStatsSchema,
  events: z.array(
    z.object({
      minute: z.number().nonnegative(),
      type: z.enum([
        "kickoff",
        "shot",
        "save",
        "goal",
        "assist",
        "tackle",
        "yellow",
        "injury",
        "substitution",
        "fulltime",
      ]),
      team: z.enum(["home", "away"]),
      text: z.string(),
      x: z.number(),
      y: z.number(),
    }),
  ),
  xpEarned: z.number().nonnegative(),
  cashEarned: z.number().nonnegative(),
  currencyEarned: z.number().nonnegative(),
  missionSuccess: z.boolean(),
});

export const gameSaveSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().datetime(),
  activePlayer: activePlayerSchema.nullable(),
  retiredPlayers: z.array(retiredPlayerSchema),
  legacyBadges: z.array(legacySchema),
  settings: z.object({
    volume: z.number().min(0).max(1),
    muted: z.boolean(),
    matchSpeed: z.union([z.literal(1), z.literal(2)]),
    trainingSpeed: z.union([z.literal(1), z.literal(2)]),
    autoStrategy: z.enum([
      "recommended",
      "attack",
      "balanced",
      "defense",
      "custom",
    ]),
    autoStops: z.object({
      attributePoint: z.boolean(),
      enhancementAvailable: z.boolean(),
      transferOffer: z.boolean(),
      seasonReward: z.boolean(),
      final: z.boolean(),
      injury: z.boolean(),
      retirement: z.boolean(),
    }),
  }),
  pendingPostMatchBonuses: z.array(rewardSchema),
  pendingSeasonRewards: z.array(rewardSchema),
  lastMatch: matchSchema.nullable(),
  randomSeed: z.number(),
  log: z.array(z.string()),
});

export function isGameSave(value: unknown): value is GameSave {
  return gameSaveSchema.safeParse(value).success;
}

export function parseGameSave(value: unknown): GameSave {
  if (!isGameSave(value))
    throw new Error("지원하지 않거나 손상된 저장 데이터입니다.");
  return value;
}
