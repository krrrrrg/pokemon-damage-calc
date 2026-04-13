"use client";

import type { Field, Weather, Terrain, Screen } from "@/lib/calc/types";

interface FieldPanelProps {
  field: Field;
  onFieldChange: (field: Field) => void;
}

const WEATHER_OPTIONS: { value: Weather; label: string; icon: string }[] = [
  { value: "none", label: "없음", icon: "--" },
  { value: "sun", label: "쾌청", icon: "SUN" },
  { value: "rain", label: "비", icon: "RAIN" },
  { value: "sand", label: "모래바람", icon: "SAND" },
  { value: "snow", label: "설경", icon: "SNOW" },
];

const TERRAIN_OPTIONS: { value: Terrain; label: string; icon: string }[] = [
  { value: "none", label: "없음", icon: "--" },
  { value: "electric", label: "일렉트릭", icon: "ELC" },
  { value: "grassy", label: "그래스", icon: "GRS" },
  { value: "psychic", label: "사이코", icon: "PSY" },
  { value: "misty", label: "미스트", icon: "MST" },
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
    <div className="pixel-panel-dark p-3 flex flex-col gap-3 w-full">
      {/* 타이틀 */}
      <div
        className="flex items-center justify-center pb-1"
        style={{ borderBottom: "3px solid #d4a017" }}
      >
        <h2 className="text-xs" style={{ color: "#d4a017" }}>
          ▶ 필드 조건
        </h2>
      </div>

      {/* 날씨 */}
      <div>
        <label className="text-xs opacity-60 mb-1 block">날씨</label>
        <div className="flex flex-wrap gap-1">
          {WEATHER_OPTIONS.map((w) => (
            <button
              key={w.value}
              className={`pixel-toggle ${field.weather === w.value ? "active" : ""}`}
              onClick={() => onFieldChange({ ...field, weather: w.value })}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* 필드 */}
      <div>
        <label className="text-xs opacity-60 mb-1 block">필드</label>
        <div className="flex flex-wrap gap-1">
          {TERRAIN_OPTIONS.map((t) => (
            <button
              key={t.value}
              className={`pixel-toggle ${field.terrain === t.value ? "active-green" : ""}`}
              onClick={() => onFieldChange({ ...field, terrain: t.value })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 벽 */}
      <div>
        <label className="text-xs opacity-60 mb-1 block">벽</label>
        <div className="flex flex-wrap gap-1">
          {SCREEN_OPTIONS.map((s) => (
            <button
              key={s.value}
              className={`pixel-toggle ${field.screens.includes(s.value) ? "active-gold" : ""}`}
              onClick={() => toggleScreen(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 배틀 옵션 */}
      <div>
        <label className="text-xs opacity-60 mb-1 block">배틀 옵션</label>
        <div className="flex flex-wrap gap-1">
          <button
            className={`pixel-toggle ${field.isDouble ? "active-red" : ""}`}
            onClick={() => onFieldChange({ ...field, isDouble: !field.isDouble })}
          >
            {field.isDouble ? "더블" : "싱글"}
          </button>
          <button
            className={`pixel-toggle ${field.isCrit ? "active-red" : ""}`}
            onClick={() => onFieldChange({ ...field, isCrit: !field.isCrit })}
          >
            급소
          </button>
          <button
            className={`pixel-toggle ${field.isHelping ? "active-green" : ""}`}
            onClick={() => onFieldChange({ ...field, isHelping: !field.isHelping })}
          >
            도우미
          </button>
        </div>
      </div>

      {/* 설치기 */}
      <div>
        <label className="text-xs opacity-60 mb-1 block">설치기 (방어측)</label>
        <div className="flex flex-wrap gap-1">
          <button
            className={`pixel-toggle ${field.stealth_rock ? "active-gold" : ""}`}
            onClick={() => onFieldChange({ ...field, stealth_rock: !field.stealth_rock })}
          >
            스텔스록
          </button>
          <button
            className={`pixel-toggle ${field.spikes > 0 ? "active-gold" : ""}`}
            onClick={() => onFieldChange({ ...field, spikes: (field.spikes + 1) % 4 })}
          >
            {field.spikes > 0 ? `압정 x${field.spikes}` : "압정"}
          </button>
        </div>
      </div>
    </div>
  );
}
