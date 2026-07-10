import { getClub } from "../config/clubs";
import type {
  ActivePlayer,
  Competition,
  ManagerMission,
  MatchEvent,
  MatchPlayerStats,
  MatchResult,
} from "../types";
import { calculateOvr } from "./ovr";
import { createRng, seededId } from "./rng";

function checkMission(
  mission: ManagerMission | null,
  stats: MatchPlayerStats,
  won: boolean,
  cleanSheet: boolean,
): boolean {
  if (!mission) return false;
  const values = {
    goals: stats.goals,
    assists: stats.assists,
    tackles: stats.tackles,
    saves: stats.saves,
    rating: stats.rating,
    win: won ? 1 : 0,
    cleanSheet: cleanSheet ? 1 : 0,
    penaltySave: stats.penaltySave ? 1 : 0,
  };
  return values[mission.metric] >= mission.target;
}

function competitionForWeek(week: number): Competition {
  if (week === 5 || week === 11) return "국내 컵";
  if (week === 7 || week === 12) return "Continental Champions Cup";
  return "리그";
}

export function simulateMatch(
  player: ActivePlayer,
  seed: number,
  opponentClubId = player.nextOpponentClubId,
): MatchResult {
  const rng = createRng(seed);
  const ownClub = getClub(player.clubId);
  const opponent = getClub(opponentClubId);
  const home = player.week % 2 === 0;
  const ovr = calculateOvr(
    player.stats,
    player.position,
    player.enhancementLevel,
  );
  const fitness =
    0.72 +
    player.stamina / 260 +
    player.condition * 0.035 -
    (player.injury ? 0.25 : 0);
  const ownStrength =
    ownClub.strength * 0.72 + ovr * 0.28 * fitness + (home ? 3 : 0);
  const awayStrength = opponent.strength + (home ? 0 : 3);
  const events: MatchEvent[] = [
    {
      minute: 0,
      type: "kickoff",
      team: "home",
      text: `${ownClub.name} vs ${opponent.name} 경기 시작`,
      x: 50,
      y: 50,
    },
  ];

  let ownGoals = 0;
  let opponentGoals = 0;
  let playerGoals = 0;
  let playerAssists = 0;
  let playerShots = 0;
  let shotsOnTarget = 0;
  const attackingRole = ["ST", "LW", "RW", "CAM"].includes(player.position);
  const midfieldRole = ["CAM", "CM", "CDM"].includes(player.position);
  const defendingRole = ["LB", "RB", "CB", "CDM"].includes(player.position);
  const goalkeeping = player.position === "GK";

  for (let chance = 0; chance < 18; chance += 1) {
    const minute = 4 + chance * 5 + Math.floor(rng() * 4);
    const ownChance = rng() < ownStrength / (ownStrength + awayStrength);
    const team: "home" | "away" = ownChance === home ? "home" : "away";
    const scoringPower = ownChance ? ownStrength : awayStrength;
    const defendingPower = ownChance ? awayStrength : ownStrength;
    const onTarget =
      rng() <
      0.48 +
        Math.max(-0.08, Math.min(0.1, (scoringPower - defendingPower) / 180));
    const involved =
      ownChance && rng() < (attackingRole ? 0.42 : midfieldRole ? 0.25 : 0.12);
    if (involved) playerShots += 1;
    events.push({
      minute,
      type: "shot",
      team,
      text: `${ownChance ? ownClub.name : opponent.name}의 슈팅`,
      x: ownChance ? 75 + rng() * 16 : 9 + rng() * 16,
      y: 18 + rng() * 64,
    });
    if (!onTarget) continue;
    if (involved) shotsOnTarget += 1;
    const goal =
      rng() <
      0.26 +
        Math.max(-0.09, Math.min(0.13, (scoringPower - defendingPower) / 130));
    if (goal) {
      if (ownChance) ownGoals += 1;
      else opponentGoals += 1;
      if (involved && attackingRole && rng() < 0.62) playerGoals += 1;
      else if (ownChance && (attackingRole || midfieldRole) && rng() < 0.38)
        playerAssists += 1;
      events.push({
        minute,
        type: "goal",
        team,
        text: `${ownChance ? ownClub.name : opponent.name} 득점!`,
        x: ownChance ? 91 : 9,
        y: 50,
      });
    } else {
      events.push({
        minute,
        type: "save",
        team: team === "home" ? "away" : "home",
        text:
          goalkeeping && !ownChance ? `${player.name}의 선방` : "골키퍼 선방",
        x: ownChance ? 94 : 6,
        y: 50,
      });
    }
  }

  const homeScore = home ? ownGoals : opponentGoals;
  const awayScore = home ? opponentGoals : ownGoals;
  const won = ownGoals > opponentGoals;
  const drew = ownGoals === opponentGoals;
  const cleanSheet = opponentGoals === 0;
  const tackles = defendingRole
    ? Math.floor(1 + rng() * 5)
    : Math.floor(rng() * 3);
  const saves = goalkeeping
    ? Math.max(0, Math.floor(3 + rng() * 5 - opponentGoals))
    : 0;
  const yellowCards = rng() < (defendingRole ? 0.22 : 0.08) ? 1 : 0;
  const passSuccess = Math.min(
    96,
    Math.round(72 + ovr * 0.18 + (rng() - 0.5) * 9),
  );
  const baseRating =
    6.1 +
    playerGoals * 1.05 +
    playerAssists * 0.65 +
    tackles * 0.12 +
    saves * 0.18 +
    (won ? 0.35 : drew ? 0.05 : -0.18) +
    (rng() - 0.5) * 0.65;
  const stats: MatchPlayerStats = {
    minutes: player.injury ? 45 + Math.floor(rng() * 25) : 90,
    goals: playerGoals,
    assists: playerAssists,
    shots: Math.max(playerShots, playerGoals),
    shotsOnTarget: Math.max(shotsOnTarget, playerGoals),
    passes: Math.round(18 + rng() * 55 + (midfieldRole ? 24 : 0)),
    passSuccess,
    tackles,
    saves,
    yellowCards,
    rating: Math.max(4, Math.min(10, Math.round(baseRating * 10) / 10)),
    penaltySave: goalkeeping && rng() < 0.05,
  };
  const missionSuccess = checkMission(player.mission, stats, won, cleanSheet);
  const importance = player.week === 12 ? 1.45 : player.week === 11 ? 1.25 : 1;
  const xpEarned = Math.round(
    (stats.minutes * 2 +
      stats.rating * 28 +
      stats.goals * 120 +
      stats.assists * 90 +
      stats.tackles * 25 +
      stats.saves * 28 +
      (won ? 90 : 0) +
      (missionSuccess ? 120 : 0)) *
      importance,
  );
  events.push({
    minute: 90,
    type: "fulltime",
    team: home ? "home" : "away",
    text: `경기 종료 ${homeScore} - ${awayScore}`,
    x: 50,
    y: 50,
  });
  events.sort((a, b) => a.minute - b.minute || (a.type === "goal" ? 1 : -1));

  return {
    id: seededId("match", seed),
    seed,
    competition: competitionForWeek(player.week),
    opponentClubId,
    home,
    homeScore,
    awayScore,
    won,
    drew,
    cleanSheet,
    playerStats: stats,
    events,
    xpEarned,
    cashEarned: Math.round(
      player.wage / 8 + stats.rating * 180 + (won ? 900 : 350),
    ),
    currencyEarned:
      140 +
      stats.goals * 90 +
      stats.assists * 65 +
      (missionSuccess ? (player.mission?.currencyReward ?? 0) : 0),
    missionSuccess,
  };
}
