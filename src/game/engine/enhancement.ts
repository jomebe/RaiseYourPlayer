import {
  getEnhancementStep,
  getEnhancementWagePercent,
} from "../config/enhancement";
import { getClub } from "../config/clubs";
import type { ActivePlayer } from "../types";
import { calculateOvr } from "./ovr";
import { createRng } from "./rng";

export interface EnhancementResult {
  player: ActivePlayer;
  success: boolean;
  roll: number;
  effectiveRate: number;
  previousOvr: number;
  nextOvr: number;
  cost: number;
}

export function calculateWage(
  player: Pick<
    ActivePlayer,
    | "baseWage"
    | "stats"
    | "position"
    | "enhancementLevel"
    | "reputation"
    | "awards"
  >,
  clubFactor = 1,
): number {
  const ovr = calculateOvr(
    player.stats,
    player.position,
    player.enhancementLevel,
  );
  const enhancement =
    1 + getEnhancementWagePercent(player.enhancementLevel) / 100;
  const form = 1 + Math.max(0, ovr - 70) * 0.006;
  const fame = 1 + Math.min(0.35, player.reputation / 30000);
  const awards = 1 + player.awards.length * 0.01;
  return Math.round(
    player.baseWage * enhancement * form * fame * awards * clubFactor,
  );
}

export function attemptEnhancement(
  player: ActivePlayer,
  seed: number,
  costDiscount = 0,
): EnhancementResult {
  const step = getEnhancementStep(player.enhancementLevel + 1);
  const previousOvr = calculateOvr(
    player.stats,
    player.position,
    player.enhancementLevel,
  );
  if (!step)
    return {
      player,
      success: false,
      roll: 1,
      effectiveRate: 0,
      previousOvr,
      nextOvr: previousOvr,
      cost: 0,
    };
  const cost = Math.max(1, Math.round(step.cost * (1 - costDiscount)));
  if (player.enhancementCurrency < cost)
    return {
      player,
      success: false,
      roll: 1,
      effectiveRate: Math.min(
        0.99,
        step.successRate + player.enhancementFailureBoost,
      ),
      previousOvr,
      nextOvr: previousOvr,
      cost,
    };

  const roll = createRng(seed)();
  const effectiveRate = Math.min(
    0.99,
    step.successRate + player.enhancementFailureBoost,
  );
  const success = roll < effectiveRate;
  const enhancementLevel = success ? step.level : player.enhancementLevel;
  const base = {
    ...player,
    enhancementCurrency: player.enhancementCurrency - cost,
    enhancementLevel,
    enhancementFailureBoost: success
      ? 0
      : Math.min(0.2, player.enhancementFailureBoost + 0.025),
  };
  const wage = calculateWage(base, getClub(base.clubId).wageFactor);
  const nextPlayer = {
    ...base,
    wage,
    highestWage: Math.max(base.highestWage, wage),
  };
  return {
    player: nextPlayer,
    success,
    roll,
    effectiveRate,
    previousOvr,
    nextOvr: calculateOvr(
      nextPlayer.stats,
      nextPlayer.position,
      nextPlayer.enhancementLevel,
    ),
    cost,
  };
}
