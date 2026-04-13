"use client";

import { useState, useMemo } from "react";
import PokemonPanel from "@/components/PokemonPanel";
import FieldPanel from "@/components/FieldPanel";
import ResultPanel from "@/components/ResultPanel";
import type { Pokemon, Move, Field } from "@/lib/calc/types";
import { DEFAULT_FIELD } from "@/lib/calc/types";
import { createDefaultPokemon } from "@/lib/store";
import type { GameMode } from "@/lib/store";
import { calculateDamage, compareSpeed, calcBulk } from "@/lib/calc/calculate";

export default function Home() {
  const [gameMode, setGameMode] = useState<GameMode>("champions");
  const [attacker, setAttacker] = useState<Pokemon>(createDefaultPokemon());
  const [defender, setDefender] = useState<Pokemon>(createDefaultPokemon());
  const [attackerMoves, setAttackerMoves] = useState<(Move | null)[]>([null, null, null, null]);
  const [field, setField] = useState<Field>({ ...DEFAULT_FIELD });

  // 실시간 계산
  const results = useMemo(() => {
    return attackerMoves.map((move) => {
      if (!move || !attacker.name || !defender.name) {
        return { move: move!, result: null };
      }
      const result = calculateDamage(attacker, defender, move, field);
      return { move, result };
    }).filter((r) => r.move);
  }, [attacker, defender, attackerMoves, field]);

  const speedComparison = useMemo(() => {
    if (!attacker.name || !defender.name) return null;
    return compareSpeed(attacker, defender, field);
  }, [attacker, defender, field]);

  const bulk = useMemo(() => {
    if (!defender.name) return { physical: 0, special: 0 };
    return calcBulk(defender);
  }, [defender]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, var(--ds-bg-dark) 0%, #0f1923 100%)" }}>
      {/* 헤더 -- DS 상단 화면 스타일 */}
      <header className="relative px-4 py-3" style={{ borderBottom: "3px solid var(--ds-bg-light)" }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="pokeball-icon" />
            <h1 className="text-sm font-bold tracking-tight text-[var(--ds-text-light)]">
              <span className="text-[var(--ds-gold)]">*</span>
              {" "}포켓몬 데미지 계산기{" "}
              <span className="text-[var(--ds-gold)]">*</span>
            </h1>
            <span className="text-[9px] opacity-30 font-mono ml-1">v1.0</span>
          </div>

          {/* 모드 토글 */}
          <div className="mode-toggle">
            <button
              className={gameMode === "standard" ? "active" : ""}
              onClick={() => setGameMode("standard")}
            >
              본편
            </button>
            <button
              className={gameMode === "champions" ? "active" : ""}
              onClick={() => setGameMode("champions")}
            >
              포챔스
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 p-3 max-w-7xl mx-auto w-full">
        {/* 데스크톱: 3열 / 모바일: 세로 스택 */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* 공격측 */}
          <div className="lg:w-[360px] w-full flex-shrink-0">
            <PokemonPanel
              label="공격"
              pokemon={attacker}
              moves={attackerMoves}
              gameMode={gameMode}
              onPokemonChange={setAttacker}
              onMovesChange={setAttackerMoves}
            />
          </div>

          {/* 중앙: 필드 + 결과 */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <FieldPanel field={field} onFieldChange={setField} />
            <ResultPanel
              results={results}
              attacker={attacker}
              defender={defender}
              speedComparison={speedComparison}
              physicalBulk={bulk.physical}
              specialBulk={bulk.special}
            />
          </div>

          {/* 방어측 */}
          <div className="lg:w-[360px] w-full flex-shrink-0">
            <PokemonPanel
              label="방어"
              pokemon={defender}
              moves={[null, null, null, null]}
              gameMode={gameMode}
              onPokemonChange={setDefender}
              onMovesChange={() => {}}
            />
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="text-center text-[10px] opacity-20 py-3 font-mono">
        POKEMON DAMAGE CALCULATOR | DATA: PokeAPI + Supabase
      </footer>
    </div>
  );
}
