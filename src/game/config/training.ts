import type { StatKey, TrainingType } from "../types";

export interface TrainingConfig {
  id: TrainingType;
  name: string;
  description: string;
  stats: StatKey[];
  staminaCost: number;
  conditionDelta: number;
  xp: number;
  cashCost: number;
  injuryChance: number;
}

export const TRAINING: Record<TrainingType, TrainingConfig> = {
  speed: {
    id: "speed",
    name: "스피드 훈련",
    description: "속력과 가속력을 집중 강화",
    stats: ["pace", "acceleration"],
    staminaCost: 16,
    conditionDelta: -1,
    xp: 125,
    cashCost: 0,
    injuryChance: 0.035,
  },
  dribbling: {
    id: "dribbling",
    name: "드리블 훈련",
    description: "볼 컨트롤과 민첩성을 연마",
    stats: ["dribbling", "ballControl", "agility", "balance", "reactions"],
    staminaCost: 14,
    conditionDelta: 0,
    xp: 120,
    cashCost: 0,
    injuryChance: 0.025,
  },
  passing: {
    id: "passing",
    name: "패스 훈련",
    description: "패스, 시야와 크로스 강화",
    stats: [
      "shortPassing",
      "longPassing",
      "vision",
      "crossing",
      "curve",
      "freeKick",
    ],
    staminaCost: 13,
    conditionDelta: 0,
    xp: 120,
    cashCost: 0,
    injuryChance: 0.02,
  },
  shooting: {
    id: "shooting",
    name: "슈팅 훈련",
    description: "결정력과 슛 파워 강화",
    stats: [
      "finishing",
      "shotPower",
      "longShots",
      "positioning",
      "volleys",
      "penalties",
    ],
    staminaCost: 15,
    conditionDelta: -1,
    xp: 130,
    cashCost: 0,
    injuryChance: 0.03,
  },
  defending: {
    id: "defending",
    name: "수비 훈련",
    description: "대인 수비, 태클과 가로채기",
    stats: [
      "marking",
      "standingTackle",
      "interceptions",
      "heading",
      "slidingTackle",
    ],
    staminaCost: 15,
    conditionDelta: -1,
    xp: 130,
    cashCost: 0,
    injuryChance: 0.035,
  },
  physical: {
    id: "physical",
    name: "피지컬 훈련",
    description: "몸싸움과 스태미너 강화",
    stats: ["strength", "stamina", "aggression", "jumping", "composure"],
    staminaCost: 18,
    conditionDelta: -1,
    xp: 140,
    cashCost: 0,
    injuryChance: 0.045,
  },
  goalkeeping: {
    id: "goalkeeping",
    name: "골키퍼 훈련",
    description: "선방과 위치 선정 강화",
    stats: [
      "gkDiving",
      "gkHandling",
      "gkKicking",
      "gkReflexes",
      "gkPositioning",
    ],
    staminaCost: 14,
    conditionDelta: 0,
    xp: 135,
    cashCost: 0,
    injuryChance: 0.025,
  },
  tactical: {
    id: "tactical",
    name: "전술 훈련",
    description: "반응과 시야, 침착성 강화",
    stats: ["reactions", "vision", "positioning", "composure"],
    staminaCost: 9,
    conditionDelta: 1,
    xp: 100,
    cashCost: 0,
    injuryChance: 0.01,
  },
  rest: {
    id: "rest",
    name: "휴식",
    description: "체력 35 회복, 컨디션 상승",
    stats: [],
    staminaCost: -35,
    conditionDelta: 1,
    xp: 0,
    cashCost: 0,
    injuryChance: 0,
  },
  rehab: {
    id: "rehab",
    name: "재활",
    description: "부상 기간을 단축하고 체력 회복",
    stats: [],
    staminaCost: -18,
    conditionDelta: 1,
    xp: 0,
    cashCost: 1200,
    injuryChance: 0,
  },
};
