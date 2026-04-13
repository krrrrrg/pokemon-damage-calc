// ============================================================
// 보정값 모듈
// ============================================================

import type {
  PokemonType, Weather, Terrain, Screen, Pokemon, Move, Field,
} from "./types";

// ─── 날씨 보정 ────────────────────────────────────────────

export function getWeatherMod(weather: Weather, moveType: PokemonType): number {
  if (weather === "sun") {
    if (moveType === "fire") return 1.5;
    if (moveType === "water") return 0.5;
  }
  if (weather === "rain") {
    if (moveType === "water") return 1.5;
    if (moveType === "fire") return 0.5;
  }
  // 모래바람/설경은 스탯 보정이지 기술 배율이 아님 (방어쪽에서 처리)
  return 1.0;
}

// ─── 필드 보정 ────────────────────────────────────────────

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
    // 그래스필드: 지진/대지의힘/10만마력 위력 반감
    const groundMoves = ["earthquake", "earth-power", "thousand-arrows"];
    if (moveName && groundMoves.includes(moveName)) return 0.5;
  }
  if (terrain === "psychic" && moveType === "psychic") return 1.3;
  if (terrain === "misty" && moveType === "dragon") return 0.5;

  return 1.0;
}

// ─── 타입 상성 ────────────────────────────────────────────

// 기본 상성표 (DB에서 가져오는 것이 정석이지만, 오프라인 계산용 내장)
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

/**
 * 단일 타입 상성 배율
 */
function singleTypeEffectiveness(atkType: PokemonType, defType: PokemonType): number {
  return TYPE_CHART[atkType]?.[defType] ?? 1.0;
}

/**
 * 듀얼타입 상성 배율 (곱연산)
 * matchupTable이 주어지면 DB 데이터 사용, 없으면 내장 차트 사용
 */
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

  // 테라스탈 비활성 또는 없음
  if (!teraActive || !teraType) {
    if (!isOriginalSTAB) return 1.0;
    return abilityName === "adaptability" ? 2.0 : 1.5;
  }

  // 스텔라 테라스탈
  if (teraType === "stellar") {
    if (isOriginalSTAB) return 2.0;
    return 1.2; // 비자속이라도 1회 1.2배
  }

  const isTeraSTAB = moveType === teraType;

  // 3종 일치: 기본타입 = 테라타입 = 기술타입
  if (isOriginalSTAB && isTeraSTAB) {
    return abilityName === "adaptability" ? 2.75 : 2.25;
  }

  // 기술이 테라타입과 일치
  if (isTeraSTAB) return 1.5;

  // 기술이 기본타입과 일치 (테라와 불일치)
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
  // 급소 시 벽 무시
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
    // 근성: 화상 감소 무시 + 공격 1.5배 (공격 보정은 특성에서 처리)
    if (abilityName === "guts") return 1.0;
    // 급소 시 화상 무시
    if (isCrit) return 1.0;
    return 0.5;
  }
  return 1.0;
}

// ─��─ 도구 보정 ────────────────────────────────────────────

export function getItemMod(
  item: string,
  moveType: PokemonType,
  moveCategory: "physical" | "special",
  effectiveness: number,
  pokemonName?: string
): number {
  switch (item) {
    case "life-orb": return 1.3;
    case "expert-belt": return effectiveness > 1 ? 1.2 : 1.0;
    case "muscle-band": return moveCategory === "physical" ? 1.1 : 1.0;
    case "wise-glasses": return moveCategory === "special" ? 1.1 : 1.0;
    case "metronome": return 1.0; // 연속 사용 시 별도 처리 필요

    // 타입강화 도구
    case "charcoal": case "flame-plate": return moveType === "fire" ? 1.2 : 1.0;
    case "mystic-water": case "splash-plate": return moveType === "water" ? 1.2 : 1.0;
    case "miracle-seed": case "meadow-plate": return moveType === "grass" ? 1.2 : 1.0;
    case "magnet": case "zap-plate": return moveType === "electric" ? 1.2 : 1.0;
    case "never-melt-ice": case "icicle-plate": return moveType === "ice" ? 1.2 : 1.0;
    case "black-belt": case "fist-plate": return moveType === "fighting" ? 1.2 : 1.0;
    case "poison-barb": case "toxic-plate": return moveType === "poison" ? 1.2 : 1.0;
    case "soft-sand": case "earth-plate": return moveType === "ground" ? 1.2 : 1.0;
    case "sharp-beak": case "sky-plate": return moveType === "flying" ? 1.2 : 1.0;
    case "twisted-spoon": case "mind-plate": return moveType === "psychic" ? 1.2 : 1.0;
    case "silver-powder": case "insect-plate": return moveType === "bug" ? 1.2 : 1.0;
    case "hard-stone": case "stone-plate": return moveType === "rock" ? 1.2 : 1.0;
    case "spell-tag": case "spooky-plate": return moveType === "ghost" ? 1.2 : 1.0;
    case "dragon-fang": case "draco-plate": return moveType === "dragon" ? 1.2 : 1.0;
    case "black-glasses": case "dread-plate": return moveType === "dark" ? 1.2 : 1.0;
    case "metal-coat": case "iron-plate": return moveType === "steel" ? 1.2 : 1.0;
    case "silk-scarf": return moveType === "normal" ? 1.2 : 1.0;
    case "fairy-feather": case "pixie-plate": return moveType === "fairy" ? 1.2 : 1.0;

    // 타입 쥬얼
    case "normal-gem": return moveType === "normal" ? 1.3 : 1.0;

    default: return 1.0;
  }
}

/**
 * 도구에 의한 스탯 보정 (구애/돌격조끼/진화의돌 등)
 */
export function getItemStatMod(
  item: string,
  stat: "atk" | "spa" | "def" | "spd" | "spe",
  pokemonName?: string
): number {
  switch (item) {
    case "choice-band": return stat === "atk" ? 1.5 : 1.0;
    case "choice-specs": return stat === "spa" ? 1.5 : 1.0;
    case "choice-scarf": return stat === "spe" ? 1.5 : 1.0;
    case "assault-vest": return stat === "spd" ? 1.5 : 1.0;
    case "eviolite": return (stat === "def" || stat === "spd") ? 1.5 : 1.0;

    // 전용 도구
    case "thick-club":
      if ((pokemonName === "cubone" || pokemonName === "marowak") && stat === "atk") return 2.0;
      return 1.0;
    case "light-ball":
      if (pokemonName === "pikachu" && stat === "atk") return 2.0;
      return 1.0;
    case "deep-sea-tooth":
      if (pokemonName === "clamperl" && stat === "spa") return 2.0;
      return 1.0;
    case "deep-sea-scale":
      if (pokemonName === "clamperl" && stat === "spd") return 2.0;
      return 1.0;
    case "metal-powder":
      if (pokemonName === "ditto" && stat === "def") return 2.0;
      return 1.0;

    default: return 1.0;
  }
}

// ─── 특성 보정 (공격측) ───────────────────────────────────

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
  switch (ability) {
    // 타입 부스트
    case "iron-fist": return move.isPunch ? 1.2 : 1.0;
    case "reckless": return move.isRecoil ? 1.3 : 1.0;
    case "strong-jaw": return move.isBite ? 1.5 : 1.0;
    case "mega-launcher": return move.isPulse ? 1.5 : 1.0;
    case "sharpness": return move.isSlash ? 1.5 : 1.0;
    case "technician": return movePower <= 60 ? 1.5 : 1.0;
    case "tinted-lens": return effectiveness < 1 ? 2.0 : 1.0;

    // 조건부
    case "sand-force":
      if (weather === "sand" && (moveType === "rock" || moveType === "ground" || moveType === "steel")) return 1.3;
      return 1.0;
    case "transistor": return moveType === "electric" ? 1.3 : 1.0;

    // 오라
    case "fairy-aura": return moveType === "fairy" ? 1.33 : 1.0;
    case "dark-aura": return moveType === "dark" ? 1.33 : 1.0;

    // 상태이상 관련
    case "guts": return status !== "none" ? 1.5 : 1.0;
    case "toxic-boost": return (status === "poison" || status === "toxic") ? 1.5 : 1.0;
    case "flare-boost": return status === "burn" ? 1.5 : 1.0;

    // 독주
    case "supreme-overlord": return isAllyDown ? 2.0 : 1.0;

    default: return 1.0;
  }
}

// ─── 특성 보정 (방어측) ───────────────────────────────────

export function getDefenderAbilityMod(
  ability: string,
  moveType: PokemonType,
  moveCategory: "physical" | "special",
  effectiveness: number,
  move: Move,
  defenderCurrentHP: number,
  defenderMaxHP: number
): number {
  switch (ability) {
    case "solid-rock":
    case "filter":
    case "prism-armor":
      return effectiveness > 1 ? 0.75 : 1.0;
    case "thick-fat":
      return (moveType === "fire" || moveType === "ice") ? 0.5 : 1.0;
    case "multiscale":
    case "shadow-shield":
      return defenderCurrentHP >= defenderMaxHP ? 0.5 : 1.0;
    case "fur-coat":
      return move.makesContact ? 0.5 : 1.0;
    case "ice-scales":
      return moveCategory === "special" ? 0.5 : 1.0;
    case "dry-skin":
      return moveType === "fire" ? 1.25 : 1.0;
    case "friend-guard":
      return 0.75; // 더블배틀 파트너

    default: return 1.0;
  }
}

// ─── 면역 체크 ────────────────────────────────────────────

export function checkImmunity(
  defenderAbility: string,
  moveType: PokemonType
): { immune: boolean; boost?: string } {
  switch (defenderAbility) {
    case "levitate":
      if (moveType === "ground") return { immune: true };
      break;
    case "volt-absorb":
    case "lightning-rod":
      if (moveType === "electric") return { immune: true, boost: "spa" };
      break;
    case "water-absorb":
    case "storm-drain":
      if (moveType === "water") return { immune: true };
      break;
    case "flash-fire":
      if (moveType === "fire") return { immune: true, boost: "fire" };
      break;
    case "dry-skin":
      if (moveType === "water") return { immune: true };
      break;
    case "sap-sipper":
      if (moveType === "grass") return { immune: true, boost: "atk" };
      break;
    case "motor-drive":
      if (moveType === "electric") return { immune: true, boost: "spe" };
      break;
    case "earth-eater":
      if (moveType === "ground") return { immune: true };
      break;
    case "wind-rider":
      // 바람 기술 면역 (별도 플래그 필요하지만 간소화)
      break;
  }
  return { immune: false };
}

// ─── 스킨계 특성 (타입 변환) ──────────────────────────────

export function getSkinAbility(
  abilityName: string,
  moveType: PokemonType
): { newType: PokemonType; powerMod: number } | null {
  if (moveType !== "normal") return null;

  switch (abilityName) {
    case "refrigerate": return { newType: "ice", powerMod: 1.2 };
    case "aerilate": return { newType: "flying", powerMod: 1.2 };
    case "pixilate": return { newType: "fairy", powerMod: 1.2 };
    case "galvanize": return { newType: "electric", powerMod: 1.2 };
    default: return null;
  }
}

// ─── 맹화/급류/심록 등 핀치 특성 ─────────────────────────

export function getPinchAbilityMod(
  ability: string,
  currentHP: number,
  maxHP: number,
  moveType: PokemonType
): number {
  if (currentHP > Math.floor(maxHP / 3)) return 1.0;

  switch (ability) {
    case "blaze": return moveType === "fire" ? 1.5 : 1.0;
    case "torrent": return moveType === "water" ? 1.5 : 1.0;
    case "overgrow": return moveType === "grass" ? 1.5 : 1.0;
    case "swarm": return moveType === "bug" ? 1.5 : 1.0;
    default: return 1.0;
  }
}

// ─── 날씨 스탯 보정 (모래바람 특방, 설경 방어) ────────────

export function getWeatherStatMod(
  weather: Weather,
  defenderTypes: [PokemonType, PokemonType | null],
  stat: "def" | "spd"
): number {
  // 모래바람: 바위타입 특방 1.5배
  if (weather === "sand" && stat === "spd") {
    if (defenderTypes[0] === "rock" || defenderTypes[1] === "rock") return 1.5;
  }
  // 설경: 얼음타입 방어 1.5배
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

export function getRuinMod(
  opponentAbility: string,
  stat: "atk" | "def" | "spa" | "spd"
): number {
  switch (opponentAbility) {
    case "tablets-of-ruin": return stat === "atk" ? 0.75 : 1.0; // 상대 공격
    case "sword-of-ruin": return stat === "def" ? 0.75 : 1.0;   // 상대 방어
    case "vessel-of-ruin": return stat === "spa" ? 0.75 : 1.0;  // 상대 특공
    case "beads-of-ruin": return stat === "spd" ? 0.75 : 1.0;   // 상대 특방
    default: return 1.0;
  }
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
