"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Search, ShieldPlus, Sparkles, UserRoundPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { PLAYER_TEMPLATES } from "../game/data/players";
import { customTemplate } from "../game/engine/game";
import {
  POSITIONS,
  type CustomPlayerInput,
  type GameSave,
  type PlayerTemplate,
  type RetiredPlayer,
} from "../game/types";
import { PlayerCard } from "./PlayerCard";

const initialCustom: CustomPlayerInput = {
  name: "",
  nationality: "대한민국",
  position: "ST",
  detailPosition: "침투형 공격수",
  preferredFoot: "오른발",
  shirtNumber: 9,
  appearance: 0,
};

export function SetupScreen({
  save,
  onStart,
}: {
  save: GameSave;
  onStart: (template: PlayerTemplate, badges: string[]) => void;
}) {
  const [mode, setMode] = useState<"preset" | "custom">("preset");
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("ALL");
  const [selected, setSelected] = useState<PlayerTemplate | null>(null);
  const [badges, setBadges] = useState<string[]>([]);
  const [custom, setCustom] = useState(initialCustom);
  const [hallPlayer, setHallPlayer] = useState<RetiredPlayer | null>(null);
  const filtered = useMemo(
    () =>
      PLAYER_TEMPLATES.filter(
        (player) =>
          (position === "ALL" || player.position === position) &&
          `${player.name} ${player.clubId} ${player.nationality}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [position, query],
  );
  const target = mode === "custom" ? customTemplate(custom) : selected;

  const toggleBadge = (id: string) =>
    setBadges((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length >= 3
          ? current
          : [...current, id],
    );

  return (
    <main className="setup-shell">
      <section className="setup-hero">
        <div className="brand-mark">RYP</div>
        <div>
          <span className="eyebrow">FOOTBALL CAREER SIMULATION</span>
          <h1>
            RAISE YOUR
            <br />
            <em>PLAYER</em>
          </h1>
          <p>
            한 명을 선택하고, 훈련하고, 승리하라. 다섯 시즌 뒤 당신의 선택은
            다음 세대의 유산이 된다.
          </p>
        </div>
      </section>
      <section className="setup-panel">
        <div className="segmented">
          <button
            className={mode === "preset" ? "active" : ""}
            onClick={() => setMode("preset")}
          >
            <Sparkles size={17} /> 기본 선수
          </button>
          <button
            className={mode === "custom" ? "active" : ""}
            onClick={() => setMode("custom")}
          >
            <UserRoundPlus size={17} /> 커스텀
          </button>
        </div>
        <AnimatePresence mode="wait">
          {mode === "preset" ? (
            <motion.div
              key="preset"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
            >
              <div className="player-filters">
                <label className="search-box">
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="선수, 국적 검색"
                    aria-label="선수 검색"
                  />
                </label>
                <select
                  value={position}
                  onChange={(event) => setPosition(event.target.value)}
                  aria-label="포지션 필터"
                >
                  <option value="ALL">전체 포지션</option>
                  {POSITIONS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
              <p className="data-note">
                현재 선수 데이터 {PLAYER_TEMPLATES.length}명 · 텍스트 데이터만
                사용
              </p>
              <div className="player-grid">
                {filtered.map((player) => (
                  <button
                    key={player.id}
                    className={`player-choice ${selected?.id === player.id ? "selected" : ""}`}
                    onClick={() => {
                      setSelected(player);
                      setBadges([]);
                    }}
                  >
                    <PlayerCard player={player} compact />
                    <span className="select-label">
                      {selected?.id === player.id ? "선택됨" : "선택"}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="custom"
              className="custom-form"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
            >
              <div className="custom-preview">
                <PlayerCard player={customTemplate(custom)} />
              </div>
              <div className="field-grid">
                <label>
                  이름
                  <input
                    value={custom.name}
                    maxLength={24}
                    onChange={(event) =>
                      setCustom({ ...custom, name: event.target.value })
                    }
                    placeholder="선수 이름"
                  />
                </label>
                <label>
                  국적
                  <input
                    value={custom.nationality}
                    maxLength={20}
                    onChange={(event) =>
                      setCustom({ ...custom, nationality: event.target.value })
                    }
                  />
                </label>
                <label>
                  주 포지션
                  <select
                    value={custom.position}
                    onChange={(event) =>
                      setCustom({
                        ...custom,
                        position: event.target
                          .value as CustomPlayerInput["position"],
                      })
                    }
                  >
                    {POSITIONS.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  세부 포지션
                  <input
                    value={custom.detailPosition}
                    onChange={(event) =>
                      setCustom({
                        ...custom,
                        detailPosition: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  주발
                  <select
                    value={custom.preferredFoot}
                    onChange={(event) =>
                      setCustom({
                        ...custom,
                        preferredFoot: event.target
                          .value as CustomPlayerInput["preferredFoot"],
                      })
                    }
                  >
                    <option>오른발</option>
                    <option>왼발</option>
                  </select>
                </label>
                <label>
                  등번호
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={custom.shirtNumber}
                    onChange={(event) =>
                      setCustom({
                        ...custom,
                        shirtNumber: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <div className="appearance-row">
                {Array.from({ length: 8 }, (_, index) => (
                  <button
                    key={index}
                    className={`avatar-preset avatar-${index} ${custom.appearance === index ? "chosen" : ""}`}
                    onClick={() => setCustom({ ...custom, appearance: index })}
                    aria-label={`외형 프리셋 ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {target?.careerLength === 10 && save.legacyBadges.length > 0 && (
          <div className="legacy-picker">
            <h3>
              <ShieldPlus size={18} /> 10시즌 희귀 선수 · 레거시 3개 장착
            </h3>
            <div>
              {save.legacyBadges.map((badge) => (
                <button
                  key={badge.id}
                  className={badges.includes(badge.id) ? "active" : ""}
                  onClick={() => toggleBadge(badge.id)}
                >
                  {badge.name}
                  <small>{badge.description}</small>
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          className="primary-cta"
          disabled={!target || (mode === "custom" && !custom.name.trim())}
          onClick={() => target && onStart(target, badges)}
        >
          커리어 시작 <span>→</span>
        </button>
        {save.retiredPlayers.length > 0 && (
          <div className="setup-hall">
            <div className="hall-strip">
              <b>명예의 전당 {save.retiredPlayers.length}명</b>
              <span>
                영구 레거시 {save.legacyBadges.length}개가 새 선수에게 적용됩니다.
              </span>
            </div>
            <div className="setup-hall-list">
              {save.retiredPlayers.map((player) => (
                <button key={player.id} onClick={() => setHallPlayer(player)}>
                  <strong>{player.finalOvr}</strong>
                  <span>
                    <b>{player.name}</b>
                    <small>
                      {player.position} · {player.careerTotals.matches}경기 · {player.legacyBadge.name}
                    </small>
                  </span>
                </button>
              ))}
            </div>
            {hallPlayer && (
              <div className="setup-hall-detail">
                <button aria-label="명예의 전당 상세 닫기" onClick={() => setHallPlayer(null)}>×</button>
                <span>FINAL OVR</span>
                <strong>{hallPlayer.finalOvr}</strong>
                <h3>{hallPlayer.name}</h3>
                <p>{hallPlayer.careerTotals.matches}경기 · {hallPlayer.careerTotals.goals}골 · {hallPlayer.careerTotals.assists}도움 · 트로피 {hallPlayer.trophies.length}개</p>
                <b>{hallPlayer.legacyBadge.name}</b>
                <small>{hallPlayer.legacyBadge.description}</small>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
