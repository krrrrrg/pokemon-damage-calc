import { supabase, sleep, fetchJson } from "./supabase-admin";

const POKEAPI = "https://pokeapi.co/api/v2";
const MAX_POKEMON = 1025;

function extractMoveId(url: string): number {
  const parts = url.replace(/\/$/, "").split("/");
  return Number(parts[parts.length - 1]);
}

async function main() {
  console.log("=== 포켓몬-기술 관계 시드 스크립트 시작 ===\n");

  // 먼저 pokemon 테이블에서 id 매핑 가져오기
  const { data: pokemonRows, error: fetchErr } = await supabase
    .from("pokemon")
    .select("id, pokedex_number, form");
  if (fetchErr) {
    console.error("pokemon 테이블 조회 실패:", fetchErr.message);
    return;
  }

  const pokemonIdMap = new Map<string, number>();
  for (const row of pokemonRows ?? []) {
    pokemonIdMap.set(`${row.pokedex_number}_${row.form}`, row.id);
  }

  const failures: { id: number; error: string }[] = [];
  let totalInserted = 0;

  for (let dexNum = 1; dexNum <= MAX_POKEMON; dexNum++) {
    try {
      const data = await fetchJson(`${POKEAPI}/pokemon/${dexNum}`);
      const pkId = pokemonIdMap.get(`${dexNum}_default`);
      if (!pkId) {
        continue;
      }

      const rows: any[] = [];
      for (const moveEntry of data.moves) {
        const moveId = extractMoveId(moveEntry.move.url);
        // 습득 방법 중 가장 최신 세대 것만 사용
        const methods = moveEntry.version_group_details;
        const latestMethod = methods[methods.length - 1];
        const learnMethod = latestMethod?.move_learn_method?.name ?? "unknown";

        rows.push({
          pokemon_id: pkId,
          pokemon_form: "default",
          move_id: moveId,
          learn_method: learnMethod,
        });
      }

      if (rows.length > 0) {
        // batch upsert
        const BATCH = 200;
        for (let i = 0; i < rows.length; i += BATCH) {
          const batch = rows.slice(i, i + BATCH);
          const { error } = await supabase
            .from("pokemon_moves")
            .upsert(batch, { onConflict: "pokemon_id,move_id,learn_method" });
          if (error) {
            // 외래 키 에러 등은 무시 (move가 919 넘는 ID일 수 있음)
            if (!error.message.includes("foreign key")) {
              console.error(`#${dexNum} upsert 실패:`, error.message);
            }
          }
        }
        totalInserted += rows.length;
      }

      await sleep(100);
    } catch (err: any) {
      failures.push({ id: dexNum, error: err.message });
    }

    if (dexNum % 100 === 0 || dexNum === MAX_POKEMON) {
      console.log(`진행: ${dexNum}/${MAX_POKEMON} (누적 ${totalInserted}건)`);
    }
  }

  console.log(`\n=== 완료: 총 ${totalInserted}건 ===`);
  if (failures.length > 0) {
    console.log(`실패 ${failures.length}건:`);
    failures.forEach((f) => console.log(`  #${f.id}: ${f.error}`));
  }
}

main().catch(console.error);
