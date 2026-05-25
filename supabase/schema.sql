-- MuveEats schema
-- Supabase の SQL Editor で実行してください。

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  eaten_at timestamptz not null default now(),
  name text not null,
  calories numeric,
  protein_g numeric,
  fat_g numeric,
  carbs_g numeric,
  photo_url text,
  notes text,
  source text not null default 'manual', -- 'manual' | 'photo'
  created_at timestamptz not null default now()
);

create index if not exists meals_user_eaten_at_idx
  on public.meals (user_id, eaten_at desc);

-- anon / authenticated ロールにテーブル権限を付与（RLS はこの後に有効化）
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
-- 開発モード: 認証なしで動作確認したい場合は、以下のブロックも実行
-- してください（anon でも自由に読み書きできるようになります）。
-- 本番化前 / Auth 導入時には必ず DROP POLICY で削除すること。
-- ====================================================================
-- create policy "meals_dev_anon_all" on public.meals
--   for all to anon using (true) with check (true);
