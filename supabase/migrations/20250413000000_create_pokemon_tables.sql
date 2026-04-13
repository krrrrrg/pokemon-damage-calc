-- ============================================================
-- 포켓몬 데미지 계산기 - 전체 테이블 생성
-- ============================================================

-- 1. pokemon 테이블
CREATE TABLE IF NOT EXISTS pokemon (
  id              serial PRIMARY KEY,
  pokedex_number  int NOT NULL,
  name_kr         text NOT NULL,
  name_en         text NOT NULL,
  form            text NOT NULL DEFAULT 'default',
  type1           text NOT NULL,
  type2           text,
  hp              int NOT NULL,
  atk             int NOT NULL,
  def             int NOT NULL,
  spa             int NOT NULL,
  spd             int NOT NULL,
  spe             int NOT NULL,
  ability1        text,
  ability2        text,
  hidden_ability  text,
  generation      int NOT NULL DEFAULT 1,
  sprite_url      text,
  mega_form_id    int,
  gmax_form       boolean NOT NULL DEFAULT false,
  weight          float,

  UNIQUE (pokedex_number, form)
);

CREATE INDEX idx_pokemon_name_kr ON pokemon (name_kr);
CREATE INDEX idx_pokemon_name_en ON pokemon (name_en);
CREATE INDEX idx_pokemon_pokedex ON pokemon (pokedex_number);
CREATE INDEX idx_pokemon_type1 ON pokemon (type1);
CREATE INDEX idx_pokemon_form ON pokemon (form);

-- 2. moves 테이블
CREATE TABLE IF NOT EXISTS moves (
  id          int PRIMARY KEY,
  name_kr     text NOT NULL,
  name_en     text NOT NULL,
  type        text NOT NULL,
  category    text NOT NULL CHECK (category IN ('physical', 'special', 'status')),
  power       int,
  accuracy    int,
  pp          int NOT NULL,
  priority    int NOT NULL DEFAULT 0,
  generation  int NOT NULL DEFAULT 1,
  makes_contact boolean NOT NULL DEFAULT false,
  is_sound    boolean NOT NULL DEFAULT false,
  is_punch    boolean NOT NULL DEFAULT false,
  is_bite     boolean NOT NULL DEFAULT false,
  is_pulse    boolean NOT NULL DEFAULT false,
  is_slash    boolean NOT NULL DEFAULT false,
  is_recoil   boolean NOT NULL DEFAULT false,
  is_spread   boolean NOT NULL DEFAULT false,
  multi_hit_min int,
  multi_hit_max int
);

CREATE INDEX idx_moves_name_kr ON moves (name_kr);
CREATE INDEX idx_moves_name_en ON moves (name_en);
CREATE INDEX idx_moves_type ON moves (type);
CREATE INDEX idx_moves_category ON moves (category);

-- 3. natures 테이블
CREATE TABLE IF NOT EXISTS natures (
  id          int PRIMARY KEY,
  name_kr     text NOT NULL,
  name_en     text NOT NULL,
  plus_stat   text,
  minus_stat  text
);

-- 4. type_matchups 테이블
CREATE TABLE IF NOT EXISTS type_matchups (
  atk_type    text NOT NULL,
  def_type    text NOT NULL,
  multiplier  float NOT NULL DEFAULT 1.0,

  PRIMARY KEY (atk_type, def_type)
);

CREATE INDEX idx_type_matchups_atk ON type_matchups (atk_type);
CREATE INDEX idx_type_matchups_def ON type_matchups (def_type);

-- 5. items 테이블
CREATE TABLE IF NOT EXISTS items (
  id              int PRIMARY KEY,
  name_kr         text NOT NULL,
  name_en         text NOT NULL,
  damage_modifier float,
  stat_modifier   text,
  stat_multiplier float,
  condition       text
);

CREATE INDEX idx_items_name_kr ON items (name_kr);
CREATE INDEX idx_items_name_en ON items (name_en);

-- 6. abilities 테이블
CREATE TABLE IF NOT EXISTS abilities (
  id              int PRIMARY KEY,
  name_kr         text NOT NULL,
  name_en         text NOT NULL,
  damage_effect   text,
  modifier_type   text,
  modifier_value  float
);

CREATE INDEX idx_abilities_name_kr ON abilities (name_kr);
CREATE INDEX idx_abilities_name_en ON abilities (name_en);

-- 7. pokemon_moves 테이블 (포켓몬-기술 관계)
CREATE TABLE IF NOT EXISTS pokemon_moves (
  pokemon_id    int NOT NULL REFERENCES pokemon(id) ON DELETE CASCADE,
  pokemon_form  text NOT NULL DEFAULT 'default',
  move_id       int NOT NULL REFERENCES moves(id) ON DELETE CASCADE,
  learn_method  text NOT NULL,

  PRIMARY KEY (pokemon_id, move_id, learn_method)
);

CREATE INDEX idx_pokemon_moves_pokemon ON pokemon_moves (pokemon_id);
CREATE INDEX idx_pokemon_moves_move ON pokemon_moves (move_id);
CREATE INDEX idx_pokemon_moves_form ON pokemon_moves (pokemon_form);

-- 8. gimmick_moves 테이블 (Z기술/다이맥스기/거다이맥스기)
CREATE TABLE IF NOT EXISTS gimmick_moves (
  id                    serial PRIMARY KEY,
  base_move_id          int REFERENCES moves(id) ON DELETE CASCADE,
  gimmick_type          text NOT NULL CHECK (gimmick_type IN ('z_move', 'dmax', 'gmax')),
  gimmick_name_kr       text NOT NULL,
  gimmick_name_en       text,
  gimmick_power         int,
  gimmick_type_override text,
  effect                text,
  pokemon_id            int REFERENCES pokemon(id) ON DELETE SET NULL
);

CREATE INDEX idx_gimmick_moves_base ON gimmick_moves (base_move_id);
CREATE INDEX idx_gimmick_moves_type ON gimmick_moves (gimmick_type);
CREATE INDEX idx_gimmick_moves_pokemon ON gimmick_moves (pokemon_id);

-- ============================================================
-- RLS 비활성화 + public read 설정
-- ============================================================

ALTER TABLE pokemon ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE natures ENABLE ROW LEVEL SECURITY;
ALTER TABLE type_matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE gimmick_moves ENABLE ROW LEVEL SECURITY;

-- public read 정책 (누구나 읽기 가능)
CREATE POLICY "Public read pokemon" ON pokemon FOR SELECT USING (true);
CREATE POLICY "Public read moves" ON moves FOR SELECT USING (true);
CREATE POLICY "Public read natures" ON natures FOR SELECT USING (true);
CREATE POLICY "Public read type_matchups" ON type_matchups FOR SELECT USING (true);
CREATE POLICY "Public read items" ON items FOR SELECT USING (true);
CREATE POLICY "Public read abilities" ON abilities FOR SELECT USING (true);
CREATE POLICY "Public read pokemon_moves" ON pokemon_moves FOR SELECT USING (true);
CREATE POLICY "Public read gimmick_moves" ON gimmick_moves FOR SELECT USING (true);
