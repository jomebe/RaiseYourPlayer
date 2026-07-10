import type { Metadata } from "next";
import GameApp from "@/src/components/GameApp";

export const metadata: Metadata = {
  title: "Raise Your Player — 축구 선수 육성 시뮬레이션",
  description:
    "훈련, 경기, 강화, 이적과 은퇴까지 이어지는 웹 기반 축구 선수 커리어 시뮬레이션",
};

export default function Home() {
  return <GameApp />;
}
