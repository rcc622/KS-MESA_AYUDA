-- ============================================================
-- 03_usuarios.sql — KIT DE MANTENIMIENTO de usuarios (solo GO)
-- Correr en Supabase SQL Editor. Orden: 01_schema → 03 → 04_perfiles.
-- Login de la app: email + contraseña (signInWithPassword).
--
-- USO: pega la SECCIÓN A completa y córrela UNA vez (re-correrla es
-- seguro: create or replace). Después, el día a día son los one-liners
-- de la SECCIÓN C.
--
-- ⚠ Toca tablas internas de Supabase Auth. Es el método estándar para
--   gestión por SQL, pero si tras una actualización de Supabase algo
--   falla, plan B: dashboard → Authentication → Users.
-- ⚠ NUNCA guardes contraseñas reales en este archivo/repo. Edita en el
--   SQL Editor, corre, y aquí solo placeholders CAMBIAME.
-- ============================================================

-- ============================================================
-- SECCIÓN A — FUNCIONES (correr una vez; re-correr = actualizar)
-- ============================================================

-- A1. CREAR usuario completo: auth + perfil con rol y zona.
--     Roles válidos: 'go' | 'coordinador' | 'operativo' | 'consulta'
--     Zonas válidas: 'MTY' | 'SLT' | 'TRC' | 'MVA' | null (= todas)
create or replace function go_crear_usuario(
  p_email text, p_password text, p_nombre text default '',
  p_rol text default 'operativo', p_zona text default null
)
returns text language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  p_email := lower(trim(p_email));
  if exists (select 1 from auth.users where email = p_email) then
    return 'YA EXISTE: ' || p_email || ' (usa go_cambiar_* para modificarlo)';
  end if;
  -- Columnas de tokens en '' (NO null): GoTrue regresa error 500
  -- "Database error querying schema" en el login si quedan NULL.
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
    'authenticated', p_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre', p_nombre), now(), now(),
    '', '', '', '', '', '', '', '')
  returning id into v_id;
  insert into auth.identities (id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
    'email', null, now(), now());
  -- Perfil (lo crea el trigger de 04_perfiles; aquí se asignan rol/zona)
  if to_regclass('public.profiles') is not null then
    insert into public.profiles (id, email, full_name, role, zone)
    values (v_id, p_email, p_nombre, p_rol, p_zona)
    on conflict (id) do update
      set full_name = excluded.full_name, role = excluded.role, zone = excluded.zone;
  end if;
  return 'CREADO: ' || p_email || ' · rol=' || p_rol || ' · zona=' || coalesce(p_zona,'todas');
end $$;

-- A2. CAMBIAR CONTRASEÑA (no tumba sesiones activas; vencen solas ~1h)
create or replace function go_cambiar_password(p_email text, p_password text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  update auth.users
  set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      updated_at = now()
  where email = lower(trim(p_email));
  if not found then return 'NO EXISTE: ' || p_email; end if;
  return 'CONTRASEÑA ACTUALIZADA: ' || p_email;
end $$;

-- A3. CAMBIAR CORREO (auth + identidad + perfil; la bitácora histórica
--     conserva el correo viejo como texto — correcto para auditoría).
--     La sesión activa sigue mostrando el correo viejo hasta ~1h.
create or replace function go_cambiar_correo(p_email_actual text, p_email_nuevo text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  p_email_actual := lower(trim(p_email_actual));
  p_email_nuevo  := lower(trim(p_email_nuevo));
  if exists (select 1 from auth.users where email = p_email_nuevo) then
    return 'OCUPADO: ' || p_email_nuevo || ' ya pertenece a otro usuario';
  end if;
  select id into v_id from auth.users where email = p_email_actual;
  if v_id is null then return 'NO EXISTE: ' || p_email_actual; end if;
  update auth.users set email = p_email_nuevo, updated_at = now() where id = v_id;
  update auth.identities
     set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(p_email_nuevo)),
         updated_at = now()
   where user_id = v_id and provider = 'email';
  if to_regclass('public.profiles') is not null then
    update public.profiles set email = p_email_nuevo, updated_at = now() where id = v_id;
  end if;
  return 'CORREO CAMBIADO: ' || p_email_actual || ' → ' || p_email_nuevo;
end $$;

-- A4. CAMBIAR NOMBRE (metadata de auth + perfil)
create or replace function go_cambiar_nombre(p_email text, p_nombre text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = lower(trim(p_email));
  if v_id is null then return 'NO EXISTE: ' || p_email; end if;
  update auth.users
     set raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data,'{}'::jsonb), '{nombre}', to_jsonb(p_nombre)),
         updated_at = now()
   where id = v_id;
  if to_regclass('public.profiles') is not null then
    update public.profiles set full_name = p_nombre, updated_at = now() where id = v_id;
  end if;
  return 'NOMBRE ACTUALIZADO: ' || p_email || ' → ' || p_nombre;
end $$;

-- A5. CAMBIAR ROL ('go' | 'coordinador' | 'operativo' | 'consulta')
create or replace function go_cambiar_rol(p_email text, p_rol text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if to_regclass('public.profiles') is null then
    return 'FALTA correr 04_perfiles.sql (tabla profiles no existe)';
  end if;
  update public.profiles set role = p_rol, updated_at = now()
   where email = lower(trim(p_email));
  if not found then return 'NO EXISTE: ' || p_email; end if;
  return 'ROL ACTUALIZADO: ' || p_email || ' → ' || p_rol;
end $$;

-- A6. CAMBIAR ZONA/ÁREA ('MTY'|'SLT'|'TRC'|'MVA' o null = todas)
create or replace function go_cambiar_zona(p_email text, p_zona text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  if to_regclass('public.profiles') is null then
    return 'FALTA correr 04_perfiles.sql (tabla profiles no existe)';
  end if;
  update public.profiles set zone = p_zona, updated_at = now()
   where email = lower(trim(p_email));
  if not found then return 'NO EXISTE: ' || p_email; end if;
  return 'ZONA ACTUALIZADA: ' || p_email || ' → ' || coalesce(p_zona,'todas');
end $$;

-- A7. BLOQUEAR (rotación: conserva historial; el token vivo vence ~1h)
create or replace function go_bloquear_usuario(p_email text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  update auth.users set banned_until = 'infinity', updated_at = now()
  where email = lower(trim(p_email));
  if not found then return 'NO EXISTE: ' || p_email; end if;
  return 'BLOQUEADO: ' || p_email;
end $$;

-- A8. REACTIVAR
create or replace function go_reactivar_usuario(p_email text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  update auth.users set banned_until = null, updated_at = now()
  where email = lower(trim(p_email));
  if not found then return 'NO EXISTE: ' || p_email; end if;
  return 'REACTIVADO: ' || p_email;
end $$;

-- A9. ELIMINAR de raíz (basura/typos; para rotación usa A7-bloquear).
--     El dashboard falla por FKs internas; esto limpia todo en orden.
--     El perfil cae solo (FK on delete cascade). Bitácora no se rompe.
create or replace function go_eliminar_usuario(p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = lower(trim(p_email));
  if v_id is null then return 'NO EXISTE: ' || p_email; end if;
  delete from auth.mfa_amr_claims where session_id in (select id from auth.sessions where user_id = v_id);
  delete from auth.mfa_challenges where factor_id in (select id from auth.mfa_factors where user_id = v_id);
  delete from auth.mfa_factors where user_id = v_id;
  delete from auth.refresh_tokens where user_id = v_id::text;
  delete from auth.sessions where user_id = v_id;
  delete from auth.one_time_tokens where user_id = v_id;
  delete from auth.identities where user_id = v_id;
  delete from auth.users where id = v_id;
  return 'ELIMINADO: ' || p_email;
end $$;

-- A10. VER TODOS (panel de control en un select)
create or replace function go_ver_usuarios()
returns table (
  correo text, nombre text, rol text, zona text,
  bloqueado boolean, ultimo_acceso timestamptz, creado timestamptz
) language sql security definer set search_path = '' as $$
  select u.email,
         coalesce(p.full_name, u.raw_user_meta_data->>'nombre', ''),
         coalesce(p.role, 'sin perfil'),
         coalesce(p.zone, 'todas'),
         u.banned_until is not null and u.banned_until > now(),
         u.last_sign_in_at,
         u.created_at
    from auth.users u
    left join public.profiles p on p.id = u.id
   order by coalesce(p.role,'zzz'), p.zone nulls last, u.email;
$$;

-- CRÍTICO: sin estos revoke, cualquier usuario de la app podría llamar
-- las funciones vía API REST (rpc) y auto-gestionarse accesos.
revoke execute on function go_crear_usuario(text, text, text, text, text) from public, anon, authenticated;
revoke execute on function go_cambiar_password(text, text) from public, anon, authenticated;
revoke execute on function go_cambiar_correo(text, text) from public, anon, authenticated;
revoke execute on function go_cambiar_nombre(text, text) from public, anon, authenticated;
revoke execute on function go_cambiar_rol(text, text) from public, anon, authenticated;
revoke execute on function go_cambiar_zona(text, text) from public, anon, authenticated;
revoke execute on function go_bloquear_usuario(text) from public, anon, authenticated;
revoke execute on function go_reactivar_usuario(text) from public, anon, authenticated;
revoke execute on function go_eliminar_usuario(text) from public, anon, authenticated;
revoke execute on function go_ver_usuarios() from public, anon, authenticated;

-- Limpieza: la firma vieja de go_crear_usuario(text,text,text) queda
-- obsoleta al agregar rol/zona — eliminarla si existe.
drop function if exists go_crear_usuario(text, text, text);

-- ============================================================
-- SECCIÓN B — ALTAS DEL PILOTO (editar y correr; solo placeholders aquí)
-- ============================================================

-- select go_crear_usuario('correo@kenet.mx', 'CAMBIAME-1234', 'Nombre Apellido', 'operativo', 'TRC');
-- select go_crear_usuario('correo2@kenet.mx', 'CAMBIAME-1234', 'Nombre Apellido', 'consulta', null);

-- ============================================================
-- SECCIÓN C — OPERACIÓN DIARIA (one-liners: copiar, editar, correr)
-- ============================================================

-- Ver panel completo:
--   select * from go_ver_usuarios();

-- Cambiar contraseña:
--   select go_cambiar_password('persona@kenet.mx', 'NuevaSegura-99');

-- Cambiar correo:
--   select go_cambiar_correo('viejo@kenet.mx', 'nuevo@kenet.mx');

-- Cambiar nombre:
--   select go_cambiar_nombre('persona@kenet.mx', 'Nombre Nuevo (PM R2)');

-- Cambiar rol (go | coordinador | operativo | consulta):
--   select go_cambiar_rol('persona@kenet.mx', 'coordinador');

-- Cambiar zona (MTY | SLT | TRC | MVA | null = todas):
--   select go_cambiar_zona('persona@kenet.mx', 'TRC');

-- Baja por rotación (conserva historial):
--   select go_bloquear_usuario('exempleado@kenet.mx');

-- Reactivar:
--   select go_reactivar_usuario('persona@kenet.mx');

-- Eliminar de raíz (solo basura/typos):
--   select go_eliminar_usuario('typo@correo.com');

-- Recrear desde cero:
--   select go_eliminar_usuario('persona@kenet.mx');
--   select go_crear_usuario('persona@kenet.mx', 'Pass-2026', 'Nombre', 'operativo', 'TRC');
