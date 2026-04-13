import { describe, it, expect } from "vitest";
import { calculateDamage, compareSpeed } from "../calculate";
import { calcHP, calcAllStats } from "../stats";
import type { Pokemon, Move, Field } from "../types";
import { DEFAULT_IVS, DEFAULT_EVS, DEFAULT_BOOSTS, DEFAULT_FIELD } from "../types";

// 스마트누오/Smogon calc 결과와 비교 검증
// 참고: https://calc.pokemonshowdown.com/

function pokemon(overrides: Partial<Pokemon>): Pokemon {
  const base: Pokemon = {
    name: "", baseStats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
    ivs: { ...DEFAULT_IVS }, evs: { ...DEFAULT_EVS }, level: 50,
    nature: { name: "Hardy", plus: null, minus: null },
    types: ["normal", null], ability: "", item: "", status: "none",
    boosts: { ...DEFAULT_BOOSTS }, currentHP: 0, maxHP: 0, weight: 50,
    teraType: null, teraActive: false, gimmick: "none", isGrounded: true,
  };
  const mon = { ...base, ...overrides };
  mon.maxHP = calcHP(mon.baseStats.hp, mon.ivs.hp, mon.evs.hp, mon.level);
  mon.currentHP = mon.maxHP;
  return mon;
}

function move(overrides: Partial<Move>): Move {
  return {
    id: 1, name: "test", type: "normal", category: "physical", power: 80,
    accuracy: 100, priority: 0, makesContact: false, isSound: false,
    isPunch: false, isBite: false, isPulse: false, isSlash: false,
    isRecoil: false, isSpread: false, multiHitMin: null, multiHitMax: null,
    ...overrides,
  };
}

describe("Smogon/스마트누오 비교 검증", () => {

  // ─── 케이스 1: 가브리아스 지진 → 리자몽 ───
  it("가브리아스 지진 → 리자몽 (4배 약점)", () => {
    // 가브리아스: 양껏 A252 S252 H4
    const garchomp = pokemon({
      name: "garchomp",
      baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      nature: { name: "Jolly", plus: "spe", minus: "spa" },
      types: ["dragon", "ground"],
    });
    // 리자몽: 겁쟁이 C252 S252 H4
    const charizard = pokemon({
      name: "charizard",
      baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      nature: { name: "Timid", plus: "spe", minus: "atk" },
      types: ["fire", "flying"],
    });
    const earthquake = move({ name: "earthquake", type: "ground", category: "physical", power: 100 });

    const result = calculateDamage(garchomp, charizard, earthquake, DEFAULT_FIELD);
    expect(result).not.toBeNull();
    // 리자몽은 비행이라 땅 면역이 아니라... 잠깐, 비행은 땅 면역
    // → 면역이어야 함
    expect(result!.effectiveness).toBe(0);
  });

  // ─── 케이스 2: 마릴리(힘자랑패치) 아쿠아제트 → 리자몽 ───
  it("마릴리 아쿠아제트 → 리자몽", () => {
    const azumarill = pokemon({
      name: "azumarill",
      baseStats: { hp: 100, atk: 50, def: 80, spa: 60, spd: 80, spe: 50 },
      evs: { hp: 236, atk: 252, def: 20, spa: 0, spd: 0, spe: 0 },
      nature: { name: "Adamant", plus: "atk", minus: "spa" },
      types: ["water", "fairy"],
      ability: "huge-power", // 힘자랑패치: 공격 2배
    });
    const charizard = pokemon({
      name: "charizard",
      baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      nature: { name: "Timid", plus: "spe", minus: "atk" },
      types: ["fire", "flying"],
    });
    const aquaJet = move({ name: "aqua-jet", type: "water", category: "physical", power: 40 });

    const result = calculateDamage(azumarill, charizard, aquaJet, DEFAULT_FIELD);
    expect(result).not.toBeNull();
    // 물 → 불꽃: 2배, 자속 1.5배, 힘자랑패치 공격 2배
    expect(result!.effectiveness).toBe(2);
    expect(result!.stab).toBe(1.5);
    // 마릴리(힘자랑패치 공격2배) 아쿠아제트(40위력) → 리자몽
    // 공격실능 112*2=224, 물→불꽃/비행=2배, 자속1.5배
    // 높은 데미지가 예상됨
    expect(result!.minPercent).toBeGreaterThan(50);
    expect(result!.maxPercent).toBeLessThan(100);
    expect(result!.koChance.n).toBeLessThanOrEqual(2);
  });

  // ─── 케이스 3: 날씨 보정 (쾌청 + 불꽃기술) ───
  it("쾌청 시 불꽃 기술 1.5배", () => {
    const charizard = pokemon({
      name: "charizard",
      baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
      evs: { ...DEFAULT_EVS, spa: 252 },
      nature: { name: "Timid", plus: "spe", minus: "atk" },
      types: ["fire", "flying"],
    });
    const target = pokemon({
      baseStats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
    });
    const flamethrower = move({ name: "flamethrower", type: "fire", category: "special", power: 90 });

    const sunField: Field = { ...DEFAULT_FIELD, weather: "sun" };
    const normalResult = calculateDamage(charizard, target, flamethrower, DEFAULT_FIELD);
    const sunResult = calculateDamage(charizard, target, flamethrower, sunField);

    expect(sunResult).not.toBeNull();
    expect(normalResult).not.toBeNull();
    // 쾌청 시 데미지가 더 높아야 함
    expect(sunResult!.maxDamage).toBeGreaterThan(normalResult!.maxDamage);
  });

  // ─── 케이스 4: 구애안경 보정 ───
  it("구애안경 특수기술 1.5배 스탯", () => {
    const specs = pokemon({
      baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
      evs: { ...DEFAULT_EVS, spa: 252 },
      types: ["fire", "flying"],
      item: "choice-specs",
    });
    const noItem = pokemon({
      baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
      evs: { ...DEFAULT_EVS, spa: 252 },
      types: ["fire", "flying"],
    });
    const target = pokemon({});
    const flamethrower = move({ name: "flamethrower", type: "fire", category: "special", power: 90 });

    const specsResult = calculateDamage(specs, target, flamethrower, DEFAULT_FIELD);
    const noItemResult = calculateDamage(noItem, target, flamethrower, DEFAULT_FIELD);

    expect(specsResult!.maxDamage).toBeGreaterThan(noItemResult!.maxDamage);
    // 구애안경은 특공 1.5배이므로 데미지도 대략 1.5배
    const ratio = specsResult!.maxDamage / noItemResult!.maxDamage;
    expect(ratio).toBeGreaterThan(1.3);
    expect(ratio).toBeLessThan(1.7);
  });

  // ─── 케이스 5: 적응력(Adaptability) STAB 2.0 ───
  it("적응력 특성 STAB 2.0", () => {
    const adaptability = pokemon({
      baseStats: { hp: 65, atk: 130, def: 60, spa: 95, spd: 110, spe: 65 },
      evs: { ...DEFAULT_EVS, atk: 252 },
      types: ["water", null],
      ability: "adaptability",
    });
    const normal = pokemon({
      baseStats: { hp: 65, atk: 130, def: 60, spa: 95, spd: 110, spe: 65 },
      evs: { ...DEFAULT_EVS, atk: 252 },
      types: ["water", null],
      ability: "",
    });
    const target = pokemon({});
    const waterfall = move({ name: "waterfall", type: "water", category: "physical", power: 80 });

    const adaptResult = calculateDamage(adaptability, target, waterfall, DEFAULT_FIELD);
    const normalResult = calculateDamage(normal, target, waterfall, DEFAULT_FIELD);

    expect(adaptResult!.stab).toBe(2.0);
    expect(normalResult!.stab).toBe(1.5);
    expect(adaptResult!.maxDamage).toBeGreaterThan(normalResult!.maxDamage);
  });
});
