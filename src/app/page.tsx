"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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

  const results = useMemo(() => {
    return attackerMoves.map((move) => {
      if (!move || !attacker.name || !defender.name) {
        return { move: move!, result: null };
      }
      const result = calculateDamage(attacker, defender, move, field);
      return { move, result };
    }).filter((r) => r.move);
  }, [attacker, defender, attackerMoves, field]);

  const selectedMove = attackerMoves.find((m) => m !== null) ?? null;

  const speedComparison = useMemo(() => {
    if (!attacker.name || !defender.name) return null;
    return compareSpeed(attacker, defender, field, selectedMove);
  }, [attacker, defender, field, selectedMove]);

  const bulk = useMemo(() => {
    if (!defender.name) return { physical: 0, special: 0 };
    return calcBulk(defender);
  }, [defender]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #2b2d42 0%, #1a1b2e 100%)" }}>
      {/* Header */}
      <header
        className="relative"
        style={{
          background: "linear-gradient(135deg, #e3350d 0%, #ff6b4a 50%, #f0c040 100%)",
          boxShadow: "0 4px 20px rgba(227, 53, 13, 0.3)",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#fff",
                border: "3px solid #b71c1c",
                boxShadow: "inset 0 -14px 0 #e53935, inset 0 -16px 0 #333",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#fff",
                  border: "2px solid #333",
                }}
              />
            </div>
            <h1
              className="text-base tracking-wide"
              style={{ color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.3)" }}
            >
              포켓몬 데미지 계산기
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/wiki"
              className="text-xs px-3 py-1.5"
              style={{
                background: "rgba(255,255,255,0.2)",
                borderRadius: 8,
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              위키
            </Link>
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
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-3 max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Attacker */}
          <div className="lg:w-[380px] w-full flex-shrink-0">
            <PokemonPanel
              label="공격"
              pokemon={attacker}
              moves={attackerMoves}
              gameMode={gameMode}
              onPokemonChange={setAttacker}
              onMovesChange={setAttackerMoves}
            />
          </div>

          {/* Center: Field + Results */}
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

          {/* Defender */}
          <div className="lg:w-[380px] w-full flex-shrink-0">
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

      {/* Footer */}
      <footer className="text-center py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          Pokemon Damage Calculator | Data: PokeAPI + Supabase
        </span>
      </footer>
    </div>
  );
}
