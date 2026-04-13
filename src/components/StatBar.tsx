"use client";

const STAT_COLORS: Record<string, string> = {
  hp: "#f44336",
  atk: "#ff9800",
  def: "#ffd600",
  spa: "#42a5f5",
  spd: "#66bb6a",
  spe: "#ec407a",
};

const STAT_LABELS: Record<string, string> = {
  hp: "H", atk: "A", def: "B", spa: "C", spd: "D", spe: "S",
};

interface StatBarProps {
  stat: string;
  base: number;
  actual: number;
  ev: number;
}

export default function StatBar({ stat, base, actual, ev }: StatBarProps) {
  const pct = Math.min(100, (base / 255) * 100);
  const color = STAT_COLORS[stat] ?? "#888";
  const label = STAT_LABELS[stat] ?? stat;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-4 font-bold text-center" style={{ color }}>{label}</span>
      <span className="w-8 text-right font-mono">{base}</span>
      <div className="stat-bar flex-1">
        <div
          className="stat-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="w-8 text-right font-mono text-[11px] opacity-70">{ev > 0 ? `+${ev}` : ""}</span>
      <span className="w-10 text-right font-bold font-mono">{actual}</span>
    </div>
  );
}
