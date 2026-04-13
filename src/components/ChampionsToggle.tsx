"use client";

import type { Pokemon } from "@/lib/calc/types";
import type { GameMode } from "@/lib/store";
import { evToChampions, championsToEV } from "@/lib/store";

interface ChampionsToggleProps {
  gameMode: GameMode;
  pokemon: Pokemon;
  onPokemonChange: (pokemon: Pokemon) => void;
}

const STAT_LABELS: Record<string, string> = {
  hp: "HP", atk: "공격", def: "방어", spa: "특공", spd: "특방", spe: "스피드",
};

export default function ChampionsToggle({
  gameMode, pokemon, onPokemonChange,
}: ChampionsToggleProps) {
  if (gameMode !== "champions") return null;

  // 본편 → 포챔스 노력치 변환
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

  // 포챔스 → 본편 노력치 변환
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
    <div className="text-[10px] px-2 py-1.5 rounded bg-blue-50 border border-blue-200">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-blue-700">포챔스 모드</span>
        <span className={`font-mono ${evTotal > 66 ? "text-red-500" : "text-blue-600"}`}>
          {evTotal}/66
        </span>
      </div>

      <div className="text-[9px] opacity-60 mb-1.5">
        개체값 31 고정 / 노력치 0~32 (총합 66) / 1포인트 = 스탯 +1
      </div>

      <div className="flex gap-1">
        <button
          className="ds-btn text-[9px] px-2 py-0.5"
          onClick={convertToChampions}
          title="본편 노력치 → 포챔스 포인트 변환"
        >
          본편→포챔스 변환
        </button>
        <button
          className="ds-btn text-[9px] px-2 py-0.5"
          onClick={convertToStandard}
          title="포챔스 포인트 → 본편 노력치 변환"
        >
          포챔스→본편 변환
        </button>
      </div>

      {/* 변환 결과 미리보기 */}
      <div className="grid grid-cols-6 gap-1 mt-1.5">
        {(["hp", "atk", "def", "spa", "spd", "spe"] as const).map((stat) => (
          <div key={stat} className="text-center">
            <div className="text-[8px] opacity-40">{STAT_LABELS[stat]}</div>
            <div className="font-mono font-bold text-blue-700">{pokemon.evs[stat]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
