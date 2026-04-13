"use client";

import Link from "next/link";

interface EffectRow {
  name: string;
  effects: string[];
}

interface Section {
  title: string;
  rows: EffectRow[];
}

const SECTIONS: Section[] = [
  {
    title: "날씨 효과",
    rows: [
      {
        name: "쾌청 (햇살)",
        effects: [
          "불꽃 타입 기술 데미지 x1.5",
          "물 타입 기술 데미지 x0.5",
          "솔라빔/솔라블레이드 즉시 발동",
          "관련 특성: 가뭄(드래프트) - 등장 시 쾌청",
          "관련 특성: 선파워 - 특공 x1.5, 매 턴 HP 1/8 감소",
          "관련 특성: 플라워기프트 - 공격/특방 x1.5 (체리꼬)",
          "관련 특성: 엽록소 - 스피드 2배",
        ],
      },
      {
        name: "비",
        effects: [
          "물 타입 기술 데미지 x1.5",
          "불꽃 타입 기술 데미지 x0.5",
          "천둥/허리케인 필중",
          "관련 특성: 잔비(드리즐) - 등장 시 비",
          "관련 특성: 쓱쓱 - 스피드 2배",
          "관련 특성: 건조피부 - 매 턴 HP 1/8 회복, 불꽃 데미지 x1.25",
        ],
      },
      {
        name: "모래바람",
        effects: [
          "바위 타입 특방 x1.5",
          "매 턴 바위/땅/강철 타입 외 HP 1/16 감소",
          "관련 특성: 모래날림 - 등장 시 모래바람",
          "관련 특성: 모래헤치기 - 스피드 2배",
          "관련 특성: 모래의힘 - 바위/땅/강철 기술 데미지 x1.3",
        ],
      },
      {
        name: "설경",
        effects: [
          "얼음 타입 방어 x1.5",
          "눈보라 필중",
          "오로라베일 사용 가능",
          "관련 특성: 눈퍼뜨리기 - 등장 시 설경",
          "관련 특성: 눈숨기 - 회피율 1.25배",
        ],
      },
    ],
  },
  {
    title: "필드(터레인) 효과",
    rows: [
      {
        name: "일렉트릭필드",
        effects: [
          "전기 타입 기술 데미지 x1.3 (지면에 있는 포켓몬)",
          "잠듦 상태 방지",
          "관련 특성: 일렉트릭메이커 - 등장 시 필드 전개",
        ],
      },
      {
        name: "그래스필드",
        effects: [
          "풀 타입 기술 데미지 x1.3 (지면에 있는 포켓몬)",
          "지진/매그니튜드/땅고르기 데미지 x0.5",
          "매 턴 지면 포켓몬 HP 1/16 회복",
          "관련 특성: 그래스메이커 - 등장 시 필드 전개",
        ],
      },
      {
        name: "사이코필드",
        effects: [
          "에스퍼 타입 기술 데미지 x1.3 (지면에 있는 포켓몬)",
          "선제기 무효 (지면에 있는 포켓몬 대상)",
          "관련 특성: 사이코메이커 - 등장 시 필드 전개",
        ],
      },
      {
        name: "미스트필드",
        effects: [
          "드래곤 타입 기술 데미지 x0.5 (지면에 있는 포켓몬 대상)",
          "상태이상 방지 (지면에 있는 포켓몬)",
          "관련 특성: 미스트메이커 - 등장 시 필드 전개",
        ],
      },
    ],
  },
  {
    title: "벽(스크린) 효과",
    rows: [
      {
        name: "리플렉터",
        effects: [
          "물리 데미지 x0.5 (5턴 지속)",
          "더블배틀: 물리 데미지 x0.67",
          "급소 시 무시됨",
          "벽깨기(Brick Break)로 파괴 가능",
        ],
      },
      {
        name: "빛의장막",
        effects: [
          "특수 데미지 x0.5 (5턴 지속)",
          "더블배틀: 특수 데미지 x0.67",
          "급소 시 무시됨",
          "벽깨기(Brick Break)로 파괴 가능",
        ],
      },
      {
        name: "오로라베일",
        effects: [
          "물리+특수 데미지 x0.5 (5턴 지속)",
          "더블배틀: 물리+특수 데미지 x0.67",
          "설경일 때만 사용 가능",
          "급소 시 무시됨",
          "벽깨기(Brick Break)로 파괴 가능",
          "리플렉터/빛의장막과 중첩 불가",
        ],
      },
    ],
  },
];

export default function WeatherPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#18181b" }}>
      <header
        className="border-b-4"
        style={{ background: "#202020", borderColor: "#303030" }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-base tracking-wide" style={{ color: "#f0f0f0" }}>
            ▶ 날씨/필드 효과
          </h1>
          <Link href="/wiki" className="pixel-btn text-xs">
            ← 위키
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full flex flex-col gap-4">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="pixel-section-title inline-block mb-2">
              {section.title}
            </div>
            <div className="flex flex-col gap-2">
              {section.rows.map((row) => (
                <div key={row.name} className="pixel-panel p-3">
                  <div className="font-bold text-sm mb-1">{row.name}</div>
                  <ul className="text-xs space-y-0.5" style={{ color: "#505050" }}>
                    {row.effects.map((eff, i) => (
                      <li key={i}>
                        {eff.startsWith("관련 특성:") ? (
                          <span style={{ color: "#808080" }}>
                            ▸ {eff}
                          </span>
                        ) : (
                          <>• {eff}</>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
