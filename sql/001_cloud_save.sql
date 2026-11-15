-- שמירת ההתקדמות של «פרק ביום» בענן, כדי שלא תימחק ותופיע בכל מכשיר.
-- רץ בפרויקט ה-Supabase של אמירנט (jezxhibenekurxymwxrb), בסכמה נפרדת בלי גישה ישירה: רק דרך שתי הפונקציות.
-- המזהה הוא sha256 של קוד הגישה (שנמצא רק במכשירים של רועי), כך שרק מי שיש לו את הקוד קורא או כותב.
create schema if not exists psycho;
revoke all on schema psycho from public, anon, authenticated;

create table if not exists psycho.saves (
  id text primary key,                 -- sha256 (hex) של 'psycho-daily:' + קוד הגישה
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table psycho.saves enable row level security;

create or replace function public.psycho_load(p_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r psycho.saves;
begin
  if p_id is null or p_id !~ '^[0-9a-f]{64}$' then return jsonb_build_object('error', 'bad_id'); end if;
  select * into r from psycho.saves where id = p_id;
  if not found then return jsonb_build_object('data', null); end if;
  return jsonb_build_object('data', r.data, 'at', r.updated_at);
end $$;

create or replace function public.psycho_save(p_id text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_id is null or p_id !~ '^[0-9a-f]{64}$' then return jsonb_build_object('error', 'bad_id'); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then return jsonb_build_object('error', 'bad_data'); end if;
  if pg_column_size(p_data) > 1000000 then return jsonb_build_object('error', 'too_big'); end if;
  insert into psycho.saves (id, data, updated_at) values (p_id, p_data, now())
    on conflict (id) do update set data = excluded.data, updated_at = now();
  return jsonb_build_object('ok', true, 'at', now());
end $$;

revoke all on function public.psycho_load(text) from public;
revoke all on function public.psycho_save(text, jsonb) from public;
grant execute on function public.psycho_load(text) to anon, authenticated;
grant execute on function public.psycho_save(text, jsonb) to anon, authenticated;
