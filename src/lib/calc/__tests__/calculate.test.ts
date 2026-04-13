import { describe, it, expect } from "vitest";
import { calculateDamage, compareSpeed, calcBulk } from "../calculate";
import { calcHP } from "../stats";
import type { Pokemon, Move, Field } from "../types";
import { DEFAULT_IVS, DEFAULT_EVS, DEFAULT_BOOSTS, DEFAULT_FIELD, NEUTRAL_NATURE } from "../types";

// ─── 헬퍼 ��───────────────────────────────────────────────

function makePokemon(overrides: Partial<Pokemon>): Pokemon {
  const base: Pokemon = {
    name: "TestMon",
    baseStats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
    ivs: { ...DEFAULT_IVS },
    evs: { ...DEFAULT_EVS },
    level: 50,
    nature: { ...NEUTRAL_NATURE },
    types: ["normal", null],
    ability: "",
    item: "",
    status: "none",
    boosts: { ...DEFAULT_BOOSTS },
    currentHP: 999,
    maxHP: 999,
    weight: 50,
    teraType: null,
    teraActive: false,
    gimmick: "none",
    isGrounded: true,
  };
  const mon = { ...base, ...overrides };
  // maxHP/currentHP 자동 설정
  if (!overrides.maxHP) {
    mon.maxHP = calcHP(mon.baseStats.hp, mon.ivs.hp, mon.evs.hp, mon.level);
    mon.currentHP = mon.maxHP;
  }
  return mon;
}

function makeMove(overrides: Partial<Move>): Move {
  return {
    id: 1,
    name: "test-move",
    type: "normal",
    category: "physical",
    power: 80,
    accuracy: 100,
    priority: 0,
    makesContact: false,
    isSound: false,
    isPunch: false,
    isBite: false,
    isPulse: false,
    isSlash: false,
    isRecoil: false,
    isSpread: false,
    multiHitMin: null,
    multiHitMax: null,
    ...overrides,
  };
}

// ─── 테스트 케이스 ────────────────────────────────────────

describe("calculateDamage - 기본", () => {
  it("변화기는 null 반환", () => {
    const atk = makePokemon({});
    const def = makePokemon({});
    const move = makeMove({ category: "status", power: null });
    expect(calculateDamage(atk, def, move, DEFAULT_FIELD)).toBeNull();
  });

  it("기본 데미지 계산이 0보다 큰 값 반환", () => {
    const atk = makePokemon({
      baseStats: { hp: 60, atk: 65, def: 80, spa: 170, spd: 95, spe: 130 },
    });
    const def = makePokemon({
      baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
      types: ["dragon", "ground"],
    });
    const shadowBall = makeMove({
      name: "shadow-ball",
      type: "ghost",
      category: "special",
      power: 80,
    });
    const result = calculateDamage(atk, def, shadowBall, DEFAULT_FIELD);
    expect(result).not.toBeNull();
    expect(result!.minDamage).toBeGreaterThan(0);
    expect(result!.maxDamage).toBeGreaterThanOrEqual(result!.minDamage);
    expect(result!.rolls.length).toBe(16);
  });
});

describe("calculateDamage - 메가팬텀 섀도볼 → 한카리아스", () => {
  it("데미지 범위와 상성 확인", () => {
    // 메가팬텀: 겁쟁이 H4 C252 S252
    const megaGengar = makePokemon({
      name: "Gengar-Mega",
      baseStats: { hp: 60, atk: 65, def: 80, spa: 170, spd: 95, spe: 130 },
      ivs: { ...DEFAULT_IVS },
      evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
      level: 50,
      nature: { name: "Timid", plus: "spe", minus: "atk" },
      types: ["ghost", "poison"],
      ability: "",
    });

    // 한카리아스: 양껍 H4 D252 S252
    const garchomp = makePokemon({
      name: "Garchomp",
      baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
      ivs: { ...DEFAULT_IVS },
      evs: { hp: 4, atk: 0, def: 0, spa: 0, spd: 252, spe: 252 },
      level: 50,
      nature: { name: "Jolly", plus: "spe", minus: "spa" },
      types: ["dragon", "ground"],
    });

    const shadowBall = makeMove({
      name: "shadow-ball",
      type: "ghost",
      category: "special",
      power: 80,
    });

    const result = calculateDamage(megaGengar, garchomp, shadowBall, DEFAULT_FIELD);
    expect(result).not.toBeNull();
    // 고스트 → 드래곤/땅: 1배
    expect(result!.effectiveness).toBe(1);
    // 자속 (고스트 타입이 고스트 기술)
    expect(result!.stab).toBe(1.5);
    // 데미지가 합리적 범위인지
    expect(result!.minPercent).toBeGreaterThan(20);
    expect(result!.maxPercent).toBeLessThan(80);
  });
});

describe("calculateDamage - 타입 면역", () => {
  it("부유 특성 → 땅 기술 면역", () => {
    const atk = makePokemon({
      baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
      types: ["dragon", "ground"],
    });
    const def = makePokemon({
      ability: "levitate",
      types: ["ghost", "poison"],
    });
    const earthquake = makeMove({
      name: "earthquake",
      type: "ground",
      category: "physical",
      power: 100,
    });
    const result = calculateDamage(atk, def, earthquake, DEFAULT_FIELD);
    expect(result).not.toBeNull();
    expect(result!.minDamage).toBe(0);
    expect(result!.koChance.text).toContain("면역");
  });
});

describe("calculateDamage - 자속보정", () => {
  it("STAB 1.5배 적용 확인", () => {
    const atk = makePokemon({
      types: ["fire", null],
      baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
      evs: { ...DEFAULT_EVS, spa: 252 },
    });
    const def = makePokemon({});
    const flamethrower = makeMove({ name: "flamethrower", type: "fire", category: "special", power: 90 });
    const thunderbolt = makeMove({ name: "thunderbolt", type: "electric", category: "special", power: 90 });

    const fireResult = calculateDamage(atk, def, flamethrower, DEFAULT_FIELD);
    const elecResult = calculateDamage(atk, def, thunderbolt, DEFAULT_FIELD);

    expect(fireResult!.stab).toBe(1.5);
    expect(elecResult!.stab).toBe(1.0);
    // STAB 있는 기술이 더 강해야 함
    expect(fireResult!.maxDamage).toBeGreaterThan(elecResult!.maxDamage);
  });
});

describe("calculateDamage - 테라스탈 3종 일치", () => {
  it("기본타입 = 테라타입 = 기술타입 → 2.25배", () => {
    const atk = makePokemon({
      types: ["fire", null],
      teraType: "fire",
      teraActive: true,
      baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
      evs: { ...DEFAULT_EVS, spa: 252 },
    });
    const def = makePokemon({});
    const flamethrower = makeMove({ name: "flamethrower", type: "fire", category: "special", power: 90 });

    const result = calculateDamage(atk, def, flamethrower, DEFAULT_FIELD);
    expect(result!.stab).toBe(2.25);
  });
});

describe("calculateDamage - 고정 데미지", () => {
  it("나이트헤드 = 레벨 데미지", () => {
    const atk = makePokemon({ level: 50 });
    const def = makePokemon({});
    const nightShade = makeMove({ name: "night-shade", type: "ghost", category: "special", power: null });

    const result = calculateDamage(atk, def, nightShade, DEFAULT_FIELD);
    expect(result).not.toBeNull();
    expect(result!.minDamage).toBe(50);
    expect(result!.maxDamage).toBe(50);
  });
});

describe("calculateDamage - 가변위력: 자이로볼", () => {
  it("느린 포켓몬이 빠른 상대에게 높은 위력", () => {
    const slowAtk = makePokemon({
      baseStats: { hp: 100, atk: 120, def: 100, spa: 50, spd: 100, spe: 30 },
      types: ["steel", null],
    });
    const fastDef = makePokemon({
      baseStats: { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 150 },
    });
    const gyroBall = makeMove({ name: "gyro-ball", type: "steel", category: "physical", power: null });

    const result = calculateDamage(slowAtk, fastDef, gyroBall, DEFAULT_FIELD);
    expect(result).not.toBeNull();
    // spe30 → 실능50, spe150 → 실능170
    // 자이로볼: 25 × 170/50 = 85 (최대 150)
    expect(result!.power).toBe(85);
  });
});

describe("compareSpeed", () => {
  it("스카프 보정 적용", () => {
    const atk = makePokemon({
      baseStats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 80 },
      item: "choice-scarf",
    });
    const def = makePokemon({
      baseStats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
    });
    const result = compareSpeed(atk, def, DEFAULT_FIELD);
    // 80 * 1.5 = 120 > 100
    expect(result.first).toBe("attacker");
  });
});

describe("calcBulk", () => {
  it("내구력 계산", () => {
    const mon = makePokemon({
      baseStats: { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
      ivs: { ...DEFAULT_IVS },
      evs: { ...DEFAULT_EVS, hp: 252, def: 252 },
      level: 50,
    });
    const bulk = calcBulk(mon);
    expect(bulk.physical).toBeGreaterThan(0);
    expect(bulk.special).toBeGreaterThan(0);
    // HP 252 + 방어 252 = 물리내구 > 특수내구
    expect(bulk.physical).toBeGreaterThan(bulk.special);
  });
});
