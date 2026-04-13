"use client";

import type { Field, Weather, Terrain, Screen } from "@/lib/calc/types";

interface FieldPanelProps {
  field: Field;
  onFieldChange: (field: Field) => void;
}

const WEATHER_OPTIONS: { value: Weather; label: string; icon: string }[] = [
  { value: "none", label: "없음", icon: "─" },
  { value: "sun", label: "쾌청", icon: "☀" },
  { value: "rain", label: "비", icon: "🌧" },
  { value: "sand", label: "모래바람", icon: "🏜" },
  { value: "snow", label: "설경", icon: "❄" },
];

const TERRAIN_OPTIONS: { value: Terrain; label: string; icon: string }[] = [
  { value: "none", label: "없음", icon: "─" },
  { value: "electric", label: "일렉트릭", icon: "⚡" },
  { value: "grassy", label: "그래스", icon: "🌿" },
  { value: "psychic", label: "사이코", icon: "🔮" },
  { value: "misty", label: "미스트", icon: "🌫" },
];

const SCREEN_OPTIONS: { value: Screen; label: string }[] = [
  { value: "reflect", label: "리플렉터" },
  { value: "light-screen", label: "빛의장막" },
  { value: "aurora-veil", label: "오로라베일" },
];

export default function FieldPanel({ field, onFieldChange }: FieldPanelProps) {
  const toggleScreen = (screen: Screen) => {
    const screens = field.screens.includes(screen)
      ? field.screens.filter((s) => s !== screen)
      : [...field.screens, screen];
    onFieldChange({ ...field, screens });
  };

  return (
    <div className="ds-panel-dark p-3 flex flex-col gap-3 w-full">
      <h2 className="text-xs font-bold text-center text-[var(--ds-gold)]">
        필드 조건
      </h2>

      {/* 날씨 */}
      <div>
        <label className="text-[10px] font-bold opacity-60 mb-1 block">날씨</label>
        <div className="flex flex-wrap gap-1">
          {WEATHER_OPTIONS.map((w) => (
            <button
              key={w.value}
              className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                field.weather === w.value
                  ? "bg-[var(--ds-accent-blue)] text-white border-[var(--ds-accent-blue)]"
                  : "bg-[var(--ds-bg-mid)] text-[var(--ds-text-light)] border-[var(--ds-bg-light)]"
              }`}
              onClick={() => onFieldChange({ ...field, weather: w.value })}
            >
              {w.icon} {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* 필드 */}
      <div>
        <label className="text-[10px] font-bold opacity-60 mb-1 block">필드</label>
        <div className="flex flex-wrap gap-1">
          {TERRAIN_OPTIONS.map((t) => (
            <button
              key={t.value}
              className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                field.terrain === t.value
                  ? "bg-[var(--ds-accent-green)] text-white border-[var(--ds-accent-green)]"
                  : "bg-[var(--ds-bg-mid)] text-[var(--ds-text-light)] border-[var(--ds-bg-light)]"
              }`}
              onClick={() => onFieldChange({ ...field, terrain: t.value })}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 벽 */}
      <div>
        <label className="text-[10px] font-bold opacity-60 mb-1 block">벽</label>
        <div className="flex flex-wrap gap-1">
          {SCREEN_OPTIONS.map((s) => (
            <button
              key={s.value}
              className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                field.screens.includes(s.value)
                  ? "bg-[var(--ds-gold)] text-[var(--ds-text)] border-[var(--ds-gold)]"
                  : "bg-[var(--ds-bg-mid)] text-[var(--ds-text-light)] border-[var(--ds-bg-light)]"
              }`}
              onClick={() => toggleScreen(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 싱글/더블 + 기타 */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`text-[10px] px-3 py-1 rounded border font-bold transition-colors ${
            field.isDouble
              ? "bg-[var(--ds-accent)] text-white border-[var(--ds-accent)]"
              : "bg-[var(--ds-bg-mid)] text-[var(--ds-text-light)] border-[var(--ds-bg-light)]"
          }`}
          onClick={() => onFieldChange({ ...field, isDouble: !field.isDouble })}
        >
          {field.isDouble ? "더블" : "싱글"}
        </button>

        <button
          className={`text-[10px] px-3 py-1 rounded border transition-colors ${
            field.isCrit
              ? "bg-[var(--ds-accent)] text-white border-[var(--ds-accent)]"
              : "bg-[var(--ds-bg-mid)] text-[var(--ds-text-light)] border-[var(--ds-bg-light)]"
          }`}
          onClick={() => onFieldChange({ ...field, isCrit: !field.isCrit })}
        >
          급소
        </button>

        <button
          className={`text-[10px] px-3 py-1 rounded border transition-colors ${
            field.isHelping
              ? "bg-[var(--ds-accent-green)] text-white border-[var(--ds-accent-green)]"
              : "bg-[var(--ds-bg-mid)] text-[var(--ds-text-light)] border-[var(--ds-bg-light)]"
          }`}
          onClick={() => onFieldChange({ ...field, isHelping: !field.isHelping })}
        >
          도우미
        </button>
      </div>

      {/* 스텔스록/압정 */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`text-[10px] px-3 py-1 rounded border transition-colors ${
            field.stealth_rock
              ? "bg-[var(--ds-gold)] text-[var(--ds-text)] border-[var(--ds-gold)]"
              : "bg-[var(--ds-bg-mid)] text-[var(--ds-text-light)] border-[var(--ds-bg-light)]"
          }`}
          onClick={() => onFieldChange({ ...field, stealth_rock: !field.stealth_rock })}
        >
          스텔스록
        </button>

        <button
          className={`text-[10px] px-2 py-1 rounded border transition-colors ${
            field.spikes > 0
              ? "bg-[var(--ds-gold)] text-[var(--ds-text)] border-[var(--ds-gold)]"
              : "bg-[var(--ds-bg-mid)] text-[var(--ds-text-light)] border-[var(--ds-bg-light)]"
          }`}
          onClick={() => onFieldChange({ ...field, spikes: (field.spikes + 1) % 4 })}
        >
          압정 ×{field.spikes}
        </button>
      </div>
    </div>
  );
}
