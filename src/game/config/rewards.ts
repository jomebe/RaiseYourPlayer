import type { SeasonReward, TrainingType } from "../types";

const NAMES: Record<string, string[]> = {
  speed: ["터보 스터드", "가속 밴드", "폭발적 첫걸음"],
  dribbling: ["밀착 터치", "회전 드릴", "밸런스 코어"],
  passing: ["정밀 패스", "플레이메이커 렌즈", "커브 마스터"],
  shooting: ["킬러 부츠", "파워 임팩트", "문전 본능"],
  defending: ["인터셉터", "수비 리더", "태클 타이밍"],
  physical: ["파워 프레임", "스태미너 팩", "공중 지배"],
  goalkeeping: ["리플렉스 글러브", "세이브 존", "골문 지휘"],
};

export const REWARD_CATEGORIES: Exclude<
  TrainingType,
  "tactical" | "rest" | "rehab"
>[] = [
  "speed",
  "dribbling",
  "passing",
  "shooting",
  "defending",
  "physical",
  "goalkeeping",
];

export function makeRewards(
  seed: number,
  season: number,
  count = 3,
): SeasonReward[] {
  return Array.from({ length: count }, (_, index) => {
    const category =
      REWARD_CATEGORIES[(seed + index * 3 + season) % REWARD_CATEGORIES.length];
    const rarityIndex =
      (seed + index + season) % 10 > 7 ? 2 : (seed + index) % 3 === 0 ? 1 : 0;
    const rarity = (["일반", "고급", "희귀"] as const)[rarityIndex];
    const statBonus = 7 + rarityIndex * 7 + ((seed + index * 5) % 8);
    const trainingBonus = 10 + rarityIndex * 10 + ((seed + index * 7) % 11);
    const name = NAMES[category][(seed + index) % 3];
    return {
      id: `${seed}-${season}-${index}-${category}`,
      name,
      category,
      rarity,
      statBonus,
      trainingBonus,
      description: `${name}: 관련 능력치 +${statBonus}, 훈련 경험치 +${trainingBonus}%`,
    };
  });
}

export function makeMatchBonuses(seed: number): SeasonReward[] {
  const pool: SeasonReward[] = [
    {
      id: `${seed}-recovery`,
      name: "피로 회복",
      category: "physical",
      rarity: "일반",
      statBonus: 0,
      trainingBonus: 0,
      description: "체력 +25",
    },
    {
      id: `${seed}-condition`,
      name: "컨디션 업",
      category: "dribbling",
      rarity: "일반",
      statBonus: 0,
      trainingBonus: 0,
      description: "컨디션 한 단계 상승",
    },
    {
      id: `${seed}-training`,
      name: "훈련 가속",
      category: "speed",
      rarity: "고급",
      statBonus: 0,
      trainingBonus: 20,
      description: "다음 훈련 경험치 +20%",
    },
    {
      id: `${seed}-growth`,
      name: "성장의 여파",
      category: "passing",
      rarity: "고급",
      statBonus: 1,
      trainingBonus: 0,
      description: "관련 능력치 +1",
    },
    {
      id: `${seed}-fans`,
      name: "팬 서비스",
      category: "shooting",
      rarity: "일반",
      statBonus: 0,
      trainingBonus: 0,
      description: "팬 수 +1,200",
    },
    {
      id: `${seed}-safe`,
      name: "보호 테이핑",
      category: "defending",
      rarity: "일반",
      statBonus: 0,
      trainingBonus: 0,
      description: "체력 +12, 컨디션 유지",
    },
  ];
  return [0, 1, 2].map((index) => pool[(seed + index * 2) % pool.length]);
}
