-- MuveEats schema (v8)
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
