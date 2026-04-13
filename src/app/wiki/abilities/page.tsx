"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface Ability {
  id: number;
  name_kr: string;
  name_en: string;
  damage_effect: string | null;
  modifier_type: string | null;
  modifier_value: number | null;
}

function describeEffect(a: Ability): string {
  if (!a.damage_effect && !a.modifier_type) return "-";
  const parts: string[] = [];
  if (a.damage_effect) parts.push(a.damage_effect);
  if (a.modifier_type && a.modifier_value != null) {
    parts.push(`${a.modifier_type} x${a.modifier_value}`);
  }
  return parts.join(" / ") || "-";
}

export default function AbilitiesPage() {
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("abilities")
      .select("id, name_kr, name_en, damage_effect, modifier_type, modifier_value")
      .order("name_kr")
      .then(({ data }) => {
        if (data) setAbilities(data as Ability[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return abilities;
    const q = search.toLowerCase();
    return abilities.filter(
      (a) =>
        a.name_kr.toLowerCase().includes(q) ||
        a.name_en.toLowerCase().includes(q)
    );
  }, [abilities, search]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#18181b" }}>
      <header
        className="border-b-4"
        style={{ background: "#202020", borderColor: "#303030" }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-base tracking-wide" style={{ color: "#f0f0f0" }}>
            ▶ 특성 목록
          </h1>
          <Link href="/wiki" className="pixel-btn text-xs">
            ← 위키
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
        <div className="mb-3">
          <input
            type="text"
            className="pixel-input w-full"
            placeholder="특성 검색 (한글/영문)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="pixel-panel p-4 text-center text-sm">로딩 중...</div>
        ) : (
          <div className="pixel-panel p-0">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#303030", color: "#fff" }}>
                  <th className="text-left px-3 py-2">한글명</th>
                  <th className="text-left px-3 py-2">영문명</th>
                  <th className="text-left px-3 py-2">효과</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t"
                    style={{ borderColor: "#d0d0c8" }}
                  >
                    <td className="px-3 py-1.5 font-bold">{a.name_kr}</td>
                    <td className="px-3 py-1.5" style={{ color: "#606060" }}>
                      {a.name_en}
                    </td>
                    <td className="px-3 py-1.5">{describeEffect(a)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center" style={{ color: "#888" }}>
                      결과 없음
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-2 text-xs" style={{ color: "#606060" }}>
          총 {filtered.length}개
        </div>
      </main>
    </div>
  );
}
