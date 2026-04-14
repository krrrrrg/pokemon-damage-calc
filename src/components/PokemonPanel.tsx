"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Pokemon, Move, PokemonType, Nature, StatName, Status, GimmickType, TeraType } from "@/lib/calc/types";
import { DEFAULT_IVS, DEFAULT_EVS, DEFAULT_BOOSTS, NEUTRAL_NATURE } from "@/lib/calc/types";
import { calcHP, calcStat, getNatureMod, calcAllStats } from "@/lib/calc/stats";
import { supabase } from "@/lib/supabase/client";
import TypeBadge from "./TypeBadge";
import StatBar from "./StatBar";
import GimmickPanel from "./GimmickPanel";
import ChampionsToggle from "./ChampionsToggle";
import type { GameMode } from "@/lib/store";

interface PokemonPanelProps {
  label: string; // "공격" | "방어"
  pokemon: Pokemon;
  moves: (Move | null)[];
  gameMode: GameMode;
  onPokemonChange: (pokemon: Pokemon) => void;
  onMovesChange: (moves: (Move | null)[]) => void;
}

const STAT_KEYS: StatName[] = ["hp", "atk", "def", "spa", "spd", "spe"];
const STAT_LABELS: Record<string, string> = {
  hp: "HP", atk: "공격", def: "방어", spa: "특공", spd: "특방", spe: "스피드",
};
const STAT_SHORT: Record<string, string> = {
  hp: "H", atk: "A", def: "B", spa: "C", spd: "D", spe: "S",
};

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "none", label: "없음" },
  { value: "burn", label: "화상" },
  { value: "paralysis", label: "마비" },
  { value: "poison", label: "독" },
  { value: "toxic", label: "맹독" },
  { value: "sleep", label: "잠듦" },
  { value: "freeze", label: "얼음" },
];

// Standard EV quick buttons
const EV_QUICK_VALUES_STANDARD = [0, 252];
// Champions EV quick buttons
const EV_QUICK_VALUES_CHAMPIONS = [0, 32];

// EV Preset patterns for standard mode
const EV_PRESETS_STANDARD: { label: string; evs: Record<StatName, number> }[] = [
  { label: "H252/A252/S4", evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 } },
  { label: "H252/C252/S4", evs: { hp: 252, atk: 0, def: 0, spa: 252, spd: 0, spe: 4 } },
  { label: "A252/S252/H4", evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 } },
  { label: "C252/S252/H4", evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 } },
  { label: "H252/B252/S4", evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 0, spe: 4 } },
  { label: "H252/D252/S4", evs: { hp: 252, atk: 0, def: 0, spa: 0, spd: 252, spe: 4 } },
];

// 도구 효과 설명
const ITEM_DESC_MAP: Record<string, string> = {
  survives_ohko: "HP 풀일 때 일격기를 HP 1로 버팀",
  "heal_25%": "HP 50% 이하 시 HP 25% 회복",
  "heal_1/16": "매 턴 HP 1/16 회복",
  "heal_1/16_poison": "독 타입: 매 턴 HP 1/16 회복 / 그 외: 1/8 감소",
  "survive_10%": "10% 확률로 HP 1로 버팀",
  "contact_1/6": "접촉기로 공격받으면 상대 HP 1/6 감소",
  reset_stat_drop: "능력치 하락 1회 초기화",
  force_switch: "공격받으면 상대 강제 교체",
  switch_on_hit: "공격받으면 자신 교체",
  switch_on_stat_drop: "능력치 하락 시 자신 교체",
  super_effective_hit: "효과발군 피격 시 공격/특공 +2",
  prevent_stat_drop: "상대에 의한 능력치 하락 방지",
  ignore_hazards: "설치기 데미지 무시",
  ignore_weather_powder: "날씨 데미지/가루 기술 무효",
  heal_20hp: "HP 50% 이하 시 HP 20 회복",
  heal_10hp: "HP 50% 이하 시 HP 10 회복",
  cure_status: "상태이상 1회 회복",
  cure_paralysis: "마비 회복",
  cure_poison: "독 회복",
  cure_burn: "화상 회복",
  cure_freeze: "얼음 회복",
  cure_sleep: "잠듦 회복",
  "crit_rate+1": "급소율 +1 단계",
  "accuracy_1.1x": "명중률 1.1배",
  "spa+1_on_water_hit": "물 기술 피격 시 특공 +1",
  "atk+1_on_electric_hit": "전기 기술 피격 시 공격 +1",
  "atk+1_on_ice_hit": "얼음 기술 피격 시 공격 +1",
  screen_8turns: "벽 지속 8턴으로 연장",
  rain_8turns: "비 지속 8턴",
  sun_8turns: "쾌청 지속 8턴",
  snow_8turns: "설경 지속 8턴",
  sand_8turns: "모래바람 지속 8턴",
  "trap_1/6": "구속 데미지 1/6으로 증가",
  "def+1_grassy": "그래스필드 시 방어 +1",
  "def+1_electric": "일렉트릭필드 시 방어 +1",
  "spd+1_psychic": "사이코필드 시 특방 +1",
  "spd+1_misty": "미스트필드 시 특방 +1",
  "multi_hit_4-5": "연속기 최소 4회 보장",
  money_2x: "상금 2배",
  "heal_1/8_dmg": "준 데미지의 1/8 회복",
  "spa+1_on_sound": "소리 기술 사용 시 특공 +1",
  cure_infatuation: "헤롱헤롱/앵콜 등 해제",
  levitate_until_hit: "공격받을 때까지 부유 (땅 무효)",
  "spe+1_low_hp": "HP 25% 이하 시 스피드 +1",
  "spa+1_low_hp": "HP 25% 이하 시 특공 +1",
  "atk+1_low_hp": "HP 25% 이하 시 공격 +1",
  "def+1_low_hp": "HP 25% 이하 시 방어 +1",
  "spd+1_low_hp": "HP 25% 이하 시 특방 +1",
  priority_low_hp: "HP 25% 이하 시 다음 턴 선제행동",
};

function getItemDesc(item: any): string | null {
  if (!item) return null;
  // condition 기반 설명
  if (item.condition && ITEM_DESC_MAP[item.condition]) {
    return ITEM_DESC_MAP[item.condition];
  }
  if (item.damage_modifier && item.condition) {
    const cond = item.condition.startsWith("type:") ? `${item.condition.replace("type:", "")} 타입` :
      item.condition.startsWith("super_effective:") ? `${item.condition.replace("super_effective:", "")} 효과발군 시 1회` :
      item.condition === "super_effective" ? "효과발군 시" :
      item.condition === "physical" ? "물리기술" :
      item.condition === "special" ? "특수기술" :
      item.condition.startsWith("gem:") ? `${item.condition.replace("gem:", "")} 1회` : item.condition;
    return `데미지 x${item.damage_modifier} (${cond})`;
  }
  if (item.damage_modifier) return `데미지 x${item.damage_modifier}`;
  if (item.stat_modifier && item.stat_multiplier) {
    const stat = item.stat_modifier === "atk" ? "공격" :
      item.stat_modifier === "spa" ? "특공" :
      item.stat_modifier === "def" ? "방어" :
      item.stat_modifier === "spd" ? "특방" :
      item.stat_modifier === "spe" ? "스피드" :
      item.stat_modifier === "def,spd" ? "방어/특방" :
      item.stat_modifier === "atk,spa" ? "공격/특공" : item.stat_modifier;
    return `${stat} x${item.stat_multiplier}`;
  }
  return null;
}

// PokeAPI slug ("solar-power") → abilities DB name_en ("Solar Power") 매칭용
function normalizeAbilityName(name: string): string {
  return name.toLowerCase().replace(/[\s-]/g, "");
}

function findAbilityKr(allAbilities: any[], abilitySlug: string): string {
  const norm = normalizeAbilityName(abilitySlug);
  const found = allAbilities.find((a: any) => normalizeAbilityName(a.name_en) === norm);
  return found?.name_kr ?? abilitySlug;
}

export default function PokemonPanel({
  label, pokemon, moves, gameMode, onPokemonChange, onMovesChange,
}: PokemonPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [natures, setNatures] = useState<any[]>([]);
  const [availableMoves, setAvailableMoves] = useState<any[]>([]);
  const [moveSearch, setMoveSearch] = useState<string[]>(["", "", "", ""]);
  const [moveResults, setMoveResults] = useState<any[][]>([[], [], [], []]);
  const [activeMoveSlot, setActiveMoveSlot] = useState<number | null>(null);
  const [forms, setForms] = useState<any[]>([]);
  const [spriteUrl, setSpriteUrl] = useState<string | null>(null);
  const [allAbilities, setAllAbilities] = useState<any[]>([]);
  const [pokemonAbilities, setPokemonAbilities] = useState<string[]>([]);
  const [abilitySearch, setAbilitySearch] = useState("");
  const [abilityResults, setAbilityResults] = useState<any[]>([]);
  const [showAbilityDropdown, setShowAbilityDropdown] = useState(false);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState<any[]>([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [subTab, setSubTab] = useState<"basic" | "stats" | "extras">("basic");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [allMoves, setAllMoves] = useState<any[]>([]);

  // 성격 + 특성 + 도구 + 전체기술 로드
  useEffect(() => {
    supabase.from("natures").select("*").order("id").then(({ data }) => {
      if (data) setNatures(data);
    });
    supabase.from("abilities").select("*").order("name_kr").then(({ data }) => {
      if (data) setAllAbilities(data);
    });
    supabase.from("items").select("*").order("name_kr").then(({ data }) => {
      if (data) setAllItems(data);
    });
    supabase.from("moves").select("*").neq("category", "status").order("name_kr").then(({ data }) => {
      if (data) setAllMoves(data);
    });
  }, []);

  // 포켓몬 검색
  useEffect(() => {
    if (searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("pokemon")
        .select("*")
        .or(`name_kr.ilike.%${searchQuery}%,name_en.ilike.%${searchQuery}%`)
        .eq("form", "default")
        .limit(10);
      if (data) setSearchResults(data);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 폼 로드
  const loadForms = useCallback(async (pokedexNumber: number) => {
    const { data } = await supabase
      .from("pokemon")
      .select("*")
      .eq("pokedex_number", pokedexNumber)
      .order("form");
    if (data) setForms(data);
  }, []);

  // 포켓몬 선택
  const selectPokemon = useCallback((row: any) => {
    const newPokemon: Pokemon = {
      ...pokemon,
      name: row.name_en,
      baseStats: {
        hp: row.hp, atk: row.atk, def: row.def,
        spa: row.spa, spd: row.spd, spe: row.spe,
      },
      types: [row.type1 as PokemonType, (row.type2 as PokemonType) || null],
      ability: row.ability1 || "",
      weight: row.weight || 50,
    };
    const stats = calcAllStats(newPokemon.baseStats, newPokemon.ivs, newPokemon.evs, newPokemon.level, newPokemon.nature);
    newPokemon.maxHP = stats.hp;
    newPokemon.currentHP = stats.hp;

    onPokemonChange(newPokemon);
    setSearchQuery(row.name_kr);
    setShowDropdown(false);
    setSpriteUrl(row.sprite_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${row.pokedex_number}.png`);
    loadForms(row.pokedex_number);

    const abilityNames = [row.ability1, row.ability2, row.hidden_ability].filter(Boolean);
    setPokemonAbilities(abilityNames);
    setAbilitySearch(findAbilityKr(allAbilities, row.ability1 ?? ""));

    // 기술은 전체 DB에서 검색 (allMoves 사용)
  }, [pokemon, onPokemonChange, loadForms, allAbilities]);

  // 폼 변경
  const selectForm = useCallback((form: any) => {
    const newPokemon: Pokemon = {
      ...pokemon,
      name: form.name_en,
      baseStats: {
        hp: form.hp, atk: form.atk, def: form.def,
        spa: form.spa, spd: form.spd, spe: form.spe,
      },
      types: [form.type1 as PokemonType, (form.type2 as PokemonType) || null],
      ability: form.ability1 || pokemon.ability,
    };
    const stats = calcAllStats(newPokemon.baseStats, newPokemon.ivs, newPokemon.evs, newPokemon.level, newPokemon.nature);
    newPokemon.maxHP = stats.hp;
    newPokemon.currentHP = stats.hp;

    const formAbilities = [form.ability1, form.ability2, form.hidden_ability].filter(Boolean);
    if (formAbilities.length > 0) {
      setPokemonAbilities(formAbilities);
    }
    setAbilitySearch(findAbilityKr(allAbilities, form.ability1 || pokemon.ability));

    setSpriteUrl(form.sprite_url || spriteUrl);
    onPokemonChange(newPokemon);
  }, [pokemon, onPokemonChange, allAbilities, spriteUrl]);

  // 스탯 재계산
  const updateAndRecalc = useCallback((updates: Partial<Pokemon>) => {
    const newMon = { ...pokemon, ...updates };
    const stats = calcAllStats(newMon.baseStats, newMon.ivs, newMon.evs, newMon.level, newMon.nature);
    newMon.maxHP = stats.hp;
    newMon.currentHP = stats.hp;
    onPokemonChange(newMon);
  }, [pokemon, onPokemonChange]);

  // 실능 계산
  const actualStats = calcAllStats(
    pokemon.baseStats, pokemon.ivs, pokemon.evs, pokemon.level, pokemon.nature
  );

  // EV 총합
  const evTotal = Object.values(pokemon.evs).reduce((a, b) => a + b, 0);
  const evMax = gameMode === "champions" ? 66 : 508;
  const evPerStatMax = gameMode === "champions" ? 32 : 252;

  const evQuickValues = gameMode === "champions" ? EV_QUICK_VALUES_CHAMPIONS : EV_QUICK_VALUES_STANDARD;

  // EV 퀵 설정
  const setEV = useCallback((stat: StatName, value: number) => {
    const clampedValue = Math.min(evPerStatMax, Math.max(0, value));
    updateAndRecalc({ evs: { ...pokemon.evs, [stat]: clampedValue } });
  }, [pokemon, evPerStatMax, updateAndRecalc]);

  // EV 프리셋 적용
  const applyEvPreset = useCallback((preset: Record<StatName, number>) => {
    updateAndRecalc({ evs: { ...preset } });
    setShowPresets(false);
  }, [updateAndRecalc]);

  // EV 전체 리셋
  const resetEvs = useCallback(() => {
    updateAndRecalc({ evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } });
  }, [updateAndRecalc]);

  // 기술 검색
  const searchMoves = useCallback((query: string, slot: number) => {
    const newSearch = [...moveSearch];
    newSearch[slot] = query;
    setMoveSearch(newSearch);
    setActiveMoveSlot(slot);

    if (query.length < 1) {
      const newResults = [...moveResults];
      newResults[slot] = [];
      setMoveResults(newResults);
      return;
    }

    const filtered = allMoves.filter(
      (m: any) => m.name_kr?.includes(query) || m.name_en?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
    const newResults = [...moveResults];
    newResults[slot] = filtered;
    setMoveResults(newResults);
  }, [moveSearch, moveResults, allMoves]);

  const selectMove = useCallback((moveData: any, slot: number) => {
    const move: Move = {
      id: moveData.id,
      name: moveData.name_en,
      nameKr: moveData.name_kr,
      type: moveData.type as PokemonType,
      category: moveData.category,
      power: moveData.power,
      accuracy: moveData.accuracy,
      priority: moveData.priority,
      makesContact: moveData.makes_contact,
      isSound: moveData.is_sound,
      isPunch: moveData.is_punch,
      isBite: moveData.is_bite,
      isPulse: moveData.is_pulse,
      isSlash: moveData.is_slash,
      isRecoil: moveData.is_recoil,
      isSpread: moveData.is_spread,
      multiHitMin: moveData.multi_hit_min,
      multiHitMax: moveData.multi_hit_max,
    };
    const newMoves = [...moves];
    newMoves[slot] = move;
    onMovesChange(newMoves);

    const newSearch = [...moveSearch];
    newSearch[slot] = moveData.name_kr;
    setMoveSearch(newSearch);
    const newResults = [...moveResults];
    newResults[slot] = [];
    setMoveResults(newResults);
    setActiveMoveSlot(null);
  }, [moves, moveSearch, moveResults, onMovesChange]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowAbilityDropdown(false);
        setShowItemDropdown(false);
        setActiveMoveSlot(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAttacker = label === "공격";

  return (
    <div className="pixel-panel p-3 flex flex-col gap-2 w-full" ref={dropdownRef}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-0.5">
        <div className={isAttacker ? "panel-header-atk" : "panel-header-def"}>
          {isAttacker ? "⚔ 공격" : "🛡 방어"}
        </div>
        {pokemon.name && (
          <span className="text-xs font-bold" style={{ color: "#8b7e6a" }}>Lv.{pokemon.level}</span>
        )}
      </div>

      {/* 포켓몬 검색 */}
      <div className="relative">
        <input
          className="pixel-input w-full"
          placeholder="포켓몬 이름 검색..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        {showDropdown && searchResults.length > 0 && (
          <div className="autocomplete-dropdown">
            {searchResults.map((row) => (
              <div
                key={row.id}
                className="autocomplete-item"
                onClick={() => selectPokemon(row)}
              >
                {row.sprite_url && (
                  <img src={row.sprite_url} alt="" className="w-6 h-6" style={{ imageRendering: "pixelated" }} />
                )}
                <span>{row.name_kr}</span>
                <span className="text-xs opacity-50">{row.name_en}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 폼 선택 */}
      {forms.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {forms.map((f) => (
            <button
              key={f.id}
              className="pixel-btn pixel-btn-sm text-xs"
              style={{
                background: pokemon.name === f.name_en ? "#5080c0" : undefined,
                color: pokemon.name === f.name_en ? "#fff" : undefined,
                borderColor: pokemon.name === f.name_en ? "#5080c0" : undefined,
              }}
              onClick={() => selectForm(f)}
            >
              {f.form === "default" ? "기본" : f.form}
            </button>
          ))}
        </div>
      )}

      {/* 스프라이트 + 타입 + HP + 레벨 (초컴팩트) */}
      {pokemon.name && (
        <div className="flex items-center gap-2 p-1.5 rounded-lg"
             style={{ background: "linear-gradient(135deg, #fff8e7 0%, #fefcf3 100%)", border: "2px solid #e8dcb0" }}>
          <div
            className="flex-shrink-0 rounded-lg flex items-center justify-center"
            style={{
              width: 52, height: 52,
              background: "radial-gradient(circle at 50% 60%, #f5f0e1 0%, #e8e0d0 60%, #d4c89a 100%)",
              border: "1.5px solid #d4c89a",
              overflow: "hidden",
            }}
          >
            {spriteUrl && (
              <img
                src={spriteUrl}
                alt={searchQuery || pokemon.name}
                style={{ width: 48, height: 48, imageRendering: "pixelated", filter: "drop-shadow(1px 2px 0 rgba(0,0,0,0.15))" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold truncate" style={{ color: "#3b2d1b", fontSize: 13 }}>
                {searchQuery || pokemon.name}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-xs" style={{ color: "#8b7e6a" }}>Lv</span>
                <input
                  className="pixel-input text-center"
                  type="number" min={1} max={100}
                  style={{ width: 46, padding: "2px 4px", fontSize: 13, minHeight: 0 }}
                  value={pokemon.level}
                  onChange={(e) => updateAndRecalc({ level: Number(e.target.value) || 50 })}
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                <TypeBadge type={pokemon.types[0]} />
                {pokemon.types[1] && <TypeBadge type={pokemon.types[1]} />}
              </div>
              <div className="hp-bar flex-1 ml-1" style={{ height: 8 }}>
                <div className="hp-bar-fill hp-green" style={{ width: "100%" }} />
              </div>
              <span className="text-xs font-bold" style={{ color: "#3b2d1b", minWidth: 28, textAlign: "right", fontSize: 12 }}>
                {actualStats.hp}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 포켓몬 미선택 상태일 때만 레벨 노출 */}
      {!pokemon.name && (
        <div className="flex items-center gap-2">
          <label className="text-xs" style={{ color: "#8b7e6a" }}>레벨</label>
          <input
            className="pixel-input w-20 text-center"
            type="number" min={1} max={100}
            value={pokemon.level}
            onChange={(e) => updateAndRecalc({ level: Number(e.target.value) || 50 })}
          />
        </div>
      )}

      {/* 서브탭 네비게이션 */}
      <div className="sub-tab-nav">
        <button
          className={`sub-tab-btn ${subTab === "basic" ? "active" : ""}`}
          onClick={() => setSubTab("basic")}
        >
          ⚙ 기본
        </button>
        <button
          className={`sub-tab-btn ${subTab === "stats" ? "active" : ""}`}
          onClick={() => setSubTab("stats")}
        >
          📊 스탯
        </button>
        <button
          className={`sub-tab-btn ${subTab === "extras" ? "active" : ""}`}
          onClick={() => setSubTab("extras")}
        >
          {label === "공격" ? "⚡ 기술" : "🎭 기믹"}
        </button>
      </div>

      {/* [기본 탭] 성격/특성/도구/상태이상 */}
      {subTab === "basic" && (<>

      {/* 성격 보정 (컴팩트: 5×2 그리드) */}
      <div>
        <label className="text-xs block mb-1" style={{ color: "#8b7e6a" }}>
          성격: {pokemon.nature.plus && pokemon.nature.minus
            ? <><span style={{ color: "#e3350d" }}>+{STAT_LABELS[pokemon.nature.plus]}</span> / <span style={{ color: "#0075be" }}>-{STAT_LABELS[pokemon.nature.minus]}</span></>
            : <span style={{ color: "#8b7e6a" }}>무보정</span>}
        </label>
        <div className="grid grid-cols-5 gap-1">
          {(["atk", "def", "spa", "spd", "spe"] as const).map((stat) => {
            const mod = pokemon.nature.plus === stat ? 1.1 : pokemon.nature.minus === stat ? 0.9 : 1.0;
            return (
              <div key={stat} className="flex flex-col items-center gap-0.5">
                <div className="text-[11px]" style={{ color: "#8b7e6a" }}>{STAT_LABELS[stat]}</div>
                <div className="flex w-full gap-0.5">
                  {[0.9, 1.0, 1.1].map((val) => (
                    <button
                      key={val}
                      className="flex-1 rounded"
                      style={{
                        height: 24,
                        fontSize: 12,
                        background: mod === val
                          ? val === 1.1 ? "#e3350d" : val === 0.9 ? "#0075be" : "#8b7e6a"
                          : "#fff",
                        color: mod === val ? "#fff" : "#3b2d1b",
                        border: mod === val ? "1.5px solid currentColor" : "1.5px solid #d4c89a",
                        fontWeight: mod === val ? "bold" : "normal",
                      }}
                      onClick={() => {
                        let plus: StatName | null = pokemon.nature.plus;
                        let minus: StatName | null = pokemon.nature.minus;
                        if (val === 1.1) { plus = stat; if (minus === stat) minus = null; }
                        else if (val === 0.9) { minus = stat; if (plus === stat) plus = null; }
                        else { if (plus === stat) plus = null; if (minus === stat) minus = null; }
                        updateAndRecalc({ nature: { name: "Custom", plus, minus } });
                      }}
                    >
                      {val === 0.9 ? "↓" : val === 1.1 ? "↑" : "−"}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 특성 */}
      <div className="relative">
        <label className="text-xs block mb-0.5" style={{ color: "#8b7e6a" }}>특성</label>
        {pokemonAbilities.length > 0 ? (
          <select
            className="pixel-select w-full"
            value={pokemon.ability}
            onChange={(e) => {
              setAbilitySearch(findAbilityKr(allAbilities, e.target.value));
              onPokemonChange({ ...pokemon, ability: e.target.value });
            }}
          >
            {pokemonAbilities.map((abName) => (
              <option key={abName} value={abName}>
                {findAbilityKr(allAbilities, abName)}
              </option>
            ))}
          </select>
        ) : (
          <div className="relative">
            <input
              className="pixel-input w-full"
              value={abilitySearch}
              onChange={(e) => {
                setAbilitySearch(e.target.value);
                setShowAbilityDropdown(true);
                const q = e.target.value;
                if (q.length > 0) {
                  setAbilityResults(
                    allAbilities.filter((a: any) =>
                      a.name_kr.includes(q) || a.name_en.toLowerCase().includes(q.toLowerCase())
                    ).slice(0, 8)
                  );
                } else {
                  setAbilityResults([]);
                }
              }}
              onFocus={() => setShowAbilityDropdown(true)}
              placeholder="특성 검색..."
            />
            {showAbilityDropdown && abilityResults.length > 0 && (
              <div className="autocomplete-dropdown">
                {abilityResults.map((a: any) => (
                  <div
                    key={a.id}
                    className="autocomplete-item"
                    onClick={() => {
                      onPokemonChange({ ...pokemon, ability: a.name_en });
                      setAbilitySearch(a.name_kr);
                      setShowAbilityDropdown(false);
                    }}
                  >
                    <span>{a.name_kr}</span>
                    <span className="text-xs opacity-40 ml-auto">{a.name_en}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 도구 */}
      <div className="relative">
        <label className="text-xs block mb-0.5" style={{ color: "#8b7e6a" }}>도구</label>
        <input
          className="pixel-input w-full"
          value={itemSearch}
          onChange={(e) => {
            setItemSearch(e.target.value);
            setShowItemDropdown(true);
            const q = e.target.value;
            if (q.length > 0) {
              setItemResults(
                allItems.filter((i: any) =>
                  i.name_kr?.includes(q) || i.name_en?.toLowerCase().includes(q.toLowerCase())
                ).slice(0, 10)
              );
            } else {
              setItemResults([]);
            }
          }}
          onFocus={() => setShowItemDropdown(true)}
          placeholder="도구 검색..."
        />
        {showItemDropdown && itemResults.length > 0 && (
          <div className="autocomplete-dropdown">
            {itemResults.map((i: any) => {
              const desc = getItemDesc(i);
              return (
                <div
                  key={i.id}
                  className="autocomplete-item flex-col items-start"
                  onClick={() => {
                    onPokemonChange({ ...pokemon, item: i.name_en.toLowerCase().replace(/ /g, "-") });
                    setItemSearch(i.name_kr);
                    setShowItemDropdown(false);
                  }}
                >
                  <div className="flex w-full justify-between">
                    <span>{i.name_kr}</span>
                    <span className="text-xs opacity-40">{i.name_en}</span>
                  </div>
                  {desc && <div className="text-[10px] opacity-50 w-full">{desc}</div>}
                </div>
              );
            })}
          </div>
        )}
        {/* 선택된 도구 효과 표시 */}
        {pokemon.item && (() => {
          const selectedItem = allItems.find((i: any) =>
            i.name_en.toLowerCase().replace(/ /g, "-") === pokemon.item
          );
          const desc = selectedItem ? getItemDesc(selectedItem) : null;
          return desc ? (
            <div className="text-[10px] mt-0.5 opacity-50" style={{ color: "#78c850" }}>{desc}</div>
          ) : null;
        })()}
      </div>

      {/* 상태이상 */}
      <div>
        <label className="text-xs block mb-0.5" style={{ color: "#8b7e6a" }}>상태이상</label>
        <select
          className="pixel-select w-full"
          value={pokemon.status}
          onChange={(e) => onPokemonChange({ ...pokemon, status: e.target.value as Status })}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      </>)}

      {/* [스탯 탭] 통합 스탯/EV */}
      {subTab === "stats" && (<>

      {/* EV 총합 + 리셋/프리셋 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold" style={{ color: "#3b2d1b" }}>노력치 (EV)</span>
          <button
            className="ev-quick-btn"
            style={{ fontSize: 12, minWidth: 36, height: 26 }}
            onClick={resetEvs}
          >
            리셋
          </button>
          {gameMode === "standard" && (
            <button
              className={`ev-quick-btn ${showPresets ? "active" : ""}`}
              style={{ fontSize: 12, minWidth: 44, height: 26 }}
              onClick={() => setShowPresets(!showPresets)}
            >
              프리셋
            </button>
          )}
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded"
          style={{
            background: evTotal > evMax ? "#fef0c7" : "#f0f0e8",
            color: evTotal > evMax ? "#e3350d" : "#3b2d1b",
            border: evTotal > evMax ? "1px solid #e3350d" : "1px solid #e8dcb0",
          }}
        >
          {evTotal}/{evMax}
        </span>
      </div>

      {/* EV 프리셋 패널 */}
      {showPresets && gameMode === "standard" && (
        <div className="flex flex-wrap gap-1 p-2 rounded-lg" style={{ background: "#f0ece0", border: "1px solid #e8dcb0" }}>
          {EV_PRESETS_STANDARD.map((preset) => (
            <button
              key={preset.label}
              className="ev-quick-btn"
              style={{ fontSize: 11, padding: "0 6px", height: 24 }}
              onClick={() => applyEvPreset(preset.evs)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* 통합 스탯 테이블: 종족 | EV | 퀵 | 실능 */}
      {pokemon.baseStats.hp > 0 && (
        <div className="flex flex-col gap-1 p-2 rounded-lg" style={{ background: "#faf6ea", border: "1px solid #e8dcb0" }}>
          {/* 헤더 */}
          <div className="flex items-center gap-1.5 text-[11px] pb-1" style={{ color: "#8b7e6a", borderBottom: "1px dashed #d4c89a" }}>
            <span className="flex-shrink-0" style={{ width: 28 }}></span>
            <span className="flex-shrink-0 text-right" style={{ width: 32 }}>종족</span>
            <span className="flex-shrink-0 text-center" style={{ width: 60 }}>EV</span>
            <span className="flex-1 text-center">퀵</span>
            <span className="flex-shrink-0 text-right" style={{ width: 44 }}>실능</span>
          </div>

          {STAT_KEYS.map((stat) => {
            const color = stat === "hp" ? "#e53935" : stat === "atk" ? "#f08030" : stat === "def" ? "#f0c040" : stat === "spa" ? "#6890f0" : stat === "spd" ? "#4daf50" : "#f85888";
            const natureMod = pokemon.nature.plus === stat ? 1.1 : pokemon.nature.minus === stat ? 0.9 : 1.0;
            return (
              <div key={stat} className="flex items-center gap-1.5">
                <span
                  className="flex-shrink-0 flex items-center justify-center rounded font-bold"
                  style={{ width: 28, height: 28, background: color, color: "#fff", fontSize: 13, textShadow: "0 1px 1px rgba(0,0,0,0.3)" }}
                >
                  {STAT_SHORT[stat]}
                </span>
                <span className="flex-shrink-0 text-right text-xs" style={{ width: 32, color: "#8b7e6a" }}>
                  {pokemon.baseStats[stat]}
                </span>
                <input
                  className="pixel-input text-center flex-shrink-0"
                  type="number" min={0} max={evPerStatMax}
                  step={gameMode === "champions" ? 1 : 4}
                  style={{ width: 60, padding: "4px 4px", fontSize: 14 }}
                  value={pokemon.evs[stat]}
                  onChange={(e) => {
                    const val = Math.min(evPerStatMax, Math.max(0, Number(e.target.value) || 0));
                    updateAndRecalc({ evs: { ...pokemon.evs, [stat]: val } });
                  }}
                />
                <div className="flex-1 flex gap-1 justify-center">
                  {evQuickValues.map((v) => (
                    <button
                      key={v}
                      className={`ev-quick-btn ${pokemon.evs[stat] === v ? "active" : ""}`}
                      style={{ fontSize: 12, minWidth: 34, height: 26, padding: 0 }}
                      onClick={() => setEV(stat, v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <span className="flex-shrink-0 text-right font-bold" style={{ width: 44, color: "#3b2d1b", fontSize: 14 }}>
                  {natureMod === 1.1 && <span style={{ color: "#e3350d", fontSize: 11 }}>↑</span>}
                  {natureMod === 0.9 && <span style={{ color: "#0075be", fontSize: 11 }}>↓</span>}
                  {actualStats[stat]}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 개체값 / 능력 랭크 (접기) */}
      <div className="grid grid-cols-2 gap-2">
        <details className="text-xs">
          <summary className="cursor-pointer text-xs px-2 py-1 rounded"
            style={{ background: "#f0ece0", color: "#5a4a20", border: "1px solid #d4c89a" }}>
            개체값 (IV) {gameMode === "champions" ? "· 31" : ""}
          </summary>
          <div className="grid grid-cols-6 gap-1 mt-2 p-2 rounded" style={{ background: "#faf6ea" }}>
            {STAT_KEYS.map((stat) => (
              <div key={stat} className="text-center">
                <label className="text-[10px]" style={{ color: "#8b7e6a" }}>{STAT_SHORT[stat]}</label>
                <input
                  className="pixel-input w-full text-center" style={{ padding: "3px 0", fontSize: 12 }}
                  type="number" min={0} max={31}
                  value={pokemon.ivs[stat]}
                  disabled={gameMode === "champions"}
                  onChange={(e) => {
                    const val = Math.min(31, Math.max(0, Number(e.target.value) || 0));
                    updateAndRecalc({ ivs: { ...pokemon.ivs, [stat]: val } });
                  }}
                />
              </div>
            ))}
          </div>
        </details>

        <details className="text-xs">
          <summary className="cursor-pointer text-xs px-2 py-1 rounded"
            style={{ background: "#f0ece0", color: "#5a4a20", border: "1px solid #d4c89a" }}>
            능력 랭크
          </summary>
          <div className="grid grid-cols-5 gap-1 mt-2 p-2 rounded" style={{ background: "#faf6ea" }}>
            {(["atk", "def", "spa", "spd", "spe"] as const).map((stat) => (
              <div key={stat} className="text-center">
                <label className="text-[10px]" style={{ color: "#8b7e6a" }}>{STAT_SHORT[stat]}</label>
                <div className="flex items-center justify-center gap-0.5">
                  <button
                    className="ev-quick-btn" style={{ width: 18, height: 18, minWidth: 18, fontSize: 11, padding: 0 }}
                    onClick={() => {
                      const val = Math.max(-6, pokemon.boosts[stat] - 1);
                      onPokemonChange({ ...pokemon, boosts: { ...pokemon.boosts, [stat]: val } });
                    }}
                  >-</button>
                  <span className="text-xs" style={{
                    width: 20, textAlign: "center",
                    color: pokemon.boosts[stat] > 0 ? "#4daf50" : pokemon.boosts[stat] < 0 ? "#e3350d" : "#3b2d1b",
                  }}>
                    {pokemon.boosts[stat] > 0 ? `+${pokemon.boosts[stat]}` : pokemon.boosts[stat]}
                  </span>
                  <button
                    className="ev-quick-btn" style={{ width: 18, height: 18, minWidth: 18, fontSize: 11, padding: 0 }}
                    onClick={() => {
                      const val = Math.min(6, pokemon.boosts[stat] + 1);
                      onPokemonChange({ ...pokemon, boosts: { ...pokemon.boosts, [stat]: val } });
                    }}
                  >+</button>
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>

      </>)}

      {/* [기술/기믹 탭] */}
      {subTab === "extras" && (<>

      {/* 배틀 기믹 */}
      {pokemon.name && (
        <GimmickPanel
          pokemon={pokemon}
          onPokemonChange={onPokemonChange}
          hasMegaForm={forms.some((f: any) => f.form.startsWith("mega"))}
          hasGmax={forms.some((f: any) => f.form === "gmax")}
        />
      )}

      {/* 포챔스 모드 */}
      <ChampionsToggle
        gameMode={gameMode}
        pokemon={pokemon}
        onPokemonChange={updateAndRecalc}
      />

      {/* 기술 선택 (공격 측만) */}
      {label === "공격" && (
        <div>
          <div className="pixel-section-title">기술</div>
          {[0, 1, 2, 3].map((slot) => (
            <div key={slot} className="relative mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs opacity-40 w-4">{slot + 1}.</span>
                <input
                  className="pixel-input flex-1 text-xs"
                  placeholder="기술 검색..."
                  value={moveSearch[slot]}
                  onChange={(e) => searchMoves(e.target.value, slot)}
                  onFocus={() => setActiveMoveSlot(slot)}
                />
                {moves[slot] && (
                  <div className="flex items-center gap-1">
                    <TypeBadge type={moves[slot]!.type} />
                    <span className="text-xs">
                      {moves[slot]!.category === "physical" ? "물" : "특"}
                      {" "}
                      {moves[slot]!.power ?? "-"}
                    </span>
                  </div>
                )}
              </div>
              {activeMoveSlot === slot && moveResults[slot].length > 0 && (
                <div className="autocomplete-dropdown">
                  {moveResults[slot].map((m: any) => (
                    <div
                      key={m.id}
                      className="autocomplete-item"
                      onClick={() => selectMove(m, slot)}
                    >
                      <span className={`type-badge type-${m.type} text-[10px] px-1`}>
                        {m.type}
                      </span>
                      <span>{m.name_kr}</span>
                      <span className="text-xs opacity-50 ml-auto">
                        {m.category === "physical" ? "물리" : "특수"} {m.power ?? "-"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      </>)}
    </div>
  );
}
