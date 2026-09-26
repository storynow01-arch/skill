-- ═══════════════════════════════════════════════════════════════
-- 「伺服器專用」架構的 RLS 鎖定範本
--
-- 用途：瀏覽器完全不直接連 Supabase，伺服器用 secret key 讀寫。
--       所以每張表都開 RLS、不給 anon 任何 policy —— publishable key 什麼都讀不到。
--       唯一例外：heartbeat 給外部排程每天喚醒用（免費版 7 天沒請求會暫停）。
--
-- 執行：Supabase 後台 → SQL Editor → 貼上 → Run。可以重複執行。
-- ═══════════════════════════════════════════════════════════════

-- 1. 所有 public 資料表都開 RLS（新增資料表後重跑一次即可）
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- 2. heartbeat：唯一匿名可讀的表，裡面沒有任何個資
create table if not exists public.heartbeat (
  id   int primary key,
  note text not null
);
insert into public.heartbeat (id, note) values (1, '喚醒用，勿刪')
on conflict (id) do nothing;
alter table public.heartbeat enable row level security;

drop policy if exists heartbeat_anon_read on public.heartbeat;
create policy heartbeat_anon_read on public.heartbeat for select to anon using (true);

-- 3. 私有 bucket 範本（名稱、大小上限、允許的格式依需要改）
--    伺服器讀出後串流給瀏覽器；不要把簽名網址交給瀏覽器
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-files', 'private-files', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- 4. 自我檢查：列出「沒開 RLS」的表（應該是空的）與「給 anon 的 policy」（應該只有 heartbeat）
select tablename as 沒開RLS的表 from pg_tables
where schemaname = 'public' and not rowsecurity;

select tablename, policyname, roles from pg_policies
where schemaname = 'public' and 'anon' = any(roles);
