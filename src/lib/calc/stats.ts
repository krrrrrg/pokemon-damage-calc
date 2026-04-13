// ============================================================
// 스탯 실능 계산
// ============================================================

import type { StatName, Nature, BaseStats, IVs, EVs } from "./types";

/**
 * HP 실능 계산
 * HP = (2 × 종족값 + 개체값 + 노력치÷4) × Lv÷100 + Lv + 10
 * 누석스(종족값 1)는 항상 HP = 1
 */
export function calcHP(base: number, iv: number, ev: number, level: number): number {
  // 누석스 예외
  if (base === 1) return 1;

  return Math.floor(
    ((2 * base + iv + Math.floor(ev / 4)) * level) / 100
  ) + level + 10;
}

/**
 * 성격 보정값 반환 (1.1 / 1.0 / 0.9)
 */
export function getNatureMod(nature: Nature, stat: StatName): number {
  if (stat === "hp") return 1.0;
  if (nature.plus === stat) return 1.1;
  if (nature.minus === stat) return 0.9;
  return 1.0;
}

/**
 * HP 외 스탯 실능 계산
 * 기타 = ((2 × 종족값 + 개체값 + 노력치÷4) × Lv÷100 + 5) × 성격보정
 * 매 단계 소수점 버림
 */
export function calcStat(
  base: number,
  iv: number,
  ev: number,
  level: number,
  natureMod: number
): number {
  const raw = Math.floor(
    ((2 * base + iv + Math.floor(ev / 4)) * level) / 100
  ) + 5;
  return Math.floor(raw * natureMod);
}

/**
 * 전체 실능 한번에 계산
 */
export function calcAllStats(
  baseStats: BaseStats,
  ivs: IVs,
  evs: EVs,
  level: number,
  nature: Nature
): { hp: number; atk: number; def: number; spa: number; spd: number; spe: number } {
  return {
    hp: calcHP(baseStats.hp, ivs.hp, evs.hp, level),
    atk: calcStat(baseStats.atk, ivs.atk, evs.atk, level, getNatureMod(nature, "atk")),
    def: calcStat(baseStats.def, ivs.def, evs.def, level, getNatureMod(nature, "def")),
    spa: calcStat(baseStats.spa, ivs.spa, evs.spa, level, getNatureMod(nature, "spa")),
    spd: calcStat(baseStats.spd, ivs.spd, evs.spd, level, getNatureMod(nature, "spd")),
    spe: calcStat(baseStats.spe, ivs.spe, evs.spe, level, getNatureMod(nature, "spe")),
  };
}

/**
 * 능력 랭크 배율
 */
export function getRankMultiplier(rank: number): number {
  if (rank >= 0) return (2 + rank) / 2;
  return 2 / (2 - rank);
}

/**
 * 포챔스 모드 스탯 계산
 * 개체값 31 고정, 노력치 1당 스탯 +1
 */
export function calcStatChampions(
  base: number,
  ev: number,
  level: number,
  natureMod: number,
  isHP: boolean
): number {
  const iv = 31;
  if (isHP) {
    if (base === 1) return 1;
    return Math.floor(
      ((2 * base + iv + Math.floor(ev / 4)) * level) / 100
    ) + level + 10 + (ev - Math.floor(ev / 4));
    // 포챔스: 노력치 1당 +1이므로 기본 공식에 잔여분 추가
  }
  // 포챔스에서는 노력치가 직접 +1이므로 별도 계산
  const raw = Math.floor(((2 * base + iv) * level) / 100) + 5;
  return Math.floor(raw * natureMod) + ev;
}
