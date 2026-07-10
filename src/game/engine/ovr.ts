import { getEnhancementOvrBonus } from "../config/enhancement";
import { MAX_STAT } from "../config/progression";
import { STAT_KEYS, type Position, type StatKey, type Stats } from "../types";
import { createRng } from "./rng";

export const STAT_GROUPS: Record<string, StatKey[]> = {
  speed: ["pace", "acceleration"],
  dribbling: ["dribbling", "ballControl", "agility", "balance", "reactions"],
  passing: [
    "shortPassing",
    "longPassing",
    "vision",
    "crossing",
    "curve",
    "freeKick",
  ],
  shooting: [
    "finishing",
    "shotPower",
    "longShots",
    "positioning",
    "volleys",
    "penalties",
  ],
  defending: [
    "marking",
    "standingTackle",
    "interceptions",
    "heading",
    "slidingTackle",
  ],
  physical: ["strength", "stamina", "aggression", "jumping", "composure"],
  goalkeeping: [
    "gkDiving",
    "gkHandling",
    "gkKicking",
    "gkReflexes",
    "gkPositioning",
  ],
};

export const POSITION_WEIGHTS: Record<
  Position,
  Partial<Record<StatKey, number>>
> = {
  ST: {
    finishing: 0.2,
    positioning: 0.16,
    pace: 0.12,
    acceleration: 0.1,
    shotPower: 0.1,
    reactions: 0.08,
    ballControl: 0.07,
    heading: 0.06,
    strength: 0.06,
    composure: 0.05,
  },
  LW: {
    pace: 0.16,
    acceleration: 0.14,
    dribbling: 0.15,
    ballControl: 0.1,
    crossing: 0.1,
    finishing: 0.1,
    agility: 0.09,
    positioning: 0.08,
    reactions: 0.08,
  },
  RW: {
    pace: 0.16,
    acceleration: 0.14,
    dribbling: 0.15,
    ballControl: 0.1,
    crossing: 0.1,
    finishing: 0.1,
    agility: 0.09,
    positioning: 0.08,
    reactions: 0.08,
  },
  CAM: {
    vision: 0.17,
    shortPassing: 0.14,
    ballControl: 0.13,
    dribbling: 0.11,
    positioning: 0.1,
    longShots: 0.09,
    reactions: 0.08,
    agility: 0.08,
    finishing: 0.06,
    composure: 0.04,
  },
  CM: {
    shortPassing: 0.17,
    vision: 0.15,
    longPassing: 0.13,
    stamina: 0.12,
    ballControl: 0.1,
    reactions: 0.08,
    composure: 0.08,
    interceptions: 0.07,
    dribbling: 0.06,
    strength: 0.04,
  },
  CDM: {
    interceptions: 0.17,
    standingTackle: 0.15,
    shortPassing: 0.13,
    longPassing: 0.1,
    marking: 0.1,
    strength: 0.1,
    stamina: 0.1,
    reactions: 0.08,
    composure: 0.07,
  },
  LB: {
    pace: 0.14,
    acceleration: 0.11,
    standingTackle: 0.14,
    interceptions: 0.13,
    marking: 0.12,
    crossing: 0.1,
    stamina: 0.1,
    reactions: 0.08,
    ballControl: 0.04,
    strength: 0.04,
  },
  RB: {
    pace: 0.14,
    acceleration: 0.11,
    standingTackle: 0.14,
    interceptions: 0.13,
    marking: 0.12,
    crossing: 0.1,
    stamina: 0.1,
    reactions: 0.08,
    ballControl: 0.04,
    strength: 0.04,
  },
  CB: {
    marking: 0.18,
    interceptions: 0.17,
    standingTackle: 0.16,
    strength: 0.13,
    heading: 0.12,
    reactions: 0.09,
    aggression: 0.06,
    jumping: 0.05,
    composure: 0.04,
  },
  GK: {
    gkDiving: 0.21,
    gkHandling: 0.18,
    gkKicking: 0.13,
    gkReflexes: 0.25,
    gkPositioning: 0.23,
  },
};

export function calculateOvr(
  stats: Stats,
  position: Position,
  enhancementLevel = 1,
): number {
  const weights = POSITION_WEIGHTS[position];
  const weighted = Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + stats[key as StatKey] * (weight ?? 0),
    0,
  );
  return Math.min(
    MAX_STAT,
    Math.round(weighted + getEnhancementOvrBonus(enhancementLevel)),
  );
}

export function generateBaseStats(
  targetOvr: number,
  position: Position,
  seed: string,
): Stats {
  const rng = createRng(seed);
  const weights = POSITION_WEIGHTS[position];
  const stats = Object.fromEntries(
    STAT_KEYS.map((key) => {
      const isGoalkeeping = key.startsWith("gk");
      const baseline =
        position === "GK"
          ? isGoalkeeping
            ? targetOvr
            : Math.max(18, targetOvr - 52)
          : isGoalkeeping
            ? 18
            : targetOvr - 11;
      const keyBonus = weights[key] ? 8 : 0;
      return [
        key,
        Math.min(
          150,
          Math.max(10, Math.round(baseline + keyBonus + (rng() - 0.5) * 10)),
        ),
      ];
    }),
  ) as Stats;

  let guard = 0;
  while (calculateOvr(stats, position) !== targetOvr && guard < 20) {
    const delta = targetOvr - calculateOvr(stats, position);
    for (const key of Object.keys(weights) as StatKey[])
      stats[key] = Math.min(
        MAX_STAT,
        Math.max(1, stats[key] + Math.sign(delta)),
      );
    guard += 1;
  }
  return stats;
}

export function categoryAverage(
  stats: Stats,
  category: keyof typeof STAT_GROUPS,
): number {
  const keys = STAT_GROUPS[category];
  return Math.round(
    keys.reduce((sum, key) => sum + stats[key], 0) / keys.length,
  );
}
