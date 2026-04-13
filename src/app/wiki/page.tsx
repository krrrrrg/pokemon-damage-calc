"use client";

import Link from "next/link";

const SECTIONS = [
  { href: "/wiki/abilities", title: "특성 목록", desc: "모든 특성의 한글/영문 이름과 데미지 효과" },
  { href: "/wiki/items", title: "도구 목록", desc: "모든 도구의 한글/영문 이름과 효과 설명" },
  { href: "/wiki/types", title: "타입 상성표", desc: "18x18 타입 상성 배율 차트" },
  { href: "/wiki/weather", title: "날씨/필드 효과", desc: "날씨, 필드, 벽의 데미지 보정 정리" },
];

export default function WikiIndex() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#18181b" }}>
      <header
        className="border-b-4"
        style={{ background: "#202020", borderColor: "#303030" }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-base tracking-wide" style={{ color: "#f0f0f0" }}>
            ▶ 포켓몬 위키
          </h1>
          <Link href="/" className="pixel-btn text-xs">
            ← 계산기
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="block">
              <div className="pixel-panel p-4 hover:opacity-80 transition-opacity h-full">
                <div className="text-base font-bold mb-1">{s.title}</div>
                <div className="text-xs" style={{ color: "#606060" }}>
                  {s.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
