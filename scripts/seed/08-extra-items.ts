import { supabase } from "./supabase-admin";

const EXTRA_ITEMS = [
  { id: 2000, name_kr: "기합의띠", name_en: "Focus Sash", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "survives_ohko" },
  { id: 2001, name_kr: "자뭉열매", name_en: "Sitrus Berry", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "heal_25%" },
  { id: 2002, name_kr: "남은음식", name_en: "Leftovers", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "heal_1/16" },
  { id: 2003, name_kr: "검은진흙", name_en: "Black Sludge", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "heal_1/16_poison" },
  { id: 2004, name_kr: "기합의머리띠", name_en: "Focus Band", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "survive_10%" },
  { id: 2005, name_kr: "울퉁불퉁멧", name_en: "Rocky Helmet", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "contact_1/6" },
  { id: 2006, name_kr: "하양허브", name_en: "White Herb", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "reset_stat_drop" },
  { id: 2007, name_kr: "빨간실", name_en: "Red Card", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "force_switch" },
  { id: 2008, name_kr: "탈출버튼", name_en: "Eject Button", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "switch_on_hit" },
  { id: 2009, name_kr: "탈출팩", name_en: "Eject Pack", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "switch_on_stat_drop" },
  { id: 2010, name_kr: "약점보험", name_en: "Weakness Policy", damage_modifier: null, stat_modifier: "atk,spa", stat_multiplier: 2.0, condition: "super_effective_hit" },
  { id: 2012, name_kr: "클리어참", name_en: "Clear Amulet", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "prevent_stat_drop" },
  { id: 2013, name_kr: "편한신발", name_en: "Heavy-Duty Boots", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "ignore_hazards" },
  { id: 2014, name_kr: "방진고글", name_en: "Safety Goggles", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "ignore_weather_powder" },
  { id: 2015, name_kr: "나무열매주스", name_en: "Berry Juice", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "heal_20hp" },
  { id: 2016, name_kr: "오렌열매", name_en: "Oran Berry", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "heal_10hp" },
  { id: 2017, name_kr: "리샘열매", name_en: "Lum Berry", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "cure_status" },
  { id: 2018, name_kr: "크라보열매", name_en: "Cheri Berry", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "cure_paralysis" },
  { id: 2019, name_kr: "복숭열매", name_en: "Pecha Berry", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "cure_poison" },
  { id: 2020, name_kr: "라즈열매", name_en: "Rawst Berry", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "cure_burn" },
  { id: 2021, name_kr: "나나시열매", name_en: "Aspear Berry", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "cure_freeze" },
  { id: 2022, name_kr: "잠열매", name_en: "Chesto Berry", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "cure_sleep" },
  { id: 2023, name_kr: "초점렌즈", name_en: "Scope Lens", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "crit_rate+1" },
  { id: 2024, name_kr: "날카로운손톱", name_en: "Razor Claw", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "crit_rate+1" },
  { id: 2025, name_kr: "넓은렌즈", name_en: "Wide Lens", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "accuracy_1.1x" },
  { id: 2026, name_kr: "흡수구근", name_en: "Absorb Bulb", damage_modifier: null, stat_modifier: "spa", stat_multiplier: null, condition: "spa+1_on_water_hit" },
  { id: 2027, name_kr: "충전지", name_en: "Cell Battery", damage_modifier: null, stat_modifier: "atk", stat_multiplier: null, condition: "atk+1_on_electric_hit" },
  { id: 2028, name_kr: "눈덩이", name_en: "Snowball", damage_modifier: null, stat_modifier: "atk", stat_multiplier: null, condition: "atk+1_on_ice_hit" },
  { id: 2029, name_kr: "빛의점토", name_en: "Light Clay", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "screen_8turns" },
  { id: 2030, name_kr: "축축한바위", name_en: "Damp Rock", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "rain_8turns" },
  { id: 2031, name_kr: "뜨거운바위", name_en: "Heat Rock", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "sun_8turns" },
  { id: 2032, name_kr: "차가운바위", name_en: "Icy Rock", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "snow_8turns" },
  { id: 2033, name_kr: "고운모래바위", name_en: "Smooth Rock", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "sand_8turns" },
  { id: 2034, name_kr: "조이는밴드", name_en: "Binding Band", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "trap_1/6" },
  { id: 2035, name_kr: "그래스시드", name_en: "Grassy Seed", damage_modifier: null, stat_modifier: "def", stat_multiplier: null, condition: "def+1_grassy" },
  { id: 2036, name_kr: "일렉트릭시드", name_en: "Electric Seed", damage_modifier: null, stat_modifier: "def", stat_multiplier: null, condition: "def+1_electric" },
  { id: 2037, name_kr: "사이코시드", name_en: "Psychic Seed", damage_modifier: null, stat_modifier: "spd", stat_multiplier: null, condition: "spd+1_psychic" },
  { id: 2038, name_kr: "미스트시드", name_en: "Misty Seed", damage_modifier: null, stat_modifier: "spd", stat_multiplier: null, condition: "spd+1_misty" },
  { id: 2039, name_kr: "엉킨실", name_en: "Loaded Dice", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "multi_hit_4-5" },
  { id: 2040, name_kr: "부적금화", name_en: "Amulet Coin", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "money_2x" },
  { id: 2041, name_kr: "먹다남은음식", name_en: "Shell Bell", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "heal_1/8_dmg" },
  { id: 2042, name_kr: "구애목도리", name_en: "Throat Spray", damage_modifier: null, stat_modifier: "spa", stat_multiplier: null, condition: "spa+1_on_sound" },
  { id: 2043, name_kr: "멘탈허브", name_en: "Mental Herb", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "cure_infatuation" },
  { id: 2044, name_kr: "풍선", name_en: "Air Balloon", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "levitate_until_hit" },
  { id: 2045, name_kr: "격한열매", name_en: "Salac Berry", damage_modifier: null, stat_modifier: "spe", stat_multiplier: null, condition: "spe+1_low_hp" },
  { id: 2046, name_kr: "야타비열매", name_en: "Petaya Berry", damage_modifier: null, stat_modifier: "spa", stat_multiplier: null, condition: "spa+1_low_hp" },
  { id: 2047, name_kr: "치들열매", name_en: "Liechi Berry", damage_modifier: null, stat_modifier: "atk", stat_multiplier: null, condition: "atk+1_low_hp" },
  { id: 2048, name_kr: "캄라열매", name_en: "Ganlon Berry", damage_modifier: null, stat_modifier: "def", stat_multiplier: null, condition: "def+1_low_hp" },
  { id: 2049, name_kr: "슈카열매", name_en: "Apicot Berry", damage_modifier: null, stat_modifier: "spd", stat_multiplier: null, condition: "spd+1_low_hp" },
  { id: 2050, name_kr: "아슬열매", name_en: "Custap Berry", damage_modifier: null, stat_modifier: null, stat_multiplier: null, condition: "priority_low_hp" },
];

async function main() {
  console.log("=== 추가 도구 시드 ===");
  const { error } = await supabase.from("items").upsert(EXTRA_ITEMS, { onConflict: "id" });
  if (error) console.error("실패:", error.message);
  else console.log(`완료: ${EXTRA_ITEMS.length}건 추가`);
}

main().catch(console.error);
