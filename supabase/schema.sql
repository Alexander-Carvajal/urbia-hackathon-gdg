-- =====================================================================
-- URBIA Cancún · esquema de Supabase
-- Ejecuta este archivo completo en Supabase → SQL Editor → New query → Run.
-- Es idempotente: puedes volver a ejecutarlo sin perder datos.
-- Requiere activar «Anonymous sign-ins» en Authentication → Sign In / Providers.
-- =====================================================================

-- ---------- Tablas ----------
create table if not exists public.reports (
  id                 text primary key,
  category           text not null check (category in ('bache','agua','inundacion')),
  title              text not null check (char_length(title) between 3 and 80),
  description        text not null check (char_length(description) <= 2000),
  zone_id            text not null,
  reference          text not null default '' check (char_length(reference) <= 200),
  lat                double precision not null check (lat between 20.95 and 21.3),
  lng                double precision not null check (lng between -87.05 and -86.7),
  accuracy_m         integer not null default 150,
  created_at         timestamptz not null default now(),
  status             text not null default 'pendiente' check (status in ('pendiente','revision','corroborado','resuelto','descartado')),
  status_locked      boolean not null default false,
  status_reason      text,
  source             text not null default 'ciudadania' check (source in ('ciudadania','externo','autoridad')),
  author_id          text not null,
  author_alias       text not null check (char_length(author_alias) <= 60),
  base_confirmations integer not null default 0,
  base_evidence      integer not null default 0,
  photo              text,
  imported_from      text,
  is_demo_seed       boolean not null default false
);

create table if not exists public.confirmations (
  report_id  text not null references public.reports(id) on delete cascade,
  user_id    text not null,
  user_alias text not null default '',
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table if not exists public.objections (
  id         text primary key,
  report_id  text not null references public.reports(id) on delete cascade,
  user_id    text not null,
  user_alias text not null default '',
  reason     text not null check (reason in ('no-existe','ubicacion','duplicado','resuelto','otro')),
  detail     text not null default '' check (char_length(detail) <= 300),
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);

create table if not exists public.history (
  id         bigint generated always as identity primary key,
  report_id  text not null references public.reports(id) on delete cascade,
  at         timestamptz not null default now(),
  text       text not null,
  by         text not null,
  status     text
);

create index if not exists history_report_idx on public.history(report_id, at);
create index if not exists reports_created_idx on public.reports(created_at desc);

-- ---------- Regla de corroboración (misma que la app) ----------
-- 2+ confirmaciones → revisión; 5+ confirmaciones y 1+ evidencia → corroborado.
create or replace function public.recompute_status(p_report text, p_by text default 'Regla comunitaria')
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.reports;
  c int;
  e int;
  next_status text;
  labels jsonb := '{"pendiente":"Pendiente","revision":"En revisión comunitaria","corroborado":"Corroborado por vecinos"}';
begin
  select * into r from public.reports where id = p_report for update;
  if not found or r.status_locked then return; end if;
  select r.base_confirmations + count(*) into c from public.confirmations where report_id = p_report;
  e := r.base_evidence + (case when r.photo is not null then 1 else 0 end);
  next_status := case when c >= 5 and e >= 1 then 'corroborado' when c >= 2 then 'revision' else 'pendiente' end;
  if next_status <> r.status then
    update public.reports set status = next_status where id = p_report;
    insert into public.history(report_id, text, by, status)
    values (p_report, 'Cambio automático por regla comunitaria: ' || (labels->>next_status), p_by, next_status);
  end if;
end $$;

-- Historial automático al crear un reporte
create or replace function public.on_report_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not new.is_demo_seed then
    insert into public.history(report_id, at, text, by, status)
    values (new.id, now(),
      case when new.imported_from is not null then 'Importado desde el documento «' || new.imported_from || '»' else 'Reporte publicado' end,
      new.author_alias, 'pendiente');
  end if;
  return new;
end $$;

drop trigger if exists trg_report_insert on public.reports;
create trigger trg_report_insert after insert on public.reports
for each row execute function public.on_report_insert();

-- Historial + recálculo al confirmar
create or replace function public.on_confirmation_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.history(report_id, text, by)
  values (new.report_id, '«Yo también lo observé»: +1 confirmación', coalesce(nullif(new.user_alias, ''), 'Vecino'));
  perform public.recompute_status(new.report_id);
  return new;
end $$;

drop trigger if exists trg_confirmation_insert on public.confirmations;
create trigger trg_confirmation_insert after insert on public.confirmations
for each row execute function public.on_confirmation_insert();

-- Historial al objetar
create or replace function public.on_objection_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.history(report_id, text, by)
  values (new.report_id, 'Se registró una objeción («Información incorrecta») para revisión comunitaria', coalesce(nullif(new.user_alias, ''), 'Vecino'));
  return new;
end $$;

drop trigger if exists trg_objection_insert on public.objections;
create trigger trg_objection_insert after insert on public.objections
for each row execute function public.on_objection_insert();

-- ---------- Seguridad (Row Level Security) ----------
alter table public.reports       enable row level security;
alter table public.confirmations enable row level security;
alter table public.objections    enable row level security;
alter table public.history       enable row level security;

-- Lectura pública
drop policy if exists "leer reportes" on public.reports;
create policy "leer reportes" on public.reports for select using (true);
drop policy if exists "leer confirmaciones" on public.confirmations;
create policy "leer confirmaciones" on public.confirmations for select using (true);
drop policy if exists "leer objeciones" on public.objections;
create policy "leer objeciones" on public.objections for select using (true);
drop policy if exists "leer historial" on public.history;
create policy "leer historial" on public.history for select using (true);

-- Crear reportes: solo a nombre propio, siempre como pendiente y sin confirmaciones de base
drop policy if exists "crear reporte propio" on public.reports;
create policy "crear reporte propio" on public.reports for insert to authenticated
with check (
  author_id = auth.uid()::text and status = 'pendiente' and not status_locked
  and base_confirmations = 0 and base_evidence = 0 and not is_demo_seed and source in ('ciudadania','externo')
);

-- Confirmar: una vez por persona, no el propio, no si está cerrado
drop policy if exists "confirmar" on public.confirmations;
create policy "confirmar" on public.confirmations for insert to authenticated
with check (
  user_id = auth.uid()::text
  and exists (select 1 from public.reports r where r.id = report_id and r.author_id <> auth.uid()::text and r.status not in ('resuelto','descartado'))
);

-- Objetar: una vez por persona, no el propio
drop policy if exists "objetar" on public.objections;
create policy "objetar" on public.objections for insert to authenticated
with check (
  user_id = auth.uid()::text
  and exists (select 1 from public.reports r where r.id = report_id and r.author_id <> auth.uid()::text)
);
-- (No hay políticas de update/delete: nadie puede editar ni borrar desde la app.
--  El historial solo lo escriben los triggers.)

-- ---------- Fotos (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', true, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists "subir foto propia" on storage.objects;
create policy "subir foto propia" on storage.objects for insert to authenticated
with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Tiempo real ----------
do $$
declare t text;
begin
  foreach t in array array['reports','confirmations','objections','history'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
