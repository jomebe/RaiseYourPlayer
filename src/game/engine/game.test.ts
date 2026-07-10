import { describe, expect, it } from "vitest";
import { ENHANCEMENT_STEPS } from "../config/enhancement";
import { PLAYER_TEMPLATES } from "../data/players";
import type { ActivePlayer, GameSave, LegacyBadge, Stats } from "../types";
import { attemptEnhancement } from "./enhancement";
import {
  chooseSeasonReward,
  createActivePlayer,
  createEmptySave,
  finishSeason,
  startCareer,
} from "./game";
import { simulateMatch } from "./match";
import { calculateOvr } from "./ovr";
import { addExperience } from "./progression";
import { createRng } from "./rng";
import { generateTransferOffers } from "./transfer";
import { isGameSave, parseGameSave } from "../save/validation";

const template =
  PLAYER_TEMPLATES.find(
    (player) => player.clubId === "tottenham" && player.position === "ST",
  ) ?? PLAYER_TEMPLATES[0];
const makePlayer = () => createActivePlayer(template, []);
const withPlayer = (player: ActivePlayer): GameSave => ({
  ...createEmptySave(101),
  activePlayer: player,
});
const seedFor = (predicate: (roll: number) => boolean) => {
  for (let seed = 1; seed < 10000; seed += 1)
    if (predicate(createRng(seed)())) return seed;
  throw new Error("seed not found");
};

describe("선수 데이터", () => {
  it("현재 기본 선수 100명을 제공한다", () => {
    expect(PLAYER_TEMPLATES).toHaveLength(100);
  });
});

describe("포지션별 OVR", () => {
  it("ST와 CB가 같은 능력치 분포를 서로 다르게 평가한다", () => {
    const stats = Object.fromEntries(
      Object.keys(makePlayer().stats).map((key) => [key, 50]),
    ) as Stats;
    stats.finishing = 120;
    stats.positioning = 115;
    stats.shotPower = 110;
    expect(calculateOvr(stats, "ST")).toBeGreaterThan(
      calculateOvr(stats, "CB"),
    );
  });

  it("GK OVR은 골키퍼 능력치를 중심으로 계산한다", () => {
    const stats = Object.fromEntries(
      Object.keys(makePlayer().stats).map((key) => [key, 20]),
    ) as Stats;
    stats.gkDiving = 100;
    stats.gkHandling = 100;
    stats.gkKicking = 100;
    stats.gkReflexes = 100;
    stats.gkPositioning = 100;
    expect(calculateOvr(stats, "GK")).toBe(100);
    expect(calculateOvr(stats, "ST")).toBeLessThan(30);
  });
});

describe("강화", () => {
  it("시드 난수와 성공 확률로 성공과 실패를 결정한다", () => {
    const player = { ...makePlayer(), enhancementCurrency: 99999 };
    const rate = ENHANCEMENT_STEPS[0].successRate;
    const success = attemptEnhancement(
      player,
      seedFor((roll) => roll < rate),
    );
    const failure = attemptEnhancement(
      player,
      seedFor((roll) => roll > rate),
    );
    expect(success.success).toBe(true);
    expect(failure.success).toBe(false);
    expect(failure.player.enhancementFailureBoost).toBeGreaterThan(0);
  });

  it("강화 성공 후 OVR과 주급이 증가한다", () => {
    const player = { ...makePlayer(), enhancementCurrency: 99999 };
    const result = attemptEnhancement(
      player,
      seedFor((roll) => roll < 0.85),
    );
    expect(result.player.enhancementLevel).toBe(2);
    expect(result.nextOvr).toBeGreaterThan(result.previousOvr);
    expect(result.player.wage).toBeGreaterThan(player.wage);
  });
});

describe("성장과 경기", () => {
  it("경험치가 기준을 넘으면 능력치 포인트를 지급한다", () => {
    const player = { ...makePlayer(), xp: 700, attributePoints: 2 };
    const result = addExperience(player, 900);
    expect(result.pointsEarned).toBe(2);
    expect(result.player.attributePoints).toBe(4);
    expect(result.player.xp).toBe(100);
  });

  it("같은 시드의 경기 결과는 완전히 재현된다", () => {
    const player = makePlayer();
    expect(simulateMatch(player, 445566)).toEqual(
      simulateMatch(player, 445566),
    );
    expect(simulateMatch(player, 445566).seed).not.toBe(
      simulateMatch(player, 445567).seed,
    );
  });
});

describe("이적과 시즌", () => {
  it("이적시장 기간과 선수 수준에 맞는 제안만 생성한다", () => {
    const player = {
      ...makePlayer(),
      week: 4,
      reputation: 4500,
      currentSeason: {
        ...makePlayer().currentSeason,
        matches: 6,
        ratingSum: 48,
      },
    };
    const offers = generateTransferOffers(player, 313);
    expect(offers.length).toBeGreaterThan(0);
    expect(
      offers.every(
        (offer) =>
          offer.clubId !== player.clubId &&
          offer.requiredOvr <= calculateOvr(player.stats, player.position) + 10,
      ),
    ).toBe(true);
    expect(generateTransferOffers({ ...player, week: 6 }, 313)).toEqual([]);
  });

  it("시즌 종료 시 기록과 3개 보상을 만든다", () => {
    const player = {
      ...makePlayer(),
      week: 13,
      currentSeason: {
        ...makePlayer().currentSeason,
        matches: 9,
        wins: 7,
        goals: 9,
        assists: 4,
        ratingSum: 70,
      },
    };
    const ended = finishSeason(withPlayer(player));
    expect(ended.activePlayer?.seasonRecords).toHaveLength(1);
    expect(ended.pendingSeasonRewards).toHaveLength(3);
  });

  it("일반 선수는 5번째 시즌 보상 선택 후 은퇴한다", () => {
    const player = {
      ...makePlayer(),
      careerLength: 5 as const,
      season: 5,
      week: 13,
      currentSeason: {
        ...makePlayer().currentSeason,
        matches: 9,
        wins: 8,
        goals: 10,
        ratingSum: 75,
      },
    };
    const ended = finishSeason(withPlayer(player));
    const retired = chooseSeasonReward(ended, ended.pendingSeasonRewards[0].id);
    expect(retired.activePlayer).toBeNull();
    expect(retired.retiredPlayers).toHaveLength(1);
    expect(retired.legacyBadges).toHaveLength(1);
  });
});

describe("레거시와 저장", () => {
  it("획득한 레거시가 다음 5시즌 선수에게 영구 적용된다", () => {
    const badge: LegacyBadge = {
      id: "legacy-test",
      name: "질주의 감각",
      description: "스피드 +21",
      category: "speed",
      statBonus: 21,
      trainingBonus: 10,
    };
    const normal = createActivePlayer(template, []);
    const inherited = createActivePlayer(template, [badge]);
    expect(inherited.stats.pace).toBe(Math.min(160, normal.stats.pace + 21));
    expect(inherited.equippedLegacyBadgeIds).toContain(badge.id);
  });

  it("저장 데이터를 JSON 왕복 후 검증해 불러온다", () => {
    const save = startCareer(createEmptySave(55), template);
    const parsed: unknown = JSON.parse(JSON.stringify(save));
    expect(isGameSave(parsed)).toBe(true);
    expect(parseGameSave(parsed).activePlayer?.name).toBe(template.name);
  });

  it("버전이나 구조가 잘못된 저장 파일을 거부한다", () => {
    const invalid = { version: 99, activePlayer: { name: "broken" } };
    expect(isGameSave(invalid)).toBe(false);
    expect(() => parseGameSave(invalid)).toThrow("손상된 저장 데이터");
  });
});
