"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface Item {
  id: number;
  name_kr: string;
  name_en: string;
  damage_modifier: number | null;
  stat_modifier: string | null;
  stat_multiplier: number | null;
  condition: string | null;
}

const ITEM_DESC_MAP: Record<string, string> = {
  survives_ohko: "HP 풀일 때 일격기를 HP 1로 버팀",
  "heal_25%": "HP 50% 이하 시 HP 25% 회복",
  "heal_1/16": "매 턴 HP 1/16 회복",
  "heal_1/16_poison": "독 타입: 매 턴 HP 1/16 회복 / 그 외: 1/8 감소",
  "survive_10%": "10% 확률로 HP 1로 버팀",
  "contact_1/6": "접촉기로 공격받으면 상대 HP 1/6 감소",
  reset_stat_drop: "능력치 하락 1회 초기화",
  force_switch: "공격받으면 상대 강제 교체",
  switch_on_hit: "공격받으면 자신 교체",
  switch_on_stat_drop: "능력치 하락 시 자신 교체",
  super_effective_hit: "효과발군 피격 시 공격/특공 +2",
  prevent_stat_drop: "상대에 의한 능력치 하락 방지",
  ignore_hazards: "설치기 데미지 무시",
  ignore_weather_powder: "날씨 데미지/가루 기술 무효",
  heal_20hp: "HP 50% 이하 시 HP 20 회복",
  heal_10hp: "HP 50% 이하 시 HP 10 회복",
  cure_status: "상태이상 1회 회복",
  cure_paralysis: "마비 회복",
  cure_poison: "독 회복",
  cure_burn: "화상 회복",
  cure_freeze: "얼음 회복",
  cure_sleep: "잠듦 회복",
  "crit_rate+1": "급소율 +1 단계",
  "accuracy_1.1x": "명중률 1.1배",
  "spa+1_on_water_hit": "물 기술 피격 시 특공 +1",
  "atk+1_on_electric_hit": "전기 기술 피격 시 공격 +1",
  "atk+1_on_ice_hit": "얼음 기술 피격 시 공격 +1",
  screen_8turns: "벽 지속 8턴으로 연장",
  rain_8turns: "비 지속 8턴",
  sun_8turns: "쾌청 지속 8턴",
  snow_8turns: "설경 지속 8턴",
  sand_8turns: "모래바람 지속 8턴",
  "trap_1/6": "구속 데미지 1/6으로 증가",
  "def+1_grassy": "그래스필드 시 방어 +1",
  "def+1_electric": "일렉트릭필드 시 방어 +1",
  "spd+1_psychic": "사이코필드 시 특방 +1",
  "spd+1_misty": "미스트필드 시 특방 +1",
  "multi_hit_4-5": "연속기 최소 4회 보장",
  money_2x: "상금 2배",
  "heal_1/8_dmg": "준 데미지의 1/8 회복",
  "spa+1_on_sound": "소리 기술 사용 시 특공 +1",
  cure_infatuation: "헤롱헤롱/앵콜 등 해제",
  levitate_until_hit: "공격받을 때까지 부유 (땅 무효)",
  "spe+1_low_hp": "HP 25% 이하 시 스피드 +1",
  "spa+1_low_hp": "HP 25% 이하 시 특공 +1",
  "atk+1_low_hp": "HP 25% 이하 시 공격 +1",
  "def+1_low_hp": "HP 25% 이하 시 방어 +1",
  "spd+1_low_hp": "HP 25% 이하 시 특방 +1",
  priority_low_hp: "HP 25% 이하 시 다음 턴 선제행동",
};

function getItemDesc(item: Item): string {
  if (item.condition && ITEM_DESC_MAP[item.condition]) {
    return ITEM_DESC_MAP[item.condition];
  }
  if (item.damage_modifier && item.condition) {
    const cond = item.condition.startsWith("type:")
      ? `${item.condition.replace("type:", "")} 타입`
      : item.condition.startsWith("super_effective:")
        ? `${item.condition.replace("super_effective:", "")} 효과발군 시 1회`
        : item.condition === "super_effective"
          ? "효과발군 시"
          : item.condition === "physical"
            ? "물리기술"
            : item.condition === "special"
              ? "특수기술"
              : item.condition.startsWith("gem:")
                ? `${item.condition.replace("gem:", "")} 1회`
                : item.condition;
    return `데미지 x${item.damage_modifier} (${cond})`;
  }
  if (item.damage_modifier) return `데미지 x${item.damage_modifier}`;
  if (item.stat_modifier && item.stat_multiplier) {
    const stat =
      item.stat_modifier === "atk"
        ? "공격"
        : item.stat_modifier === "spa"
          ? "특공"
          : item.stat_modifier === "def"
            ? "방어"
            : item.stat_modifier === "spd"
              ? "특방"
              : item.stat_modifier === "spe"
                ? "스피드"
                : item.stat_modifier === "def,spd"
                  ? "방어/특방"
                  : item.stat_modifier === "atk,spa"
                    ? "공격/특공"
                    : item.stat_modifier;
    return `${stat} x${item.stat_multiplier}`;
  }
  return "-";
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("items")
      .select("id, name_kr, name_en, damage_modifier, stat_modifier, stat_multiplier, condition")
      .order("name_kr")
      .then(({ data }) => {
        if (data) setItems(data as Item[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.name_kr.toLowerCase().includes(q) ||
        i.name_en.toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#18181b" }}>
      <header
        className="border-b-4"
        style={{ background: "#202020", borderColor: "#303030" }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-base tracking-wide" style={{ color: "#f0f0f0" }}>
            ▶ 도구 목록
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
            placeholder="도구 검색 (한글/영문)..."
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
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t"
                    style={{ borderColor: "#d0d0c8" }}
                  >
                    <td className="px-3 py-1.5 font-bold">{item.name_kr}</td>
                    <td className="px-3 py-1.5" style={{ color: "#606060" }}>
                      {item.name_en}
                    </td>
                    <td className="px-3 py-1.5">{getItemDesc(item)}</td>
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
