import type { GameSettings } from "../types";

export const MAX_STAT = 160;
export const XP_PER_ATTRIBUTE_POINT = 750;
export const SEASON_WEEKS = 12;
export const TRANSFER_WEEKS = [4, 9];
export const MATCH_WEEKS = [2, 4, 5, 6, 7, 8, 10, 11, 12];
export const CONDITION_LABELS = [
  "",
  "매우 나쁨",
  "나쁨",
  "보통",
  "좋음",
  "매우 좋음",
] as const;

export const DEFAULT_SETTINGS: GameSettings = {
  volume: 0.65,
  muted: false,
  matchSpeed: 1,
  trainingSpeed: 1,
  autoStrategy: "recommended",
  autoStops: {
    attributePoint: true,
    enhancementAvailable: true,
    transferOffer: true,
    seasonReward: true,
    final: true,
    injury: true,
    retirement: true,
  },
};
