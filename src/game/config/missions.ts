import type { ManagerMission, Position } from "../types";

const mission = (
  id: string,
  title: string,
  metric: ManagerMission["metric"],
  target: number,
  difficulty: 1 | 2 | 3,
): ManagerMission => ({
  id,
  title,
  metric,
  target,
  difficulty,
  currencyReward: 180 * difficulty,
  reputationReward: 35 * difficulty,
});

const ATTACK = [
  mission("goal-1", "1골 이상", "goals", 1, 1),
  mission("goal-2", "2골 이상", "goals", 2, 2),
  mission("goal-3", "해트트릭", "goals", 3, 3),
  mission("rating-8", "평점 8.0 이상", "rating", 8, 2),
  mission("rating-9", "평점 9.0 이상", "rating", 9, 3),
  mission("win", "경기 승리", "win", 1, 1),
];
const MID = [
  mission("assist-1", "1도움 이상", "assists", 1, 1),
  mission("assist-2", "2도움 이상", "assists", 2, 3),
  mission("mid-goal", "1골 이상", "goals", 1, 2),
  mission("mid-rating", "평점 8.0 이상", "rating", 8, 2),
  mission("mid-win", "경기 승리", "win", 1, 1),
];
const DEF = [
  mission("tackle-1", "태클 1회 이상", "tackles", 1, 1),
  mission("tackle-2", "태클 2회 이상", "tackles", 2, 2),
  mission("clean", "클린시트", "cleanSheet", 1, 2),
  mission("def-rating", "평점 8.0 이상", "rating", 8, 2),
  mission("def-win", "경기 승리", "win", 1, 1),
];
const GK = [
  mission("save-3", "선방 3회 이상", "saves", 3, 1),
  mission("gk-clean", "무실점", "cleanSheet", 1, 2),
  mission("penalty", "페널티킥 선방", "penaltySave", 1, 3),
  mission("gk-rating", "평점 8.0 이상", "rating", 8, 2),
];

export const MISSIONS_BY_POSITION: Record<Position, ManagerMission[]> = {
  ST: ATTACK,
  LW: ATTACK,
  RW: ATTACK,
  CAM: MID,
  CM: MID,
  CDM: MID,
  LB: DEF,
  RB: DEF,
  CB: DEF,
  GK,
};

export function selectMission(position: Position, seed: number) {
  const pool = MISSIONS_BY_POSITION[position];
  return pool[Math.abs(seed) % pool.length];
}
