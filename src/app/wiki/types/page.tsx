"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

const TYPE_ORDER = [
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "fairy",
] as const;

const TYPE_KR: Record<string, string> = {
  normal: "노말",
  fighting: "격투",
  flying: "비행",
  poison: "독",
  ground: "땅",
  rock: "바위",
  bug: "벌레",
  ghost: "고스트",
  steel: "강철",
  fire: "불꽃",
  water: "물",
  grass: "풀",
  electric: "전기",
  psychic: "에스퍼",
  ice: "얼음",
  dragon: "드래곤",
  dark: "악",
  fairy: "페어리",
};

interface Matchup {
  atk_type: string;
  def_type: string;
  multiplier: number;
}

function cellStyle(mult: number): React.CSSProperties {
  if (mult === 0) return { background: "#1a1a1a", color: "#555" };
  if (mult === 0.5) return { background: "#6b3030", color: "#ffa0a0" };
  if (mult === 2) return { background: "#2d6b30", color: "#b0ffb0" };
  return { background: "#f8f8f0", color: "#303030" };
}

function cellText(mult: number): string {
  if (mult === 0) return "0";
  if (mult === 0.5) return "0.5";
  if (mult === 1) return "";
  if (mult === 2) return "2";
  return String(mult);
}

export default function TypesPage() {
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("type_matchups")
      .select("atk_type, def_type, multiplier")
      .then(({ data }) => {
        if (data) setMatchups(data as Matchup[]);
        setLoading(false);
      });
  }, []);

  const grid = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of matchups) {
      map.set(`${m.atk_type}:${m.def_type}`, m.multiplier);
    }
    return map;
  }, [matchups]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#18181b" }}>
      <header
        className="border-b-4"
        style={{ background: "#202020", borderColor: "#303030" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-base tracking-wide" style={{ color: "#f0f0f0" }}>
            ▶ 타입 상성표
          </h1>
          <Link href="/wiki" className="pixel-btn text-xs">
            ← 위키
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="pixel-panel p-4 text-center text-sm">로딩 중...</div>
        ) : (
          <>
            <div className="mb-2 text-xs" style={{ color: "#888" }}>
              행 = 공격 타입, 열 = 방어 타입
            </div>
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
              <table
                className="text-xs"
                style={{
                  borderCollapse: "collapse",
                  border: "2px solid #303030",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        background: "#303030",
                        color: "#fff",
                        padding: "4px 6px",
                        border: "1px solid #505050",
                        position: "sticky",
                        left: 0,
                        zIndex: 2,
                      }}
                    >
                      공/방
                    </th>
                    {TYPE_ORDER.map((t) => (
                      <th
                        key={t}
                        style={{
                          padding: "2px 1px",
                          border: "1px solid #505050",
                          background: "#303030",
                        }}
                      >
                        <span className={`type-badge type-${t}`} style={{ fontSize: "10px", padding: "1px 4px" }}>
                          {TYPE_KR[t]}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TYPE_ORDER.map((atk) => (
                    <tr key={atk}>
                      <td
                        style={{
                          padding: "2px 4px",
                          border: "1px solid #505050",
                          background: "#303030",
                          position: "sticky",
                          left: 0,
                          zIndex: 1,
                        }}
                      >
                        <span
                          className={`type-badge type-${atk}`}
                          style={{ fontSize: "10px", padding: "1px 4px" }}
                        >
                          {TYPE_KR[atk]}
                        </span>
                      </td>
                      {TYPE_ORDER.map((def) => {
                        const mult = grid.get(`${atk}:${def}`) ?? 1;
                        return (
                          <td
                            key={def}
                            style={{
                              ...cellStyle(mult),
                              padding: "4px 6px",
                              border: "1px solid #505050",
                              textAlign: "center",
                              fontWeight: mult !== 1 ? "bold" : "normal",
                              minWidth: "28px",
                            }}
                          >
                            {cellText(mult)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4 mt-3 text-xs" style={{ color: "#aaa" }}>
              <span>
                <span style={{ background: "#2d6b30", color: "#b0ffb0", padding: "1px 6px" }}>2</span> 효과발군
              </span>
              <span>
                <span style={{ background: "#6b3030", color: "#ffa0a0", padding: "1px 6px" }}>0.5</span> 효과미흡
              </span>
              <span>
                <span style={{ background: "#1a1a1a", color: "#555", padding: "1px 6px" }}>0</span> 무효
              </span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
