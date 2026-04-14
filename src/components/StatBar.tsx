"use client";

const STAT_COLORS: Record<string, string> = {
  hp: "#e53935",
  atk: "#f08030",
  def: "#f0c040",
  spa: "#6890f0",
  spd: "#4daf50",
  spe: "#f85888",
};

const STAT_LABELS: Record<string, string> = {
  hp: "H", atk: "A", def: "B", spa: "C", spd: "D", spe: "S",
};

const STAT_LABELS_FULL: Record<string, string> = {
  hp: "HP", atk: "공격", def: "방어", spa: "특공", spd: "특방", spe: "스피드",
};

interface StatBarProps {
  stat: string;
  base: number;
  actual: number;
  ev: number;
}

export default function StatBar({ stat, base, actual, ev }: StatBarProps) {
  const pct = Math.min(100, (base / 200) * 100);
  const color = STAT_COLORS[stat] ?? "#888";
  const label = STAT_LABELS[stat] ?? stat;
  const labelFull = STAT_LABELS_FULL[stat] ?? stat;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className="w-6 h-5 flex items-center justify-center rounded font-bold text-[11px]"
        style={{ background: color, color: "#fff", textShadow: "0 1px 1px rgba(0,0,0,0.3)" }}
        title={labelFull}
      >
        {label}
      </span>
      <span className="w-8 text-right text-[11px]" style={{ color: "#8b7e6a" }}>{base}</span>
      <div className="stat-bar flex-1">
        <div
          className="stat-bar-fill"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}dd)` }}
        />
      </div>
      <span
        className="w-10 text-right text-[10px]"
        style={{ color: ev > 0 ? color : "#bbb", fontWeight: ev > 0 ? "bold" : "normal" }}
      >
        {ev > 0 ? `+${ev}` : "·"}
      </span>
      <span
        className="w-10 text-right text-[12px] font-bold"
        style={{ color: "#3b2d1b" }}
      >
        {actual}
      </span>
    </div>
  );
}
