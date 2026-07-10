import { MAX_STAT, XP_PER_ATTRIBUTE_POINT } from "../config/progression";
import type { ActivePlayer, StatKey } from "../types";

export function addExperience(
  player: ActivePlayer,
  amount: number,
): { player: ActivePlayer; pointsEarned: number } {
  const total = player.xp + Math.max(0, Math.round(amount));
  const pointsEarned = Math.floor(total / XP_PER_ATTRIBUTE_POINT);
  return {
    player: {
      ...player,
      xp: total % XP_PER_ATTRIBUTE_POINT,
      attributePoints: player.attributePoints + pointsEarned,
    },
    pointsEarned,
  };
}

export function spendAttributePoint(
  player: ActivePlayer,
  stat: StatKey,
): ActivePlayer {
  if (player.attributePoints < 1 || player.stats[stat] >= MAX_STAT)
    return player;
  return {
    ...player,
    attributePoints: player.attributePoints - 1,
    stats: { ...player.stats, [stat]: player.stats[stat] + 1 },
  };
}
