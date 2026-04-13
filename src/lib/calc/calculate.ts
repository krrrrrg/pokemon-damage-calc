// ============================================================
// 통합 데미지 계산 함수
// ============================================================

import type {
  Pokemon, Move, Field, DamageResult, PokemonType,
} from "./types";
import { calcHP, calcStat, getNatureMod, calcAllStats, getRankMultiplier } from "./stats";
import { calcBaseDamage, applyModifiers, getDamageRolls } from "./damage";
import {
  getWeatherMod, getFieldMod, getTypeEffectiveness, getSTAB,
  getCritMod, getScreenMod, getDoubleMod, getStatusMod,
  getItemMod, getItemStatMod, getAttackerAbilityMod, getDefenderAbilityMod,
  checkImmunity, getSkinAbility, getPinchAbilityMod,
  getWeatherStatMod, getDoubleSupportMod, getRuinMod, getFlashFireMod,
} from "./modifiers";
import {
  getAttackDefenseStats, getVariablePower, getFixedDamage,
  getMultiHitInfo, getZMovePower, getDmaxMovePower,
} from "./specialMoves";

// ─── 킬 판정 ─────────────────────────────────────────────

function calcKOChance(
  rolls: number[],
  targetHP: number
): { n: number; chance: number; text: string } {
  // 1발 판정
  const killCount1 = rolls.filter((r) => r >= targetHP).length;
  if (killCount1 === 16) {
    return { n: 1, chance: 1.0, text: "확정 1발" };
  }
  if (killCount1 > 0) {
    return {
      n: 1,
      chance: killCount1 / 16,
      text: `난수 1발 (${killCount1}/16, ${((killCount1 / 16) * 100).toFixed(1)}%)`,
    };
  }

  // 2발 판정: 16×16 = 256 조합
  let killCount2 = 0;
  for (const r1 of rolls) {
    for (const r2 of rolls) {
      if (r1 + r2 >= targetHP) killCount2++;
    }
  }
  if (killCount2 === 256) {
    return { n: 2, chance: 1.0, text: "확정 2발" };
  }
  if (killCount2 > 0) {
    return {
      n: 2,
      chance: killCount2 / 256,
      text: `난수 2발 (${killCount2}/256, ${((killCount2 / 256) * 100).toFixed(1)}%)`,
    };
  }

  // 3발 판정: 16^3 = 4096 조합
  let killCount3 = 0;
  for (const r1 of rolls) {
    for (const r2 of rolls) {
      for (const r3 of rolls) {
        if (r1 + r2 + r3 >= targetHP) killCount3++;
      }
    }
  }
  if (killCount3 === 4096) {
    return { n: 3, chance: 1.0, text: "확정 3발" };
  }
  if (killCount3 > 0) {
    return {
      n: 3,
      chance: killCount3 / 4096,
      text: `난수 3발 (${((killCount3 / 4096) * 100).toFixed(1)}%)`,
    };
  }

  // 4발 이상: 근사치 (평균 데미지 기준)
  const avgDmg = rolls.reduce((a, b) => a + b, 0) / rolls.length;
  if (avgDmg <= 0) return { n: 999, chance: 0, text: "킬 불가" };
  const nHits = Math.ceil(targetHP / avgDmg);
  return {
    n: nHits,
    chance: 1.0,
    text: `약 ${nHits}발`,
  };
}

// ─── 메인 계산 함수 ───────────────────────────────────────

export function calculateDamage(
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field
): DamageResult | null {
  // 변화기는 데미지 없음
  if (move.category === "status") return null;

  // 면역 체크
  const immunity = checkImmunity(defender.ability, move.type);
  if (immunity.immune) {
    return {
      minDamage: 0, maxDamage: 0, rolls: new Array(16).fill(0),
      minPercent: 0, maxPercent: 0,
      koChance: { n: 999, chance: 0, text: "면역 (무효)" },
      critDamage: { min: 0, max: 0, minPercent: 0, maxPercent: 0 },
      attackStat: 0, defenseStat: 0, effectiveness: 0, stab: 1, power: 0, multiHit: null,
    };
  }

  // 1. 스탯 계산
  const atkStats = calcAllStats(
    attacker.baseStats, attacker.ivs, attacker.evs, attacker.level, attacker.nature
  );
  const defStats = calcAllStats(
    defender.baseStats, defender.ivs, defender.evs, defender.level, defender.nature
  );

  // 2. 스킨 특성 처리 (타입 변환)
  let effectiveMoveType: PokemonType = move.type;
  let skinPowerMod = 1.0;
  const skin = getSkinAbility(attacker.ability, move.type);
  if (skin) {
    effectiveMoveType = skin.newType;
    skinPowerMod = skin.powerMod;
  }

  // 테라버스트: 테라 타입으로 변경
  if (move.name.toLowerCase() === "tera-blast" && attacker.teraActive && attacker.teraType && attacker.teraType !== "stellar") {
    effectiveMoveType = attacker.teraType as PokemonType;
  }

  // 3. 기술 위력 결정
  let power = move.power ?? 0;

  // 고정 데미지 체크
  const fixed = getFixedDamage(move, attacker, defender);
  if (fixed !== null) {
    const defHP = defStats.hp;
    const pct = (fixed / defHP) * 100;
    return {
      minDamage: fixed, maxDamage: fixed,
      rolls: new Array(16).fill(fixed),
      minPercent: parseFloat(pct.toFixed(1)),
      maxPercent: parseFloat(pct.toFixed(1)),
      koChance: calcKOChance(new Array(16).fill(fixed), defHP),
      critDamage: { min: fixed, max: fixed, minPercent: parseFloat(pct.toFixed(1)), maxPercent: parseFloat(pct.toFixed(1)) },
      attackStat: 0, defenseStat: 0, effectiveness: 1, stab: 1, power: fixed, multiHit: null,
    };
  }

  // 가변 위력
  power = getVariablePower(
    move, attacker, defender,
    { spe: atkStats.spe }, { spe: defStats.spe },
    {
      attackerCurrentHP: attacker.currentHP,
      attackerMaxHP: atkStats.hp,
      defenderWeight: defender.weight,
      attackerWeight: attacker.weight,
      hasItem: attacker.item !== "",
      attackerStatus: attacker.status,
    }
  );

  // Z기술 위력
  if (attacker.gimmick === "z-move" && power > 0) {
    power = getZMovePower(power);
  }

  // 다이맥스기 위력
  if ((attacker.gimmick === "dynamax" || attacker.gimmick === "gigantamax") && power > 0) {
    power = getDmaxMovePower(power, effectiveMoveType);
  }

  // 스킨 위력 보정
  power = Math.floor(power * skinPowerMod);

  // 4. 공격/방어 스탯 결정 (변칙 기술 포함)
  const statPair = getAttackDefenseStats(
    move, attacker, defender,
    { atk: atkStats.atk, def: atkStats.def, spa: atkStats.spa, spd: atkStats.spd },
    { atk: defStats.atk, def: defStats.def, spa: defStats.spa, spd: defStats.spd },
    field.isCrit
  );

  // 도구 스탯 보정
  const atkStatKey = move.category === "physical" ? "atk" as const : "spa" as const;
  const defStatKey = move.category === "physical" ? "def" as const : "spd" as const;
  const itemAtkMod = getItemStatMod(attacker.item, atkStatKey, attacker.name.toLowerCase());
  const itemDefMod = getItemStatMod(defender.item, defStatKey, defender.name.toLowerCase());

  // 날씨 스탯 보정
  const weatherDefMod = getWeatherStatMod(field.weather, defender.types, defStatKey);

  // 재앙 특성
  const ruinAtkMod = getRuinMod(defender.ability, atkStatKey);
  const ruinDefMod = getRuinMod(attacker.ability, defStatKey);

  // 힘자랑패치/천하장사
  let abilityAtkStatMod = 1.0;
  if ((attacker.ability === "huge-power" || attacker.ability === "pure-power") && move.category === "physical") {
    abilityAtkStatMod = 2.0;
  }
  if (attacker.ability === "solar-power" && field.weather === "sun" && move.category === "special") {
    abilityAtkStatMod = 1.5;
  }

  const finalAtk = Math.floor(statPair.atk * itemAtkMod * abilityAtkStatMod * ruinAtkMod);
  const finalDef = Math.floor(statPair.def * itemDefMod * weatherDefMod * ruinDefMod);

  // 다이맥스 HP 2배
  let defHP = defStats.hp;
  if (defender.gimmick === "dynamax" || defender.gimmick === "gigantamax") {
    defHP *= 2;
  }

  // 5. 기본 데미지
  const baseDmg = calcBaseDamage(attacker.level, power, finalAtk, Math.max(1, finalDef));

  // 6. 보정값 수집 (순서: 타입상성→자속→급소→랜덤→화상→도구→특성→기타)
  // 테라스탈 방어 타입
  let defTypes = defender.types;
  if (defender.teraActive && defender.teraType && defender.teraType !== "stellar") {
    defTypes = [defender.teraType as PokemonType, null];
  }

  const effectiveness = getTypeEffectiveness(effectiveMoveType, defTypes[0], defTypes[1]);
  const stab = getSTAB(effectiveMoveType, attacker.types, attacker.teraType, attacker.teraActive, attacker.ability);
  const critMod = getCritMod(field.isCrit, attacker.ability);
  const burnMod = getStatusMod(attacker.status, move.category as "physical" | "special", attacker.ability, field.isCrit);
  const itemMod = getItemMod(attacker.item, effectiveMoveType, move.category as "physical" | "special", effectiveness);
  const abilityMod = getAttackerAbilityMod(
    attacker.ability, effectiveMoveType, move.category as "physical" | "special",
    power, move, effectiveness, field.weather, attacker.status
  );
  const defAbilityMod = getDefenderAbilityMod(
    defender.ability, effectiveMoveType, move.category as "physical" | "special",
    effectiveness, move, defender.currentHP, defHP
  );
  const screenMod = getScreenMod(field.screens, move.category as "physical" | "special", field.isDouble, field.isCrit);
  const spreadMod = getDoubleMod(move.isSpread, field.isDouble);
  const weatherMod = getWeatherMod(field.weather, effectiveMoveType);
  const fieldMod = getFieldMod(field.terrain, effectiveMoveType, attacker.isGrounded, move.name.toLowerCase());
  const pinchMod = getPinchAbilityMod(attacker.ability, attacker.currentHP, atkStats.hp, effectiveMoveType);
  const helpMod = getDoubleSupportMod(field.isHelping);

  // 보정값 적용 (랜덤 전)
  const preRandomDmg = applyModifiers(baseDmg, [
    weatherMod,
    fieldMod,
    effectiveness,
    stab,
    critMod,
  ]);

  // 랜덤 적용 후 나머지 보정
  const rolls = getDamageRolls(preRandomDmg).map((roll) =>
    Math.max(1, applyModifiers(roll, [
      burnMod,
      screenMod,
      spreadMod,
      itemMod,
      abilityMod,
      defAbilityMod,
      pinchMod,
      helpMod,
    ]))
  );

  const minDmg = Math.min(...rolls);
  const maxDmg = Math.max(...rolls);
  const minPct = parseFloat(((minDmg / defHP) * 100).toFixed(1));
  const maxPct = parseFloat(((maxDmg / defHP) * 100).toFixed(1));

  // 급소 데미지 (별도 계산)
  const critPreRandom = applyModifiers(baseDmg, [
    weatherMod, fieldMod, effectiveness, stab, getCritMod(true, attacker.ability),
  ]);
  const critRolls = getDamageRolls(critPreRandom).map((roll) =>
    Math.max(1, applyModifiers(roll, [
      1.0, // 급소 시 화상 무시
      1.0, // 급소 시 벽 무시
      spreadMod,
      itemMod,
      abilityMod,
      defAbilityMod,
      pinchMod,
      helpMod,
    ]))
  );
  const critMin = Math.min(...critRolls);
  const critMax = Math.max(...critRolls);

  // 연속기 계산
  const multiHitInfo = getMultiHitInfo(move);
  let multiHitResult: DamageResult["multiHit"] = null;

  if (multiHitInfo) {
    const hits: { power: number; minDamage: number; maxDamage: number; minPercent: number; maxPercent: number }[] = [];
    let totalMin = 0;
    let totalMax = 0;

    // 타수별 위력이 다른 경우 (트리플악셀 등)
    const hitCount = multiHitInfo.powerPerHit
      ? multiHitInfo.powerPerHit.length
      : multiHitInfo.maxHits;

    for (let i = 0; i < hitCount; i++) {
      const hitPower = multiHitInfo.powerPerHit
        ? multiHitInfo.powerPerHit[i]
        : power;

      const hitBaseDmg = calcBaseDamage(attacker.level, hitPower, finalAtk, Math.max(1, finalDef));
      const hitPreRandom = applyModifiers(hitBaseDmg, [
        weatherMod, fieldMod, effectiveness, stab, critMod,
      ]);
      const hitRolls = getDamageRolls(hitPreRandom).map((roll) =>
        Math.max(1, applyModifiers(roll, [
          burnMod, screenMod, spreadMod, itemMod, abilityMod, defAbilityMod, pinchMod, helpMod,
        ]))
      );
      const hitMin = Math.min(...hitRolls);
      const hitMax = Math.max(...hitRolls);
      totalMin += hitMin;
      totalMax += hitMax;
      hits.push({
        power: hitPower,
        minDamage: hitMin,
        maxDamage: hitMax,
        minPercent: parseFloat(((hitMin / defHP) * 100).toFixed(1)),
        maxPercent: parseFloat(((hitMax / defHP) * 100).toFixed(1)),
      });
    }

    multiHitResult = {
      hits,
      totalMin,
      totalMax,
      totalMinPercent: parseFloat(((totalMin / defHP) * 100).toFixed(1)),
      totalMaxPercent: parseFloat(((totalMax / defHP) * 100).toFixed(1)),
    };
  }

  return {
    minDamage: multiHitResult ? multiHitResult.totalMin : minDmg,
    maxDamage: multiHitResult ? multiHitResult.totalMax : maxDmg,
    rolls,
    minPercent: multiHitResult ? multiHitResult.totalMinPercent : minPct,
    maxPercent: multiHitResult ? multiHitResult.totalMaxPercent : maxPct,
    koChance: calcKOChance(
      multiHitResult ? rolls.map((r) => r * (multiHitInfo?.maxHits ?? 1)) : rolls,
      defHP
    ),
    critDamage: {
      min: critMin,
      max: critMax,
      minPercent: parseFloat(((critMin / defHP) * 100).toFixed(1)),
      maxPercent: parseFloat(((critMax / defHP) * 100).toFixed(1)),
    },
    attackStat: finalAtk,
    defenseStat: finalDef,
    effectiveness,
    stab,
    power,
    multiHit: multiHitResult,
  };
}

// ─── 스피드 비교 ──────────────────────────────────────────

export interface SpeedResult {
  first: "attacker" | "defender" | "tie";
  attackerSpeed: number;
  defenderSpeed: number;
  attackerPriority: number;
  defenderPriority: number;
  reason: string; // 판정 이유
}

export function compareSpeed(
  attacker: Pokemon,
  defender: Pokemon,
  field: Field,
  attackerMove?: Move | null,
  defenderMove?: Move | null
): SpeedResult {
  const atkPriority = attackerMove?.priority ?? 0;
  const defPriority = defenderMove?.priority ?? 0;

  const atkStats = calcAllStats(attacker.baseStats, attacker.ivs, attacker.evs, attacker.level, attacker.nature);
  const defStats = calcAllStats(defender.baseStats, defender.ivs, defender.evs, defender.level, defender.nature);

  let atkSpe = Math.floor(atkStats.spe * getRankMultiplier(attacker.boosts.spe));
  let defSpe = Math.floor(defStats.spe * getRankMultiplier(defender.boosts.spe));

  // 도구 보정
  atkSpe = Math.floor(atkSpe * getItemStatMod(attacker.item, "spe"));
  defSpe = Math.floor(defSpe * getItemStatMod(defender.item, "spe"));

  // 마비
  if (attacker.status === "paralysis") atkSpe = Math.floor(atkSpe * 0.5);
  if (defender.status === "paralysis") defSpe = Math.floor(defSpe * 0.5);

  // 날씨/필드 특성 스피드
  const weatherSpeAbilities: Record<string, string> = {
    "chlorophyll": "sun",
    "swift-swim": "rain",
    "sand-rush": "sand",
    "slush-rush": "snow",
  };
  const terrainSpeAbilities: Record<string, string> = {
    "surge-surfer": "electric",
  };
  if (weatherSpeAbilities[attacker.ability] === field.weather) atkSpe *= 2;
  if (weatherSpeAbilities[defender.ability] === field.weather) defSpe *= 2;
  if (terrainSpeAbilities[attacker.ability] === field.terrain) atkSpe *= 2;
  if (terrainSpeAbilities[defender.ability] === field.terrain) defSpe *= 2;

  // 우선도 비교 (기술이 선택된 경우)
  if (atkPriority !== defPriority) {
    if (atkPriority > defPriority) {
      return { first: "attacker", attackerSpeed: atkSpe, defenderSpeed: defSpe, attackerPriority: atkPriority, defenderPriority: defPriority, reason: `우선도 +${atkPriority} > +${defPriority}` };
    }
    return { first: "defender", attackerSpeed: atkSpe, defenderSpeed: defSpe, attackerPriority: atkPriority, defenderPriority: defPriority, reason: `우선도 +${defPriority} > +${atkPriority}` };
  }

  // 같은 우선도 → 스피드 비교
  const reason = atkPriority !== 0 ? `같은 우선도(+${atkPriority}), 스피드로 판정` : "스피드 비교";

  if (atkSpe > defSpe) return { first: "attacker", attackerSpeed: atkSpe, defenderSpeed: defSpe, attackerPriority: atkPriority, defenderPriority: defPriority, reason };
  if (defSpe > atkSpe) return { first: "defender", attackerSpeed: atkSpe, defenderSpeed: defSpe, attackerPriority: atkPriority, defenderPriority: defPriority, reason };
  return { first: "tie", attackerSpeed: atkSpe, defenderSpeed: defSpe, attackerPriority: atkPriority, defenderPriority: defPriority, reason: "동속 (랜덤)" };
}

// ─── 결정력 / 내구 ───────────────────────────────────────

export function calcOffensiveStat(attacker: Pokemon): { physical: number; special: number } {
  const stats = calcAllStats(attacker.baseStats, attacker.ivs, attacker.evs, attacker.level, attacker.nature);
  return { physical: stats.atk, special: stats.spa };
}

export function calcBulk(defender: Pokemon): { physical: number; special: number } {
  const stats = calcAllStats(defender.baseStats, defender.ivs, defender.evs, defender.level, defender.nature);
  return {
    physical: stats.hp * stats.def,
    special: stats.hp * stats.spd,
  };
}
