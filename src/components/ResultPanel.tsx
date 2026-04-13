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

function getKOColor(chance: number): string {
  if (chance >= 1) return "color: var(--ds-accent)";
  if (chance > 0.5) return "color: var(--ds-hp-yellow)";
  if (chance > 0) return "color: var(--ds-accent-green)";
  return "opacity: 0.5";
}

export default function ResultPanel({
  results, attacker, defender, speedComparison, physicalBulk, specialBulk,
}: ResultPanelProps) {
  if (results.length === 0 || !results.some((r) => r.result)) {
    return (
      <div className="battle-message text-center py-6">
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
        <div className="ds-panel-dark px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--ds-gold)]">스피드</span>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={speedComparison.first === "attacker" ? "text-[var(--ds-accent)] font-bold" : "opacity-60"}>
                {speedComparison.attackerSpeed}
              </span>
              <span className="text-[var(--ds-gold)] font-bold">vs</span>
              <span className={speedComparison.first === "defender" ? "text-[var(--ds-accent-blue)] font-bold" : "opacity-60"}>
                {speedComparison.defenderSpeed}
              </span>
              <span className="text-[10px] font-bold ml-1" style={{
                color: speedComparison.first === "attacker" ? "var(--ds-accent)"
                     : speedComparison.first === "defender" ? "var(--ds-accent-blue)"
                     : "var(--ds-gold)"
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
          <div key={idx} className="battle-message">
            {/* 기술 이름 헤더 */}
            <div className="flex items-center gap-2 mb-2 pb-1.5" style={{ borderBottom: "1px solid rgba(139,125,107,0.3)" }}>
              <span className="text-[10px] font-mono opacity-40">#{idx + 1}</span>
              <span className="font-bold text-sm">{move.nameKr || move.name}</span>
              <TypeBadge type={move.type} />
              <span className="text-[10px] opacity-50 font-mono">
                {move.category === "physical" ? "물리" : "특수"} / 위력:{result.power}
              </span>
              {eff.text && (
                <span className={`text-xs font-bold ml-auto ${eff.className}`}>
                  [{eff.text}]
                </span>
              )}
            </div>

            {/* 데미지 수치 */}
            <div className="flex items-baseline gap-3 mb-1.5">
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] opacity-40">데미지</span>
                <span className="font-mono font-bold text-base">
                  {result.minDamage}~{result.maxDamage}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] opacity-40">HP%</span>
                <span className="font-mono font-bold text-base" style={{ color: "var(--ds-accent)" }}>
                  {result.minPercent}%~{result.maxPercent}%
                </span>
              </div>
            </div>

            {/* HP 바 */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] opacity-40 w-6">HP</span>
              <div className="hp-bar flex-1">
                <div
                  className={`hp-bar-fill ${getHPBarClass(remainHP)}`}
                  style={{ width: `${Math.max(0, remainHPMin)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono opacity-60 w-12 text-right">
                {remainHP.toFixed(0)}~{remainHPMin.toFixed(0)}%
              </span>
            </div>

            {/* KO 판정 */}
            <div className="text-xs font-bold mb-1" style={getKOColor(result.koChance.chance) ? { color: undefined } : undefined}>
              <span style={(() => {
                const s = getKOColor(result.koChance.chance);
                const parts = s.split(":").map((p) => p.trim());
                if (parts[0] === "color") return { color: parts[1] };
                if (parts[0] === "opacity") return { opacity: Number(parts[1]) };
                return {};
              })()}>
                &gt;&gt; {result.koChance.text}
              </span>
            </div>

            {/* 급소 데미지 */}
            <div className="text-[10px] opacity-50 flex items-center gap-2">
              <span className="font-bold">급소:</span>
              <span className="font-mono">
                {result.critDamage.min}~{result.critDamage.max}
                {" "}({result.critDamage.minPercent}%~{result.critDamage.maxPercent}%)
              </span>
            </div>

            {/* 16단계 롤 */}
            <details className="text-[10px] opacity-40 mt-1">
              <summary className="cursor-pointer hover:opacity-60">난수 상세 (16단계)</summary>
              <div className="font-mono mt-1 leading-relaxed">
                {result.rolls.join(", ")}
              </div>
            </details>
          </div>
        );
      })}

      {/* 내구 수치 */}
      {defender.name && (
        <div className="ds-panel-dark px-3 py-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--ds-gold)] text-[10px]">내구 (방어측)</span>
            <div className="flex gap-3 font-mono">
              <span>
                <span className="opacity-50">물리:</span>
                <span className="font-bold ml-1">{physicalBulk.toLocaleString()}</span>
              </span>
              <span>
                <span className="opacity-50">특수:</span>
                <span className="font-bold ml-1">{specialBulk.toLocaleString()}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
