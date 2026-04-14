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
    attackerPriority: number;
    defenderPriority: number;
    reason: string;
  } | null;
  physicalBulk: number;
  specialBulk: number;
}

function getEffectivenessLabel(eff: number): { text: string; className: string } {
  if (eff === 0) return { text: "무효", className: "eff-immune" };
  if (eff < 1) return { text: "효과별로", className: "eff-not-very" };
  if (eff === 1) return { text: "", className: "eff-neutral" };
  if (eff === 2) return { text: "효과발군", className: "eff-super" };
  return { text: "효과굉장", className: "eff-ultra" };
}

function getHPBarClass(percent: number): string {
  if (percent > 50) return "hp-green";
  if (percent > 25) return "hp-yellow";
  return "hp-red";
}

function getKOBadge(n: number, chance: number): { label: string; className: string } {
  if (n === 1 && chance >= 1) return { label: "확정 1발", className: "damage-badge-ko" };
  if (n === 1) return { label: `난수 1발 ${(chance * 100).toFixed(0)}%`, className: "damage-badge-ko" };
  if (n === 2) return { label: chance >= 1 ? "확정 2발" : `난수 2발`, className: "damage-badge-2hko" };
  if (n === 3) return { label: chance >= 1 ? "확정 3발" : "난수 3발", className: "damage-badge-3hko" };
  if (n >= 999) return { label: "킬 불가", className: "damage-badge-safe" };
  return { label: `약 ${n}발`, className: "damage-badge-safe" };
}

export default function ResultPanel({
  results, attacker, defender, speedComparison, physicalBulk, specialBulk,
}: ResultPanelProps) {
  if (results.length === 0 || !results.some((r) => r.result)) {
    return (
      <div className="pixel-dialog text-center py-10 px-4">
        <div className="text-3xl mb-2" style={{ opacity: 0.3 }}>⚔️</div>
        <div className="text-sm mb-1" style={{ color: "#8b7e6a" }}>배틀 준비 중…</div>
        <div className="text-xs" style={{ color: "#b5a88c" }}>
          포켓몬과 기술을 선택해주세요
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* 스피드 비교 */}
      {speedComparison && (
        <div
          className="rounded-xl p-3"
          style={{
            background: "linear-gradient(135deg, #3a3d56 0%, #2b2d42 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px]" style={{ color: "#f0c040" }}>⚡ 선공 판정</span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{
                background: speedComparison.first === "attacker" ? "#e3350d"
                         : speedComparison.first === "defender" ? "#0075be"
                         : "#f0c040",
                color: "#fff",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
            >
              {speedComparison.first === "attacker" ? "▶ 공격측"
               : speedComparison.first === "defender" ? "◀ 방어측"
               : "= 동속"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span style={{ color: "#e3350d", minWidth: 40 }}>
              {speedComparison.attackerSpeed}
            </span>
            <div className="flex-1 flex items-center gap-1">
              <div className="speed-bar flex-1">
                <div
                  className="speed-bar-fill"
                  style={{
                    width: `${speedComparison.attackerSpeed / (speedComparison.attackerSpeed + speedComparison.defenderSpeed) * 100}%`,
                    background: "#e3350d",
                  }}
                />
              </div>
              <span className="text-[10px]" style={{ color: "#8b7e6a" }}>vs</span>
              <div className="speed-bar flex-1">
                <div
                  className="speed-bar-fill"
                  style={{
                    width: `${speedComparison.defenderSpeed / (speedComparison.attackerSpeed + speedComparison.defenderSpeed) * 100}%`,
                    background: "#0075be",
                    marginLeft: "auto",
                  }}
                />
              </div>
            </div>
            <span style={{ color: "#0075be", minWidth: 40, textAlign: "right" }}>
              {speedComparison.defenderSpeed}
            </span>
          </div>

          <div className="text-[10px] mt-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
            {speedComparison.reason}
            {(speedComparison.attackerPriority !== 0 || speedComparison.defenderPriority !== 0) && (
              <span className="ml-2">
                · 우선도 +{speedComparison.attackerPriority} / +{speedComparison.defenderPriority}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 기술별 결과 */}
      {results.map(({ move, result }, idx) => {
        if (!result) return null;

        const eff = getEffectivenessLabel(result.effectiveness);
        const koBadge = getKOBadge(result.koChance.n, result.koChance.chance);
        const remainHPMin = Math.max(0, 100 - result.maxPercent);
        const remainHPMax = Math.max(0, 100 - result.minPercent);

        return (
          <div key={idx} className="pixel-dialog">
            {/* 헤더: 기술명 + 타입 + KO 뱃지 */}
            <div className="flex items-center gap-2 flex-wrap mb-3 pb-2"
                 style={{ borderBottom: "2px dashed #e8dcb0" }}>
              <span className="text-xs w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "#f0c040", color: "#fff", fontSize: 11 }}>
                {idx + 1}
              </span>
              <span className="text-sm font-bold" style={{ color: "#3b2d1b" }}>
                {move.nameKr || move.name}
              </span>
              <TypeBadge type={move.type} />
              <span className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: "#f0ece0", color: "#5a4a20" }}>
                {move.category === "physical" ? "물리" : "특수"} · {result.power}
              </span>
              {eff.text && (
                <span className={`text-xs ${eff.className}`}>
                  [{eff.text}]
                </span>
              )}
              <span className={`damage-badge ${koBadge.className} ml-auto`}>
                {koBadge.label}
              </span>
            </div>

            {/* 데미지 메인 */}
            <div className="mb-3">
              <div
                className="rounded-xl p-3 flex items-center justify-between flex-wrap gap-2"
                style={{
                  background: "linear-gradient(135deg, #fff8e7 0%, #fef0c7 100%)",
                  border: "2px solid #f0c040",
                }}
              >
                <div>
                  <div className="text-xs mb-1" style={{ color: "#8b7e6a" }}>데미지</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold" style={{ color: "#e3350d" }}>
                      {result.minPercent.toFixed(1)}
                    </span>
                    <span className="text-base" style={{ color: "#8b7e6a" }}>
                      ~
                    </span>
                    <span className="text-3xl font-bold" style={{ color: "#e3350d" }}>
                      {result.maxPercent.toFixed(1)}
                    </span>
                    <span className="text-lg" style={{ color: "#8b7e6a" }}>%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs mb-1" style={{ color: "#8b7e6a" }}>실제 수치</div>
                  <div className="text-base font-bold" style={{ color: "#3b2d1b" }}>
                    {result.minDamage} ~ {result.maxDamage}
                  </div>
                </div>
              </div>
            </div>

            {/* HP 바: 남은 체력 시각화 */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] w-8" style={{ color: "#8b7e6a" }}>HP</span>
              <div className="hp-bar flex-1 relative">
                <div
                  className={`hp-bar-fill ${getHPBarClass(remainHPMin)}`}
                  style={{ width: `${remainHPMin}%` }}
                />
                {remainHPMax > remainHPMin && (
                  <div
                    className="absolute top-0 left-0 h-full opacity-40"
                    style={{
                      width: `${remainHPMax}%`,
                      background: getHPBarClass(remainHPMax) === "hp-green" ? "#4daf50"
                               : getHPBarClass(remainHPMax) === "hp-yellow" ? "#fbc02d" : "#e53935",
                      borderRadius: 4,
                    }}
                  />
                )}
              </div>
              <span className="text-[11px] w-20 text-right" style={{ color: "#3b2d1b" }}>
                {remainHPMin.toFixed(0)}~{remainHPMax.toFixed(0)}%
              </span>
            </div>

            {/* 연속기 */}
            {result.multiHit && (
              <div className="text-xs mt-2 p-2 rounded-lg"
                   style={{ background: "#fff8e7", border: "1px solid #e8dcb0" }}>
                <div className="mb-1 font-bold" style={{ color: "#8b7e6a" }}>
                  ⚡ 연속기 ({result.multiHit.hits.length}타)
                </div>
                {result.multiHit.hits.map((hit, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span style={{ color: "#b5a88c", width: 30 }}>{i + 1}타:</span>
                    <span style={{ color: "#5a4a20", width: 50 }}>위력 {hit.power}</span>
                    <span style={{ color: "#8b7e6a" }}>→</span>
                    <span style={{ color: "#3b2d1b" }}>{hit.minDamage}~{hit.maxDamage}</span>
                    <span style={{ color: "#e3350d" }}>({hit.minPercent}%~{hit.maxPercent}%)</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-1.5 pt-1.5 text-[11px] font-bold"
                     style={{ borderTop: "1px solid #e8dcb0" }}>
                  <span style={{ width: 30, color: "#8b7e6a" }}>총합:</span>
                  <span style={{ color: "#3b2d1b" }}>{result.multiHit.totalMin}~{result.multiHit.totalMax}</span>
                  <span style={{ color: "#e3350d" }}>
                    ({result.multiHit.totalMinPercent}%~{result.multiHit.totalMaxPercent}%)
                  </span>
                </div>
              </div>
            )}

            {/* 급소 + 난수 */}
            <div className="flex items-center gap-3 mt-2 text-[11px] flex-wrap">
              <span style={{ color: "#8b7e6a" }}>
                💥 급소: <span style={{ color: "#e3350d" }}>
                  {result.critDamage.minPercent}%~{result.critDamage.maxPercent}%
                </span>
              </span>
              <details className="cursor-pointer" style={{ color: "#b5a88c" }}>
                <summary className="hover:opacity-80 inline">난수 (16)</summary>
                <span className="ml-2">{result.rolls.join(", ")}</span>
              </details>
            </div>
          </div>
        );
      })}

      {/* 내구 수치 */}
      {defender.name && (
        <div
          className="rounded-xl p-3 flex items-center justify-between text-xs"
          style={{
            background: "linear-gradient(135deg, #3a3d56 0%, #2b2d42 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <span style={{ color: "#f0c040" }}>🛡️ 방어측 내구</span>
          <div className="flex gap-4">
            <span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>물리:</span>
              <span className="ml-1 font-bold" style={{ color: "#fff" }}>{physicalBulk.toLocaleString()}</span>
            </span>
            <span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>특수:</span>
              <span className="ml-1 font-bold" style={{ color: "#fff" }}>{specialBulk.toLocaleString()}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
