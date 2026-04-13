// ============================================================
// 기본 데미지 공식
// damage = ((2 × level ÷ 5 + 2) × power × atk ÷ def) ÷ 50 + 2
// 매 단계 Math.floor 적용
// ============================================================

/**
 * 보정값 적용 전의 순수 기본 데미지 계산
 */
export function calcBaseDamage(
  level: number,
  power: number,
  atk: number,
  def: number
): number {
  const step1 = Math.floor(2 * level / 5) + 2; // (2 × level ÷ 5 + 2)
  const step2 = Math.floor(step1 * power * atk / def); // × power × atk ÷ def
  const step3 = Math.floor(step2 / 50) + 2; // ÷ 50 + 2
  return step3;
}

/**
 * 보정값을 순서대로 곱하기 (매 단계 Math.floor)
 * modifiers: [배율1, 배율2, ...] 순서대로 적용
 */
export function applyModifiers(damage: number, modifiers: number[]): number {
  let result = damage;
  for (const mod of modifiers) {
    result = Math.floor(result * mod);
  }
  return result;
}

/**
 * 난수 보정 (0.85 ~ 1.00, 16단계)
 * 각 단계: 85, 86, 87, ..., 100 → /100
 */
export function getDamageRolls(damage: number): number[] {
  const rolls: number[] = [];
  for (let r = 85; r <= 100; r++) {
    rolls.push(Math.floor(damage * r / 100));
  }
  return rolls;
}
