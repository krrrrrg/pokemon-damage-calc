// ============================================================
// 특수 기술 처리 (변칙 스탯, 가변위력, 고정데미지, 연속기)
// ============================================================

import type { Pokemon, Move } from "./types";
import { calcStat, getNatureMod, getRankMultiplier } from "./stats";

// ─── 변칙 스탯 참조 ──────────────────────────────────────

interface StatPair {
  atk: number;  // 사용할 공격 실능
  def: number;  // 사용할 방어 실능
  atkLabel: string;
  defLabel: string;
}

/**
 * 기술에 따라 어떤 공격/방어 스탯을 사용할지 결정
 */
export function getAttackDefenseStats(
  move: Move,
  attacker: Pokemon,
  defender: Pokemon,
  attackerStats: { atk: number; def: number; spa: number; spd: number },
  defenderStats: { atk: number; def: number; spa: number; spd: number },
  isCrit: boolean
): StatPair {
  const atkBoostMod = (stat: "atk" | "spa", who: Pokemon) => {
    const rank = who.boosts[stat];
    // 급소 시: 공격 측 랭크 하락 무시
    if (isCrit && rank < 0) return 1.0;
    return getRankMultiplier(rank);
  };
  const defBoostMod = (stat: "def" | "spd", who: Pokemon) => {
    const rank = who.boosts[stat];
    // 급소 시: 방어 측 랭크 상승 무시
    if (isCrit && rank > 0) return 1.0;
    return getRankMultiplier(rank);
  };

  const moveName = move.name.toLowerCase();

  // 바디프레스: 자신 방어 → 상대 방어
  if (moveName === "body-press") {
    return {
      atk: Math.floor(attackerStats.def * atkBoostMod("def" as any, attacker)),
      def: Math.floor(defenderStats.def * defBoostMod("def", defender)),
      atkLabel: "방어",
      defLabel: "방어",
    };
  }

  // 파울플레이: 상대 공격 → 상대 방어
  if (moveName === "foul-play") {
    return {
      atk: Math.floor(defenderStats.atk * atkBoostMod("atk", defender)),
      def: Math.floor(defenderStats.def * defBoostMod("def", defender)),
      atkLabel: "상대 공격",
      defLabel: "방어",
    };
  }

  // 사이코쇼크/사이코브레이크/비밀의칼: 자신 특공 → 상대 방어
  if (
    moveName === "psyshock" ||
    moveName === "psystrike" ||
    moveName === "secret-sword"
  ) {
    return {
      atk: Math.floor(attackerStats.spa * atkBoostMod("spa", attacker)),
      def: Math.floor(defenderStats.def * defBoostMod("def", defender)),
      atkLabel: "특공",
      defLabel: "방어",
    };
  }

  // 포톤게이저: 공격 vs 특공 중 높은 쪽
  if (moveName === "photon-geyser") {
    const physAtk = Math.floor(attackerStats.atk * atkBoostMod("atk", attacker));
    const specAtk = Math.floor(attackerStats.spa * atkBoostMod("spa", attacker));
    if (physAtk > specAtk) {
      return {
        atk: physAtk,
        def: Math.floor(defenderStats.def * defBoostMod("def", defender)),
        atkLabel: "공격",
        defLabel: "방어",
      };
    }
    return {
      atk: specAtk,
      def: Math.floor(defenderStats.spd * defBoostMod("spd", defender)),
      atkLabel: "특공",
      defLabel: "특방",
    };
  }

  // 쉘암즈: 물리/특수 중 데미지 높은 쪽 (외부에서 비교 필요, 여기선 물리 기본)
  if (moveName === "shell-side-arm") {
    const physAtk = Math.floor(attackerStats.atk * atkBoostMod("atk", attacker));
    const physDef = Math.floor(defenderStats.def * defBoostMod("def", defender));
    const specAtk = Math.floor(attackerStats.spa * atkBoostMod("spa", attacker));
    const specDef = Math.floor(defenderStats.spd * defBoostMod("spd", defender));
    // 간이 비교: atk/def vs spa/spd
    if (physAtk / physDef >= specAtk / specDef) {
      return { atk: physAtk, def: physDef, atkLabel: "공격", defLabel: "방어" };
    }
    return { atk: specAtk, def: specDef, atkLabel: "특공", defLabel: "특방" };
  }

  // 테라버스트: 테라스탈 시 공격>특공이면 물리
  if (moveName === "tera-blast" && attacker.teraActive) {
    const physAtk = Math.floor(attackerStats.atk * atkBoostMod("atk", attacker));
    const specAtk = Math.floor(attackerStats.spa * atkBoostMod("spa", attacker));
    if (physAtk > specAtk) {
      return {
        atk: physAtk,
        def: Math.floor(defenderStats.def * defBoostMod("def", defender)),
        atkLabel: "공격",
        defLabel: "방어",
      };
    }
  }

  // 기본: 물리 → 공격/방어, 특수 → 특공/특방
  if (move.category === "physical") {
    return {
      atk: Math.floor(attackerStats.atk * atkBoostMod("atk", attacker)),
      def: Math.floor(defenderStats.def * defBoostMod("def", defender)),
      atkLabel: "공격",
      defLabel: "방어",
    };
  }
  return {
    atk: Math.floor(attackerStats.spa * atkBoostMod("spa", attacker)),
    def: Math.floor(defenderStats.spd * defBoostMod("spd", defender)),
    atkLabel: "특공",
    defLabel: "특방",
  };
}

// ─── 가변 위력 ────────────────────────────────────────────

export function getVariablePower(
  move: Move,
  attacker: Pokemon,
  defender: Pokemon,
  attackerStats: { spe: number },
  defenderStats: { spe: number },
  context?: {
    attackerCurrentHP?: number;
    attackerMaxHP?: number;
    defenderWeight?: number;
    attackerWeight?: number;
    attackerBoostSum?: number;
    defenderBoostSum?: number;
    hasItem?: boolean;
    attackerStatus?: string;
  }
): number {
  const name = move.name.toLowerCase();
  const ctx = context ?? {};

  // 자이로볼: 25 × (상대 스피드 ÷ 자신 스피드), 최대 150
  if (name === "gyro-ball") {
    const power = Math.min(150, Math.floor(25 * defenderStats.spe / Math.max(1, attackerStats.spe)));
    return Math.max(1, power);
  }

  // 일렉트릭볼: 스피드 비율에 따라
  if (name === "electro-ball") {
    const ratio = attackerStats.spe / Math.max(1, defenderStats.spe);
    if (ratio >= 4) return 150;
    if (ratio >= 3) return 120;
    if (ratio >= 2) return 80;
    if (ratio >= 1) return 60;
    return 40;
  }

  // 풀묶기/로킥: 상대 체중
  if (name === "grass-knot" || name === "low-kick") {
    const w = ctx.defenderWeight ?? defender.weight;
    if (w >= 200) return 120;
    if (w >= 100) return 100;
    if (w >= 50) return 80;
    if (w >= 25) return 60;
    if (w >= 10) return 40;
    return 20;
  }

  // 히트스탬프/헤비봄버: 체중 비율
  if (name === "heat-crash" || name === "heavy-slam") {
    const aw = ctx.attackerWeight ?? attacker.weight;
    const dw = ctx.defenderWeight ?? defender.weight;
    const ratio = aw / Math.max(0.1, dw);
    if (ratio >= 5) return 120;
    if (ratio >= 4) return 100;
    if (ratio >= 3) return 80;
    if (ratio >= 2) return 60;
    return 40;
  }

  // 분출/해수스파우팅: 150 × (현재HP ÷ 최대HP)
  if (name === "eruption" || name === "water-spout") {
    const hp = ctx.attackerCurrentHP ?? attacker.currentHP;
    const max = ctx.attackerMaxHP ?? attacker.maxHP;
    return Math.max(1, Math.floor(150 * hp / max));
  }

  // 기사회생: (최대HP - 현재HP) × 1.5, 최대 200
  if (name === "reversal" || name === "flail") {
    const hp = ctx.attackerCurrentHP ?? attacker.currentHP;
    const max = ctx.attackerMaxHP ?? attacker.maxHP;
    const ratio = hp / max;
    if (ratio <= 0.0417) return 200;
    if (ratio <= 0.1042) return 150;
    if (ratio <= 0.2083) return 100;
    if (ratio <= 0.3542) return 80;
    if (ratio <= 0.6875) return 40;
    return 20;
  }

  // 아크로바트: 도구 미소지 시 위력 2배
  if (name === "acrobatics") {
    return (ctx.hasItem === false || attacker.item === "") ? 110 : 55;
  }

  // 파사드: 상태이상 시 위력 2배
  if (name === "facade") {
    const st = ctx.attackerStatus ?? attacker.status;
    return (st !== "none" && st !== undefined) ? 140 : 70;
  }

  // 웨더볼: 날씨 시 위력 100 (타입 변경은 별도 처리)
  if (name === "weather-ball") {
    return 50; // 기본, 날씨 보정은 외부에서
  }

  // 날려버리기(어시스트파워): 상승 랭크 합 × 20 + 20
  if (name === "stored-power") {
    const sum = ctx.attackerBoostSum ?? 0;
    return 20 + sum * 20;
  }

  // 꺾기(파워트릭): 하락 랭크 합 × 20 + 20
  if (name === "punishment") {
    const sum = ctx.defenderBoostSum ?? 0;
    return Math.min(200, 60 + sum * 20);
  }

  // 쥐어짜기: 120 × (상대 현재HP ÷ 상대 최대HP)
  if (name === "wring-out" || name === "crush-grip") {
    const hp = defender.currentHP;
    const max = defender.maxHP;
    return Math.max(1, Math.floor(120 * hp / max));
  }

  return move.power ?? 0;
}

// ─── 고정 데미지 ──────────────────────────────────────────

export function getFixedDamage(
  move: Move,
  attacker: Pokemon,
  _defender: Pokemon
): number | null {
  const name = move.name.toLowerCase();

  // 나이트헤드/지구던지기: 레벨 = 데미지
  if (name === "night-shade" || name === "seismic-toss") {
    return attacker.level;
  }

  // 용의분노: 40 고정 (7세대까지)
  if (name === "dragon-rage") return 40;

  // 소닉붐: 20 고정 (7세대까지)
  if (name === "sonic-boom") return 20;

  // 이판사판머리찌르기: 레벨
  if (name === "endeavor") return null; // 특수 처리 필요 (HP 차이)

  return null; // 고정 데미지가 아닌 기술
}

// ─── 연속기 ───────────────────────────────────────────────

export interface MultiHitInfo {
  minHits: number;
  maxHits: number;
  hitDistribution: { hits: number; probability: number }[];
  powerPerHit?: number[]; // 트리플악셀 등 타수별 위력
}

export function getMultiHitInfo(move: Move): MultiHitInfo | null {
  const name = move.name.toLowerCase();

  // 2회 고정
  const doubleHitMoves = [
    "double-kick", "double-hit", "dual-wingbeat", "dual-chop",
    "twineedle", "double-iron-bash", "dragon-darts",
  ];
  if (doubleHitMoves.includes(name)) {
    return {
      minHits: 2,
      maxHits: 2,
      hitDistribution: [{ hits: 2, probability: 1.0 }],
    };
  }

  // 트리플악셀: 3회, 위력 누적
  if (name === "triple-axel") {
    return {
      minHits: 3,
      maxHits: 3,
      hitDistribution: [{ hits: 3, probability: 1.0 }],
      powerPerHit: [20, 40, 60],
    };
  }

  // 트리플킥: 3회, 위력 누적
  if (name === "triple-kick") {
    return {
      minHits: 3,
      maxHits: 3,
      hitDistribution: [{ hits: 3, probability: 1.0 }],
      powerPerHit: [10, 20, 30],
    };
  }

  // 2~5회 연속기
  if (move.multiHitMin === 2 && move.multiHitMax === 5) {
    return {
      minHits: 2,
      maxHits: 5,
      hitDistribution: [
        { hits: 2, probability: 35 / 100 },
        { hits: 3, probability: 35 / 100 },
        { hits: 4, probability: 15 / 100 },
        { hits: 5, probability: 15 / 100 },
      ],
    };
  }

  // 3회 고정 (population-bomb 등은 별도)
  if (move.multiHitMin && move.multiHitMax && move.multiHitMin === move.multiHitMax) {
    return {
      minHits: move.multiHitMin,
      maxHits: move.multiHitMax,
      hitDistribution: [{ hits: move.multiHitMin, probability: 1.0 }],
    };
  }

  // 일반 멀티히트
  if (move.multiHitMin && move.multiHitMax) {
    const range = move.multiHitMax - move.multiHitMin + 1;
    const prob = 1.0 / range;
    const dist = [];
    for (let i = move.multiHitMin; i <= move.multiHitMax; i++) {
      dist.push({ hits: i, probability: prob });
    }
    return { minHits: move.multiHitMin, maxHits: move.multiHitMax, hitDistribution: dist };
  }

  return null; // 연속기가 아님
}

// ─── Z기술 위력 변환 ──────────────────────────────────────

export function getZMovePower(basePower: number): number {
  if (basePower <= 55) return 100;
  if (basePower <= 65) return 120;
  if (basePower <= 75) return 140;
  if (basePower <= 85) return 160;
  if (basePower <= 95) return 175;
  if (basePower <= 100) return 180;
  if (basePower <= 110) return 185;
  if (basePower <= 125) return 190;
  if (basePower <= 130) return 195;
  return 200;
}

// ─── 다이맥스기 위력 변환 ─────────────────────────────────

export function getDmaxMovePower(basePower: number, moveType?: string): number {
  // 격투/독은 약간 낮은 위력 (간이 처리)
  const isLower = moveType === "fighting" || moveType === "poison";
  const offset = isLower ? -10 : 0;

  if (basePower <= 40) return 90 + offset;
  if (basePower <= 50) return 100 + offset;
  if (basePower <= 60) return 110 + offset;
  if (basePower <= 70) return 120 + offset;
  if (basePower <= 100) return 130 + offset;
  if (basePower <= 140) return 140 + offset;
  return 150 + offset;
}
