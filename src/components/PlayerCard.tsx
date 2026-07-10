"use client";

import { motion } from "framer-motion";
import { getClub } from "../game/config/clubs";
import type { ActivePlayer, PlayerTemplate } from "../game/types";
import { calculateOvr } from "../game/engine/ovr";

function isActive(
  player: ActivePlayer | PlayerTemplate,
): player is ActivePlayer {
  return "stats" in player;
}

export function PlayerCard({
  player,
  compact = false,
}: {
  player: ActivePlayer | PlayerTemplate;
  compact?: boolean;
}) {
  const club = getClub(player.clubId);
  const ovr = isActive(player)
    ? calculateOvr(player.stats, player.position, player.enhancementLevel)
    : player.targetOvr;
  const level = isActive(player) ? player.enhancementLevel : 1;
  const initials = player.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return (
    <motion.article
      className={`player-card ${compact ? "player-card-compact" : ""}`}
      style={
        {
          "--club-a": club.colors[0],
          "--club-b": club.colors[1],
        } as React.CSSProperties
      }
      whileHover={{ y: compact ? -2 : -4 }}
    >
      <div className="card-glow" />
      <div className="card-topline">
        <span>{player.position}</span>
        <span>{player.nationality}</span>
      </div>
      <div className="card-main">
        <div>
          <span className="ovr-label">OVR</span>
          <strong className="ovr-number">{ovr}</strong>
          <span className="enhance-level">+{level}</span>
        </div>
        <div className={`avatar-preset avatar-${player.appearance}`}>
          {initials}
        </div>
      </div>
      <div className="card-copy">
        <h3>{player.name}</h3>
        <p>{club.name}</p>
      </div>
      {!compact && (
        <div className="card-meta">
          <span>{player.detailPosition}</span>
          <span>{player.preferredFoot}</span>
          <span>{player.careerLength}시즌</span>
        </div>
      )}
    </motion.article>
  );
}
