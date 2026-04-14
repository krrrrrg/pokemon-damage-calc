"use client";

import type { Field, Weather, Terrain, Screen } from "@/lib/calc/types";

interface FieldPanelProps {
  field: Field;
  onFieldChange: (field: Field) => void;
}

const WEATHER_OPTIONS: { value: Weather; label: string; icon: string; desc: string }[] = [
  { value: "none", label: "맑음", icon: "☀", desc: "" },
  { value: "sun", label: "쾌청", icon: "🔥", desc: "불꽃 x1.5 / 물 x0.5" },
  { value: "rain", label: "비", icon: "💧", desc: "물 x1.5 / 불꽃 x0.5" },
  { value: "sand", label: "모래", icon: "🏜️", desc: "바위 특방 x1.5" },
  { value: "snow", label: "설경", icon: "❄", desc: "얼음 방어 x1.5" },
];

const TERRAIN_OPTIONS: { value: Terrain; label: string; icon: string; desc: string }[] = [
  { value: "none", label: "없음", icon: "·", desc: "" },
  { value: "electric", label: "일렉트릭", icon: "⚡", desc: "전기 x1.3 / 잠듦 방지" },
  { value: "grassy", label: "그래스", icon: "🌱", desc: "풀 x1.3 / 지진 x0.5" },
  { value: "psychic", label: "사이코", icon: "🔮", desc: "에스퍼 x1.3 / 선제기 차단" },
  { value: "misty", label: "미스트", icon: "🌫", desc: "드래곤 x0.5 / 상태이상 방지" },
];

const SCREEN_OPTIONS: { value: Screen; label: string; desc: string }[] = [
  { value: "reflect", label: "리플렉터", desc: "물리 x0.5" },
  { value: "light-screen", label: "빛의장막", desc: "특수 x0.5" },
  { value: "aurora-veil", label: "오로라베일", desc: "물리+특수 x0.5" },
];

export default function FieldPanel({ field, onFieldChange }: FieldPanelProps) {
  const toggleScreen = (screen: Screen) => {
    const screens = field.screens.includes(screen)
      ? field.screens.filter((s) => s !== screen)
      : [...field.screens, screen];
    onFieldChange({ ...field, screens });
  };

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-3 w-full"
      style={{
        background: "linear-gradient(135deg, #3a3d56 0%, #2b2d42 100%)",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {/* 타이틀 */}
      <div className="flex items-center gap-2 pb-2" style={{ borderBottom: "1px dashed rgba(240,192,64,0.3)" }}>
        <span className="text-sm" style={{ color: "#f0c040" }}>🌤 필드 조건</span>
      </div>

      {/* 날씨 */}
      <div>
        <label className="text-[10px] mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>날씨</label>
        <div className="grid grid-cols-5 gap-1.5">
          {WEATHER_OPTIONS.map((w) => (
            <button
              key={w.value}
              className={`pixel-toggle flex items-center justify-center gap-1 ${field.weather === w.value ? "active-gold" : ""}`}
              onClick={() => onFieldChange({ ...field, weather: w.value })}
              style={{ padding: "6px 4px" }}
              title={w.desc}
            >
              <span className="text-[11px]">{w.icon}</span>
              <span className="text-[10px]">{w.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 필드 */}
      <div>
        <label className="text-[10px] mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>필드</label>
        <div className="grid grid-cols-5 gap-1.5">
          {TERRAIN_OPTIONS.map((t) => (
            <button
              key={t.value}
              className={`pixel-toggle flex items-center justify-center gap-1 ${field.terrain === t.value ? "active-green" : ""}`}
              onClick={() => onFieldChange({ ...field, terrain: t.value })}
              style={{ padding: "6px 4px" }}
              title={t.desc}
            >
              <span className="text-[11px]">{t.icon}</span>
              <span className="text-[10px]">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 벽 */}
      <div>
        <label className="text-[10px] mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>벽</label>
        <div className="flex flex-wrap gap-1.5">
          {SCREEN_OPTIONS.map((s) => (
            <button
              key={s.value}
              className={`pixel-toggle ${field.screens.includes(s.value) ? "active" : ""}`}
              onClick={() => toggleScreen(s.value)}
              title={s.desc}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 배틀 옵션 */}
      <div>
        <label className="text-[10px] mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>배틀 옵션</label>
        <div className="flex flex-wrap gap-1.5">
          <button
            className={`pixel-toggle ${field.isDouble ? "active-red" : ""}`}
            onClick={() => onFieldChange({ ...field, isDouble: !field.isDouble })}
          >
            {field.isDouble ? "더블배틀" : "싱글배틀"}
          </button>
          <button
            className={`pixel-toggle ${field.isCrit ? "active-red" : ""}`}
            onClick={() => onFieldChange({ ...field, isCrit: !field.isCrit })}
          >
            💥 급소
          </button>
          <button
            className={`pixel-toggle ${field.isHelping ? "active-green" : ""}`}
            onClick={() => onFieldChange({ ...field, isHelping: !field.isHelping })}
          >
            🤝 도우미
          </button>
          <button
            className={`pixel-toggle ${field.trickRoom ? "active" : ""}`}
            onClick={() => onFieldChange({ ...field, trickRoom: !field.trickRoom })}
          >
            🔮 트릭룸
          </button>
        </div>
      </div>

      {/* 설치기 */}
      <div>
        <label className="text-[10px] mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>설치기 (방어측)</label>
        <div className="flex flex-wrap gap-1.5">
          <button
            className={`pixel-toggle ${field.stealth_rock ? "active-gold" : ""}`}
            onClick={() => onFieldChange({ ...field, stealth_rock: !field.stealth_rock })}
          >
            🪨 스텔스록
          </button>
          <button
            className={`pixel-toggle ${field.spikes > 0 ? "active-gold" : ""}`}
            onClick={() => onFieldChange({ ...field, spikes: (field.spikes + 1) % 4 })}
          >
            📍 {field.spikes > 0 ? `압정 x${field.spikes}` : "압정"}
          </button>
        </div>
      </div>
    </div>
  );
}
