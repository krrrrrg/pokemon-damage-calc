"use client";

// 간단한 상태 관리 (React state 기반)
// 별도 상태 라이브러리 없이 prop drilling + context로 관리

import type {
  Pokemon, Move, Field, Weather, Terrain, Screen, Status,
  BaseStats, IVs, EVs, StatBoosts, Nature, PokemonType, TeraType, GimmickType,
} from "./calc/types";
import { DEFAULT_IVS, DEFAULT_EVS, DEFAULT_BOOSTS, NEUTRAL_NATURE, DEFAULT_FIELD } from "./calc/types";
import { calcHP, calcStat, getNatureMod } from "./calc/stats";

export type GameMode = "standard" | "champions";

export interface PokemonPanelState {
  pokemon: Pokemon;
  moves: (Move | null)[];
  selectedPokemonId: number | null; // DB id
}

export function createDefaultPokemon(): Pokemon {
  return {
    name: "",
    baseStats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    ivs: { ...DEFAULT_IVS },
    evs: { ...DEFAULT_EVS },
    level: 50,
    nature: { ...NEUTRAL_NATURE },
    types: ["normal", null],
    ability: "",
    item: "",
    status: "none",
    boosts: { ...DEFAULT_BOOSTS },
    currentHP: 0,
    maxHP: 0,
    weight: 0,
    teraType: null,
    teraActive: false,
    gimmick: "none",
    isGrounded: true,
  };
}

export function createDefaultPanel(): PokemonPanelState {
  return {
    pokemon: createDefaultPokemon(),
    moves: [null, null, null, null],
    selectedPokemonId: null,
  };
}

export function recalcStats(pokemon: Pokemon): Pokemon {
  const { baseStats, ivs, evs, level, nature } = pokemon;
  const hp = calcHP(baseStats.hp, ivs.hp, evs.hp, level);
  const atk = calcStat(baseStats.atk, ivs.atk, evs.atk, level, getNatureMod(nature, "atk"));
  const def = calcStat(baseStats.def, ivs.def, evs.def, level, getNatureMod(nature, "def"));
  const spa = calcStat(baseStats.spa, ivs.spa, evs.spa, level, getNatureMod(nature, "spa"));
  const spd = calcStat(baseStats.spd, ivs.spd, evs.spd, level, getNatureMod(nature, "spd"));
  const spe = calcStat(baseStats.spe, ivs.spe, evs.spe, level, getNatureMod(nature, "spe"));

  return {
    ...pokemon,
    maxHP: hp,
    currentHP: hp, // 기본값: 풀HP
  };
}

// 포챔스 노력치 변환
export function evToChampions(ev: number): number {
  return Math.floor((ev + 4) / 8);
}

export function championsToEV(cp: number): number {
  return Math.min(252, cp * 8);
}
