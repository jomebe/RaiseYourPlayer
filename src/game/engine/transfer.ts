import { CLUBS, getClub } from "../config/clubs";
import type { ActivePlayer, TransferOffer } from "../types";
import { calculateOvr } from "./ovr";
import { createRng, seededId } from "./rng";

export function isTransferWindow(week: number): boolean {
  return week === 4 || week === 9;
}

export function generateTransferOffers(
  player: ActivePlayer,
  seed: number,
): TransferOffer[] {
  if (!isTransferWindow(player.week)) return [];
  const rng = createRng(seed);
  const current = getClub(player.clubId);
  const ovr = calculateOvr(
    player.stats,
    player.position,
    player.enhancementLevel,
  );
  const performance = player.currentSeason.matches
    ? player.currentSeason.ratingSum / player.currentSeason.matches
    : 6.5;
  const ceiling =
    ovr +
    Math.floor(player.reputation / 1800) +
    Math.floor(Math.max(0, performance - 6) * 3);
  return CLUBS.filter(
    (club) =>
      club.id !== current.id &&
      club.strength <= ceiling + 8 &&
      club.strength >= Math.max(78, current.strength - 8),
  )
    .sort(
      (a, b) =>
        Math.abs(a.strength - ceiling) +
        rng() * 4 -
        (Math.abs(b.strength - ceiling) + rng() * 4),
    )
    .slice(0, 3)
    .map((club, index) => ({
      id: seededId(`offer-${club.id}`, seed + index),
      clubId: club.id,
      wage: Math.round(player.wage * club.wageFactor * (0.95 + rng() * 0.25)),
      contractYears: 2 + Math.floor(rng() * 4),
      expectedStarts: Math.max(
        35,
        Math.min(
          95,
          Math.round(82 - Math.max(0, club.strength - ovr) * 4 + rng() * 15),
        ),
      ),
      titleChance: Math.max(
        8,
        Math.min(82, Math.round((club.strength - 72) * 2.8)),
      ),
      continental: club.continental,
      requiredOvr: Math.max(68, club.strength - 11),
      role:
        ovr >= club.strength - 3
          ? "핵심 선수"
          : ovr >= club.strength - 7
            ? "주전 경쟁"
            : "로테이션",
    }));
}

export function acceptTransfer(
  player: ActivePlayer,
  offer: TransferOffer,
): ActivePlayer {
  const club = getClub(offer.clubId);
  return {
    ...player,
    clubId: club.id,
    league: club.league,
    wage: offer.wage,
    highestWage: Math.max(player.highestWage, offer.wage),
    pendingOffers: [],
    clubHistory: [...player.clubHistory, club.id],
    nextOpponentClubId:
      CLUBS.find(
        (candidate) =>
          candidate.league === club.league && candidate.id !== club.id,
      )?.id ?? CLUBS[0].id,
  };
}
