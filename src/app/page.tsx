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
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg, #2b2d42 0%, #1a1b2e 100%)" }}
    >
      {/* Compact App Header */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-3 py-2 gap-2"
        style={{
          background: "linear-gradient(135deg, #e3350d 0%, #ff6b4a 50%, #f0c040 100%)",
          borderBottom: "3px solid #b71c1c",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <div className="flex items-center gap-2 flex-shrink-0">
          <img
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/25.gif"
            alt="Pikachu"
            style={{
              width: 38,
              height: 38,
              imageRendering: "pixelated",
              filter: "drop-shadow(1px 2px 0 rgba(0,0,0,0.25))",
            }}
          />
          <h1
            className="text-lg font-bold"
            style={{
              color: "#fff",
              textShadow: "0 2px 0 #b71c1c",
              letterSpacing: "0.5px",
            }}
          >
            데미지 계산기
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/wiki"
            className="flex items-center justify-center"
            title="위키"
            style={{
              width: 40,
              height: 40,
              background: "rgba(255,255,255,0.25)",
              borderRadius: 10,
              border: "2px solid rgba(255,255,255,0.4)",
              fontSize: 20,
            }}
          >
            📖
          </Link>
          <div
            className="flex items-center"
            style={{
              background: "rgba(0,0,0,0.2)",
              borderRadius: 10,
              border: "2px solid rgba(255,255,255,0.2)",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setGameMode("standard")}
              title="본편 모드"
              style={{
                width: 40,
                height: 36,
                fontSize: 16,
                fontWeight: "bold",
                color: gameMode === "standard" ? "#fff" : "rgba(255,255,255,0.6)",
                background: gameMode === "standard" ? "#e3350d" : "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              본
            </button>
            <button
              onClick={() => setGameMode("champions")}
              title="포챔스"
              style={{
                width: 40,
                height: 36,
                fontSize: 16,
                fontWeight: "bold",
                color: gameMode === "champions" ? "#fff" : "rgba(255,255,255,0.6)",
                background: gameMode === "champions" ? "#e3350d" : "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              챔
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Navigation - compact */}
      <div className="flex-shrink-0 px-2 pt-2">
        <div className="tab-nav max-w-5xl mx-auto" style={{ marginBottom: 0 }}>
          <button
            className={`tab-nav-btn ${activeTab === "attacker" ? "active-atk" : ""}`}
            onClick={() => setActiveTab("attacker")}
          >
            <span className="tab-nav-step">1</span>
            <span className="tab-emoji">⚔️</span>
            <span>공격</span>
          </button>
          <button
            className={`tab-nav-btn ${activeTab === "defender" ? "active-def" : ""}`}
            onClick={() => setActiveTab("defender")}
          >
            <span className="tab-nav-step">2</span>
            <span className="tab-emoji">🛡️</span>
            <span>방어</span>
          </button>
          <button
            className={`tab-nav-btn ${activeTab === "result" ? "active-result" : ""}`}
            onClick={() => setActiveTab("result")}
          >
            <span className="tab-nav-step">3</span>
            <span className="tab-emoji">📊</span>
            <span>결과</span>
          </button>
        </div>
      </div>

      {/* Content Area - fills remaining space */}
      <main className="flex-1 overflow-hidden flex flex-col px-2 pb-2 pt-2 max-w-5xl w-full mx-auto">
        {activeTab === "attacker" && (
          <div className="flex-1 flex flex-col min-h-0 gap-2">
            <div className="flex-1 min-h-0 overflow-auto">
              <PokemonPanel
                label="공격"
                pokemon={attacker}
                moves={attackerMoves}
                gameMode={gameMode}
                onPokemonChange={setAttacker}
                onMovesChange={setAttackerMoves}
              />
            </div>
            <button
              className="step-next-btn to-def flex-shrink-0"
              onClick={() => setActiveTab("defender")}
              disabled={!attacker.name}
              style={!attacker.name ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              🛡️ 방어 포켓몬 설정 →
            </button>
          </div>
        )}

        {activeTab === "defender" && (
          <div className="flex-1 flex flex-col min-h-0 gap-2">
            <div className="flex-1 min-h-0 overflow-auto">
              <PokemonPanel
                label="방어"
                pokemon={defender}
                moves={[null, null, null, null]}
                gameMode={gameMode}
                onPokemonChange={setDefender}
                onMovesChange={() => {}}
              />
            </div>
            <button
              className="step-next-btn to-result flex-shrink-0"
              onClick={() => setActiveTab("result")}
              disabled={!defender.name}
              style={!defender.name ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              📊 배틀 결과 확인 →
            </button>
          </div>
        )}

        {activeTab === "result" && (
          <div className="flex-1 flex flex-col min-h-0 gap-2">
            <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-2">
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
            <div className="grid grid-cols-2 gap-2 flex-shrink-0">
              <button
                className="pixel-btn"
                onClick={() => setActiveTab("attacker")}
                style={{ padding: "12px" }}
              >
                ⚔️ 공격 수정
              </button>
              <button
                className="pixel-btn"
                onClick={() => setActiveTab("defender")}
                style={{ padding: "12px" }}
              >
                🛡️ 방어 수정
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
