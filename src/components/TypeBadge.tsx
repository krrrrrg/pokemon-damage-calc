"use client";

import type { PokemonType } from "@/lib/calc/types";

const TYPE_NAMES_KR: Record<string, string> = {
  normal: "노말", fighting: "격투", flying: "비행", poison: "독",
  ground: "땅", rock: "바위", bug: "벌레", ghost: "고스트",
  steel: "강철", fire: "불꽃", water: "물", grass: "풀",
  electric: "전기", psychic: "에스퍼", ice: "얼음", dragon: "드래곤",
  dark: "악", fairy: "페어리", stellar: "스텔라",
};

export default function TypeBadge({ type }: { type: string }) {
  const label = TYPE_NAMES_KR[type] ?? type;
  return (
    <span className={`type-badge type-${type}`} role="img" aria-label={`${label} 타입`}>
      {label}
    </span>
  );
}
