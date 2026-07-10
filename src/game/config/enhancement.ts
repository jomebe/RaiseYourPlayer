export interface EnhancementStep {
  level: number;
  successRate: number;
  ovrBonus: number;
  cumulativeOvrBonus: number;
  wagePercent: number;
  cost: number;
}

const raw = [
  [2, 0.85, 1, 1, 1, 450],
  [3, 0.75, 1, 2, 2, 700],
  [4, 0.65, 1, 3, 3, 1050],
  [5, 0.55, 2, 5, 5, 1500],
  [6, 0.45, 2, 7, 7, 2200],
  [7, 0.35, 2, 9, 9, 3100],
  [8, 0.28, 3, 12, 12, 4300],
  [9, 0.22, 3, 15, 15, 5900],
  [10, 0.15, 3, 18, 18, 8000],
  [11, 0.1, 4, 22, 22, 10800],
  [12, 0.07, 4, 26, 26, 14500],
  [13, 0.05, 5, 31, 30, 20000],
] as const;

export const ENHANCEMENT_STEPS: EnhancementStep[] = raw.map(
  ([level, successRate, ovrBonus, cumulativeOvrBonus, wagePercent, cost]) => ({
    level,
    successRate,
    ovrBonus,
    cumulativeOvrBonus,
    wagePercent,
    cost,
  }),
);
export const getEnhancementStep = (targetLevel: number) =>
  ENHANCEMENT_STEPS.find((step) => step.level === targetLevel);
export const getEnhancementOvrBonus = (level: number) =>
  level <= 1 ? 0 : (getEnhancementStep(level)?.cumulativeOvrBonus ?? 31);
export const getEnhancementWagePercent = (level: number) =>
  level <= 1 ? 0 : (getEnhancementStep(level)?.wagePercent ?? 30);
