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

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "none", label: "없음" },
  { value: "burn", label: "화상" },
  { value: "paralysis", label: "마비" },
  { value: "poison", label: "독" },
  { value: "toxic", label: "맹독" },
  { value: "sleep", label: "잠듦" },
  { value: "freeze", label: "얼음" },
];

const TERA_TYPES: (PokemonType | "stellar")[] = [
  "normal", "fighting", "flying", "poison", "ground", "rock",
  "bug", "ghost", "steel", "fire", "water", "grass",
  "electric", "psychic", "ice", "dragon", "dark", "fairy", "stellar",
];

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
  const [allAbilities, setAllAbilities] = useState<any[]>([]);
  const [pokemonAbilities, setPokemonAbilities] = useState<string[]>([]);
  const [abilitySearch, setAbilitySearch] = useState("");
  const [abilityResults, setAbilityResults] = useState<any[]>([]);
  const [showAbilityDropdown, setShowAbilityDropdown] = useState(false);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [itemResults, setItemResults] = useState<any[]>([]);
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 성격 + 특성 + 도구 로드
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
    // 실능 재계산
    const stats = calcAllStats(newPokemon.baseStats, newPokemon.ivs, newPokemon.evs, newPokemon.level, newPokemon.nature);
    newPokemon.maxHP = stats.hp;
    newPokemon.currentHP = stats.hp;

    onPokemonChange(newPokemon);
    setSearchQuery(row.name_kr);
    setShowDropdown(false);
    loadForms(row.pokedex_number);

    // 해당 포켓몬 특성 목록 (한글)
    const abilityNames = [row.ability1, row.ability2, row.hidden_ability].filter(Boolean);
    setPokemonAbilities(abilityNames);
    // 특성 한글 이름 세팅
    const ab = allAbilities.find((a: any) => a.name_en === row.ability1);
    setAbilitySearch(ab?.name_kr ?? row.ability1 ?? "");

    // 배울 수 있는 기술 로드
    supabase
      .from("pokemon_moves")
      .select("move_id")
      .eq("pokemon_id", row.id)
      .then(({ data: moveIds }) => {
        if (moveIds && moveIds.length > 0) {
          const ids = moveIds.map((m: any) => m.move_id);
          supabase
            .from("moves")
            .select("*")
            .in("id", ids)
            .neq("category", "status")
            .order("name_kr")
            .then(({ data: movesData }) => {
              if (movesData) setAvailableMoves(movesData);
            });
        }
      });
  }, [pokemon, onPokemonChange, loadForms]);

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
    onPokemonChange(newPokemon);
  }, [pokemon, onPokemonChange]);

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

    const filtered = availableMoves.filter(
      (m: any) => m.name_kr.includes(query) || m.name_en.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);
    const newResults = [...moveResults];
    newResults[slot] = filtered;
    setMoveResults(newResults);
  }, [moveSearch, moveResults, availableMoves]);

  const selectMove = useCallback((moveData: any, slot: number) => {
    const move: Move = {
      id: moveData.id,
      name: moveData.name_en,
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

  // 스프라이트 URL
  const spriteUrl = pokemon.name
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
        pokemon.name.includes("-mega") || pokemon.name.includes("-alola")
          ? pokemon.name.toLowerCase()
          : ""
      }.png`
    : null;

  return (
    <div className="ds-panel p-3 flex flex-col gap-2 w-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold text-[var(--ds-accent-blue)]">{label} 측</h2>
        <span className="text-xs opacity-60">Lv.{pokemon.level}</span>
      </div>

      {/* 포켓몬 검색 */}
      <div className="relative">
        <input
          className="ds-input w-full"
          placeholder="포켓몬 이름 검색..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        {showDropdown && searchResults.length > 0 && (
          <div className="autocomplete-dropdown" ref={dropdownRef}>
            {searchResults.map((row) => (
              <div
                key={row.id}
                className="autocomplete-item"
                onClick={() => selectPokemon(row)}
              >
                {row.sprite_url && (
                  <img src={row.sprite_url} alt="" className="w-6 h-6" style={{ imageRendering: "pixelated" }} />
                )}
                <span className="font-medium">{row.name_kr}</span>
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
              className={`text-[10px] px-2 py-0.5 rounded border ${
                pokemon.name === f.name_en
                  ? "bg-[var(--ds-accent-blue)] text-white border-[var(--ds-accent-blue)]"
                  : "bg-white border-[var(--ds-panel-border)]"
              }`}
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
          <div className="w-16 h-16 bg-white/50 rounded-lg flex items-center justify-center border border-[var(--ds-panel-border)]">
            <img
              src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.name.split("-")[0]}.png`}
              alt={pokemon.name}
              className="w-14 h-14"
              style={{ imageRendering: "pixelated" }}
              onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <TypeBadge type={pokemon.types[0]} />
              {pokemon.types[1] && <TypeBadge type={pokemon.types[1]} />}
            </div>
            <span className="text-[10px] opacity-50">{pokemon.name}</span>
          </div>
        </div>
      )}

      {/* 레벨 + 성격 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold opacity-60">레벨</label>
          <input
            className="ds-input w-full"
            type="number"
            min={1}
            max={100}
            value={pokemon.level}
            onChange={(e) => updateAndRecalc({ level: Number(e.target.value) || 50 })}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold opacity-60">성격</label>
          <select
            className="ds-select w-full"
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
        <label className="text-[10px] font-bold opacity-60">특성</label>
        {pokemonAbilities.length > 0 ? (
          <select
            className="ds-select w-full"
            value={pokemon.ability}
            onChange={(e) => {
              const ab = allAbilities.find((a: any) => a.name_en === e.target.value);
              setAbilitySearch(ab?.name_kr ?? e.target.value);
              onPokemonChange({ ...pokemon, ability: e.target.value });
            }}
          >
            {pokemonAbilities.map((abName) => {
              const ab = allAbilities.find((a: any) => a.name_en === abName);
              return (
                <option key={abName} value={abName}>
                  {ab?.name_kr ?? abName}
                </option>
              );
            })}
          </select>
        ) : (
          <div>
            <input
              className="ds-input w-full"
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
                    <span className="font-medium">{a.name_kr}</span>
                    <span className="text-[10px] opacity-40 ml-auto">{a.name_en}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 도구 */}
      <div className="relative">
        <label className="text-[10px] font-bold opacity-60">도구</label>
        <input
          className="ds-input w-full"
          value={itemSearch}
          onChange={(e) => {
            setItemSearch(e.target.value);
            setShowItemDropdown(true);
            const q = e.target.value;
            if (q.length > 0) {
              setItemResults(
                allItems.filter((i: any) =>
                  i.name_kr.includes(q) || i.name_en.toLowerCase().includes(q.toLowerCase())
                ).slice(0, 8)
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
            {itemResults.map((i: any) => (
              <div
                key={i.id}
                className="autocomplete-item"
                onClick={() => {
                  onPokemonChange({ ...pokemon, item: i.name_en.toLowerCase().replace(/ /g, "-") });
                  setItemSearch(i.name_kr);
                  setShowItemDropdown(false);
                }}
              >
                <span className="font-medium">{i.name_kr}</span>
                <span className="text-[10px] opacity-40 ml-auto">{i.name_en}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 상태이상 */}
      <div>
        <label className="text-[10px] font-bold opacity-60">상태이상</label>
        <select
          className="ds-select w-full"
          value={pokemon.status}
          onChange={(e) => onPokemonChange({ ...pokemon, status: e.target.value as Status })}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* 종족값 + 실능 */}
      {pokemon.baseStats.hp > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] font-bold opacity-60">
            <span>스탯</span>
            <span>종족값 / 노력치 / 실능</span>
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
        <summary className="cursor-pointer font-bold opacity-60 text-[10px]">
          개체값 (IV) {gameMode === "champions" ? "- 31 고정" : ""}
        </summary>
        <div className="grid grid-cols-6 gap-1 mt-1">
          {STAT_KEYS.map((stat) => (
            <div key={stat} className="text-center">
              <label className="text-[9px] opacity-50">{STAT_LABELS[stat]}</label>
              <input
                className="ds-input w-full text-center text-xs"
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

      {/* 노력치 */}
      <div>
        <div className="flex justify-between text-[10px] font-bold opacity-60 mb-1">
          <span>노력치 (EV)</span>
          <span className={evTotal > evMax ? "text-red-500" : ""}>
            {evTotal}/{evMax}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {STAT_KEYS.map((stat) => (
            <div key={stat} className="text-center">
              <label className="text-[9px] opacity-50">{STAT_LABELS[stat]}</label>
              <input
                className="ds-input w-full text-center text-xs"
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
            </div>
          ))}
        </div>
      </div>

      {/* 능력 랭크 */}
      <details className="text-xs">
        <summary className="cursor-pointer font-bold opacity-60 text-[10px]">능력 랭크</summary>
        <div className="grid grid-cols-5 gap-1 mt-1">
          {(["atk", "def", "spa", "spd", "spe"] as const).map((stat) => (
            <div key={stat} className="text-center">
              <label className="text-[9px] opacity-50">{STAT_LABELS[stat]}</label>
              <div className="flex items-center justify-center gap-0.5">
                <button
                  className="w-4 h-4 text-[10px] bg-white rounded border leading-none"
                  onClick={() => {
                    const val = Math.max(-6, pokemon.boosts[stat] - 1);
                    onPokemonChange({ ...pokemon, boosts: { ...pokemon.boosts, [stat]: val } });
                  }}
                >-</button>
                <span className="w-5 text-center text-[10px] font-mono">
                  {pokemon.boosts[stat] > 0 ? `+${pokemon.boosts[stat]}` : pokemon.boosts[stat]}
                </span>
                <button
                  className="w-4 h-4 text-[10px] bg-white rounded border leading-none"
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

      {/* 배틀 기믹 (메가/Z/다이맥스/테라스탈) */}
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
          <label className="text-[10px] font-bold opacity-60 mb-1 block">기술</label>
          {[0, 1, 2, 3].map((slot) => (
            <div key={slot} className="relative mb-1">
              <div className="flex items-center gap-1">
                <span className="text-[10px] opacity-40 w-3">{slot + 1}</span>
                <input
                  className="ds-input flex-1 text-xs"
                  placeholder="기술 검색..."
                  value={moveSearch[slot]}
                  onChange={(e) => searchMoves(e.target.value, slot)}
                  onFocus={() => setActiveMoveSlot(slot)}
                />
                {moves[slot] && (
                  <div className="flex items-center gap-1">
                    <TypeBadge type={moves[slot]!.type} />
                    <span className="text-[10px] font-mono">
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
                      <span className={`type-badge type-${m.type} text-[9px] px-1`}>
                        {m.type}
                      </span>
                      <span>{m.name_kr}</span>
                      <span className="text-[10px] opacity-50 ml-auto">
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
