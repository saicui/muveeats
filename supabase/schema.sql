-- MuveEats schema (v9)
-- Supabase の SQL Editor で実行してください。冪等に書いています。

create extension if not exists "pgcrypto";

-- ====================================================================
-- meals
-- ====================================================================
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_at timestamptz not null default now(),

  name text not null,
  calories numeric,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric,

  -- v8: チェーン店メニュー由来の場合に埋まる
  chain_id text,
  chain_name text,
  item_id text,
  size text,                       -- "並盛" "Tall" "Hot" など、name から抽出した値

  source text not null default 'manual', -- 'manual' | 'photo' | 'chain'
  ai_confidence numeric,           -- 写真解析の自信度 0..1
  ai_note text,                    -- 写真解析の補足
  tags text[] not null default '{}',

  created_at timestamptz not null default now()
);

create index if not exists meals_user_eaten_at_idx
  on public.meals (user_id, eaten_at desc);

-- 既存テーブルへの後追い alter（冪等）
alter table public.meals add column if not exists chain_id text;
alter table public.meals add column if not exists chain_name text;
alter table public.meals add column if not exists item_id text;
alter table public.meals add column if not exists size text;
alter table public.meals add column if not exists ai_confidence numeric;
alter table public.meals add column if not exists ai_note text;
alter table public.meals add column if not exists tags text[] not null default '{}';

grant select, insert, update, delete on public.meals to anon, authenticated;
alter table public.meals enable row level security;

drop policy if exists "meals_owner_select" on public.meals;
create policy "meals_owner_select" on public.meals
  for select using (auth.uid() = user_id);

drop policy if exists "meals_owner_insert" on public.meals;
create policy "meals_owner_insert" on public.meals
  for insert with check (auth.uid() = user_id);

drop policy if exists "meals_owner_update" on public.meals;
create policy "meals_owner_update" on public.meals
  for update using (auth.uid() = user_id);

drop policy if exists "meals_owner_delete" on public.meals;
create policy "meals_owner_delete" on public.meals
  for delete using (auth.uid() = user_id);

-- ====================================================================
-- profiles  (将来の AI 相談・目標設定で使用)
-- ====================================================================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  sex text,                        -- 'male' | 'female' | 'other'
  age integer,
  height_cm numeric,
  activity_level text,             -- 'low' | 'mid' | 'high'
  goal text,                       -- 'cut' | 'maintain' | 'bulk'
  target_kcal integer,
  target_protein_g integer,
  target_fat_g integer,
  target_carbs_g integer,
  theme text default 'light',
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to anon, authenticated;
alter table public.profiles enable row level security;

drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ====================================================================
-- ヘルパー: ユーザー削除時に profile を自動作成
-- ====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ====================================================================
-- workouts (筋トレ + 有酸素のセッション共通テーブル)
-- ====================================================================
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_min integer,             -- 終了時に算出 or 手入力
  kind text not null,               -- 'strength' | 'cardio'
  title text,                       -- 'チェスト' / '朝ラン' など任意
  -- cardio 固有
  cardio_type text,                 -- 'run' | 'walk' | 'bike' | 'other'
  distance_km numeric,
  avg_hr integer,
  intensity text,                   -- 'low' | 'mid' | 'high'
  -- 集計
  est_kcal numeric,                 -- MET 法での推定値
  note text,
  created_at timestamptz not null default now()
);

create index if not exists workouts_user_started_idx
  on public.workouts (user_id, started_at desc);

grant select, insert, update, delete on public.workouts to anon, authenticated;
alter table public.workouts enable row level security;

drop policy if exists "workouts_owner_all" on public.workouts;
create policy "workouts_owner_all" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ====================================================================
-- exercise_sets (筋トレの個別セット)
-- ====================================================================
create table if not exists public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null,        -- data/exercises.json の id
  exercise_name text not null,
  set_index integer not null,       -- そのセッション内での順序 (1..n)
  weight_kg numeric,
  reps integer,
  recorded_at timestamptz not null default now()
);

create index if not exists exercise_sets_workout_idx
  on public.exercise_sets (workout_id, set_index);
create index if not exists exercise_sets_user_ex_idx
  on public.exercise_sets (user_id, exercise_id, recorded_at desc);

grant select, insert, update, delete on public.exercise_sets to anon, authenticated;
alter table public.exercise_sets enable row level security;

drop policy if exists "exercise_sets_owner_all" on public.exercise_sets;
create policy "exercise_sets_owner_all" on public.exercise_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ====================================================================
-- meal_templates (固定分の食事テンプレート)
-- 「毎日同じ朝食」などをワンタップで記録するための雛形。
-- ====================================================================
create table if not exists public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,                  -- "毎朝のオートミール" など
  default_time text,                    -- "08:00" 等 (HH:MM)。null なら自由

  name text not null,
  calories numeric,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric,
  chain_id text,
  chain_name text,
  item_id text,
  size text,
  tags text[] not null default '{}',

  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists meal_templates_user_idx
  on public.meal_templates (user_id, sort_order);

grant select, insert, update, delete on public.meal_templates to anon, authenticated;
alter table public.meal_templates enable row level security;

drop policy if exists "meal_templates_owner_all" on public.meal_templates;
create policy "meal_templates_owner_all" on public.meal_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ====================================================================
-- meal_template_skips (テンプレを当日スキップした記録)
-- ====================================================================
create table if not exists public.meal_template_skips (
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.meal_templates(id) on delete cascade,
  skip_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, template_id, skip_date)
);

grant select, insert, update, delete on public.meal_template_skips to anon, authenticated;
alter table public.meal_template_skips enable row level security;

drop policy if exists "meal_template_skips_owner_all" on public.meal_template_skips;
create policy "meal_template_skips_owner_all" on public.meal_template_skips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ====================================================================
-- workout_templates (筋トレ / 有酸素のテンプレ)
-- payload は kind に応じて以下を格納:
--   strength: { exercises: [{ exercise_id, exercise_name, sets: [{ weight_kg, reps }] }] }
--   cardio:   { cardio_type, duration_min, distance_km, avg_hr, intensity, title }
-- ====================================================================
create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  kind text not null check (kind in ('strength','cardio')),
  payload jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists workout_templates_user_idx
  on public.workout_templates (user_id, sort_order);

grant select, insert, update, delete on public.workout_templates to anon, authenticated;
alter table public.workout_templates enable row level security;

drop policy if exists "workout_templates_owner_all" on public.workout_templates;
create policy "workout_templates_owner_all" on public.workout_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ====================================================================
-- body_records (体組成)
-- ====================================================================
create table if not exists public.body_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  weight_kg numeric,
  body_fat_pct numeric,
  muscle_kg numeric,
  visceral_fat numeric,
  bmr_kcal integer,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists body_records_user_recorded_idx
  on public.body_records (user_id, recorded_at desc);

grant select, insert, update, delete on public.body_records to anon, authenticated;
alter table public.body_records enable row level security;

drop policy if exists "body_records_owner_all" on public.body_records;
create policy "body_records_owner_all" on public.body_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ====================================================================
-- activity_records (日次アクティビティ: 歩数 / 消費カロリー)
-- スマートウォッチ・ヘルスケアアプリの記録を手入力 or 写真から取り込む。
-- 将来の HealthKit / Google Fit 連携の布石。
-- ====================================================================
create table if not exists public.activity_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  steps integer,
  active_kcal numeric,              -- アクティブ消費カロリー (kcal)
  distance_km numeric,
  source text not null default 'manual',  -- 'manual' | 'photo'
  ai_confidence numeric,
  ai_note text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists activity_records_user_recorded_idx
  on public.activity_records (user_id, recorded_at desc);

grant select, insert, update, delete on public.activity_records to anon, authenticated;
alter table public.activity_records enable row level security;

drop policy if exists "activity_records_owner_all" on public.activity_records;
create policy "activity_records_owner_all" on public.activity_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
