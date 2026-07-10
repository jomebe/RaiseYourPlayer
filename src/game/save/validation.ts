import { z } from "zod";
import type { GameSave } from "../types";

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

const activePlayerSchema = z
  .object({
    instanceId: z.string().min(1),
    name: z.string().min(1),
    position: z.enum([
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
    ]),
    stats: z.record(z.string(), z.number().min(0).max(160)),
    enhancementLevel: z.number().int().min(1).max(13),
    season: z.number().int().min(1).max(10),
    careerLength: z.union([z.literal(5), z.literal(10)]),
    week: z.number().int().min(1).max(13),
    careerTotals: totalsSchema,
    currentSeason: totalsSchema,
  })
  .passthrough();

export const gameSaveSchema = z
  .object({
    version: z.literal(1),
    updatedAt: z.string(),
    activePlayer: activePlayerSchema.nullable(),
    retiredPlayers: z.array(
      z.object({ id: z.string(), name: z.string() }).passthrough(),
    ),
    legacyBadges: z.array(
      z
        .object({ id: z.string(), name: z.string(), description: z.string() })
        .passthrough(),
    ),
    settings: z
      .object({ volume: z.number().min(0).max(1), muted: z.boolean() })
      .passthrough(),
    pendingPostMatchBonuses: z.array(
      z.object({ id: z.string(), name: z.string() }).passthrough(),
    ),
    pendingSeasonRewards: z.array(
      z.object({ id: z.string(), name: z.string() }).passthrough(),
    ),
    lastMatch: z
      .object({ id: z.string(), seed: z.number() })
      .passthrough()
      .nullable(),
    randomSeed: z.number(),
    log: z.array(z.string()),
  })
  .passthrough();

export function isGameSave(value: unknown): value is GameSave {
  return gameSaveSchema.safeParse(value).success;
}

export function parseGameSave(value: unknown): GameSave {
  if (!isGameSave(value))
    throw new Error("지원하지 않거나 손상된 저장 데이터입니다.");
  return value;
}
