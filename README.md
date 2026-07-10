# Raise Your Player

실제 경기 데이터의 감각을 참고하되 로고, 초상, 유니폼, 상표 자산을 사용하지 않은 독립 웹 축구 선수 육성 시뮬레이션입니다. 한 선수를 선택해 훈련, 회복, 경기, 강화와 이적을 반복하고 5시즌(희귀 선수 10시즌) 커리어를 완주하면 다음 선수에게 영구 적용되는 레거시 배지를 남깁니다.

## 실행 방법

필수 환경은 Node.js 22.13 이상입니다.

```bash
npm install
npm run dev
```

개발 서버가 표시하는 로컬 주소를 브라우저에서 엽니다. 로컬 개발에서도 저장 데이터는 Vite의 Cloudflare D1 로컬 바인딩을 통해 서버 API에 저장되며, 브라우저 `localStorage`에는 원격 세이브를 찾는 익명 프로필 ID만 저장됩니다.

## 빌드와 테스트

```bash
npm run typecheck
npm test
npm run build
```

- `npm run typecheck`: TypeScript strict 타입 검사
- `npm test`: Vitest 게임 엔진 테스트
- `npm run build`: vinext/Vite 기반 Cloudflare Worker 프로덕션 빌드
- `npm run db:generate`: `db/schema.ts` 변경 후 D1 마이그레이션 생성

## 주요 폴더

```text
app/
  api/save/route.ts       D1 원격 저장 API
  page.tsx                게임 진입점
db/
  schema.ts               D1 스키마
  game-saves.ts           prepared statement 기반 저장 모듈
drizzle/                  배포 시 적용되는 D1 마이그레이션
src/
  components/             선택 화면, 게임 셸, 매치 뷰, 공통 UI
  game/
    config/               훈련, 강화, 리그, 구단, 보상, 미션, 성장 밸런스
    data/players.ts        기본 선수 100명 텍스트 데이터
    engine/               OVR, RNG, 경기, 강화, 성장, 이적, 시즌 엔진
    save/validation.ts     버전 및 JSON 저장 검증
    types.ts               게임 도메인 타입
  lib/                     원격 저장 클라이언트와 Web Audio 효과음
  store/gameStore.ts       Zustand 상태와 D1 자동 저장
```

## 게임 규칙

1. 기본 선수 100명 중 하나를 선택하거나 커스텀 선수를 만듭니다.
2. 체력과 컨디션을 관리하면서 포지션에 맞는 훈련을 선택합니다.
3. 매치위크 경기에는 선수 능력치, 컨디션, 체력, 팀 전력, 홈 어드밴티지와 시드 난수가 반영됩니다.
4. 경기 XP 750마다 능력치 포인트를 얻어 최대 160까지 개별 능력치를 올릴 수 있습니다.
5. 강화 전용 재화로 +13까지 도전합니다. 실패하면 등급은 유지되고 실패 보정이 누적됩니다.
6. 지정된 이적시장 주차에 도착한 제안을 수락하거나 거절합니다.
7. 시즌 종료 후 세 가지 장비 보상 중 하나를 선택합니다.
8. 최종 시즌 보상 선택 후 선수가 은퇴하고 명예의 전당과 레거시 배지가 생성됩니다.
9. 일반 5시즌 선수는 모든 공용 레거시를 적용받고, 희귀 10시즌 선수는 시작 시 최대 3개를 선택합니다.

자동 진행은 다음 경기, 시즌 종료, 전체 커리어 단위로 제공됩니다. 능력치 포인트, 이적 제안, 시즌 보상, 결승전, 부상과 은퇴 정지 여부는 설정에서 바꿀 수 있습니다.

## 저장 데이터

모든 권위 있는 게임 상태는 Cloudflare D1의 `game_saves` 테이블에 JSON과 스키마 버전으로 저장됩니다.

- 현재 선수, 시즌과 매치위크
- 모든 능력치, 강화, 재화, 구단과 이적 기록
- 트로피, 시즌 보상, 레거시 배지
- 은퇴 선수와 명예의 전당
- 자동 진행 및 사운드 설정

각 행동은 자동 저장됩니다. 설정 화면에서 수동 저장, 새 선수 시작, 전체 저장 초기화, JSON 내보내기와 검증된 JSON 불러오기를 사용할 수 있습니다. 잘못된 버전 또는 필수 구조가 없는 파일은 거부됩니다.

## 밸런스 조정 위치

- `src/game/config/training.ts`: 훈련 XP, 체력 소모, 부상 확률
- `src/game/config/enhancement.ts`: +2~+13 확률, 비용, OVR/주급 보정
- `src/game/config/leagues.ts`: 리그 명성과 국가
- `src/game/config/clubs.ts`: 구단 전력, 컬러, 임금 계수
- `src/game/config/rewards.ts`: 경기 후 보너스와 시즌 보상
- `src/game/config/missions.ts`: 포지션별 감독 미션과 보상
- `src/game/config/progression.ts`: 최대 능력치, XP 기준, 시즌 길이
- `src/game/engine/ovr.ts`: 포지션별 OVR 가중치
- `src/game/engine/match.ts`: 결정적 경기 시뮬레이션

## 자산 정책

실제 선수와 구단 이름은 텍스트 데이터로만 사용합니다. 실제 선수 사진, 구단 로고, 유니폼, 방송 그래픽, EA·넥슨·FC 온라인 및 대회 로고는 포함하지 않습니다. UI, 경기장 표현, 선수 카드와 Web Audio 효과음은 프로젝트 전용으로 제작되었습니다.
