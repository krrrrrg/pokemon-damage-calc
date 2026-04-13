"use client";

import type { DamageResult, Move, Pokemon } from "@/lib/calc/types";
import TypeBadge from "./TypeBadge";

interface ResultPanelProps {
  results: { move: Move; result: DamageResult | null }[];
  attacker: Pokemon;
  defender: Pokemon;
  speedComparison: {
    first: "attacker" | "defender" | "tie";
    attackerSpeed: number;
    defenderSpeed: number;
  } | null;
  physicalBulk: number;
  specialBulk: number;
}

function getEffectivenessLabel(eff: number): { text: string; className: string } {
  if (eff === 0) return { text: "무효", className: "eff-immune" };
  if (eff < 1) return { text: "효과별로", className: "eff-not-very" };
  if (eff === 1) return { text: "", className: "eff-neutral" };
  if (eff === 2) return { text: "효과발군", className: "eff-super" };
  return { text: "효과발군x" + eff, className: "eff-ultra" };
}

function getHPBarClass(percent: number): string {
  if (percent > 50) return "hp-green";
  if (percent > 25) return "hp-yellow";
  return "hp-red";
}

function getKOStyle(chance: number): React.CSSProperties {
  if (chance >= 1) return { color: "#e53935" };
  if (chance > 0.5) return { color: "#f8d030" };
  if (chance > 0) return { color: "#78c850" };
  return { opacity: 0.5 };
}

export default function ResultPanel({
  results, attacker, defender, speedComparison, physicalBulk, specialBulk,
}: ResultPanelProps) {
  if (results.length === 0 || !results.some((r) => r.result)) {
    return (
      <div className="pixel-dialog text-center py-6">
        <div className="text-sm opacity-40 mb-1">-- 배틀 결과 --</div>
        <div className="text-xs opacity-30">
          포켓몬과 기술을 선택하면 데미지가 계산됩니다.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* 스피드 비교 */}
      {speedComparison && (
        <div className="pixel-panel-dark px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#d4a017" }}>스피드</span>
            <div className="flex items-center gap-2 text-xs">
              <span className={speedComparison.first === "attacker" ? "text-[#e53935]" : "opacity-60"}>
                {speedComparison.attackerSpeed}
              </span>
              <span style={{ color: "#d4a017" }}>vs</span>
              <span className={speedComparison.first === "defender" ? "text-[#5080c0]" : "opacity-60"}>
                {speedComparison.defenderSpeed}
              </span>
              <span className="text-xs ml-1" style={{
                color: speedComparison.first === "attacker" ? "#e53935"
                     : speedComparison.first === "defender" ? "#5080c0"
                     : "#d4a017"
              }}>
                {speedComparison.first === "attacker" ? ">> 공격측 선공"
                 : speedComparison.first === "defender" ? "<< 방어측 선공"
                 : "== 동속"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 기술별 결과 */}
      {results.map(({ move, result }, idx) => {
        if (!result) return null;

        const eff = getEffectivenessLabel(result.effectiveness);
        const remainHP = Math.max(0, 100 - result.maxPercent);
        const remainHPMin = Math.max(0, 100 - result.minPercent);

        return (
          <div key={idx} className="pixel-dialog">
            {/* 기술 이름 헤더 */}
            <div className="flex items-center gap-2 mb-2 pb-1.5" style={{ borderBottom: "2px solid #c0c0b8" }}>
              <span className="text-xs opacity-40">#{idx + 1}</span>
              <span className="text-sm">{move.nameKr || move.name}</span>
              <TypeBadge type={move.type} />
              <span className="text-xs opacity-50">
                {move.category === "physical" ? "물리" : "특수"} / 위력:{result.power}
              </span>
              {eff.text && (
                <span className={`text-xs ml-auto ${eff.className}`}>
                  [{eff.text}]
                </span>
              )}
            </div>

            {/* 데미지 -- dialog style */}
            <div className="mb-1.5">
              <span className="text-xs opacity-60">▶ </span>
              <span className="text-sm">
                {move.nameKr || move.name} 으로{" "}
              </span>
              <span className="text-base" style={{ color: "#e53935" }}>
                {result.minPercent}%~{result.maxPercent}%
              </span>
              <span className="text-sm"> 데미지!</span>
            </div>

            {/* 수치 상세 */}
            <div className="flex items-baseline gap-3 mb-1.5 text-xs opacity-60">
              <span>데미지: {result.minDamage}~{result.maxDamage}</span>
            </div>

            {/* HP 바 */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs opacity-40 w-6">HP</span>
              <div className="hp-bar flex-1">
                <div
                  className={`hp-bar-fill ${getHPBarClass(remainHP)}`}
                  style={{ width: `${Math.max(0, remainHPMin)}%` }}
                />
              </div>
              <span className="text-xs opacity-60 w-14 text-right">
                {remainHP.toFixed(0)}~{remainHPMin.toFixed(0)}%
              </span>
            </div>

            {/* KO 판정 */}
            <div className="text-xs mb-1">
              <span style={getKOStyle(result.koChance.chance)}>
                ▶▶ {result.koChance.text}
              </span>
            </div>

            {/* 급소 데미지 */}
            <div className="text-xs opacity-50 flex items-center gap-2">
              <span>급소:</span>
              <span>
                {result.critDamage.min}~{result.critDamage.max}
                {" "}({result.critDamage.minPercent}%~{result.critDamage.maxPercent}%)
              </span>
            </div>

            {/* 16단계 롤 */}
            <details className="text-xs opacity-40 mt-1">
              <summary className="cursor-pointer hover:opacity-60">난수 상세 (16단계)</summary>
              <div className="mt-1 leading-relaxed">
                {result.rolls.join(", ")}
              </div>
            </details>
          </div>
        );
      })}

      {/* 내구 수치 */}
      {defender.name && (
        <div className="pixel-panel-dark px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: "#d4a017" }}>내구 (방어측)</span>
            <div className="flex gap-3">
              <span>
                <span className="opacity-50">물리:</span>
                <span className="ml-1">{physicalBulk.toLocaleString()}</span>
              </span>
              <span>
                <span className="opacity-50">특수:</span>
                <span className="ml-1">{specialBulk.toLocaleString()}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
