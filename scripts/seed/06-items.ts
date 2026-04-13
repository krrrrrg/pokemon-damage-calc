import { supabase, sleep, fetchJson } from "./supabase-admin";

const POKEAPI = "https://pokeapi.co/api/v2";

// 데미지 관련 도구 하드코딩 (기획서 3-1, 3-15)
const DAMAGE_ITEMS: {
  name_en: string;
  damage_modifier: number | null;
  stat_modifier: string | null;
  stat_multiplier: number | null;
  condition: string | null;
}[] = [
  // 3-1 기본 도구
  { name_en: "Choice Band", damage_modifier: null, stat_modifier: "atk", stat_multiplier: 1.5, condition: "physical" },
  { name_en: "Choice Specs", damage_modifier: null, stat_modifier: "spa", stat_multiplier: 1.5, condition: "special" },
  { name_en: "Life Orb", damage_modifier: 1.3, stat_modifier: null, stat_multiplier: null, condition: null },
  { name_en: "Expert Belt", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "super_effective" },
  { name_en: "Choice Scarf", damage_modifier: null, stat_modifier: "spe", stat_multiplier: 1.5, condition: null },
  { name_en: "Assault Vest", damage_modifier: null, stat_modifier: "spd", stat_multiplier: 1.5, condition: null },
  // 타입강화 도구
  { name_en: "Charcoal", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:fire" },
  { name_en: "Mystic Water", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:water" },
  { name_en: "Miracle Seed", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:grass" },
  { name_en: "Magnet", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:electric" },
  { name_en: "Never-Melt Ice", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:ice" },
  { name_en: "Black Belt", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:fighting" },
  { name_en: "Poison Barb", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:poison" },
  { name_en: "Soft Sand", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:ground" },
  { name_en: "Sharp Beak", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:flying" },
  { name_en: "Twisted Spoon", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:psychic" },
  { name_en: "Silver Powder", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:bug" },
  { name_en: "Hard Stone", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:rock" },
  { name_en: "Spell Tag", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:ghost" },
  { name_en: "Dragon Fang", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:dragon" },
  { name_en: "Black Glasses", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:dark" },
  { name_en: "Metal Coat", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:steel" },
  { name_en: "Silk Scarf", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:normal" },
  { name_en: "Fairy Feather", damage_modifier: 1.2, stat_modifier: null, stat_multiplier: null, condition: "type:fairy" },
  // 3-15 추가 도구
  { name_en: "Eviolite", damage_modifier: null, stat_modifier: "def,spd", stat_multiplier: 1.5, condition: "not_fully_evolved" },
  { name_en: "Muscle Band", damage_modifier: 1.1, stat_modifier: null, stat_multiplier: null, condition: "physical" },
  { name_en: "Wise Glasses", damage_modifier: 1.1, stat_modifier: null, stat_multiplier: null, condition: "special" },
  { name_en: "Thick Club", damage_modifier: null, stat_modifier: "atk", stat_multiplier: 2.0, condition: "cubone_marowak" },
  { name_en: "Light Ball", damage_modifier: null, stat_modifier: "atk", stat_multiplier: 2.0, condition: "pikachu" },
  { name_en: "Deep Sea Tooth", damage_modifier: null, stat_modifier: "spa", stat_multiplier: 2.0, condition: "clamperl" },
  { name_en: "Deep Sea Scale", damage_modifier: null, stat_modifier: "spd", stat_multiplier: 2.0, condition: "clamperl" },
  { name_en: "Metal Powder", damage_modifier: null, stat_modifier: "def", stat_multiplier: 2.0, condition: "ditto" },
  { name_en: "Metronome", damage_modifier: 1.0, stat_modifier: null, stat_multiplier: null, condition: "metronome_stacking" },
  // 반감열매 (대표)
  { name_en: "Occa Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:fire" },
  { name_en: "Passho Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:water" },
  { name_en: "Wacan Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:electric" },
  { name_en: "Rindo Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:grass" },
  { name_en: "Yache Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:ice" },
  { name_en: "Chople Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:fighting" },
  { name_en: "Kebia Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:poison" },
  { name_en: "Shuca Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:ground" },
  { name_en: "Coba Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:flying" },
  { name_en: "Payapa Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:psychic" },
  { name_en: "Tanga Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:bug" },
  { name_en: "Charti Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:rock" },
  { name_en: "Kasib Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:ghost" },
  { name_en: "Haban Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:dragon" },
  { name_en: "Colbur Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:dark" },
  { name_en: "Babiri Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:steel" },
  { name_en: "Chilan Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "type:normal" },
  { name_en: "Roseli Berry", damage_modifier: 0.5, stat_modifier: null, stat_multiplier: null, condition: "super_effective:fairy" },
  // 타입쥬얼
  { name_en: "Normal Gem", damage_modifier: 1.3, stat_modifier: null, stat_multiplier: null, condition: "gem:normal" },
];

// PokeAPI에서 도구 ID + 한글 이름 가져오기
const ITEM_SEARCH_NAMES: Record<string, string> = {
  "Choice Band": "choice-band",
  "Choice Specs": "choice-specs",
  "Life Orb": "life-orb",
  "Expert Belt": "expert-belt",
  "Choice Scarf": "choice-scarf",
  "Assault Vest": "assault-vest",
  Charcoal: "charcoal",
  "Mystic Water": "mystic-water",
  "Miracle Seed": "miracle-seed",
  Magnet: "magnet",
  "Never-Melt Ice": "never-melt-ice",
  "Black Belt": "black-belt",
  "Poison Barb": "poison-barb",
  "Soft Sand": "soft-sand",
  "Sharp Beak": "sharp-beak",
  "Twisted Spoon": "twisted-spoon",
  "Silver Powder": "silver-powder",
  "Hard Stone": "hard-stone",
  "Spell Tag": "spell-tag",
  "Dragon Fang": "dragon-fang",
  "Black Glasses": "black-glasses",
  "Metal Coat": "metal-coat",
  "Silk Scarf": "silk-scarf",
  "Fairy Feather": "fairy-feather",
  Eviolite: "eviolite",
  "Muscle Band": "muscle-band",
  "Wise Glasses": "wise-glasses",
  "Thick Club": "thick-club",
  "Light Ball": "light-ball",
  "Deep Sea Tooth": "deep-sea-tooth",
  "Deep Sea Scale": "deep-sea-scale",
  "Metal Powder": "metal-powder",
  Metronome: "metronome",
  "Occa Berry": "occa-berry",
  "Passho Berry": "passho-berry",
  "Wacan Berry": "wacan-berry",
  "Rindo Berry": "rindo-berry",
  "Yache Berry": "yache-berry",
  "Chople Berry": "chople-berry",
  "Kebia Berry": "kebia-berry",
  "Shuca Berry": "shuca-berry",
  "Coba Berry": "coba-berry",
  "Payapa Berry": "payapa-berry",
  "Tanga Berry": "tanga-berry",
  "Charti Berry": "charti-berry",
  "Kasib Berry": "kasib-berry",
  "Haban Berry": "haban-berry",
  "Colbur Berry": "colbur-berry",
  "Babiri Berry": "babiri-berry",
  "Chilan Berry": "chilan-berry",
  "Roseli Berry": "roseli-berry",
  "Normal Gem": "normal-gem",
};

async function main() {
  console.log("=== 도구 시드 스크립트 시작 ===\n");
  const rows: any[] = [];

  for (const item of DAMAGE_ITEMS) {
    const slug = ITEM_SEARCH_NAMES[item.name_en];
    if (!slug) {
      console.log(`슬러그 없음: ${item.name_en}, 스킵`);
      continue;
    }

    try {
      const data = await fetchJson(`${POKEAPI}/item/${slug}`);
      const nameKr =
        data.names.find((n: any) => n.language.name === "ko")?.name ?? item.name_en;

      rows.push({
        id: data.id,
        name_kr: nameKr,
        name_en: item.name_en,
        damage_modifier: item.damage_modifier,
        stat_modifier: item.stat_modifier,
        stat_multiplier: item.stat_multiplier,
        condition: item.condition,
      });
      console.log(`${rows.length} - ${nameKr} (${item.name_en})`);
      await sleep(100);
    } catch (err: any) {
      console.log(`실패: ${item.name_en} - ${err.message}`);
    }
  }

  const { error } = await supabase.from("items").upsert(rows, { onConflict: "id" });
  if (error) console.error("Upsert 실패:", error.message);
  else console.log(`\n=== 완료: ${rows.length}건 ===`);
}

main().catch(console.error);
