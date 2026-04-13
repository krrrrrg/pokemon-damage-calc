"use client";

import { useCallback } from "react";
import type { Pokemon, GimmickType, PokemonType } from "@/lib/calc/types";
import TypeBadge from "./TypeBadge";

interface GimmickPanelProps {
  pokemon: Pokemon;
  onPokemonChange: (pokemon: Pokemon) => void;
  hasMegaForm: boolean;
  hasGmax: boolean;
}

const GIMMICK_OPTIONS: { value: GimmickType; label: string; color: string }[] = [
  { value: "none", label: "없음", color: "" },
  { value: "mega", label: "메가진화", color: "bg-gradient-to-r from-pink-500 to-purple-500" },
  { value: "z-move", label: "Z기술", color: "bg-gradient-to-r from-yellow-400 to-orange-500" },
  { value: "dynamax", label: "다이맥스", color: "bg-gradient-to-r from-red-500 to-red-700" },
  { value: "gigantamax", label: "거다이맥스", color: "bg-gradient-to-r from-red-600 to-pink-600" },
  { value: "terastal", label: "테라스탈", color: "bg-gradient-to-r from-cyan-400 to-blue-500" },
];

const TERA_TYPES: PokemonType[] = [
  "normal", "fighting", "flying", "poison", "ground", "rock",
  "bug", "ghost", "steel", "fire", "water", "grass",
  "electric", "psychic", "ice", "dragon", "dark", "fairy",
];

const TYPE_NAMES_KR: Record<string, string> = {
  normal: "노말", fighting: "격투", flying: "비행", poison: "독",
  ground: "땅", rock: "바위", bug: "벌레", ghost: "고스트",
  steel: "강철", fire: "불꽃", water: "물", grass: "풀",
  electric: "전기", psychic: "에스퍼", ice: "얼음", dragon: "드래곤",
  dark: "악", fairy: "페어리",
};

export default function GimmickPanel({
  pokemon, onPokemonChange, hasMegaForm, hasGmax,
}: GimmickPanelProps) {

  const setGimmick = useCallback((gimmick: GimmickType) => {
    const updates: Partial<Pokemon> = { gimmick };

    // 기믹 전환 시 테라 상태 정리
    if (gimmick !== "terastal") {
      updates.teraActive = false;
    }
    if (gimmick === "terastal") {
      updates.teraActive = true;
      if (!pokemon.teraType) {
        updates.teraType = pokemon.types[0]; // 기본타입으로 초기화
      }
    }

    onPokemonChange({ ...pokemon, ...updates });
  }, [pokemon, onPokemonChange]);

  // 사용 가능한 기믹 필터링
  const availableGimmicks = GIMMICK_OPTIONS.filter((g) => {
    if (g.value === "none") return true;
    if (g.value === "mega") return hasMegaForm;
    if (g.value === "gigantamax") return hasGmax;
    return true; // z-move, dynamax, terastal은 항상 가능
  });

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-bold opacity-60">배틀 기믹</label>

      {/* 기믹 선택 버튼 */}
      <div className="flex flex-wrap gap-1">
        {availableGimmicks.map((g) => (
          <button
            key={g.value}
            className={`text-[10px] px-2 py-1 rounded border font-bold transition-all ${
              pokemon.gimmick === g.value
                ? `${g.color || "bg-gray-500"} text-white border-transparent shadow-md`
                : "bg-white border-[var(--ds-panel-border)] text-[var(--ds-text)]"
            }`}
            onClick={() => setGimmick(g.value)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* 기믹별 추가 UI */}
      {pokemon.gimmick === "mega" && (
        <div className="text-[10px] px-2 py-1.5 rounded bg-purple-50 border border-purple-200">
          <span className="font-bold text-purple-700">메가진화</span>
          <span className="opacity-60 ml-1">— 종족값/특성/타입이 메가폼으로 변경됩니다</span>
        </div>
      )}

      {pokemon.gimmick === "z-move" && (
        <div className="text-[10px] px-2 py-1.5 rounded bg-orange-50 border border-orange-200">
          <span className="font-bold text-orange-700">Z기술</span>
          <span className="opacity-60 ml-1">— 선택된 기술이 Z기술 위력으로 자동 변환됩니다</span>
          <div className="mt-1 text-[9px] opacity-50">
            원본 위력 → Z위력: 55이하→100 / 60~65→120 / 70~75→140 / 80~85→160 / 90~95→175 / 100→180
          </div>
        </div>
      )}

      {(pokemon.gimmick === "dynamax" || pokemon.gimmick === "gigantamax") && (
        <div className="text-[10px] px-2 py-1.5 rounded bg-red-50 border border-red-200">
          <span className="font-bold text-red-700">
            {pokemon.gimmick === "gigantamax" ? "거다이맥스" : "다이맥스"}
          </span>
          <span className="opacity-60 ml-1">— HP 2배, 기술이 다이맥스기로 변환됩니다</span>
        </div>
      )}

      {pokemon.gimmick === "terastal" && (
        <div className="text-[10px] px-2 py-1.5 rounded bg-cyan-50 border border-cyan-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-cyan-700">테라스탈</span>
            {pokemon.teraType && pokemon.teraType !== "stellar" && (
              <TypeBadge type={pokemon.teraType} />
            )}
            {pokemon.teraType === "stellar" && (
              <span className="type-badge type-stellar">스텔라</span>
            )}
          </div>
          <div className="flex flex-wrap gap-0.5 mt-1">
            {TERA_TYPES.map((t) => (
              <button
                key={t}
                className={`text-[9px] px-1.5 py-0.5 rounded transition-all ${
                  pokemon.teraType === t
                    ? `type-${t} text-white`
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                onClick={() => onPokemonChange({
                  ...pokemon,
                  teraType: t,
                  teraActive: true,
                })}
                title={TYPE_NAMES_KR[t]}
              >
                {TYPE_NAMES_KR[t]}
              </button>
            ))}
            <button
              className={`text-[9px] px-1.5 py-0.5 rounded transition-all ${
                pokemon.teraType === "stellar"
                  ? "type-stellar text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => onPokemonChange({
                ...pokemon,
                teraType: "stellar",
                teraActive: true,
              })}
            >
              스텔라
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
