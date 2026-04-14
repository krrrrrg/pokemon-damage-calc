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

type TabKey = "attacker" | "defender" | "result";

export default function Home() {
  const [gameMode, setGameMode] = useState<GameMode>("champions");
  const [attacker, setAttacker] = useState<Pokemon>(createDefaultPokemon());
  const [defender, setDefender] = useState<Pokemon>(createDefaultPokemon());
  const [attackerMoves, setAttackerMoves] = useState<(Move | null)[]>([null, null, null, null]);
  const [field, setField] = useState<Field>({ ...DEFAULT_FIELD });
  const [activeTab, setActiveTab] = useState<TabKey>("attacker");

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
          borderBottom: "4px solid #b71c1c",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif"
              alt="Pikachu"
              className="hidden sm:block flex-shrink-0"
              style={{
                width: 64,
                height: 64,
                imageRendering: "pixelated",
                filter: "drop-shadow(2px 3px 0 rgba(0,0,0,0.25))",
              }}
            />
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png"
              alt="Pikachu"
              className="sm:hidden flex-shrink-0"
              style={{
                width: 52,
                height: 52,
                imageRendering: "pixelated",
                filter: "drop-shadow(2px 3px 0 rgba(0,0,0,0.25))",
              }}
            />
            <div className="flex flex-col min-w-0">
              <h1
                className="text-xl sm:text-2xl tracking-wide truncate"
                style={{
                  color: "#fff",
                  textShadow: "0 2px 0 #b71c1c, 0 3px 6px rgba(0,0,0,0.3)",
                  letterSpacing: "1px",
                }}
              >
                포켓몬 데미지 계산기
              </h1>
              <span
                className="text-xs sm:text-sm hidden sm:block"
                style={{ color: "rgba(255,255,255,0.85)", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
              >
                POKEMON DAMAGE CALCULATOR
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/wiki"
              className="text-sm px-3 py-2 hidden sm:inline-flex"
              style={{
                background: "rgba(255,255,255,0.25)",
                borderRadius: 10,
                color: "#fff",
                border: "2px solid rgba(255,255,255,0.4)",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
            >
              📖 위키
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
      <main className="flex-1 p-3 max-w-5xl mx-auto w-full">
        {/* Tab Navigation */}
        <div className="tab-nav">
          <button
            className={`tab-nav-btn ${activeTab === "attacker" ? "active-atk" : ""}`}
            onClick={() => setActiveTab("attacker")}
          >
            <span className="tab-nav-step">1</span>
            <span className="tab-emoji">⚔️</span>
            <span className="hidden sm:inline">공격 포켓몬</span>
            <span className="sm:hidden">공격</span>
          </button>
          <button
            className={`tab-nav-btn ${activeTab === "defender" ? "active-def" : ""}`}
            onClick={() => setActiveTab("defender")}
          >
            <span className="tab-nav-step">2</span>
            <span className="tab-emoji">🛡️</span>
            <span className="hidden sm:inline">방어 포켓몬</span>
            <span className="sm:hidden">방어</span>
          </button>
          <button
            className={`tab-nav-btn ${activeTab === "result" ? "active-result" : ""}`}
            onClick={() => setActiveTab("result")}
          >
            <span className="tab-nav-step">3</span>
            <span className="tab-emoji">📊</span>
            <span className="hidden sm:inline">배틀 결과</span>
            <span className="sm:hidden">결과</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex flex-col gap-3">
          {activeTab === "attacker" && (
            <>
              <PokemonPanel
                label="공격"
                pokemon={attacker}
                moves={attackerMoves}
                gameMode={gameMode}
                onPokemonChange={setAttacker}
                onMovesChange={setAttackerMoves}
              />
              <button
                className="step-next-btn to-def"
                onClick={() => setActiveTab("defender")}
                disabled={!attacker.name}
                style={!attacker.name ? { opacity: 0.5, cursor: "not-allowed" } : {}}
              >
                🛡️ 방어 포켓몬 설정하기 →
              </button>
            </>
          )}

          {activeTab === "defender" && (
            <>
              <PokemonPanel
                label="방어"
                pokemon={defender}
                moves={[null, null, null, null]}
                gameMode={gameMode}
                onPokemonChange={setDefender}
                onMovesChange={() => {}}
              />
              <button
                className="step-next-btn to-result"
                onClick={() => setActiveTab("result")}
                disabled={!defender.name}
                style={!defender.name ? { opacity: 0.5, cursor: "not-allowed" } : {}}
              >
                📊 배틀 결과 확인 →
              </button>
            </>
          )}

          {activeTab === "result" && (
            <>
              <FieldPanel field={field} onFieldChange={setField} />
              <ResultPanel
                results={results}
                attacker={attacker}
                defender={defender}
                speedComparison={speedComparison}
                physicalBulk={bulk.physical}
                specialBulk={bulk.special}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="pixel-btn"
                  onClick={() => setActiveTab("attacker")}
                  style={{ padding: "14px", fontSize: 15 }}
                >
                  ⚔️ 공격 수정
                </button>
                <button
                  className="pixel-btn"
                  onClick={() => setActiveTab("defender")}
                  style={{ padding: "14px", fontSize: 15 }}
                >
                  🛡️ 방어 수정
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 flex flex-col items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2 opacity-70">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png" alt="" width={36} height={36} style={{ imageRendering: "pixelated" }} />
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png" alt="" width={36} height={36} style={{ imageRendering: "pixelated" }} />
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png" alt="" width={36} height={36} style={{ imageRendering: "pixelated" }} />
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" alt="" width={36} height={36} style={{ imageRendering: "pixelated" }} />
        </div>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          Pokemon Damage Calculator · PokeAPI + Supabase
        </span>
      </footer>
    </div>
  );
}
