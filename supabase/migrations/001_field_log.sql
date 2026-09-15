-- Run once in the Supabase SQL Editor. Does not import or invent writing.
begin;
create table if not exists public.field_log_records (
  collection text not null,
  record_key text not null,
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  primary key (collection, record_key)
);
alter table public.field_log_records enable row level security;
revoke all on public.field_log_records from anon, authenticated;
grant all on public.field_log_records to service_role;

-- Merge against the locked current row: simultaneous reactions cannot lose
-- increments, and editing one field cannot replace a concurrent field edit.
create or replace function public.field_log_patch(
  p_collection text, p_key text, p_patch jsonb, p_initial jsonb default null
) returns boolean language plpgsql security invoker set search_path = public as $$
declare
  d jsonb;
  k text;
  v jsonb;
  parts text[];
begin
  if p_initial is not null then
    insert into field_log_records values (p_collection, p_key, p_initial)
      on conflict do nothing;
  end if;
  select document into d from field_log_records
    where collection=p_collection and record_key=p_key for update;
  if not found then return false; end if;
  d := d || coalesce(p_patch->'$set', '{}'::jsonb);
  for k, v in select * from jsonb_each(coalesce(p_patch->'$inc', '{}'::jsonb)) loop
    parts := string_to_array(k, '.');
    if array_length(parts, 1) > 1 and d->parts[1] is null then
      d := jsonb_set(d, array[parts[1]], '{}'::jsonb);
    end if;
    d := jsonb_set(d, parts, to_jsonb(coalesce((d #>> parts)::numeric, 0) + (v::text)::numeric));
  end loop;
  for k, v in select * from jsonb_each(coalesce(p_patch->'$pull', '{}'::jsonb)) loop
    d := jsonb_set(d, array[k], coalesce((select jsonb_agg(x) from jsonb_array_elements(coalesce(d->k, '[]'::jsonb)) x where x <> v), '[]'::jsonb));
  end loop;
  update field_log_records set document=d where collection=p_collection and record_key=p_key;
  return true;
end;
$$;
revoke all on function public.field_log_patch(text,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.field_log_patch(text,text,jsonb,jsonb) to service_role;

-- Files are private; the backend issues download links for the active track.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('field-log-music', 'field-log-music', false, 20971520,
  array['audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/aac','audio/ogg','audio/wav','audio/x-wav','audio/flac','audio/webm'])
on conflict (id) do nothing;
commit;
