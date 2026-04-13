import { describe, it, expect } from "vitest";
import { calcHP, calcStat, getNatureMod, calcAllStats, getRankMultiplier } from "../stats";
import type { Nature, BaseStats, IVs, EVs } from "../types";

describe("calcHP", () => {
  it("일반 포켓몬 HP 계산", () => {
    // 메가팬텀 (팬텀) HP종족값 60, 6V, H188 노력치, Lv50
    // (2*60 + 31 + 47) * 50/100 + 50 + 10 = 99 + 60 = 159
    // Math.floor((2*60+31+Math.floor(188/4))*50/100) + 50 + 10
    // = Math.floor((120+31+47)*50/100) + 60
    // = Math.floor(198*50/100) + 60
    // = Math.floor(99) + 60 = 159
    expect(calcHP(60, 31, 188, 50)).toBe(159);
  });

  it("마릴리 HP 계산 (H236)", () => {
    // 마릴리 HP종족값 100, 6V, H236, Lv50
    // Math.floor((200+31+59)*50/100) + 60
    // = Math.floor(290*0.5) + 60
    // = 145 + 60 = 205
    expect(calcHP(100, 31, 236, 50)).toBe(205);
  });

  it("누석스(종족값 1)는 항상 HP=1", () => {
    expect(calcHP(1, 31, 252, 50)).toBe(1);
  });

  it("노력치 0, 개체값 0", () => {
    // HP종족값 100, IV0, EV0, Lv50
    // Math.floor((200+0+0)*50/100) + 60 = 100 + 60 = 160
    expect(calcHP(100, 0, 0, 50)).toBe(160);
  });
});

describe("getNatureMod", () => {
  it("상승 성격", () => {
    const timid: Nature = { name: "Timid", plus: "spe", minus: "atk" };
    expect(getNatureMod(timid, "spe")).toBe(1.1);
    expect(getNatureMod(timid, "atk")).toBe(0.9);
    expect(getNatureMod(timid, "def")).toBe(1.0);
    expect(getNatureMod(timid, "hp")).toBe(1.0);
  });

  it("무보정 성격", () => {
    const hardy: Nature = { name: "Hardy", plus: null, minus: null };
    expect(getNatureMod(hardy, "atk")).toBe(1.0);
    expect(getNatureMod(hardy, "spe")).toBe(1.0);
  });
});

describe("calcStat", () => {
  it("메가팬텀 겁쟁이 S252 스피드", () => {
    // 메가팬텀 스피드 종족값 130, 6V, S252, 겁쟁이(스피드↑)
    // raw = Math.floor((260+31+63)*50/100) + 5 = Math.floor(177) + 5 = 182
    // 182 * 1.1 = 200.2 → Math.floor = 200
    expect(calcStat(130, 31, 252, 50, 1.1)).toBe(200);
  });

  it("메가팬텀 겁쟁이 D68 특방", () => {
    // 특방 종족값 95, 6V, D68, 무보정
    // raw = Math.floor((190+31+17)*50/100) + 5 = Math.floor(119) + 5 = 124
    // 124 * 1.0 = 124
    expect(calcStat(95, 31, 68, 50, 1.0)).toBe(124);
  });

  it("메가팬텀 겁쟁이 공격 (하락)", () => {
    // 공격 종족값 65, 6V, EV0, 겁쟁이(공격↓)
    // raw = Math.floor((130+31+0)*50/100) + 5 = Math.floor(80.5) + 5 = 80 + 5 = 85
    // 85 * 0.9 = 76.5 → 76
    expect(calcStat(65, 31, 0, 50, 0.9)).toBe(76);
  });

  it("마릴리 고집 A252 공격", () => {
    // 마릴리 공격 종족값 50, 6V, A252, 고집(공격↑)
    // raw = Math.floor((100+31+63)*50/100) + 5 = Math.floor(97) + 5 = 102
    // 102 * 1.1 = 112.2 → 112
    expect(calcStat(50, 31, 252, 50, 1.1)).toBe(112);
  });
});

describe("calcAllStats", () => {
  it("메가팬텀 겁쟁이 6V H188 D68 S252", () => {
    const base: BaseStats = { hp: 60, atk: 65, def: 80, spa: 170, spd: 95, spe: 130 };
    // 메가팬텀(겜팬텀)의 메가 종족값
    const ivs: IVs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const evs: EVs = { hp: 188, atk: 0, def: 0, spa: 0, spd: 68, spe: 252 };
    const timid: Nature = { name: "Timid", plus: "spe", minus: "atk" };

    const stats = calcAllStats(base, ivs, evs, 50, timid);

    expect(stats.hp).toBe(159);
    expect(stats.spe).toBe(200);
    expect(stats.spd).toBe(124);
  });

  it("마릴리 고집 6V H236 A252 D20", () => {
    const base: BaseStats = { hp: 100, atk: 50, def: 80, spa: 60, spd: 80, spe: 50 };
    const ivs: IVs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const evs: EVs = { hp: 236, atk: 252, def: 20, spa: 0, spd: 0, spe: 0 };
    const adamant: Nature = { name: "Adamant", plus: "atk", minus: "spa" };

    const stats = calcAllStats(base, ivs, evs, 50, adamant);

    expect(stats.hp).toBe(205);
    expect(stats.atk).toBe(112);
    expect(stats.def).toBe(103);
  });
});

describe("getRankMultiplier", () => {
  it("랭크 배율 정확성", () => {
    expect(getRankMultiplier(0)).toBeCloseTo(1.0);
    expect(getRankMultiplier(1)).toBeCloseTo(1.5);
    expect(getRankMultiplier(2)).toBeCloseTo(2.0);
    expect(getRankMultiplier(6)).toBeCloseTo(4.0);
    expect(getRankMultiplier(-1)).toBeCloseTo(2 / 3);
    expect(getRankMultiplier(-2)).toBeCloseTo(0.5);
    expect(getRankMultiplier(-6)).toBeCloseTo(0.25);
  });
});
