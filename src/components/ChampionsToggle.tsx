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
  hp: "#f44336",
  atk: "#ff9800",
  def: "#ffd600",
  spa: "#42a5f5",
  spd: "#66bb6a",
  spe: "#ec407a",
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
    <div className="text-[10px] px-2 py-2 rounded-md" style={{ background: "rgba(69,123,157,0.1)", border: "1.5px solid rgba(69,123,157,0.3)" }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-bold" style={{ color: "var(--ds-accent-blue)" }}>POKE CHAMPIONS</span>
        </div>
        <span className={`font-mono font-bold ${evTotal > 66 ? "text-red-600" : ""}`} style={{ color: evTotal > 66 ? undefined : "var(--ds-accent-blue)" }}>
          {evTotal}/66
        </span>
      </div>

      <div className="text-[9px] opacity-50 mb-2 leading-relaxed">
        IV 31 고정 / EV 0~32 (총합 66) / 1포인트 = 스탯 +1
      </div>

      <div className="flex gap-1.5 mb-2">
        <button
          className="ds-btn ds-btn-sm"
          onClick={convertToChampions}
          title="본편 노력치 -> 포챔스 포인트 변환"
        >
          본편 &gt; 포챔스
        </button>
        <button
          className="ds-btn ds-btn-sm"
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
            <div className="text-[8px] font-bold" style={{ color: STAT_COLORS[stat] }}>{STAT_SHORT[stat]}</div>
            <div className="font-mono font-bold" style={{ color: "var(--ds-accent-blue)" }}>{pokemon.evs[stat]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
