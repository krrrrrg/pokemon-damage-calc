import { describe, it, expect } from "vitest";
import { calculate, Pokemon as SmogonPokemon, Move as SmogonMove, Field as SmogonField, Generations } from "@smogon/calc";
import { calculateDamage } from "../calculate";
import { calcHP } from "../stats";
import type { Pokemon, Move, Field } from "../types";
import { DEFAULT_IVS, DEFAULT_EVS, DEFAULT_BOOSTS, DEFAULT_FIELD } from "../types";

// ─── Smogon calc vs 우리 계산기 직접 비교 ─────────────────

const gen = Generations.get(9); // 9세대 기준

function ourPokemon(overrides: Partial<Pokemon>): Pokemon {
  const base: Pokemon = {
    name: "", baseStats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
    ivs: { ...DEFAULT_IVS }, evs: { ...DEFAULT_EVS }, level: 50,
    nature: { name: "Hardy", plus: null, minus: null },
    types: ["normal", null], ability: "", item: "", status: "none",
    boosts: { ...DEFAULT_BOOSTS }, currentHP: 0, maxHP: 0, weight: 50,
    teraType: null, teraActive: false, gimmick: "none", isGrounded: true, isUnburden: false,
  };
  const mon = { ...base, ...overrides };
  mon.maxHP = calcHP(mon.baseStats.hp, mon.ivs.hp, mon.evs.hp, mon.level);
  mon.currentHP = mon.maxHP;
  return mon;
}

function ourMove(overrides: Partial<Move>): Move {
  return {
    id: 1, name: "test", type: "normal", category: "physical", power: 80,
    accuracy: 100, priority: 0, makesContact: false, isSound: false,
    isPunch: false, isBite: false, isPulse: false, isSlash: false,
    isRecoil: false, isSpread: false, multiHitMin: null, multiHitMax: null,
    ...overrides,
  };
}

describe("Smogon calc 공식 검증", () => {

  // ─── 케이스 1: 가브리아스(양껏) 지진 → 히드런 ───
  it("가브리아스 지진 → 히드런", () => {
    // Smogon
    const smogonAtk = new SmogonPokemon(gen, "Garchomp", {
      nature: "Jolly", evs: { atk: 252, spe: 252, hp: 4 }, level: 50,
    });
    const smogonDef = new SmogonPokemon(gen, "Heatran", {
      nature: "Calm", evs: { hp: 252, spd: 252, def: 4 }, level: 50,
    });
    const smogonMove = new SmogonMove(gen, "Earthquake");
    const smogonResult = calculate(gen, smogonAtk, smogonDef, smogonMove);
    const smogonRange = smogonResult.range();

    // 우리 계산기
    const atk = ourPokemon({
      name: "garchomp",
      baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      nature: { name: "Jolly", plus: "spe", minus: "spa" },
      types: ["dragon", "ground"],
    });
    const def = ourPokemon({
      name: "heatran",
      baseStats: { hp: 91, atk: 90, def: 106, spa: 130, spd: 106, spe: 77 },
      evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
      nature: { name: "Calm", plus: "spd", minus: "atk" },
      types: ["fire", "steel"],
    });
    const mv = ourMove({ name: "earthquake", type: "ground", category: "physical", power: 100 });
    const ourResult = calculateDamage(atk, def, mv, DEFAULT_FIELD);

    console.log(`[케이스1] 가브리아스 지진 → 히드런`);
    console.log(`  Smogon: ${smogonRange[0]}~${smogonRange[1]}`);
    console.log(`  우리:   ${ourResult!.minDamage}~${ourResult!.maxDamage}`);

    // 허용 오차: ±2 (소수점 버림 타이밍 차이)
    expect(Math.abs(ourResult!.minDamage - smogonRange[0])).toBeLessThanOrEqual(3);
    expect(Math.abs(ourResult!.maxDamage - smogonRange[1])).toBeLessThanOrEqual(3);
  });

  // ─── 케이스 2: 드래펄트 유턴 → 삼삼드래 ───
  it("드래펄트 유턴 → 삼삼드래", () => {
    const smogonAtk = new SmogonPokemon(gen, "Dragapult", {
      nature: "Timid", evs: { spa: 252, spe: 252, hp: 4 }, level: 50,
    });
    const smogonDef = new SmogonPokemon(gen, "Hydreigon", {
      nature: "Modest", evs: { hp: 4, spa: 252, spe: 252 }, level: 50,
    });
    const smogonMove = new SmogonMove(gen, "U-turn");
    const smogonResult = calculate(gen, smogonAtk, smogonDef, smogonMove);
    const smogonRange = smogonResult.range();

    const atk = ourPokemon({
      name: "dragapult",
      baseStats: { hp: 88, atk: 120, def: 75, spa: 100, spd: 75, spe: 142 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      nature: { name: "Timid", plus: "spe", minus: "atk" },
      types: ["dragon", "ghost"],
    });
    const def = ourPokemon({
      name: "hydreigon",
      baseStats: { hp: 92, atk: 105, def: 90, spa: 125, spd: 90, spe: 98 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      nature: { name: "Modest", plus: "spa", minus: "atk" },
      types: ["dark", "dragon"],
    });
    const mv = ourMove({ name: "u-turn", type: "bug", category: "physical", power: 70 });
    const ourResult = calculateDamage(atk, def, mv, DEFAULT_FIELD);

    console.log(`[케이스2] 드래펄트 유턴 → 삼삼드래`);
    console.log(`  Smogon: ${smogonRange[0]}~${smogonRange[1]}`);
    console.log(`  우리:   ${ourResult!.minDamage}~${ourResult!.maxDamage}`);

    expect(Math.abs(ourResult!.minDamage - smogonRange[0])).toBeLessThanOrEqual(3);
    expect(Math.abs(ourResult!.maxDamage - smogonRange[1])).toBeLessThanOrEqual(3);
  });

  // ─── 케이스 3: 생명의구슬 테스트 ───
  it("생명의구슬 보정 비교", () => {
    const smogonAtk = new SmogonPokemon(gen, "Gengar", {
      nature: "Timid", evs: { spa: 252, spe: 252, hp: 4 }, level: 50,
      item: "Life Orb",
    });
    const smogonDef = new SmogonPokemon(gen, "Garchomp", {
      nature: "Jolly", evs: { hp: 4, atk: 252, spe: 252 }, level: 50,
    });
    const smogonMove = new SmogonMove(gen, "Shadow Ball");
    const smogonResult = calculate(gen, smogonAtk, smogonDef, smogonMove);
    const smogonRange = smogonResult.range();

    const atk = ourPokemon({
      name: "gengar",
      baseStats: { hp: 60, atk: 65, def: 60, spa: 130, spd: 75, spe: 110 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      nature: { name: "Timid", plus: "spe", minus: "atk" },
      types: ["ghost", "poison"],
      item: "life-orb",
    });
    const def = ourPokemon({
      name: "garchomp",
      baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      nature: { name: "Jolly", plus: "spe", minus: "spa" },
      types: ["dragon", "ground"],
    });
    const mv = ourMove({ name: "shadow-ball", type: "ghost", category: "special", power: 80 });
    const ourResult = calculateDamage(atk, def, mv, DEFAULT_FIELD);

    console.log(`[케이스3] 팬텀(생구) 섀도볼 → 한카리아스`);
    console.log(`  Smogon: ${smogonRange[0]}~${smogonRange[1]}`);
    console.log(`  우리:   ${ourResult!.minDamage}~${ourResult!.maxDamage}`);

    expect(Math.abs(ourResult!.minDamage - smogonRange[0])).toBeLessThanOrEqual(3);
    expect(Math.abs(ourResult!.maxDamage - smogonRange[1])).toBeLessThanOrEqual(3);
  });

  // ─── 케이스 4: 쾌청 + 자속 불꽃 기술 ───
  it("쾌청 리자몽 화염방사 비교", () => {
    const smogonAtk = new SmogonPokemon(gen, "Charizard", {
      nature: "Timid", evs: { spa: 252, spe: 252, hp: 4 }, level: 50,
    });
    const smogonDef = new SmogonPokemon(gen, "Garchomp", {
      nature: "Jolly", evs: { hp: 4, atk: 252, spe: 252 }, level: 50,
    });
    const smogonMove = new SmogonMove(gen, "Flamethrower");
    const smogonField = new SmogonField({ weather: "Sun" });
    const smogonResult = calculate(gen, smogonAtk, smogonDef, smogonMove, smogonField);
    const smogonRange = smogonResult.range();

    const atk = ourPokemon({
      name: "charizard",
      baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      nature: { name: "Timid", plus: "spe", minus: "atk" },
      types: ["fire", "flying"],
    });
    const def = ourPokemon({
      name: "garchomp",
      baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      nature: { name: "Jolly", plus: "spe", minus: "spa" },
      types: ["dragon", "ground"],
    });
    const mv = ourMove({ name: "flamethrower", type: "fire", category: "special", power: 90 });
    const sunField: Field = { ...DEFAULT_FIELD, weather: "sun" };
    const ourResult = calculateDamage(atk, def, mv, sunField);

    console.log(`[케이스4] 리자몽 화염방사(쾌청) → 한카리아스`);
    console.log(`  Smogon: ${smogonRange[0]}~${smogonRange[1]}`);
    console.log(`  우리:   ${ourResult!.minDamage}~${ourResult!.maxDamage}`);

    expect(Math.abs(ourResult!.minDamage - smogonRange[0])).toBeLessThanOrEqual(3);
    expect(Math.abs(ourResult!.maxDamage - smogonRange[1])).toBeLessThanOrEqual(3);
  });

  // ─── 케이스 5: 벽 + 더블배틀 ───
  it("리플렉터 + 더블배틀 보정 비교", () => {
    const smogonAtk = new SmogonPokemon(gen, "Garchomp", {
      nature: "Jolly", evs: { atk: 252, spe: 252, hp: 4 }, level: 50,
    });
    const smogonDef = new SmogonPokemon(gen, "Heatran", {
      nature: "Calm", evs: { hp: 252, spd: 252, def: 4 }, level: 50,
    });
    const smogonMove = new SmogonMove(gen, "Earthquake");
    const smogonField = new SmogonField({
      gameType: "Doubles",
      attackerSide: {},
      defenderSide: { isReflect: true },
    });
    const smogonResult = calculate(gen, smogonAtk, smogonDef, smogonMove, smogonField);
    const smogonRange = smogonResult.range();

    const atk = ourPokemon({
      name: "garchomp",
      baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
      evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
      nature: { name: "Jolly", plus: "spe", minus: "spa" },
      types: ["dragon", "ground"],
    });
    const def = ourPokemon({
      name: "heatran",
      baseStats: { hp: 91, atk: 90, def: 106, spa: 130, spd: 106, spe: 77 },
      evs: { hp: 252, atk: 0, def: 4, spa: 0, spd: 252, spe: 0 },
      nature: { name: "Calm", plus: "spd", minus: "atk" },
      types: ["fire", "steel"],
    });
    const mv = ourMove({
      name: "earthquake", type: "ground", category: "physical", power: 100, isSpread: true,
    });
    const field: Field = { ...DEFAULT_FIELD, isDouble: true, screens: ["reflect"] };
    const ourResult = calculateDamage(atk, def, mv, field);

    console.log(`[케이스5] 가브리아스 지진(더블+리플렉터) → 히드런`);
    console.log(`  Smogon: ${smogonRange[0]}~${smogonRange[1]}`);
    console.log(`  우리:   ${ourResult!.minDamage}~${ourResult!.maxDamage}`);

    expect(Math.abs(ourResult!.minDamage - smogonRange[0])).toBeLessThanOrEqual(5);
    expect(Math.abs(ourResult!.maxDamage - smogonRange[1])).toBeLessThanOrEqual(5);
  });
});
