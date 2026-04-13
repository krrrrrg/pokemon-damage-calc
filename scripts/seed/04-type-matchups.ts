import { supabase, sleep, fetchJson } from "./supabase-admin";

const POKEAPI = "https://pokeapi.co/api/v2";

const TYPE_IDS = Array.from({ length: 18 }, (_, i) => i + 1);

const ALL_TYPES = [
  "normal", "fighting", "flying", "poison", "ground", "rock",
  "bug", "ghost", "steel", "fire", "water", "grass",
  "electric", "psychic", "ice", "dragon", "dark", "fairy",
];

async function main() {
  console.log("=== 타입상성 시드 스크립트 시작 ===\n");
  const rows: { atk_type: string; def_type: string; multiplier: number }[] = [];

  for (const id of TYPE_IDS) {
    const data = await fetchJson(`${POKEAPI}/type/${id}`);
    const atkType = data.name as string;
    const dr = data.damage_relations;

    // 기본: 모든 타입에 대해 1배
    const matchups: Record<string, number> = {};
    for (const t of ALL_TYPES) matchups[t] = 1;

    for (const t of dr.double_damage_to) matchups[t.name] = 2;
    for (const t of dr.half_damage_to) matchups[t.name] = 0.5;
    for (const t of dr.no_damage_to) matchups[t.name] = 0;

    for (const [defType, mult] of Object.entries(matchups)) {
      rows.push({ atk_type: atkType, def_type: defType, multiplier: mult });
    }

    console.log(`${id}/18 - ${atkType}`);
    await sleep(100);
  }

  // batch upsert
  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("type_matchups")
      .upsert(batch, { onConflict: "atk_type,def_type" });
    if (error) console.error(`Upsert 실패 (${i}):`, error.message);
  }

  console.log(`\n=== 완료: ${rows.length}건 (18×18=${18 * 18}) ===`);
}

main().catch(console.error);
