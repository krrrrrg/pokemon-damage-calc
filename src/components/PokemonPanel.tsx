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
function getItemDesc(item: any): string | null {
  if (!item) return null;
  if (item.damage_modifier && item.condition) {
    const cond = item.condition.startsWith("type:") ? `${item.condition.replace("type:", "")} 타입` :
      item.condition === "super_effective" ? "효과발군 시" :
      item.condition === "physical" ? "물리기술" :
      item.condition === "special" ? "특수기술" : item.condition;
    return `데미지 x${item.damage_modifier} (${cond})`;
  }
  if (item.damage_modifier) return `데미지 x${item.damage_modifier}`;
  if (item.stat_modifier && item.stat_multiplier) {
    const stat = item.stat_modifier === "atk" ? "공격" :
      item.stat_modifier === "spa" ? "특공" :
      item.stat_modifier === "def" ? "방어" :
      item.stat_modifier === "spd" ? "특방" :
      item.stat_modifier === "spe" ? "스피드" :
      item.stat_modifier === "def,spd" ? "방어/특방" : item.stat_modifier;
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
    <div className="pixel-panel p-3 flex flex-col gap-2.5 w-full" ref={dropdownRef}>
      {/* 헤더 */}
      <div
        className="flex items-center justify-between pb-1.5 mb-0.5"
        style={{ borderBottom: `3px solid ${isAttacker ? "#e53935" : "#5080c0"}` }}
      >
        <h2 className="text-sm" style={{ color: isAttacker ? "#e53935" : "#5080c0" }}>
          ▶ {label} 측
        </h2>
        <span className="text-xs opacity-60">Lv.{pokemon.level}</span>
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

      {/* 스프라이트 + 타입 */}
      {pokemon.name && (
        <div className="flex items-center gap-3">
          <div
            className="w-20 h-20 flex items-center justify-center"
            style={{ border: "2px solid #303030", background: "#e8e8e0" }}
          >
            {spriteUrl && (
              <img
                src={spriteUrl}
                alt={searchQuery || pokemon.name}
                className="w-16 h-16"
                style={{ imageRendering: "pixelated" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1">
              <TypeBadge type={pokemon.types[0]} />
              {pokemon.types[1] && <TypeBadge type={pokemon.types[1]} />}
            </div>
            <span className="text-xs opacity-50">{searchQuery || pokemon.name}</span>
          </div>
        </div>
      )}

      {/* 레벨 + 성격 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs opacity-60 block mb-0.5">레벨</label>
          <input
            className="pixel-input w-full"
            type="number"
            min={1}
            max={100}
            value={pokemon.level}
            onChange={(e) => updateAndRecalc({ level: Number(e.target.value) || 50 })}
          />
        </div>
        <div>
          <label className="text-xs opacity-60 block mb-0.5">성격</label>
          <select
            className="pixel-select w-full"
            value={pokemon.nature.name}
            onChange={(e) => {
              const nat = natures.find((n: any) => n.name_en === e.target.value);
              if (nat) {
                updateAndRecalc({
                  nature: {
                    name: nat.name_en,
                    plus: nat.plus_stat as StatName | null,
                    minus: nat.minus_stat as StatName | null,
                  },
                });
              }
            }}
          >
            {natures.map((n: any) => (
              <option key={n.id} value={n.name_en}>
                {n.name_kr}
                {n.plus_stat ? ` (+${STAT_LABELS[n.plus_stat]}/-${STAT_LABELS[n.minus_stat]})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 특성 */}
      <div className="relative">
        <label className="text-xs opacity-60 block mb-0.5">특성</label>
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
        <label className="text-xs opacity-60 block mb-0.5">도구</label>
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
        <label className="text-xs opacity-60 block mb-0.5">상태이상</label>
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

      {/* 종족값 + 실능 (Gen 2 summary style) */}
      {pokemon.baseStats.hp > 0 && (
        <div className="flex flex-col gap-1">
          <div className="pixel-section-title">스탯</div>
          <div className="flex justify-end text-[10px] opacity-50 gap-2 pr-1 mb-0.5">
            <span className="w-8 text-right">종족</span>
            <span className="w-16 text-center">바</span>
            <span className="w-6 text-right">EV</span>
            <span className="w-10 text-right">실능</span>
          </div>
          {STAT_KEYS.map((stat) => (
            <StatBar
              key={stat}
              stat={stat}
              base={pokemon.baseStats[stat]}
              actual={actualStats[stat]}
              ev={pokemon.evs[stat]}
            />
          ))}
        </div>
      )}

      {/* 개체값 */}
      <details className="text-xs">
        <summary className="cursor-pointer opacity-60 text-xs hover:opacity-80">
          개체값 (IV) {gameMode === "champions" ? "- 31 고정" : ""}
        </summary>
        <div className="grid grid-cols-6 gap-1 mt-1.5">
          {STAT_KEYS.map((stat) => (
            <div key={stat} className="text-center">
              <label className="text-[10px] opacity-50">{STAT_SHORT[stat]}</label>
              <input
                className="pixel-input w-full text-center text-xs"
                type="number"
                min={0}
                max={31}
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

      {/* 노력치 (EV) + 퀵 버튼 */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-60">노력치 (EV)</span>
            <button
              className="ev-quick-btn text-[10px]"
              onClick={resetEvs}
              title="EV 전체 리셋"
            >
              리셋
            </button>
            {gameMode === "standard" && (
              <button
                className={`ev-quick-btn text-[10px] ${showPresets ? "active" : ""}`}
                onClick={() => setShowPresets(!showPresets)}
                title="EV 프리셋"
              >
                프리셋
              </button>
            )}
          </div>
          <span className={`text-xs ${evTotal > evMax ? "text-red-600" : ""}`}>
            {evTotal}/{evMax}
          </span>
        </div>

        {/* EV 프리셋 패널 */}
        {showPresets && gameMode === "standard" && (
          <div className="flex flex-wrap gap-1 mb-2 p-1.5" style={{ background: "#f0f0e8", border: "2px solid #303030" }}>
            {EV_PRESETS_STANDARD.map((preset) => (
              <button
                key={preset.label}
                className="ev-quick-btn text-[10px] px-2"
                onClick={() => applyEvPreset(preset.evs)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {/* EV 입력 + 퀵 버튼 */}
        <div className="flex flex-col gap-1.5">
          {STAT_KEYS.map((stat) => (
            <div key={stat} className="flex items-center gap-1.5">
              <span
                className="w-5 text-xs text-center"
                style={{ color: stat === "hp" ? "#f03830" : stat === "atk" ? "#f08030" : stat === "def" ? "#f8d030" : stat === "spa" ? "#6890f0" : stat === "spd" ? "#78c850" : "#f85888" }}
              >
                {STAT_SHORT[stat]}
              </span>
              <input
                className="pixel-input w-14 text-center text-xs"
                type="number"
                min={0}
                max={evPerStatMax}
                step={gameMode === "champions" ? 1 : 4}
                value={pokemon.evs[stat]}
                onChange={(e) => {
                  const val = Math.min(evPerStatMax, Math.max(0, Number(e.target.value) || 0));
                  updateAndRecalc({ evs: { ...pokemon.evs, [stat]: val } });
                }}
              />
              <div className="ev-preset-group">
                {evQuickValues.map((v) => (
                  <button
                    key={v}
                    className={`ev-quick-btn ${pokemon.evs[stat] === v ? "active" : ""}`}
                    onClick={() => setEV(stat, v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <span className="text-xs opacity-50 ml-auto w-8 text-right">
                {actualStats[stat]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 능력 랭크 */}
      <details className="text-xs">
        <summary className="cursor-pointer opacity-60 text-xs hover:opacity-80">능력 랭크</summary>
        <div className="grid grid-cols-5 gap-1 mt-1.5">
          {(["atk", "def", "spa", "spd", "spe"] as const).map((stat) => (
            <div key={stat} className="text-center">
              <label className="text-[10px] opacity-50">{STAT_SHORT[stat]}</label>
              <div className="flex items-center justify-center gap-0.5">
                <button
                  className="ev-quick-btn w-5 h-5 text-xs leading-none"
                  onClick={() => {
                    const val = Math.max(-6, pokemon.boosts[stat] - 1);
                    onPokemonChange({ ...pokemon, boosts: { ...pokemon.boosts, [stat]: val } });
                  }}
                >-</button>
                <span className={`w-6 text-center text-xs ${
                  pokemon.boosts[stat] > 0 ? "text-[#78c850]" :
                  pokemon.boosts[stat] < 0 ? "text-[#e53935]" : ""
                }`}>
                  {pokemon.boosts[stat] > 0 ? `+${pokemon.boosts[stat]}` : pokemon.boosts[stat]}
                </span>
                <button
                  className="ev-quick-btn w-5 h-5 text-xs leading-none"
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
    </div>
  );
}
