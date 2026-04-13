import { supabase } from "./supabase-admin";

async function count(table: string, filter?: string): Promise<number> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) {
    // filter format: "column.eq.value"
    const [col, op, val] = filter.split(".");
    query = query.filter(col, op as any, val);
  }
  const { count: c, error } = await query;
  if (error) {
    console.error(`  [에러] ${table}: ${error.message}`);
    return -1;
  }
  return c ?? 0;
}

async function countNull(table: string, column: string): Promise<number> {
  const { count: c, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .is(column, null);
  if (error) return -1;
  return c ?? 0;
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║       시드 데이터 검증 리포트            ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // 포켓몬
  const totalPokemon = await count("pokemon");
  const defaultForms = await count("pokemon", "form.eq.default");
  const megaForms =
    (await count("pokemon", "form.eq.mega")) +
    (await count("pokemon", "form.eq.mega-x")) +
    (await count("pokemon", "form.eq.mega-y"));
  const alolaForms = await count("pokemon", "form.eq.alola");
  const galarForms = await count("pokemon", "form.eq.galar");
  const hisuiForms = await count("pokemon", "form.eq.hisui");
  const paldeaForms = await count("pokemon", "form.eq.paldea");
  const gmaxForms = await count("pokemon", "form.eq.gmax");
  const pokemonNullKr = await countNull("pokemon", "name_kr");
  const pokemonNullSprite = await countNull("pokemon", "sprite_url");

  console.log("── 포켓몬 ──────────────────────────────");
  console.log(`  총 수:         ${totalPokemon}`);
  console.log(`  기본폼:        ${defaultForms}`);
  console.log(`  메가진화:      ${megaForms}`);
  console.log(`  앨로라:        ${alolaForms}`);
  console.log(`  가라르:        ${galarForms}`);
  console.log(`  히스이:        ${hisuiForms}`);
  console.log(`  팔데아:        ${paldeaForms}`);
  console.log(`  거다이맥스:    ${gmaxForms}`);
  console.log(`  한글이름 누락: ${pokemonNullKr}`);
  console.log(`  스프라이트 없음: ${pokemonNullSprite}`);

  // 기술
  const totalMoves = await count("moves");
  const movesNullKr = await countNull("moves", "name_kr");

  console.log("\n── 기술 ────────────────────────────────");
  console.log(`  총 수:         ${totalMoves}`);
  console.log(`  한글이름 누락: ${movesNullKr}`);

  // 성격
  const totalNatures = await count("natures");
  console.log("\n── 성격 ────────────────────────────────");
  console.log(`  총 수:         ${totalNatures} (기대값: 25)`);
  console.log(`  ${totalNatures === 25 ? "✓ OK" : "✗ 불일치!"}`);

  // 타입상성
  const totalMatchups = await count("type_matchups");
  console.log("\n── 타입상성 ────────────────────────────");
  console.log(`  총 수:         ${totalMatchups} (기대값: 324)`);
  console.log(`  ${totalMatchups === 324 ? "✓ OK" : "✗ 불일치!"}`);

  // 특성
  const totalAbilities = await count("abilities");
  console.log("\n── 특성 ────────────────────────────────");
  console.log(`  총 수:         ${totalAbilities}`);

  // 도구
  const totalItems = await count("items");
  console.log("\n── 도구 ────────────────────────────────");
  console.log(`  총 수:         ${totalItems}`);

  // 포켓몬-기술
  const totalPkMoves = await count("pokemon_moves");
  console.log("\n── 포켓몬-기술 관계 ────────────────────");
  console.log(`  총 수:         ${totalPkMoves}`);

  console.log("\n════════════════════════════════════════");
  console.log("검증 완료!");
}

main().catch(console.error);
