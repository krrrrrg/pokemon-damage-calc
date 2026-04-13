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

// 모든 주요 특성의 한글 효과 설명
const ABILITY_DESC: Record<string, string> = {
  // 공격 보정
  adaptability: "자속보정 2.0 (일반 1.5)",
  "tinted-lens": "효과별로 시 데미지 2배 (0.5→1.0)",
  sniper: "급소 시 데미지 2.25배 (일반 1.5)",
  "iron-fist": "펀치 기술 위력 1.2배",
  reckless: "반동 기술 위력 1.3배",
  "huge-power": "공격 2배",
  "pure-power": "공격 2배",
  "solar-power": "쾌청 시 특공 1.5배 (매턴 HP 1/8 감소)",
  "sand-force": "모래바람 시 바위/땅/강철 기술 1.3배",
  transistor: "전기 기술 1.3배",
  "strong-jaw": "물기 기술 1.5배",
  "mega-launcher": "파동 계열 기술 1.5배",
  sharpness: "베기 기술 1.5배",
  technician: "위력 60 이하 기술 1.5배",
  guts: "상태이상 시 공격 1.5배 (화상 감소 무시)",
  "toxic-boost": "독/맹독 시 물리 위력 1.5배",
  "flare-boost": "화상 시 특수 위력 1.5배",
  "fairy-aura": "필드 전체 페어리 기술 1.33배",
  "dark-aura": "필드 전체 악 기술 1.33배",
  "aura-break": "페어리/다크오라 반전 (1.33→0.75배)",
  "gorilla-tactics": "공격 1.5배 (같은 기술만 사용)",
  hustle: "공격 1.5배, 물리기 명중률 0.8배",
  rivalry: "같은 성별 1.25배, 다른 성별 0.75배",
  analytic: "후공 시 위력 1.3배",
  "tough-claws": "접촉기 위력 1.3배",
  "punk-rock": "소리 기술 위력 1.3배, 소리 피해 0.5배",
  "steelworker": "강철 기술 1.5배",
  "dragons-maw": "드래곤 기술 1.5배",
  "rocky-payload": "바위 기술 1.5배",

  // 방어 보정
  "solid-rock": "효과발군 피해 0.75배",
  filter: "효과발군 피해 0.75배",
  "prism-armor": "효과발군 피해 0.75배",
  "thick-fat": "불꽃/얼음 피해 0.5배",
  multiscale: "HP 풀일 때 피해 0.5배",
  "shadow-shield": "HP 풀일 때 피해 0.5배",
  "fur-coat": "물리 피해 0.5배",
  "ice-scales": "특수 피해 0.5배",
  "dry-skin": "물 무효+HP 회복 / 불꽃 1.25배",
  "water-absorb": "물 기술 무효, HP 1/4 회복",
  "volt-absorb": "전기 기술 무효, HP 1/4 회복",
  "flash-fire": "불꽃 무효, 이후 불꽃 기술 1.5배",
  levitate: "땅 기술 면역",
  "lightning-rod": "전기 기술 무효, 특공 +1",
  "storm-drain": "물 기술 무효, 특공 +1",
  "sap-sipper": "풀 기술 무효, 공격 +1",
  "motor-drive": "전기 기술 무효, 스피드 +1",
  "earth-eater": "땅 기술 무효, HP 회복",
  "wind-rider": "바람 기술 무효, 공격 +1",
  "well-baked-body": "불꽃 기술 무효, 방어 +2",
  "friend-guard": "더블배틀 파트너 피해 0.75배",

  // 핀치 (HP 1/3 이하)
  blaze: "HP 1/3 이하 시 불꽃 기술 1.5배",
  torrent: "HP 1/3 이하 시 물 기술 1.5배",
  overgrow: "HP 1/3 이하 시 풀 기술 1.5배",
  swarm: "HP 1/3 이하 시 벌레 기술 1.5배",

  // 스킨계
  refrigerate: "노말→얼음 타입 변환, 위력 1.2배",
  aerilate: "노말→비행 타입 변환, 위력 1.2배",
  pixilate: "노말→페어리 타입 변환, 위력 1.2배",
  galvanize: "노말→전기 타입 변환, 위력 1.2배",
  normalize: "모든 기술이 노말 타입으로",

  // 스피드
  chlorophyll: "쾌청 시 스피드 2배",
  "swift-swim": "비 시 스피드 2배",
  "sand-rush": "모래바람 시 스피드 2배",
  "slush-rush": "설경 시 스피드 2배",
  "surge-surfer": "일렉트릭필드 시 스피드 2배",
  "unburden": "도구 소비 시 스피드 2배",
  "speed-boost": "매턴 스피드 +1",
  "quick-feet": "상태이상 시 스피드 1.5배",

  // 날씨
  drought: "등장 시 쾌청 발동",
  drizzle: "등장 시 비 발동",
  "sand-stream": "등장 시 모래바람 발동",
  "snow-warning": "등장 시 설경 발동",
  "orichalcum-pulse": "등장 시 쾌청 + 쾌청 시 공격 1.33배",
  "hadron-engine": "등장 시 일렉트릭필드 + 특공 1.33배",

  // 필드
  "electric-surge": "등장 시 일렉트릭필드",
  "grassy-surge": "등장 시 그래스필드",
  "psychic-surge": "등장 시 사이코필드",
  "misty-surge": "등장 시 미스트필드",

  // 재앙
  "tablets-of-ruin": "자신 외 전체 공격 0.75배",
  "sword-of-ruin": "자신 외 전체 방어 0.75배",
  "vessel-of-ruin": "자신 외 전체 특공 0.75배",
  "beads-of-ruin": "자신 외 전체 특방 0.75배",

  // 더블
  "power-spot": "파트너 기술 위력 1.3배",
  battery: "파트너 특수기술 위력 1.3배",

  // 기타 주요
  intimidate: "등장 시 상대 공격 -1",
  "clear-body": "능력치 하락 방지",
  "white-smoke": "능력치 하락 방지",
  "full-metal-body": "능력치 하락 방지",
  contrary: "능력치 변화 반전 (상승↔하락)",
  "simple": "능력치 변화 2배 적용",
  "magic-bounce": "변화기 반사",
  "magic-guard": "기술 외 데미지 무효",
  sturdy: "HP 풀일 때 일격에 쓰러지지 않음 (HP 1)",
  "mold-breaker": "상대 특성 무시",
  "teravolt": "상대 특성 무시",
  "turboblaze": "상대 특성 무시",
  protean: "기술 사용 시 해당 타입으로 변경 (1회)",
  "libero": "기술 사용 시 해당 타입으로 변경 (1회)",
  imposter: "등장 시 상대로 변신",
  "wonder-guard": "효과발군만 피해 (신비의부적)",
  "poison-heal": "독 상태 시 매턴 HP 1/8 회복",
  "marvel-scale": "상태이상 시 방어 1.5배",
  "supreme-overlord": "쓰러진 동료 수만큼 공격/특공 상승",
};

function getAbilityDesc(ability: Ability): string {
  // 1) 하드코딩 설명
  const slug = ability.name_en.toLowerCase().replace(/ /g, "-");
  if (ABILITY_DESC[slug]) return ABILITY_DESC[slug];

  // 2) DB damage_effect
  if (ability.damage_effect) return ability.damage_effect;

  // 3) DB modifier
  if (ability.modifier_type && ability.modifier_value != null) {
    return `보정: x${ability.modifier_value}`;
  }

  return "-";
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
          <div className="pixel-panel p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#303030", color: "#fff" }}>
                  <th className="text-left px-3 py-2 whitespace-nowrap">특성</th>
                  <th className="text-left px-3 py-2">효과</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const desc = getAbilityDesc(a);
                  const hasEffect = desc !== "-";
                  return (
                    <tr
                      key={a.id}
                      className="border-t"
                      style={{ borderColor: "#d0d0c8" }}
                    >
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className="font-bold">{a.name_kr}</span>
                      </td>
                      <td className="px-3 py-1.5" style={{ color: hasEffect ? "#303030" : "#999" }}>
                        {desc}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-center" style={{ color: "#888" }}>
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
