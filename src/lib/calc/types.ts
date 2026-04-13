// ============================================================
// 계산 엔진 공통 타입 정의
// ============================================================

export type StatName = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

export type PokemonType =
  | "normal" | "fighting" | "flying" | "poison" | "ground" | "rock"
  | "bug" | "ghost" | "steel" | "fire" | "water" | "grass"
  | "electric" | "psychic" | "ice" | "dragon" | "dark" | "fairy";

export type TeraType = PokemonType | "stellar";

export type MoveCategory = "physical" | "special" | "status";

export type Weather = "none" | "sun" | "rain" | "sand" | "snow";

export type Terrain = "none" | "electric" | "grassy" | "psychic" | "misty";

export type Status = "none" | "burn" | "paralysis" | "poison" | "toxic" | "sleep" | "freeze";

export type Screen = "reflect" | "light-screen" | "aurora-veil";

export type GimmickType = "none" | "mega" | "z-move" | "dynamax" | "gigantamax" | "terastal";

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface IVs {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface EVs {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface StatBoosts {
  atk: number; // -6 ~ +6
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface Nature {
  name: string;
  plus: StatName | null;
  minus: StatName | null;
}

export interface Pokemon {
  name: string;
  baseStats: BaseStats;
  ivs: IVs;
  evs: EVs;
  level: number;
  nature: Nature;
  types: [PokemonType, PokemonType | null];
  ability: string;
  item: string;
  status: Status;
  boosts: StatBoosts;
  currentHP: number; // 현재 HP (비율이 아닌 실수치)
  maxHP: number;
  weight: number; // kg
  teraType: TeraType | null;
  teraActive: boolean;
  gimmick: GimmickType;
  isGrounded: boolean; // 지면에 있는지
}

export interface Move {
  id: number;
  name: string;
  type: PokemonType;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  priority: number;
  makesContact: boolean;
  isSound: boolean;
  isPunch: boolean;
  isBite: boolean;
  isPulse: boolean;
  isSlash: boolean;
  isRecoil: boolean;
  isSpread: boolean;
  multiHitMin: number | null;
  multiHitMax: number | null;
}

export interface Field {
  weather: Weather;
  terrain: Terrain;
  screens: Screen[];
  isDouble: boolean;
  isHelping: boolean; // 도우미
  isCrit: boolean;
  stealth_rock: boolean;
  spikes: number; // 0~3
}

export interface DamageResult {
  minDamage: number;
  maxDamage: number;
  rolls: number[]; // 16단계
  minPercent: number;
  maxPercent: number;
  koChance: {
    n: number;
    chance: number;
    text: string;
  };
  critDamage: {
    min: number;
    max: number;
    minPercent: number;
    maxPercent: number;
  };
  attackStat: number;
  defenseStat: number;
  effectiveness: number;
  stab: number;
  power: number;
}

export const DEFAULT_IVS: IVs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
export const DEFAULT_EVS: EVs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
export const DEFAULT_BOOSTS: StatBoosts = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
export const NEUTRAL_NATURE: Nature = { name: "Hardy", plus: null, minus: null };

export const DEFAULT_FIELD: Field = {
  weather: "none",
  terrain: "none",
  screens: [],
  isDouble: false,
  isHelping: false,
  isCrit: false,
  stealth_rock: false,
  spikes: 0,
};
