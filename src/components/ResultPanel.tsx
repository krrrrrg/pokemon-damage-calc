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
  return { text: "효과발군×" + eff, className: "eff-ultra" };
}

function getHPBarClass(percent: number): string {
  if (percent > 50) return "hp-green";
  if (percent > 25) return "hp-yellow";
  return "hp-red";
}

const MOVE_NAMES_KR: Record<string, string> = {};

export default function ResultPanel({
  results, attacker, defender, speedComparison, physicalBulk, specialBulk,
}: ResultPanelProps) {
  if (results.length === 0 || !results.some((r) => r.result)) {
    return (
      <div className="battle-message text-center text-sm opacity-50">
        포켓몬과 기술을 선택��면 ��미지가 계산됩니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* 기술별 결과 */}
      {results.map(({ move, result }, idx) => {
        if (!result) return null;

        const eff = getEffectivenessLabel(result.effectiveness);
        const remainHP = Math.max(0, 100 - result.maxPercent);

        return (
          <div key={idx} className="battle-message">
            {/* 기술 이름 + 타입 */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-sm">{move.name}</span>
              <TypeBadge type={move.type} />
              <span className="text-xs opacity-50">
                {move.category === "physical" ? "물리" : "특수"} 위력:{result.power}
              </span>
              {eff.text && (
                <span className={`text-xs font-bold ${eff.className}`}>
                  [{eff.text}]
                </span>
              )}
            </div>

            {/* 데미지 */}
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono font-bold">
                {result.minDamage}~{result.maxDamage}
              </span>
              <span className="font-mono text-[var(--ds-accent)]">
                ({result.minPercent}%~{result.maxPercent}%)
              </span>
            </div>

            {/* HP 바 시각화 */}
            <div className="hp-bar mt-1 mb-1">
              <div
                className={`hp-bar-fill ${getHPBarClass(remainHP)}`}
                style={{ width: `${Math.max(0, remainHP)}%` }}
              />
            </div>

            {/* 킬 판정 */}
            <div className="text-xs font-bold mt-1">
              <span className={
                result.koChance.chance >= 1 ? "text-[var(--ds-accent)]" :
                result.koChance.chance > 0 ? "text-[var(--ds-hp-yellow)]" :
                "opacity-50"
              }>
                → {result.koChance.text}
              </span>
            </div>

            {/* 급소 */}
            <div className="text-[10px] opacity-60 mt-1">
              급소 시: {result.critDamage.min}~{result.critDamage.max} ({result.critDamage.minPercent}%~{result.critDamage.maxPercent}%)
            </div>

            {/* 16단계 롤 */}
            <details className="text-[10px] opacity-50 mt-1">
              <summary className="cursor-pointer">난수 상세 (16단계)</summary>
              <div className="font-mono mt-1">
                {result.rolls.join(", ")}
              </div>
            </details>
          </div>
        );
      })}

      {/* 스피드 비교 + ���구 */}
      <div className="ds-panel-dark p-3 text-xs">
        {speedComparison && (
          <div className="flex justify-between mb-2">
            <span className="font-bold text-[var(--ds-gold)]">스피드 비교</span>
            <span className="font-mono">
              {speedComparison.attackerSpeed} vs {speedComparison.defenderSpeed}
              {" → "}
              <span className="font-bold">
                {speedComparison.first === "attacker" ? "공격측 선공" :
                 speedComparison.first === "defender" ? "방어측 선공" : "동속"}
              </span>
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="font-bold text-[var(--ds-gold)]">방어측 내구</span>
          <span className="font-mono">
            물리: {physicalBulk.toLocaleString()} / 특수: {specialBulk.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
