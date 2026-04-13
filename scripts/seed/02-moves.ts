import { supabase, sleep, fetchJson } from "./supabase-admin";

const POKEAPI = "https://pokeapi.co/api/v2";
const MAX_MOVE = 919;

// 기술 플래그 판별용 메타 태그
const PUNCH_MOVES = new Set([
  "ice-punch", "fire-punch", "thunder-punch", "mach-punch", "mega-punch",
  "comet-punch", "bullet-punch", "drain-punch", "focus-punch", "sky-uppercut",
  "dynamic-punch", "dizzy-punch", "shadow-punch", "meteor-mash", "power-up-punch",
  "plasma-fists", "surging-strikes", "wicked-blow", "rage-fist",
]);

const BITE_MOVES = new Set([
  "bite", "crunch", "fire-fang", "ice-fang", "thunder-fang", "poison-fang",
  "hyper-fang", "psychic-fangs", "fishious-rend", "jaw-lock",
]);

const PULSE_MOVES = new Set([
  "aura-sphere", "dark-pulse", "dragon-pulse", "heal-pulse", "water-pulse",
  "origin-pulse", "terrain-pulse",
]);

const SLASH_MOVES = new Set([
  "cut", "slash", "fury-cutter", "night-slash", "air-slash", "psycho-cut",
  "leaf-blade", "razor-shell", "sacred-sword", "secret-sword", "aerial-ace",
  "x-scissor", "cross-poison", "behemoth-blade", "ceaseless-edge",
  "kowtow-cleave", "bitter-blade", "population-bomb",
]);

const SOUND_MOVES = new Set([
  "boomburst", "bug-buzz", "chatter", "clanging-scales", "clangorous-soul",
  "confide", "disarming-voice", "echoed-voice", "eerie-spell", "grass-whistle",
  "growl", "heal-bell", "howl", "hyper-voice", "metal-sound", "noble-roar",
  "overdrive", "parting-shot", "perish-song", "relic-song", "roar", "round",
  "screech", "shadow-panic", "sing", "snarl", "snore", "sparkling-aria",
  "supersonic", "torch-song", "uproar",
]);

const RECOIL_MOVES = new Set([
  "brave-bird", "double-edge", "flare-blitz", "head-charge", "head-smash",
  "high-jump-kick", "jump-kick", "light-of-ruin", "submission", "take-down",
  "volt-tackle", "wave-crash", "wild-charge", "wood-hammer",
]);

const SPREAD_MOVES = new Set([
  "blizzard", "boomburst", "breaking-swipe", "brutal-swing", "bulldoze",
  "burning-jealousy", "cotton-spore", "dark-void", "dazzling-gleam",
  "discharge", "earthquake", "electroweb", "eruption", "explosion",
  "glacial-lance", "heat-wave", "hyper-voice", "icy-wind", "lava-plume",
  "make-it-rain", "muddy-water", "origin-pulse", "overdrive", "precipice-blades",
  "rock-slide", "self-destruct", "sludge-wave", "snarl", "struggle-bug",
  "surf", "sweet-scent", "water-spout",
]);

interface MoveRow {
  id: number;
  name_kr: string;
  name_en: string;
  type: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
  priority: number;
  generation: number;
  makes_contact: boolean;
  is_sound: boolean;
  is_punch: boolean;
  is_bite: boolean;
  is_pulse: boolean;
  is_slash: boolean;
  is_recoil: boolean;
  is_spread: boolean;
  multi_hit_min: number | null;
  multi_hit_max: number | null;
}

const CATEGORY_MAP: Record<string, string> = {
  physical: "physical",
  special: "special",
  status: "status",
};

const GEN_MAP: Record<string, number> = {
  "generation-i": 1,
  "generation-ii": 2,
  "generation-iii": 3,
  "generation-iv": 4,
  "generation-v": 5,
  "generation-vi": 6,
  "generation-vii": 7,
  "generation-viii": 8,
  "generation-ix": 9,
};

async function main() {
  console.log("=== 기술 시드 스크립트 시작 ===\n");
  const failures: { id: number; error: string }[] = [];
  const allRows: MoveRow[] = [];
  let processed = 0;

  for (let id = 1; id <= MAX_MOVE; id++) {
    try {
      const data = await fetchJson(`${POKEAPI}/move/${id}`);
      const nameKr =
        data.names.find((n: any) => n.language.name === "ko")?.name ??
        data.names.find((n: any) => n.language.name === "en")?.name ??
        data.name;
      const nameEn =
        data.names.find((n: any) => n.language.name === "en")?.name ?? data.name;

      const moveName = data.name as string;

      const meta = data.meta;
      const minHits = meta?.min_hits ?? null;
      const maxHits = meta?.max_hits ?? null;

      allRows.push({
        id,
        name_kr: nameKr,
        name_en: nameEn,
        type: data.type.name,
        category: CATEGORY_MAP[data.damage_class.name] ?? "status",
        power: data.power,
        accuracy: data.accuracy,
        pp: data.pp ?? 0,
        priority: data.priority ?? 0,
        generation: GEN_MAP[data.generation.name] ?? 1,
        makes_contact: meta?.category?.name === "contact" || false,
        is_sound: SOUND_MOVES.has(moveName),
        is_punch: PUNCH_MOVES.has(moveName),
        is_bite: BITE_MOVES.has(moveName),
        is_pulse: PULSE_MOVES.has(moveName),
        is_slash: SLASH_MOVES.has(moveName),
        is_recoil: RECOIL_MOVES.has(moveName),
        is_spread: SPREAD_MOVES.has(moveName),
        multi_hit_min: minHits,
        multi_hit_max: maxHits,
      });

      await sleep(100);
    } catch (err: any) {
      failures.push({ id, error: err.message });
    }

    processed++;
    if (processed % 50 === 0 || processed === MAX_MOVE) {
      console.log(`진행: ${processed}/${MAX_MOVE}`);
    }
  }

  console.log(`\n총 ${allRows.length}건 upsert 시작...`);
  const BATCH = 500;
  for (let i = 0; i < allRows.length; i += BATCH) {
    const batch = allRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("moves")
      .upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`Upsert 실패 (${i}~${i + batch.length}):`, error.message);
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`성공: ${allRows.length}건`);
  if (failures.length > 0) {
    console.log(`\n실패 목록 (${failures.length}건):`);
    failures.forEach((f) => console.log(`  #${f.id}: ${f.error}`));
  }
}

main().catch(console.error);
