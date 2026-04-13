"use client";

import type { Pokemon } from "@/lib/calc/types";
import type { GameMode } from "@/lib/store";
import { evToChampions, championsToEV } from "@/lib/store";

interface ChampionsToggleProps {
  gameMode: GameMode;
  pokemon: Pokemon;
  onPokemonChange: (pokemon: Pokemon) => void;
}

const STAT_SHORT: Record<string, string> = {
  hp: "H", atk: "A", def: "B", spa: "C", spd: "D", spe: "S",
};

const STAT_COLORS: Record<string, string> = {
  hp: "#f03830",
  atk: "#f08030",
  def: "#f8d030",
  spa: "#6890f0",
  spd: "#78c850",
  spe: "#f85888",
};

export default function ChampionsToggle({
  gameMode, pokemon, onPokemonChange,
}: ChampionsToggleProps) {
  if (gameMode !== "champions") return null;

  const convertToChampions = () => {
    const newEvs = {
      hp: evToChampions(pokemon.evs.hp),
      atk: evToChampions(pokemon.evs.atk),
      def: evToChampions(pokemon.evs.def),
      spa: evToChampions(pokemon.evs.spa),
      spd: evToChampions(pokemon.evs.spd),
      spe: evToChampions(pokemon.evs.spe),
    };
    onPokemonChange({
      ...pokemon,
      evs: newEvs,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    });
  };

  const convertToStandard = () => {
    const newEvs = {
      hp: championsToEV(pokemon.evs.hp),
      atk: championsToEV(pokemon.evs.atk),
      def: championsToEV(pokemon.evs.def),
      spa: championsToEV(pokemon.evs.spa),
      spd: championsToEV(pokemon.evs.spd),
      spe: championsToEV(pokemon.evs.spe),
    };
    onPokemonChange({ ...pokemon, evs: newEvs });
  };

  const evTotal = Object.values(pokemon.evs).reduce((a, b) => a + b, 0);

  return (
    <div className="text-xs px-2 py-2" style={{ background: "#f0f4f8", border: "2px solid #5080c0" }}>
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ color: "#5080c0" }}>포케 챔피언스</span>
        <span className={evTotal > 66 ? "text-red-600" : ""} style={{ color: evTotal > 66 ? undefined : "#5080c0" }}>
          {evTotal}/66
        </span>
      </div>

      <div className="text-[10px] opacity-50 mb-2 leading-relaxed">
        IV 31 고정 / EV 0~32 (총합 66) / 1포인트 = 스탯 +1
      </div>

      <div className="flex gap-1.5 mb-2">
        <button
          className="pixel-btn-green pixel-btn-sm"
          onClick={convertToChampions}
          title="본편 노력치 -> 포챔스 포인트 변환"
        >
          본편 &gt; 포챔스
        </button>
        <button
          className="pixel-btn-green pixel-btn-sm"
          onClick={convertToStandard}
          title="포챔스 포인트 -> 본편 노력치 변환"
        >
          포챔스 &gt; 본편
        </button>
      </div>

      {/* 현재 EV 값 미리보기 */}
      <div className="grid grid-cols-6 gap-1">
        {(["hp", "atk", "def", "spa", "spd", "spe"] as const).map((stat) => (
          <div key={stat} className="text-center">
            <div className="text-[10px]" style={{ color: STAT_COLORS[stat] }}>{STAT_SHORT[stat]}</div>
            <div style={{ color: "#5080c0" }}>{pokemon.evs[stat]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
