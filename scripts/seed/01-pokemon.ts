import { supabase, sleep, fetchJson } from "./supabase-admin";

const POKEAPI = "https://pokeapi.co/api/v2";
const MAX_SPECIES = 1025;

interface PokemonRow {
  pokedex_number: number;
  name_kr: string;
  name_en: string;
  form: string;
  type1: string;
  type2: string | null;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  ability1: string | null;
  ability2: string | null;
  hidden_ability: string | null;
  generation: number;
  sprite_url: string | null;
  gmax_form: boolean;
  weight: number | null;
}

const GENERATION_RANGES: [number, number, number][] = [
  [1, 1, 151], [2, 152, 251], [3, 252, 386], [4, 387, 493],
  [5, 494, 649], [6, 650, 721], [7, 722, 809], [8, 810, 905], [9, 906, 1025],
];

function getGeneration(dexNum: number): number {
  for (const [gen, start, end] of GENERATION_RANGES) {
    if (dexNum >= start && dexNum <= end) return gen;
  }
  return 9;
}

function getName(names: any[], lang: string): string | null {
  return names.find((n: any) => n.language.name === lang)?.name ?? null;
}

function getFormName(pokemonName: string, defaultName: string): string {
  // charizard → default, charizard-mega-x → mega-x, charizard-gmax → gmax
  const baseParts = defaultName.toLowerCase();
  if (pokemonName === baseParts) return "default";
  const suffix = pokemonName.replace(baseParts + "-", "");
  return suffix || "default";
}

function buildRow(
  dexNum: number, nameKr: string, nameEn: string, form: string, data: any
): PokemonRow {
  const stats = data.stats;
  const types = data.types.sort((a: any, b: any) => a.slot - b.slot);
  const abilities = data.abilities;

  let ability1: string | null = null;
  let ability2: string | null = null;
  let hidden_ability: string | null = null;
  for (const a of abilities) {
    if (a.is_hidden) hidden_ability = a.ability.name;
    else if (a.slot === 1) ability1 = a.ability.name;
    else if (a.slot === 2) ability2 = a.ability.name;
  }

  return {
    pokedex_number: dexNum,
    name_kr: form !== "default" ? `${nameKr}(${form})` : nameKr,
    name_en: data.name,
    form,
    type1: types[0]?.type.name ?? "normal",
    type2: types[1]?.type.name ?? null,
    hp: stats.find((s: any) => s.stat.name === "hp")?.base_stat ?? 0,
    atk: stats.find((s: any) => s.stat.name === "attack")?.base_stat ?? 0,
    def: stats.find((s: any) => s.stat.name === "defense")?.base_stat ?? 0,
    spa: stats.find((s: any) => s.stat.name === "special-attack")?.base_stat ?? 0,
    spd: stats.find((s: any) => s.stat.name === "special-defense")?.base_stat ?? 0,
    spe: stats.find((s: any) => s.stat.name === "speed")?.base_stat ?? 0,
    ability1, ability2, hidden_ability,
    generation: getGeneration(dexNum),
    sprite_url: data.sprites?.front_default ?? null,
    gmax_form: form.includes("gmax"),
    weight: data.weight ? data.weight / 10 : null,
  };
}

async function main() {
  console.log("=== 포켓몬 시드 (varieties 방식) ===\n");
  const failures: { id: number; error: string }[] = [];
  let inserted = 0;
  let batch: PokemonRow[] = [];

  for (let id = 1; id <= MAX_SPECIES; id++) {
    try {
      // 1) species → 한글 이름 + varieties 목록
      const species = await fetchJson(`${POKEAPI}/pokemon-species/${id}`);
      const nameKr = getName(species.names, "ko") ?? getName(species.names, "en") ?? species.name;
      const baseName = species.name; // e.g. "charizard"
      await sleep(50);

      // 2) varieties에서 실제 존재하는 폼만 순회
      for (const variety of species.varieties) {
        const pokeName = variety.pokemon.name; // e.g. "charizard-mega-x"
        try {
          const pokemonData = await fetchJson(`${POKEAPI}/pokemon/${pokeName}`);
          const form = variety.is_default ? "default" : getFormName(pokeName, baseName);
          batch.push(buildRow(id, nameKr, pokeName, form, pokemonData));
          await sleep(50);
        } catch (err: any) {
          // 개별 폼 실패는 스킵
          if (!err.message?.startsWith("404")) {
            console.log(`  폼 실패: ${pokeName} - ${err.message}`);
          }
        }
      }
    } catch (err: any) {
      failures.push({ id, error: err.message });
    }

    // 50마리마다 중간 저장
    if (id % 50 === 0 || id === MAX_SPECIES) {
      if (batch.length > 0) {
        const { error } = await supabase
          .from("pokemon")
          .upsert(batch, { onConflict: "pokedex_number,form" });
        if (error) {
          console.error(`  Upsert 실패:`, error.message);
        } else {
          inserted += batch.length;
        }
        batch = [];
      }
      console.log(`진행: ${id}/${MAX_SPECIES} (DB 저장: ${inserted}건)`);
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`성공: ${inserted}건`);
  if (failures.length > 0) {
    console.log(`\n실패 목록 (${failures.length}건):`);
    failures.forEach((f) => console.log(`  #${f.id}: ${f.error}`));
  }
}

main().catch(console.error);
