"use client";

const STAT_COLORS: Record<string, string> = {
  hp: "#f03830",
  atk: "#f08030",
  def: "#f8d030",
  spa: "#6890f0",
  spd: "#78c850",
  spe: "#f85888",
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
      <span className="w-4 text-center" style={{ color }}>{label}</span>
      <span className="w-8 text-right">{base}</span>
      <div className="stat-bar flex-1">
        <div
          className="stat-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="w-8 text-right text-xs opacity-70">{ev > 0 ? `+${ev}` : ""}</span>
      <span className="w-10 text-right">{actual}</span>
    </div>
  );
}
