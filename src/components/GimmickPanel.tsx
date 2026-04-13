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

const GIMMICK_OPTIONS: { value: GimmickType; label: string }[] = [
  { value: "none", label: "없음" },
  { value: "mega", label: "메가진화" },
  { value: "z-move", label: "Z기술" },
  { value: "dynamax", label: "다이맥스" },
  { value: "gigantamax", label: "거다이맥스" },
  { value: "terastal", label: "테라스탈" },
];

const GIMMICK_COLORS: Record<GimmickType, string> = {
  none: "#505050",
  mega: "#a855f7",
  "z-move": "#f59e0b",
  dynamax: "#ef4444",
  gigantamax: "#dc2626",
  terastal: "#06b6d4",
};

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

    if (gimmick !== "terastal") {
      updates.teraActive = false;
    }
    if (gimmick === "terastal") {
      updates.teraActive = true;
      if (!pokemon.teraType) {
        updates.teraType = pokemon.types[0];
      }
    }

    onPokemonChange({ ...pokemon, ...updates });
  }, [pokemon, onPokemonChange]);

  const availableGimmicks = GIMMICK_OPTIONS.filter((g) => {
    if (g.value === "none") return true;
    if (g.value === "mega") return hasMegaForm;
    if (g.value === "gigantamax") return hasGmax;
    return true;
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="pixel-section-title">배틀 기믹</div>

      {/* 기믹 선택 버튼 */}
      <div className="flex flex-wrap gap-1">
        {availableGimmicks.map((g) => {
          const isActive = pokemon.gimmick === g.value;
          const color = GIMMICK_COLORS[g.value];
          return (
            <button
              key={g.value}
              className="pixel-btn pixel-btn-sm text-xs"
              style={{
                background: isActive ? color : undefined,
                borderColor: isActive ? color : undefined,
                color: isActive ? "#fff" : undefined,
              }}
              onClick={() => setGimmick(g.value)}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* 기믹별 설명 */}
      {pokemon.gimmick === "mega" && (
        <div className="text-xs px-2 py-1.5" style={{ background: "#f8f0ff", border: "2px solid #a855f7" }}>
          <span style={{ color: "#a855f7" }}>메가진화</span>
          <span className="opacity-60 ml-1">-- 종족값/특성/타입이 메가폼으로 변경</span>
        </div>
      )}

      {pokemon.gimmick === "z-move" && (
        <div className="text-xs px-2 py-1.5" style={{ background: "#fffbf0", border: "2px solid #f59e0b" }}>
          <span style={{ color: "#f59e0b" }}>Z기술</span>
          <span className="opacity-60 ml-1">-- 기술이 Z기술 위력으로 변환</span>
          <div className="mt-0.5 text-[10px] opacity-40">
            55이하:100 / 60~65:120 / 70~75:140 / 80~85:160 / 90~95:175 / 100:180
          </div>
        </div>
      )}

      {(pokemon.gimmick === "dynamax" || pokemon.gimmick === "gigantamax") && (
        <div className="text-xs px-2 py-1.5" style={{ background: "#fff0f0", border: "2px solid #ef4444" }}>
          <span style={{ color: "#ef4444" }}>
            {pokemon.gimmick === "gigantamax" ? "거다이맥스" : "다이맥스"}
          </span>
          <span className="opacity-60 ml-1">-- HP 2배, 기술이 다이맥스기로 변환</span>
        </div>
      )}

      {pokemon.gimmick === "terastal" && (
        <div className="text-xs px-2 py-1.5" style={{ background: "#f0fdff", border: "2px solid #06b6d4" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span style={{ color: "#06b6d4" }}>테라스탈</span>
            {pokemon.teraType && pokemon.teraType !== "stellar" && (
              <TypeBadge type={pokemon.teraType} />
            )}
            {pokemon.teraType === "stellar" && (
              <span className="type-badge type-stellar">스텔라</span>
            )}
          </div>
          <div className="flex flex-wrap gap-0.5">
            {TERA_TYPES.map((t) => (
              <button
                key={t}
                className="pixel-btn text-[10px] px-1.5 py-0.5"
                style={{
                  background: pokemon.teraType === t ? undefined : "#fff",
                  borderWidth: "1px",
                }}
                onClick={() => onPokemonChange({
                  ...pokemon,
                  teraType: t,
                  teraActive: true,
                })}
                title={TYPE_NAMES_KR[t]}
              >
                <span className={pokemon.teraType === t ? `type-badge type-${t}` : ""} style={{ padding: pokemon.teraType === t ? "0 4px" : undefined }}>
                  {TYPE_NAMES_KR[t]}
                </span>
              </button>
            ))}
            <button
              className="pixel-btn text-[10px] px-1.5 py-0.5"
              style={{
                background: pokemon.teraType === "stellar" ? undefined : "#fff",
                borderWidth: "1px",
              }}
              onClick={() => onPokemonChange({
                ...pokemon,
                teraType: "stellar",
                teraActive: true,
              })}
            >
              <span className={pokemon.teraType === "stellar" ? "type-badge type-stellar" : ""} style={{ padding: pokemon.teraType === "stellar" ? "0 4px" : undefined }}>
                스텔라
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
