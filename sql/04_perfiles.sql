-- =====================================================================
-- 04_perfiles.sql — Perfiles de usuario (nombre + rol + zona) por SQL
-- Patrón probado en el proyecto de Comisiones de ventas. IDEMPOTENTE:
-- se puede re-correr completo las veces que sea sin romper nada.
-- Correr DESPUÉS de 01_schema.sql y 03_usuarios.sql.
-- =====================================================================

-- 1) TABLA DE PERFILES
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text unique not null,
  full_name  text default '',
  role       text not null default 'operativo'
             check (role in ('go','coordinador','operativo','consulta')),
  zone       text check (zone in ('MTY','SLT','TRC','MVA')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
drop policy if exists p_sel_profiles on public.profiles;
create policy p_sel_profiles on public.profiles for select to authenticated using (true);
-- SIN políticas de insert/update/delete: los perfiles solo se modifican
-- desde el SQL Editor (mismo principio que el catálogo de etapas).

-- 2) TRIGGER: todo usuario nuevo (go_crear_usuario o dashboard) recibe
--    su perfil automático — ya no hace falta acordarse del backfill.
create or replace function public.fn_nuevo_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre',''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_nuevo_perfil on auth.users;
create trigger trg_nuevo_perfil after insert on auth.users
for each row execute function public.fn_nuevo_perfil();

-- 3) BACKFILL idempotente: perfiles para usuarios que ya existían
insert into public.profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'nombre','')
  from auth.users u
  left join public.profiles p on p.id = u.id
 where p.id is null;

-- 4) ROLES Y ZONAS — edita y re-corre cuando quieras (update = idempotente)

update public.profiles set role='go', full_name='Randall Cruz'
 where email='randall@kenetsolar.com';
update public.profiles set role='go', full_name='Randall (pruebas)'
 where email='rcc622@gmail.com';

-- Piloto R2 (descomenta con los correos reales al crearlos en 03):
-- update public.profiles set role='operativo', full_name='Lesly Palacios',     zone='TRC' where email='CORREO_LESLY';
-- update public.profiles set role='operativo', full_name='Alondra Hernández',  zone='TRC' where email='CORREO_ALONDRA';
-- update public.profiles set role='consulta',  full_name='Guillermo Hernández'             where email='CORREO_GUILLERMO';

-- 5) CONTRASEÑA EN LOTE (patrón Comisiones — usar con criterio):
-- ⚠ En la MESA la bitácora atribuye cambios por usuario; contraseña común
--   = todos pueden negar autoría. Para vendedores de comisiones funciona;
--   para los capturistas del piloto, mejor contraseña única por persona.
-- update auth.users set encrypted_password = extensions.crypt('CAMBIAME-comun', extensions.gen_salt('bf'))
--  where email in ('a@kenet.mx','b@kenet.mx');

-- 6) VERIFICACIÓN
select p.role, p.zone, p.full_name, p.email, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
 order by p.role, p.zone nulls last, p.full_name nulls last;
