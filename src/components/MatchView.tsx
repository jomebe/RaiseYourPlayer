"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FastForward, Goal, Pause, Play, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getClub } from "../game/config/clubs";
import type { ActivePlayer, GameSettings, MatchResult } from "../game/types";
import { playSound } from "../lib/audio";

export function MatchView({
  player,
  result,
  settings,
  onClose,
}: {
  player: ActivePlayer;
  result: MatchResult;
  settings: GameSettings;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 2>(settings.matchSpeed);
  const own = getClub(player.clubId);
  const opponent = getClub(result.opponentClubId);
  const complete = visible >= result.events.length;
  const shown = result.events.slice(0, visible);
  const latest = shown.at(-1) ?? result.events[0];

  useEffect(() => {
    playSound("kickoff", settings);
  }, [settings]);
  useEffect(() => {
    if (!playing || complete) return;
    const timer = window.setTimeout(
      () => setVisible((count) => Math.min(result.events.length, count + 1)),
      620 / speed,
    );
    return () => window.clearTimeout(timer);
  }, [complete, playing, result.events.length, speed, visible]);
  useEffect(() => {
    if (latest?.type === "goal") playSound("goal", settings);
  }, [latest, settings]);

  const score = useMemo(
    () =>
      shown.reduce(
        (value, event) => {
          if (event.type !== "goal") return value;
          return {
            home: value.home + (event.team === "home" ? 1 : 0),
            away: value.away + (event.team === "away" ? 1 : 0),
          };
        },
        { home: 0, away: 0 },
      ),
    [shown],
  );
  const homeName = result.home ? own.name : opponent.name;
  const awayName = result.home ? opponent.name : own.name;

  return (
    <div className="match-stage">
      <div className="match-scoreboard">
        <div>
          <span>HOME</span>
          <b>{homeName}</b>
        </div>
        <strong>
          {score.home}
          <i>:</i>
          {score.away}
        </strong>
        <div className="away">
          <span>AWAY</span>
          <b>{awayName}</b>
        </div>
      </div>
      <div className="match-clock">
        <span>{latest.minute.toString().padStart(2, "0")}:00</span>
        <b>{result.competition}</b>
      </div>
      <div className="pitch" aria-label="2D 탑다운 경기장">
        <div className="pitch-line halfway" />
        <div className="center-circle" />
        <div className="box box-left" />
        <div className="box box-right" />
        <div className="goal goal-left" />
        <div className="goal goal-right" />
        {Array.from({ length: 10 }, (_, index) => (
          <motion.span
            key={`h${index}`}
            className="pitch-player home-player"
            animate={{
              left: `${14 + (index % 4) * 17 + (latest.team === "home" ? 5 : 0)}%`,
              top: `${12 + Math.floor(index / 4) * 31 + (index % 2) * 8}%`,
            }}
            transition={{ duration: 0.45 }}
          />
        ))}
        {Array.from({ length: 10 }, (_, index) => (
          <motion.span
            key={`a${index}`}
            className="pitch-player away-player"
            animate={{
              right: `${14 + (index % 4) * 17 + (latest.team === "away" ? 5 : 0)}%`,
              top: `${12 + Math.floor(index / 4) * 31 + ((index + 1) % 2) * 8}%`,
            }}
            transition={{ duration: 0.45 }}
          />
        ))}
        <motion.span
          className="ball"
          animate={{ left: `${latest.x}%`, top: `${latest.y}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        >
          •
        </motion.span>
        <AnimatePresence>
          {latest.type === "goal" && (
            <motion.div
              className="goal-flash"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <Goal /> GOAL
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="match-controls">
        <button onClick={() => setPlaying(!playing)}>
          {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
          {playing ? "일시정지" : "재생"}
        </button>
        <button onClick={() => setSpeed(speed === 1 ? 2 : 1)}>
          <Zap size={16} /> {speed}배속
        </button>
        <button
          onClick={() => {
            setVisible(result.events.length);
            setPlaying(false);
          }}
        >
          <FastForward size={16} /> 즉시 결과
        </button>
      </div>
      <div className="event-feed">
        {shown
          .slice(-5)
          .reverse()
          .map((event, index) => (
            <motion.div
              key={`${event.minute}-${event.type}-${index}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className={event.type === "goal" ? "goal-event" : ""}
            >
              <time>{event.minute}&apos;</time>
              <span>{event.text}</span>
            </motion.div>
          ))}
      </div>
      {complete && (
        <motion.div
          className="result-summary"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="match-stat-grid">
            <span>
              <small>평점</small>
              <b>{result.playerStats.rating.toFixed(1)}</b>
            </span>
            <span>
              <small>득점</small>
              <b>{result.playerStats.goals}</b>
            </span>
            <span>
              <small>도움</small>
              <b>{result.playerStats.assists}</b>
            </span>
            <span>
              <small>{player.position === "GK" ? "선방" : "태클"}</small>
              <b>
                {player.position === "GK"
                  ? result.playerStats.saves
                  : result.playerStats.tackles}
              </b>
            </span>
          </div>
          <div
            className={`mission-result ${result.missionSuccess ? "success" : "fail"}`}
          >
            <ShieldCheck size={18} />
            <div>
              <b>감독 미션 {result.missionSuccess ? "성공" : "실패"}</b>
              <span>
                {player.mission?.title ?? "미션 없음"} · 강화 재화 +
                {result.currencyEarned}
              </span>
            </div>
          </div>
          <button className="primary-cta" onClick={onClose}>
            경기 후 보너스 선택
          </button>
        </motion.div>
      )}
    </div>
  );
}
