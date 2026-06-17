/**
 * PokeAPI에서 데이터를 받아 public/data/*.json 정적 파일로 출력한다.
 * Supabase(서비스키) 불필요. 앱의 정적 데이터 소스로 사용.
 * 실행: npx tsx scripts/build-static-data.ts
 */
import * as fs from "fs";
import * as path from "path";

const POKEAPI = "https://pokeapi.co/api/v2";
const OUT = path.resolve(__dirname, "../public/data");
const MAX_SPECIES = 1025;
const MAX_MOVE = 919;
const CONCURRENCY = 8;

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchJson(url: string, retries = 4): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(t);
      if (res.status === 404) throw new Error(`404 ${url}`);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (err: any) {
      if (err.message?.startsWith("404") || attempt === retries) throw err;
      await sleep(800 * attempt);
    }
  }
}

// 동시성 풀: items를 worker로 처리하며 결과를 순서대로 반환(실패는 null)
async function pool<T, R>(items: T[], conc: number, worker: (item: T, i: number) => Promise<R>): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  let idx = 0;
  async function run() {
    while (idx < items.length) {
      const cur = idx++;
      try { results[cur] = await worker(items[cur], cur); }
      catch { results[cur] = null; }
    }
  }
  await Promise.all(Array.from({ length: conc }, run));
  return results;
}

function write(name: string, data: any) {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data));
  console.log(`✓ ${name} (${Array.isArray(data) ? data.length : "?"}건, ${(JSON.stringify(data).length / 1024).toFixed(0)}KB)`);
}

const getName = (names: any[], lang: string): string | null =>
  names.find((n: any) => n.language.name === lang)?.name ?? null;

/* ========================= POKEMON ========================= */
const GEN_RANGES: [number, number, number][] = [
  [1, 1, 151], [2, 152, 251], [3, 252, 386], [4, 387, 493],
  [5, 494, 649], [6, 650, 721], [7, 722, 809], [8, 810, 905], [9, 906, 1025],
];
const getGeneration = (d: number) => GEN_RANGES.find(([, s, e]) => d >= s && d <= e)?.[0] ?? 9;
function getFormName(pokemonName: string, baseName: string): string {
  const base = baseName.toLowerCase();
  if (pokemonName === base) return "default";
  return pokemonName.replace(base + "-", "") || "default";
}
function buildPokemonRow(dexNum: number, nameKr: string, form: string, data: any) {
  const stats = data.stats;
  const types = [...data.types].sort((a: any, b: any) => a.slot - b.slot);
  let ability1: string | null = null, ability2: string | null = null, hidden_ability: string | null = null;
  for (const a of data.abilities) {
    if (a.is_hidden) hidden_ability = a.ability.name;
    else if (a.slot === 1) ability1 = a.ability.name;
    else if (a.slot === 2) ability2 = a.ability.name;
  }
  const stat = (n: string) => stats.find((s: any) => s.stat.name === n)?.base_stat ?? 0;
  return {
    pokedex_number: dexNum,
    name_kr: form !== "default" ? `${nameKr}(${form})` : nameKr,
    name_en: data.name,
    form,
    type1: types[0]?.type.name ?? "normal",
    type2: types[1]?.type.name ?? null,
    hp: stat("hp"), atk: stat("attack"), def: stat("defense"),
    spa: stat("special-attack"), spd: stat("special-defense"), spe: stat("speed"),
    ability1, ability2, hidden_ability,
    generation: getGeneration(dexNum),
    sprite_url: data.sprites?.front_default ?? null,
    gmax_form: form.includes("gmax"),
    weight: data.weight ? data.weight / 10 : null,
  };
}
async function buildPokemon() {
  console.log("→ pokemon 수집…");
  const ids = Array.from({ length: MAX_SPECIES }, (_, i) => i + 1);
  const perSpecies = await pool(ids, CONCURRENCY, async (id) => {
    const species = await fetchJson(`${POKEAPI}/pokemon-species/${id}`);
    const nameKr = getName(species.names, "ko") ?? getName(species.names, "en") ?? species.name;
    const baseName = species.name;
    const rows: any[] = [];
    for (const v of species.varieties) {
      const pokeName = v.pokemon.name;
      try {
        const pdata = await fetchJson(`${POKEAPI}/pokemon/${pokeName}`);
        const form = v.is_default ? "default" : getFormName(pokeName, baseName);
        rows.push(buildPokemonRow(id, nameKr, form, pdata));
      } catch { /* 폼 404 스킵 */ }
    }
    if (id % 100 === 0) console.log(`  pokemon ${id}/${MAX_SPECIES}`);
    return rows;
  });
  const all = perSpecies.filter(Boolean).flat() as any[];
  all.sort((a, b) => a.pokedex_number - b.pokedex_number || (a.form === "default" ? -1 : a.form.localeCompare(b.form)));
  all.forEach((r, i) => (r.id = i + 1));
  write("pokemon.json", all);
}

/* ========================= MOVES ========================= */
const SET = (a: string[]) => new Set(a);
const PUNCH = SET(["ice-punch","fire-punch","thunder-punch","mach-punch","mega-punch","comet-punch","bullet-punch","drain-punch","focus-punch","sky-uppercut","dynamic-punch","dizzy-punch","shadow-punch","meteor-mash","power-up-punch","plasma-fists","surging-strikes","wicked-blow","rage-fist"]);
const BITE = SET(["bite","crunch","fire-fang","ice-fang","thunder-fang","poison-fang","hyper-fang","psychic-fangs","fishious-rend","jaw-lock"]);
const PULSE = SET(["aura-sphere","dark-pulse","dragon-pulse","heal-pulse","water-pulse","origin-pulse","terrain-pulse"]);
const SLASH = SET(["cut","slash","fury-cutter","night-slash","air-slash","psycho-cut","leaf-blade","razor-shell","sacred-sword","secret-sword","aerial-ace","x-scissor","cross-poison","behemoth-blade","ceaseless-edge","kowtow-cleave","bitter-blade","population-bomb"]);
const SOUND = SET(["boomburst","bug-buzz","chatter","clanging-scales","clangorous-soul","confide","disarming-voice","echoed-voice","eerie-spell","grass-whistle","growl","heal-bell","howl","hyper-voice","metal-sound","noble-roar","overdrive","parting-shot","perish-song","relic-song","roar","round","screech","shadow-panic","sing","snarl","snore","sparkling-aria","supersonic","torch-song","uproar"]);
const RECOIL = SET(["brave-bird","double-edge","flare-blitz","head-charge","head-smash","high-jump-kick","jump-kick","light-of-ruin","submission","take-down","volt-tackle","wave-crash","wild-charge","wood-hammer"]);
const SPREAD = SET(["blizzard","boomburst","breaking-swipe","brutal-swing","bulldoze","burning-jealousy","cotton-spore","dark-void","dazzling-gleam","discharge","earthquake","electroweb","eruption","explosion","glacial-lance","heat-wave","hyper-voice","icy-wind","lava-plume","make-it-rain","muddy-water","origin-pulse","overdrive","precipice-blades","rock-slide","self-destruct","sludge-wave","snarl","struggle-bug","surf","sweet-scent","water-spout"]);
const GEN_MAP: Record<string, number> = { "generation-i":1,"generation-ii":2,"generation-iii":3,"generation-iv":4,"generation-v":5,"generation-vi":6,"generation-vii":7,"generation-viii":8,"generation-ix":9 };
async function buildMoves() {
  console.log("→ moves 수집…");
  const ids = Array.from({ length: MAX_MOVE }, (_, i) => i + 1);
  const rows = await pool(ids, CONCURRENCY, async (id) => {
    const data = await fetchJson(`${POKEAPI}/move/${id}`);
    const moveName = data.name as string;
    const meta = data.meta;
    if (id % 200 === 0) console.log(`  moves ${id}/${MAX_MOVE}`);
    return {
      id,
      name_kr: getName(data.names, "ko") ?? getName(data.names, "en") ?? data.name,
      name_en: getName(data.names, "en") ?? data.name,
      type: data.type.name,
      category: ({ physical: "physical", special: "special", status: "status" } as any)[data.damage_class.name] ?? "status",
      power: data.power, accuracy: data.accuracy, pp: data.pp ?? 0, priority: data.priority ?? 0,
      generation: GEN_MAP[data.generation.name] ?? 1,
      makes_contact: meta?.category?.name === "contact" || false,
      is_sound: SOUND.has(moveName), is_punch: PUNCH.has(moveName), is_bite: BITE.has(moveName),
      is_pulse: PULSE.has(moveName), is_slash: SLASH.has(moveName), is_recoil: RECOIL.has(moveName), is_spread: SPREAD.has(moveName),
      multi_hit_min: meta?.min_hits ?? null, multi_hit_max: meta?.max_hits ?? null,
    };
  });
  write("moves.json", rows.filter(Boolean));
}

/* ========================= NATURES ========================= */
async function buildNatures() {
  console.log("→ natures 수집…");
  const STAT: Record<string, string> = { attack:"atk", defense:"def", "special-attack":"spa", "special-defense":"spd", speed:"spe" };
  const ids = Array.from({ length: 25 }, (_, i) => i + 1);
  const rows = await pool(ids, CONCURRENCY, async (id) => {
    const d = await fetchJson(`${POKEAPI}/nature/${id}`);
    return {
      id,
      name_kr: getName(d.names, "ko") ?? getName(d.names, "en") ?? d.name,
      name_en: getName(d.names, "en") ?? d.name,
      plus_stat: d.increased_stat ? STAT[d.increased_stat.name] ?? null : null,
      minus_stat: d.decreased_stat ? STAT[d.decreased_stat.name] ?? null : null,
    };
  });
  write("natures.json", rows.filter(Boolean));
}

/* ========================= TYPE MATCHUPS ========================= */
const ALL_TYPES = ["normal","fighting","flying","poison","ground","rock","bug","ghost","steel","fire","water","grass","electric","psychic","ice","dragon","dark","fairy"];
async function buildTypes() {
  console.log("→ type_matchups 수집…");
  const rows: any[] = [];
  for (let id = 1; id <= 18; id++) {
    const d = await fetchJson(`${POKEAPI}/type/${id}`);
    const atk = d.name as string;
    const dr = d.damage_relations;
    const m: Record<string, number> = {};
    for (const t of ALL_TYPES) m[t] = 1;
    for (const t of dr.double_damage_to) m[t.name] = 2;
    for (const t of dr.half_damage_to) m[t.name] = 0.5;
    for (const t of dr.no_damage_to) m[t.name] = 0;
    for (const [def, mult] of Object.entries(m)) rows.push({ atk_type: atk, def_type: def, multiplier: mult });
  }
  write("type_matchups.json", rows);
}

/* ========================= ABILITIES ========================= */
const DAMAGE_ABILITIES: Record<string, { effect: string; type: string; value: number }> = {
  adaptability:{effect:"STAB 2.0으로 상승",type:"stab",value:2.0},"tinted-lens":{effect:"효과별로 시 2배",type:"not_effective_boost",value:2.0},sniper:{effect:"급소 시 2.25배",type:"crit",value:2.25},"iron-fist":{effect:"펀치기 1.2배",type:"punch",value:1.2},reckless:{effect:"반동기 1.3배",type:"recoil",value:1.3},"huge-power":{effect:"공격 2배",type:"atk",value:2.0},"pure-power":{effect:"공격 2배",type:"atk",value:2.0},"solar-power":{effect:"쾌청 시 특공 1.5배",type:"spa_sun",value:1.5},"sand-force":{effect:"모래바람 시 바위/땅/강철 1.3배",type:"sand_boost",value:1.3},transistor:{effect:"전기 기술 1.3배",type:"electric_boost",value:1.3},"strong-jaw":{effect:"물기 기술 1.5배",type:"bite",value:1.5},"mega-launcher":{effect:"파동 기술 1.5배",type:"pulse",value:1.5},sharpness:{effect:"베기 기술 1.5배",type:"slash",value:1.5},technician:{effect:"위력60이하 1.5배",type:"low_power",value:1.5},guts:{effect:"상태이상 시 공격 1.5배",type:"status_atk",value:1.5},"toxic-boost":{effect:"독 시 특공 1.5배",type:"poison_spa",value:1.5},"fairy-aura":{effect:"페어리 기술 1.33배",type:"fairy_boost",value:1.33},"dark-aura":{effect:"악 기술 1.33배",type:"dark_boost",value:1.33},"aura-break":{effect:"오라 반전 0.75배",type:"aura_break",value:0.75},"solid-rock":{effect:"효과발군 0.75배",type:"super_effective_reduce",value:0.75},filter:{effect:"효과발군 0.75배",type:"super_effective_reduce",value:0.75},"prism-armor":{effect:"효과발군 0.75배",type:"super_effective_reduce",value:0.75},"thick-fat":{effect:"불꽃/얼음 0.5배",type:"fire_ice_reduce",value:0.5},multiscale:{effect:"HP풀일때 0.5배",type:"full_hp_reduce",value:0.5},"shadow-shield":{effect:"HP풀일때 0.5배",type:"full_hp_reduce",value:0.5},"fur-coat":{effect:"접촉기 0.5배",type:"contact_reduce",value:0.5},"ice-scales":{effect:"특수 0.5배",type:"special_reduce",value:0.5},"dry-skin":{effect:"불꽃 1.25배/물 무효",type:"dry_skin",value:1.25},levitate:{effect:"땅 면역",type:"ground_immune",value:0},"flash-fire":{effect:"불꽃 무효+불꽃 1.5배",type:"fire_boost",value:1.5},blaze:{effect:"HP1/3이하 불꽃 1.5배",type:"pinch_fire",value:1.5},torrent:{effect:"HP1/3이하 물 1.5배",type:"pinch_water",value:1.5},overgrow:{effect:"HP1/3이하 풀 1.5배",type:"pinch_grass",value:1.5},swarm:{effect:"HP1/3이하 벌레 1.5배",type:"pinch_bug",value:1.5},refrigerate:{effect:"노말→얼음, 1.2배",type:"skin_ice",value:1.2},aerilate:{effect:"노말→비행, 1.2배",type:"skin_flying",value:1.2},pixilate:{effect:"노말→페어리, 1.2배",type:"skin_fairy",value:1.2},galvanize:{effect:"노말→전기, 1.2배",type:"skin_electric",value:1.2},
};
async function buildAbilities() {
  console.log("→ abilities 수집…");
  const ids = Array.from({ length: 400 }, (_, i) => i + 1);
  const rows = await pool(ids, CONCURRENCY, async (id) => {
    const d = await fetchJson(`${POKEAPI}/ability/${id}`);
    const dmg = DAMAGE_ABILITIES[d.name];
    return {
      id,
      name_kr: getName(d.names, "ko") ?? getName(d.names, "en") ?? d.name,
      name_en: getName(d.names, "en") ?? d.name,
      damage_effect: dmg?.effect ?? null, modifier_type: dmg?.type ?? null, modifier_value: dmg?.value ?? null,
    };
  });
  write("abilities.json", rows.filter(Boolean));
}

/* ========================= ITEMS ========================= */
const DAMAGE_ITEMS: any[] = [
  {name_en:"Choice Band",slug:"choice-band",damage_modifier:null,stat_modifier:"atk",stat_multiplier:1.5,condition:"physical"},
  {name_en:"Choice Specs",slug:"choice-specs",damage_modifier:null,stat_modifier:"spa",stat_multiplier:1.5,condition:"special"},
  {name_en:"Life Orb",slug:"life-orb",damage_modifier:1.3,stat_modifier:null,stat_multiplier:null,condition:null},
  {name_en:"Expert Belt",slug:"expert-belt",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"super_effective"},
  {name_en:"Choice Scarf",slug:"choice-scarf",damage_modifier:null,stat_modifier:"spe",stat_multiplier:1.5,condition:null},
  {name_en:"Assault Vest",slug:"assault-vest",damage_modifier:null,stat_modifier:"spd",stat_multiplier:1.5,condition:null},
  {name_en:"Charcoal",slug:"charcoal",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:fire"},
  {name_en:"Mystic Water",slug:"mystic-water",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:water"},
  {name_en:"Miracle Seed",slug:"miracle-seed",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:grass"},
  {name_en:"Magnet",slug:"magnet",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:electric"},
  {name_en:"Never-Melt Ice",slug:"never-melt-ice",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:ice"},
  {name_en:"Black Belt",slug:"black-belt",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:fighting"},
  {name_en:"Poison Barb",slug:"poison-barb",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:poison"},
  {name_en:"Soft Sand",slug:"soft-sand",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:ground"},
  {name_en:"Sharp Beak",slug:"sharp-beak",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:flying"},
  {name_en:"Twisted Spoon",slug:"twisted-spoon",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:psychic"},
  {name_en:"Silver Powder",slug:"silver-powder",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:bug"},
  {name_en:"Hard Stone",slug:"hard-stone",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:rock"},
  {name_en:"Spell Tag",slug:"spell-tag",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:ghost"},
  {name_en:"Dragon Fang",slug:"dragon-fang",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:dragon"},
  {name_en:"Black Glasses",slug:"black-glasses",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:dark"},
  {name_en:"Metal Coat",slug:"metal-coat",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:steel"},
  {name_en:"Silk Scarf",slug:"silk-scarf",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:normal"},
  {name_en:"Fairy Feather",slug:"fairy-feather",damage_modifier:1.2,stat_modifier:null,stat_multiplier:null,condition:"type:fairy"},
  {name_en:"Eviolite",slug:"eviolite",damage_modifier:null,stat_modifier:"def,spd",stat_multiplier:1.5,condition:"not_fully_evolved"},
  {name_en:"Muscle Band",slug:"muscle-band",damage_modifier:1.1,stat_modifier:null,stat_multiplier:null,condition:"physical"},
  {name_en:"Wise Glasses",slug:"wise-glasses",damage_modifier:1.1,stat_modifier:null,stat_multiplier:null,condition:"special"},
  {name_en:"Thick Club",slug:"thick-club",damage_modifier:null,stat_modifier:"atk",stat_multiplier:2.0,condition:"cubone_marowak"},
  {name_en:"Light Ball",slug:"light-ball",damage_modifier:null,stat_modifier:"atk",stat_multiplier:2.0,condition:"pikachu"},
  {name_en:"Deep Sea Tooth",slug:"deep-sea-tooth",damage_modifier:null,stat_modifier:"spa",stat_multiplier:2.0,condition:"clamperl"},
  {name_en:"Deep Sea Scale",slug:"deep-sea-scale",damage_modifier:null,stat_modifier:"spd",stat_multiplier:2.0,condition:"clamperl"},
  {name_en:"Metal Powder",slug:"metal-powder",damage_modifier:null,stat_modifier:"def",stat_multiplier:2.0,condition:"ditto"},
  {name_en:"Metronome",slug:"metronome",damage_modifier:1.0,stat_modifier:null,stat_multiplier:null,condition:"metronome_stacking"},
  {name_en:"Occa Berry",slug:"occa-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:fire"},
  {name_en:"Passho Berry",slug:"passho-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:water"},
  {name_en:"Wacan Berry",slug:"wacan-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:electric"},
  {name_en:"Rindo Berry",slug:"rindo-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:grass"},
  {name_en:"Yache Berry",slug:"yache-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:ice"},
  {name_en:"Chople Berry",slug:"chople-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:fighting"},
  {name_en:"Kebia Berry",slug:"kebia-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:poison"},
  {name_en:"Shuca Berry",slug:"shuca-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:ground"},
  {name_en:"Coba Berry",slug:"coba-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:flying"},
  {name_en:"Payapa Berry",slug:"payapa-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:psychic"},
  {name_en:"Tanga Berry",slug:"tanga-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:bug"},
  {name_en:"Charti Berry",slug:"charti-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:rock"},
  {name_en:"Kasib Berry",slug:"kasib-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:ghost"},
  {name_en:"Haban Berry",slug:"haban-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:dragon"},
  {name_en:"Colbur Berry",slug:"colbur-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:dark"},
  {name_en:"Babiri Berry",slug:"babiri-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:steel"},
  {name_en:"Chilan Berry",slug:"chilan-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"type:normal"},
  {name_en:"Roseli Berry",slug:"roseli-berry",damage_modifier:0.5,stat_modifier:null,stat_multiplier:null,condition:"super_effective:fairy"},
  {name_en:"Normal Gem",slug:"normal-gem",damage_modifier:1.3,stat_modifier:null,stat_multiplier:null,condition:"gem:normal"},
];
const EXTRA_ITEMS = [
  {id:2000,name_kr:"기합의띠",name_en:"Focus Sash",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"survives_ohko"},
  {id:2001,name_kr:"자뭉열매",name_en:"Sitrus Berry",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"heal_25%"},
  {id:2002,name_kr:"남은음식",name_en:"Leftovers",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"heal_1/16"},
  {id:2003,name_kr:"검은진흙",name_en:"Black Sludge",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"heal_1/16_poison"},
  {id:2004,name_kr:"기합의머리띠",name_en:"Focus Band",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"survive_10%"},
  {id:2005,name_kr:"울퉁불퉁멧",name_en:"Rocky Helmet",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"contact_1/6"},
  {id:2006,name_kr:"하양허브",name_en:"White Herb",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"reset_stat_drop"},
  {id:2007,name_kr:"빨간실",name_en:"Red Card",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"force_switch"},
  {id:2008,name_kr:"탈출버튼",name_en:"Eject Button",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"switch_on_hit"},
  {id:2009,name_kr:"탈출팩",name_en:"Eject Pack",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"switch_on_stat_drop"},
  {id:2010,name_kr:"약점보험",name_en:"Weakness Policy",damage_modifier:null,stat_modifier:"atk,spa",stat_multiplier:2.0,condition:"super_effective_hit"},
  {id:2012,name_kr:"클리어참",name_en:"Clear Amulet",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"prevent_stat_drop"},
  {id:2013,name_kr:"편한신발",name_en:"Heavy-Duty Boots",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"ignore_hazards"},
  {id:2014,name_kr:"방진고글",name_en:"Safety Goggles",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"ignore_weather_powder"},
  {id:2015,name_kr:"나무열매주스",name_en:"Berry Juice",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"heal_20hp"},
  {id:2016,name_kr:"오렌열매",name_en:"Oran Berry",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"heal_10hp"},
  {id:2017,name_kr:"리샘열매",name_en:"Lum Berry",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"cure_status"},
  {id:2018,name_kr:"크라보열매",name_en:"Cheri Berry",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"cure_paralysis"},
  {id:2019,name_kr:"복숭열매",name_en:"Pecha Berry",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"cure_poison"},
  {id:2020,name_kr:"라즈열매",name_en:"Rawst Berry",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"cure_burn"},
  {id:2021,name_kr:"나나시열매",name_en:"Aspear Berry",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"cure_freeze"},
  {id:2022,name_kr:"잠열매",name_en:"Chesto Berry",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"cure_sleep"},
  {id:2023,name_kr:"초점렌즈",name_en:"Scope Lens",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"crit_rate+1"},
  {id:2024,name_kr:"날카로운손톱",name_en:"Razor Claw",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"crit_rate+1"},
  {id:2025,name_kr:"넓은렌즈",name_en:"Wide Lens",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"accuracy_1.1x"},
  {id:2026,name_kr:"흡수구근",name_en:"Absorb Bulb",damage_modifier:null,stat_modifier:"spa",stat_multiplier:null,condition:"spa+1_on_water_hit"},
  {id:2027,name_kr:"충전지",name_en:"Cell Battery",damage_modifier:null,stat_modifier:"atk",stat_multiplier:null,condition:"atk+1_on_electric_hit"},
  {id:2028,name_kr:"눈덩이",name_en:"Snowball",damage_modifier:null,stat_modifier:"atk",stat_multiplier:null,condition:"atk+1_on_ice_hit"},
  {id:2029,name_kr:"빛의점토",name_en:"Light Clay",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"screen_8turns"},
  {id:2030,name_kr:"축축한바위",name_en:"Damp Rock",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"rain_8turns"},
  {id:2031,name_kr:"뜨거운바위",name_en:"Heat Rock",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"sun_8turns"},
  {id:2032,name_kr:"차가운바위",name_en:"Icy Rock",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"snow_8turns"},
  {id:2033,name_kr:"고운모래바위",name_en:"Smooth Rock",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"sand_8turns"},
  {id:2034,name_kr:"조이는밴드",name_en:"Binding Band",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"trap_1/6"},
  {id:2035,name_kr:"그래스시드",name_en:"Grassy Seed",damage_modifier:null,stat_modifier:"def",stat_multiplier:null,condition:"def+1_grassy"},
  {id:2036,name_kr:"일렉트릭시드",name_en:"Electric Seed",damage_modifier:null,stat_modifier:"def",stat_multiplier:null,condition:"def+1_electric"},
  {id:2037,name_kr:"사이코시드",name_en:"Psychic Seed",damage_modifier:null,stat_modifier:"spd",stat_multiplier:null,condition:"spd+1_psychic"},
  {id:2038,name_kr:"미스트시드",name_en:"Misty Seed",damage_modifier:null,stat_modifier:"spd",stat_multiplier:null,condition:"spd+1_misty"},
  {id:2039,name_kr:"엉킨실",name_en:"Loaded Dice",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"multi_hit_4-5"},
  {id:2040,name_kr:"부적금화",name_en:"Amulet Coin",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"money_2x"},
  {id:2041,name_kr:"먹다남은음식",name_en:"Shell Bell",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"heal_1/8_dmg"},
  {id:2042,name_kr:"구애목도리",name_en:"Throat Spray",damage_modifier:null,stat_modifier:"spa",stat_multiplier:null,condition:"spa+1_on_sound"},
  {id:2043,name_kr:"멘탈허브",name_en:"Mental Herb",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"cure_infatuation"},
  {id:2044,name_kr:"풍선",name_en:"Air Balloon",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"levitate_until_hit"},
  {id:2045,name_kr:"격한열매",name_en:"Salac Berry",damage_modifier:null,stat_modifier:"spe",stat_multiplier:null,condition:"spe+1_low_hp"},
  {id:2046,name_kr:"야타비열매",name_en:"Petaya Berry",damage_modifier:null,stat_modifier:"spa",stat_multiplier:null,condition:"spa+1_low_hp"},
  {id:2047,name_kr:"치들열매",name_en:"Liechi Berry",damage_modifier:null,stat_modifier:"atk",stat_multiplier:null,condition:"atk+1_low_hp"},
  {id:2048,name_kr:"캄라열매",name_en:"Ganlon Berry",damage_modifier:null,stat_modifier:"def",stat_multiplier:null,condition:"def+1_low_hp"},
  {id:2049,name_kr:"슈카열매",name_en:"Apicot Berry",damage_modifier:null,stat_modifier:"spd",stat_multiplier:null,condition:"spd+1_low_hp"},
  {id:2050,name_kr:"아슬열매",name_en:"Custap Berry",damage_modifier:null,stat_modifier:null,stat_multiplier:null,condition:"priority_low_hp"},
];
async function buildItems() {
  console.log("→ items 수집…");
  const fetched = await pool(DAMAGE_ITEMS, CONCURRENCY, async (item) => {
    const d = await fetchJson(`${POKEAPI}/item/${item.slug}`);
    return {
      id: d.id,
      name_kr: getName(d.names, "ko") ?? item.name_en,
      name_en: item.name_en,
      damage_modifier: item.damage_modifier, stat_modifier: item.stat_modifier,
      stat_multiplier: item.stat_multiplier, condition: item.condition,
    };
  });
  const rows = [...fetched.filter(Boolean) as any[], ...EXTRA_ITEMS];
  write("items.json", rows);
}

/* ========================= MAIN ========================= */
async function main() {
  const t0 = Date.now();
  await buildNatures();
  await buildTypes();
  await buildAbilities();
  await buildItems();
  await buildMoves();
  await buildPokemon();
  console.log(`\n=== 전체 완료 (${((Date.now() - t0) / 1000).toFixed(0)}초) ===`);
}
main().catch((e) => { console.error(e); process.exit(1); });
