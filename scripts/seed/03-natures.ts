import { supabase, sleep, fetchJson } from "./supabase-admin";

const POKEAPI = "https://pokeapi.co/api/v2";

const STAT_MAP: Record<string, string> = {
  attack: "atk",
  defense: "def",
  "special-attack": "spa",
  "special-defense": "spd",
  speed: "spe",
};

async function main() {
  console.log("=== 성격 시드 스크립트 시작 ===\n");
  const rows: any[] = [];

  for (let id = 1; id <= 25; id++) {
    const data = await fetchJson(`${POKEAPI}/nature/${id}`);
    const nameKr =
      data.names.find((n: any) => n.language.name === "ko")?.name ??
      data.names.find((n: any) => n.language.name === "en")?.name ??
      data.name;
    const nameEn =
      data.names.find((n: any) => n.language.name === "en")?.name ?? data.name;

    rows.push({
      id,
      name_kr: nameKr,
      name_en: nameEn,
      plus_stat: data.increased_stat ? STAT_MAP[data.increased_stat.name] ?? null : null,
      minus_stat: data.decreased_stat ? STAT_MAP[data.decreased_stat.name] ?? null : null,
    });

    console.log(`${id}/25 - ${nameKr} (${nameEn})`);
    await sleep(100);
  }

  const { error } = await supabase.from("natures").upsert(rows, { onConflict: "id" });
  if (error) console.error("Upsert 실패:", error.message);
  else console.log(`\n=== 완료: ${rows.length}건 ===`);
}

main().catch(console.error);
