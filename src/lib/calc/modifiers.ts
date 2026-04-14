// ============================================================
// 보정값 모듈 — 데이터 드리븐 리팩토링
// ============================================================

import type {
  PokemonType, Weather, Terrain, Screen, Pokemon, Move, Field,
} from "./types";

// ─── 날씨 보정 ────────────────────────────────────────────

const WEATHER_MOVE_MOD: Record<string, Record<string, number>> = {
  sun:  { fire: 1.5, water: 0.5 },
  rain: { water: 1.5, fire: 0.5 },
};

export function getWeatherMod(weather: Weather, moveType: PokemonType): number {
  return WEATHER_MOVE_MOD[weather]?.[moveType] ?? 1.0;
}

// ─── 필드 보정 ────────────────────────────────────────────

const GRASSY_HALVED = new Set(["earthquake", "earth-power", "thousand-arrows"]);

export function getFieldMod(
  terrain: Terrain,
  moveType: PokemonType,
  isGrounded: boolean,
  moveName?: string
): number {
  if (!isGrounded) return 1.0;

  if (terrain === "electric" && moveType === "electric") return 1.3;
  if (terrain === "grassy") {
    if (moveType === "grass") return 1.3;
    if (moveName && GRASSY_HALVED.has(moveName)) return 0.5;
  }
  if (terrain === "psychic" && moveType === "psychic") return 1.3;
  if (terrain === "misty" && moveType === "dragon") return 0.5;

  return 1.0;
}

// ─── 타입 상성 ────────────────────────────────────────────

const TYPE_CHART: Record<string, Record<string, number>> = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fighting: { normal: 2, flying: 0.5, poison: 0.5, rock: 2, bug: 0.5, ghost: 0, steel: 2, psychic: 0.5, ice: 2, dark: 2, fairy: 0.5 },
  flying:   { fighting: 2, rock: 0.5, bug: 2, steel: 0.5, grass: 2, electric: 0.5 },
  poison:   { poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, grass: 2, fairy: 2 },
  ground:   { flying: 0, poison: 2, rock: 2, bug: 0.5, steel: 2, fire: 2, grass: 0.5, electric: 2 },
  rock:     { fighting: 0.5, flying: 2, ground: 0.5, bug: 2, steel: 0.5, fire: 2, ice: 2 },
  bug:      { fighting: 0.5, flying: 0.5, poison: 0.5, ghost: 0.5, steel: 0.5, fire: 0.5, grass: 2, psychic: 2, dark: 2, fairy: 0.5 },
  ghost:    { normal: 0, ghost: 2, steel: 0.5, psychic: 2, dark: 0.5 },
  steel:    { rock: 2, steel: 0.5, fire: 0.5, water: 0.5, electric: 0.5, ice: 2, fairy: 2 },
  fire:     { rock: 0.5, bug: 2, steel: 2, fire: 0.5, water: 0.5, grass: 2, ice: 2, dragon: 0.5 },
  water:    { ground: 2, rock: 2, fire: 2, water: 0.5, grass: 0.5, dragon: 0.5 },
  grass:    { flying: 0.5, poison: 0.5, ground: 2, rock: 2, bug: 0.5, steel: 0.5, fire: 0.5, water: 2, grass: 0.5, dragon: 0.5 },
  electric: { flying: 2, ground: 0, water: 2, grass: 0.5, electric: 0.5, dragon: 0.5 },
  psychic:  { fighting: 2, poison: 2, steel: 0.5, psychic: 0.5, dark: 0 },
  ice:      { flying: 2, ground: 2, rock: 0.5, steel: 0.5, fire: 0.5, water: 0.5, grass: 2, ice: 0.5, dragon: 2 },
  dragon:   { steel: 0.5, dragon: 2, fairy: 0 },
  dark:     { fighting: 0.5, ghost: 2, psychic: 2, dark: 0.5, fairy: 0.5 },
  fairy:    { fighting: 2, poison: 0.5, steel: 0.5, fire: 0.5, dragon: 2, dark: 2 },
};

function singleTypeEffectiveness(atkType: PokemonType, defType: PokemonType): number {
  return TYPE_CHART[atkType]?.[defType] ?? 1.0;
}

export function getTypeEffectiveness(
  atkType: PokemonType,
  defType1: PokemonType,
  defType2: PokemonType | null,
  matchupTable?: Map<string, number>
): number {
  let mult: number;

  if (matchupTable) {
    mult = matchupTable.get(`${atkType}_${defType1}`) ?? 1.0;
    if (defType2) {
      mult *= matchupTable.get(`${atkType}_${defType2}`) ?? 1.0;
    }
  } else {
    mult = singleTypeEffectiveness(atkType, defType1);
    if (defType2) {
      mult *= singleTypeEffectiveness(atkType, defType2);
    }
  }

  return mult;
}

// ─── 자속보정 (STAB) ──────────────────────────────────────

export function getSTAB(
  moveType: PokemonType,
  pokemonTypes: [PokemonType, PokemonType | null],
  teraType: PokemonType | "stellar" | null,
  teraActive: boolean,
  abilityName: string
): number {
  const isOriginalSTAB =
    moveType === pokemonTypes[0] || moveType === pokemonTypes[1];

  // 변환자재/리베로: 모든 기술에 자속
  if (abilityName === "protean" || abilityName === "libero") {
    if (!teraActive || !teraType) {
      return abilityName === "protean" || abilityName === "libero" ? 1.5 : 1.0;
    }
  }

  if (!teraActive || !teraType) {
    if (!isOriginalSTAB) return 1.0;
    return abilityName === "adaptability" ? 2.0 : 1.5;
  }

  // 스텔라 테라스탈
  if (teraType === "stellar") {
    if (isOriginalSTAB) return 2.0;
    return 1.2;
  }

  const isTeraSTAB = moveType === teraType;

  // 3종 일치
  if (isOriginalSTAB && isTeraSTAB) {
    return abilityName === "adaptability" ? 2.75 : 2.25;
  }

  if (isTeraSTAB) return 1.5;
  if (isOriginalSTAB) return 1.5;

  return 1.0;
}

// ─── 급소 보정 ────────────────────────────────────────────

export function getCritMod(isCrit: boolean, abilityName: string): number {
  if (!isCrit) return 1.0;
  if (abilityName === "sniper") return 2.25;
  return 1.5;
}

// ─── 벽 보정 ──────────────────────────────────────────────

export function getScreenMod(
  screens: Screen[],
  moveCategory: "physical" | "special",
  isDouble: boolean,
  isCrit: boolean
): number {
  if (isCrit) return 1.0;

  const hasReflect = screens.includes("reflect");
  const hasLightScreen = screens.includes("light-screen");
  const hasAurora = screens.includes("aurora-veil");

  let screened = false;
  if (moveCategory === "physical" && (hasReflect || hasAurora)) screened = true;
  if (moveCategory === "special" && (hasLightScreen || hasAurora)) screened = true;

  if (!screened) return 1.0;
  return isDouble ? 2 / 3 : 0.5;
}

// ─── 더블배틀 광역기 보정 ─────────────────────────────────

export function getDoubleMod(isSpread: boolean, isDouble: boolean): number {
  if (isDouble && isSpread) return 0.75;
  return 1.0;
}

// ─── 상태이상 보정 ────────────────────────────────────────

export function getStatusMod(
  status: string,
  category: "physical" | "special",
  abilityName: string,
  isCrit: boolean
): number {
  if (status === "burn" && category === "physical") {
    if (abilityName === "guts") return 1.0;
    if (isCrit) return 1.0;
    return 0.5;
  }
  return 1.0;
}

// ─── 도구 보정 (데이터 드리븐) ────────────────────────────

// 타입강화 도구 테이블: item → boosted type
const TYPE_BOOST_ITEMS: Record<string, PokemonType> = {
  "charcoal": "fire", "flame-plate": "fire",
  "mystic-water": "water", "splash-plate": "water",
  "miracle-seed": "grass", "meadow-plate": "grass",
  "magnet": "electric", "zap-plate": "electric",
  "never-melt-ice": "ice", "icicle-plate": "ice",
  "black-belt": "fighting", "fist-plate": "fighting",
  "poison-barb": "poison", "toxic-plate": "poison",
  "soft-sand": "ground", "earth-plate": "ground",
  "sharp-beak": "flying", "sky-plate": "flying",
  "twisted-spoon": "psychic", "mind-plate": "psychic",
  "silver-powder": "bug", "insect-plate": "bug",
  "hard-stone": "rock", "stone-plate": "rock",
  "spell-tag": "ghost", "spooky-plate": "ghost",
  "dragon-fang": "dragon", "draco-plate": "dragon",
  "black-glasses": "dark", "dread-plate": "dark",
  "metal-coat": "steel", "iron-plate": "steel",
  "silk-scarf": "normal",
  "fairy-feather": "fairy", "pixie-plate": "fairy",
};

export function getItemMod(
  item: string,
  moveType: PokemonType,
  moveCategory: "physical" | "special",
  effectiveness: number,
): number {
  // 범용 도구
  if (item === "life-orb") return 1.3;
  if (item === "expert-belt") return effectiveness > 1 ? 1.2 : 1.0;
  if (item === "muscle-band") return moveCategory === "physical" ? 1.1 : 1.0;
  if (item === "wise-glasses") return moveCategory === "special" ? 1.1 : 1.0;

  // 타입강화 도구 (테이블 룩업)
  const boostedType = TYPE_BOOST_ITEMS[item];
  if (boostedType) return moveType === boostedType ? 1.2 : 1.0;

  // 타입 쥬얼
  if (item === "normal-gem") return moveType === "normal" ? 1.3 : 1.0;

  return 1.0;
}

// ─── 도구 스탯 보정 (데이터 드리븐) ──────────────────────

interface ItemStatEntry {
  stat: "atk" | "spa" | "def" | "spd" | "spe";
  value: number;
  pokemon?: string[]; // 특정 포켓몬 전용
}

const ITEM_STAT_TABLE: Record<string, ItemStatEntry> = {
  "choice-band":    { stat: "atk", value: 1.5 },
  "choice-specs":   { stat: "spa", value: 1.5 },
  "choice-scarf":   { stat: "spe", value: 1.5 },
  "assault-vest":   { stat: "spd", value: 1.5 },
  // 진화의휘석: 방어, 특방 모두 → 아래에서 별도 처리
  // 전용 도구
  "thick-club":     { stat: "atk", value: 2.0, pokemon: ["cubone", "marowak", "marowak-alola"] },
  "light-ball":     { stat: "atk", value: 2.0, pokemon: ["pikachu"] },
  "deep-sea-tooth": { stat: "spa", value: 2.0, pokemon: ["clamperl"] },
  "deep-sea-scale": { stat: "spd", value: 2.0, pokemon: ["clamperl"] },
  "metal-powder":   { stat: "def", value: 2.0, pokemon: ["ditto"] },
  "quick-powder":   { stat: "spe", value: 2.0, pokemon: ["ditto"] },
};

export function getItemStatMod(
  item: string,
  stat: "atk" | "spa" | "def" | "spd" | "spe",
  pokemonName?: string
): number {
  // 진화의휘석: 방어/특방 모두 1.5배
  if (item === "eviolite" && (stat === "def" || stat === "spd")) return 1.5;

  const entry = ITEM_STAT_TABLE[item];
  if (!entry) return 1.0;
  if (entry.stat !== stat) return 1.0;
  if (entry.pokemon && pokemonName && !entry.pokemon.includes(pokemonName)) return 1.0;
  if (entry.pokemon && !pokemonName) return 1.0;
  return entry.value;
}

// ─── 공격측 특성 보정 (데이터 드리븐) ────────────────────

interface AttackerAbilityCtx {
  moveType: PokemonType;
  moveCategory: "physical" | "special";
  movePower: number;
  move: Move;
  effectiveness: number;
  weather: Weather;
  status: string;
  isAllyDown?: boolean;
}

type AbilityModEntry = {
  value: number;
  condition: (ctx: AttackerAbilityCtx) => boolean;
};

const ATTACKER_ABILITY_TABLE: Record<string, AbilityModEntry> = {
  // 기술 플래그 기반
  "iron-fist":     { value: 1.2, condition: (c) => c.move.isPunch },
  "reckless":      { value: 1.3, condition: (c) => c.move.isRecoil },
  "strong-jaw":    { value: 1.5, condition: (c) => c.move.isBite },
  "mega-launcher": { value: 1.5, condition: (c) => c.move.isPulse },
  "sharpness":     { value: 1.5, condition: (c) => c.move.isSlash },
  "punk-rock":     { value: 1.3, condition: (c) => c.move.isSound },

  // 위력/효과 기반
  "technician":    { value: 1.5, condition: (c) => c.movePower <= 60 },
  "tinted-lens":   { value: 2.0, condition: (c) => c.effectiveness < 1 },
  "analytic":      { value: 1.3, condition: () => true }, // UI에서 "후공 시" 토글 필요, 기본 적용

  // 타입 부스트
  "transistor":    { value: 1.3, condition: (c) => c.moveType === "electric" },
  "steelworker":   { value: 1.5, condition: (c) => c.moveType === "steel" },
  "dragons-maw":   { value: 1.5, condition: (c) => c.moveType === "dragon" },
  "rocky-payload": { value: 1.5, condition: (c) => c.moveType === "rock" },

  // 오라
  "fairy-aura":    { value: 1.33, condition: (c) => c.moveType === "fairy" },
  "dark-aura":     { value: 1.33, condition: (c) => c.moveType === "dark" },

  // 날씨
  "sand-force":    { value: 1.3, condition: (c) => c.weather === "sand" && ["rock", "ground", "steel"].includes(c.moveType) },

  // 상태이상 관련
  "guts":          { value: 1.5, condition: (c) => c.status !== "none" },
  "toxic-boost":   { value: 1.5, condition: (c) => c.status === "poison" || c.status === "toxic" },
  "flare-boost":   { value: 1.5, condition: (c) => c.status === "burn" },

  // 물의 거품 (공격측: 물 1.5배)
  "water-bubble":  { value: 2.0, condition: (c) => c.moveType === "water" },

  // 독주
  "supreme-overlord": { value: 1.2, condition: (c) => !!c.isAllyDown },
};

export function getAttackerAbilityMod(
  ability: string,
  moveType: PokemonType,
  moveCategory: "physical" | "special",
  movePower: number,
  move: Move,
  effectiveness: number,
  weather: Weather,
  status: string,
  isAllyDown?: boolean
): number {
  const entry = ATTACKER_ABILITY_TABLE[ability];
  if (!entry) return 1.0;

  const ctx: AttackerAbilityCtx = {
    moveType, moveCategory, movePower, move, effectiveness, weather, status, isAllyDown,
  };
  return entry.condition(ctx) ? entry.value : 1.0;
}

// ─── 방어측 특성 보정 (데이터 드리븐) ────────────────────

interface DefenderAbilityCtx {
  moveType: PokemonType;
  moveCategory: "physical" | "special";
  effectiveness: number;
  move: Move;
  hpRatio: number; // currentHP / maxHP
}

type DefAbilityModEntry = {
  value: number;
  condition: (ctx: DefenderAbilityCtx) => boolean;
};

const DEFENDER_ABILITY_TABLE: Record<string, DefAbilityModEntry> = {
  // 반감 계열
  "solid-rock":    { value: 0.75, condition: (c) => c.effectiveness > 1 },
  "filter":        { value: 0.75, condition: (c) => c.effectiveness > 1 },
  "prism-armor":   { value: 0.75, condition: (c) => c.effectiveness > 1 },
  "thick-fat":     { value: 0.5, condition: (c) => c.moveType === "fire" || c.moveType === "ice" },
  "heatproof":     { value: 0.5, condition: (c) => c.moveType === "fire" },
  "water-bubble":  { value: 0.5, condition: (c) => c.moveType === "fire" },
  "dry-skin":      { value: 1.25, condition: (c) => c.moveType === "fire" },

  // HP 기반
  "multiscale":    { value: 0.5, condition: (c) => c.hpRatio >= 1.0 },
  "shadow-shield": { value: 0.5, condition: (c) => c.hpRatio >= 1.0 },

  // 카테고리 기반
  "fur-coat":      { value: 0.5, condition: (c) => c.moveCategory === "physical" },
  "ice-scales":    { value: 0.5, condition: (c) => c.moveCategory === "special" },
  "punk-rock":     { value: 0.5, condition: (c) => c.move.isSound },
  "fluffy":        { value: 0.5, condition: (c) => c.move.makesContact },

  // 접촉 기반
  // fluffy: 접촉기 반감이지만 불꽃에는 2배
  // → 별도 처리 필요하므로 아래 함수에서 오버라이드

  // 파트너
  "friend-guard":  { value: 0.75, condition: () => true },
};

export function getDefenderAbilityMod(
  ability: string,
  moveType: PokemonType,
  moveCategory: "physical" | "special",
  effectiveness: number,
  move: Move,
  defenderCurrentHP: number,
  defenderMaxHP: number
): number {
  const hpRatio = defenderMaxHP > 0 ? defenderCurrentHP / defenderMaxHP : 1.0;

  // fluffy 특수 처리: 접촉기 반감 + 불꽃 2배
  if (ability === "fluffy") {
    let mod = 1.0;
    if (move.makesContact) mod *= 0.5;
    if (moveType === "fire") mod *= 2.0;
    return mod;
  }

  const entry = DEFENDER_ABILITY_TABLE[ability];
  if (!entry) return 1.0;

  const ctx: DefenderAbilityCtx = { moveType, moveCategory, effectiveness, move, hpRatio };
  return entry.condition(ctx) ? entry.value : 1.0;
}

// ─── 면역 체크 (데이터 드리븐) ───────────────────────────

interface ImmunityEntry {
  type: PokemonType;
  boost?: string;
}

const IMMUNITY_TABLE: Record<string, ImmunityEntry> = {
  "levitate":      { type: "ground" },
  "volt-absorb":   { type: "electric", boost: "heal" },
  "lightning-rod": { type: "electric", boost: "spa" },
  "water-absorb":  { type: "water", boost: "heal" },
  "storm-drain":   { type: "water", boost: "spa" },
  "flash-fire":    { type: "fire", boost: "fire" },
  "dry-skin":      { type: "water", boost: "heal" },
  "sap-sipper":    { type: "grass", boost: "atk" },
  "motor-drive":   { type: "electric", boost: "spe" },
  "earth-eater":   { type: "ground", boost: "heal" },
  "well-baked-body": { type: "fire", boost: "def" },
  "wind-rider":    { type: "flying" }, // 바람기술만이지만 간소화
};

export function checkImmunity(
  defenderAbility: string,
  moveType: PokemonType
): { immune: boolean; boost?: string } {
  const entry = IMMUNITY_TABLE[defenderAbility];
  if (entry && entry.type === moveType) {
    return { immune: true, boost: entry.boost };
  }
  return { immune: false };
}

// ─── 틀깨기 특성 체크 ────────────────────────────────────

const MOLD_BREAKER_ABILITIES = new Set([
  "mold-breaker", "teravolt", "turboblaze", "mycelium-might",
]);

export function isMoldBreaker(ability: string): boolean {
  return MOLD_BREAKER_ABILITIES.has(ability);
}

// ─── 둔감 체크 ────────────────────────────────────────────

export function isUnaware(ability: string): boolean {
  return ability === "unaware";
}

// ─── 스킨계 특성 (데이터 드리븐) ─────────────────────────

const SKIN_TABLE: Record<string, { newType: PokemonType; powerMod: number }> = {
  "refrigerate": { newType: "ice", powerMod: 1.2 },
  "aerilate":    { newType: "flying", powerMod: 1.2 },
  "pixilate":    { newType: "fairy", powerMod: 1.2 },
  "galvanize":   { newType: "electric", powerMod: 1.2 },
  "normalize":   { newType: "normal", powerMod: 1.2 },
};

export function getSkinAbility(
  abilityName: string,
  moveType: PokemonType
): { newType: PokemonType; powerMod: number } | null {
  if (abilityName === "normalize") {
    // 노말스킨은 모든 타입을 노말로
    return SKIN_TABLE["normalize"];
  }
  if (moveType !== "normal") return null;
  return SKIN_TABLE[abilityName] ?? null;
}

// ─── 핀치 특성 (데이터 드리븐) ───────────────────────────

const PINCH_TABLE: Record<string, PokemonType> = {
  "blaze":   "fire",
  "torrent": "water",
  "overgrow": "grass",
  "swarm":   "bug",
};

export function getPinchAbilityMod(
  ability: string,
  currentHP: number,
  maxHP: number,
  moveType: PokemonType
): number {
  if (currentHP > Math.floor(maxHP / 3)) return 1.0;

  const boostedType = PINCH_TABLE[ability];
  if (boostedType && moveType === boostedType) return 1.5;
  return 1.0;
}

// ─── 날씨 스탯 보정 (모래바람 특방, 설경 방어) ────────────

export function getWeatherStatMod(
  weather: Weather,
  defenderTypes: [PokemonType, PokemonType | null],
  stat: "def" | "spd"
): number {
  if (weather === "sand" && stat === "spd") {
    if (defenderTypes[0] === "rock" || defenderTypes[1] === "rock") return 1.5;
  }
  if (weather === "snow" && stat === "def") {
    if (defenderTypes[0] === "ice" || defenderTypes[1] === "ice") return 1.5;
  }
  return 1.0;
}

// ─── 도우미/파워스폿/배터리 (더블) ────────────────────────

export function getDoubleSupportMod(
  isHelping: boolean,
  partnerAbility?: string,
  moveCategory?: "physical" | "special"
): number {
  let mod = 1.0;
  if (isHelping) mod *= 1.5;
  if (partnerAbility === "power-spot") mod *= 1.3;
  if (partnerAbility === "battery" && moveCategory === "special") mod *= 1.3;
  return mod;
}

// ─── 재앙 특성 (상대 스탯 0.75배) ─────────────────────────

const RUIN_TABLE: Record<string, "atk" | "def" | "spa" | "spd"> = {
  "tablets-of-ruin": "atk",
  "sword-of-ruin":  "def",
  "vessel-of-ruin": "spa",
  "beads-of-ruin":  "spd",
};

export function getRuinMod(
  opponentAbility: string,
  stat: "atk" | "def" | "spa" | "spd"
): number {
  const targetStat = RUIN_TABLE[opponentAbility];
  if (targetStat === stat) return 0.75;
  return 1.0;
}

// ─── 플래시파이어 (발동 후 불꽃 1.5배) ────────────────────

export function getFlashFireMod(
  ability: string,
  flashFireActive: boolean,
  moveType: PokemonType
): number {
  if (ability === "flash-fire" && flashFireActive && moveType === "fire") return 1.5;
  return 1.0;
}

// ─── 공격측 스탯 특성 보정 ────────────────────────────────

interface AtkStatAbilityCtx {
  moveCategory: "physical" | "special";
  weather: Weather;
}

const ATK_STAT_ABILITY_TABLE: Record<string, { value: number; condition: (ctx: AtkStatAbilityCtx) => boolean }> = {
  "huge-power":    { value: 2.0, condition: (c) => c.moveCategory === "physical" },
  "pure-power":    { value: 2.0, condition: (c) => c.moveCategory === "physical" },
  "gorilla-tactics": { value: 1.5, condition: (c) => c.moveCategory === "physical" },
  "hustle":        { value: 1.5, condition: (c) => c.moveCategory === "physical" },
  "solar-power":   { value: 1.5, condition: (c) => c.moveCategory === "special" && c.weather === "sun" },
};

export function getAtkStatAbilityMod(
  ability: string,
  moveCategory: "physical" | "special",
  weather: Weather
): number {
  const entry = ATK_STAT_ABILITY_TABLE[ability];
  if (!entry) return 1.0;
  return entry.condition({ moveCategory, weather }) ? entry.value : 1.0;
}

// ─── 스피드 특성 보정 ─────────────────────────────────────

const WEATHER_SPEED_ABILITIES: Record<string, Weather> = {
  "chlorophyll": "sun",
  "swift-swim":  "rain",
  "sand-rush":   "sand",
  "slush-rush":  "snow",
};

const TERRAIN_SPEED_ABILITIES: Record<string, Terrain> = {
  "surge-surfer": "electric",
};

export function getSpeedAbilityMod(
  ability: string,
  weather: Weather,
  terrain: Terrain,
  status: string,
  isUnburden: boolean
): number {
  let mod = 1.0;

  // 날씨 2배속
  if (WEATHER_SPEED_ABILITIES[ability] === weather) mod *= 2;

  // 필드 2배속
  if (TERRAIN_SPEED_ABILITIES[ability] === terrain) mod *= 2;

  // 짐내려놓기
  if (ability === "unburden" && isUnburden) mod *= 2;

  // 속보 (상태이상 시 1.5배)
  if (ability === "quick-feet" && status !== "none") mod *= 1.5;

  return mod;
}
