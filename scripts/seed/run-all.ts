import { execSync } from "child_process";
import * as path from "path";

const SCRIPTS = [
  "01-pokemon.ts",
  "02-moves.ts",
  "03-natures.ts",
  "04-type-matchups.ts",
  "05-abilities.ts",
  "06-items.ts",
  "07-pokemon-moves.ts",
];

const seedDir = path.resolve(__dirname);

async function main() {
  console.log("=== 전체 시드 스크립트 순차 실행 ===\n");
  const start = Date.now();

  for (const script of SCRIPTS) {
    const scriptPath = path.join(seedDir, script);
    console.log(`\n${"=".repeat(50)}`);
    console.log(`▶ ${script} 실행 중...`);
    console.log("=".repeat(50));

    try {
      execSync(`npx tsx "${scriptPath}"`, {
        stdio: "inherit",
        cwd: path.resolve(seedDir, "../.."),
      });
      console.log(`✓ ${script} 완료`);
    } catch (err) {
      console.error(`✗ ${script} 실패`);
      console.error(err);
      process.exit(1);
    }
  }

  const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);
  console.log(`\n=== 전체 완료 (${elapsed}분) ===`);
}

main();
