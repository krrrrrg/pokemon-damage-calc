import { supabase, sleep, fetchJson } from "./supabase-admin";

const POKEAPI = "https://pokeapi.co/api/v2";

// 데미지 관련 특성 매핑 (하드코딩)
const DAMAGE_ABILITIES: Record<string, { effect: string; type: string; value: number }> = {
  adaptability: { effect: "STAB 2.0으로 상승", type: "stab", value: 2.0 },
  "tinted-lens": { effect: "효과별로 시 2배", type: "not_effective_boost", value: 2.0 },
  sniper: { effect: "급소 시 2.25배", type: "crit", value: 2.25 },
  "iron-fist": { effect: "펀치기 1.2배", type: "punch", value: 1.2 },
  reckless: { effect: "반동기 1.3배", type: "recoil", value: 1.3 },
  "huge-power": { effect: "공격 2배", type: "atk", value: 2.0 },
  "pure-power": { effect: "공격 2배", type: "atk", value: 2.0 },
  "solar-power": { effect: "쾌청 시 특공 1.5배", type: "spa_sun", value: 1.5 },
  "sand-force": { effect: "모래바람 시 바위/땅/강철 1.3배", type: "sand_boost", value: 1.3 },
  transistor: { effect: "전기 기술 1.3배", type: "electric_boost", value: 1.3 },
  "strong-jaw": { effect: "물기 기술 1.5배", type: "bite", value: 1.5 },
  "mega-launcher": { effect: "파동 기술 1.5배", type: "pulse", value: 1.5 },
  sharpness: { effect: "베기 기술 1.5배", type: "slash", value: 1.5 },
  technician: { effect: "위력60이하 1.5배", type: "low_power", value: 1.5 },
  guts: { effect: "상태이상 시 공격 1.5배", type: "status_atk", value: 1.5 },
  "toxic-boost": { effect: "독 시 특공 1.5배", type: "poison_spa", value: 1.5 },
  "fairy-aura": { effect: "페어리 기술 1.33배", type: "fairy_boost", value: 1.33 },
  "dark-aura": { effect: "악 기술 1.33배", type: "dark_boost", value: 1.33 },
  "aura-break": { effect: "오라 반전 0.75배", type: "aura_break", value: 0.75 },
  "solid-rock": { effect: "효과발군 0.75배", type: "super_effective_reduce", value: 0.75 },
  filter: { effect: "효과발군 0.75배", type: "super_effective_reduce", value: 0.75 },
  "prism-armor": { effect: "효과발군 0.75배", type: "super_effective_reduce", value: 0.75 },
  "thick-fat": { effect: "불꽃/얼음 0.5배", type: "fire_ice_reduce", value: 0.5 },
  multiscale: { effect: "HP풀일때 0.5배", type: "full_hp_reduce", value: 0.5 },
  "shadow-shield": { effect: "HP풀일때 0.5배", type: "full_hp_reduce", value: 0.5 },
  "fur-coat": { effect: "접촉기 0.5배", type: "contact_reduce", value: 0.5 },
  "ice-scales": { effect: "특수 0.5배", type: "special_reduce", value: 0.5 },
  "dry-skin": { effect: "불꽃 1.25배/물 무효", type: "dry_skin", value: 1.25 },
  levitate: { effect: "땅 면역", type: "ground_immune", value: 0 },
  "flash-fire": { effect: "불꽃 무효+불꽃 1.5배", type: "fire_boost", value: 1.5 },
  blaze: { effect: "HP1/3이하 불꽃 1.5배", type: "pinch_fire", value: 1.5 },
  torrent: { effect: "HP1/3이하 물 1.5배", type: "pinch_water", value: 1.5 },
  overgrow: { effect: "HP1/3이하 풀 1.5배", type: "pinch_grass", value: 1.5 },
  swarm: { effect: "HP1/3이하 벌레 1.5배", type: "pinch_bug", value: 1.5 },
  "refrigerate": { effect: "노말→얼음, 1.2배", type: "skin_ice", value: 1.2 },
  "aerilate": { effect: "노말→비행, 1.2배", type: "skin_flying", value: 1.2 },
  "pixilate": { effect: "노말→페어리, 1.2배", type: "skin_fairy", value: 1.2 },
  "galvanize": { effect: "노말→전기, 1.2배", type: "skin_electric", value: 1.2 },
};

async function main() {
  console.log("=== 특성 시드 스크립트 시작 ===\n");
  const failures: { id: number; error: string }[] = [];
  const allRows: any[] = [];

  // PokeAPI에는 특성이 307개 정도
  let id = 1;
  let consecutive404 = 0;

  while (consecutive404 < 10) {
    try {
      const data = await fetchJson(`${POKEAPI}/ability/${id}`);
      consecutive404 = 0;

      const nameKr =
        data.names.find((n: any) => n.language.name === "ko")?.name ??
        data.names.find((n: any) => n.language.name === "en")?.name ??
        data.name;
      const nameEn =
        data.names.find((n: any) => n.language.name === "en")?.name ?? data.name;

      const dmg = DAMAGE_ABILITIES[data.name];

      allRows.push({
        id,
        name_kr: nameKr,
        name_en: nameEn,
        damage_effect: dmg?.effect ?? null,
        modifier_type: dmg?.type ?? null,
        modifier_value: dmg?.value ?? null,
      });

      if (id % 50 === 0) console.log(`진행: ${id}`);
      await sleep(100);
    } catch (err: any) {
      if (err.message.includes("404")) {
        consecutive404++;
      } else {
        failures.push({ id, error: err.message });
      }
    }
    id++;
  }

  console.log(`\n총 ${allRows.length}건 upsert 시작...`);
  const BATCH = 200;
  for (let i = 0; i < allRows.length; i += BATCH) {
    const batch = allRows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("abilities")
      .upsert(batch, { onConflict: "id" });
    if (error) console.error(`Upsert 실패:`, error.message);
  }

  console.log(`=== 완료: ${allRows.length}건 ===`);
  if (failures.length > 0) {
    console.log(`실패: ${failures.length}건`);
    failures.forEach((f) => console.log(`  #${f.id}: ${f.error}`));
  }
}

main().catch(console.error);
