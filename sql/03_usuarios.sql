-- ============================================================
-- 03_usuarios.sql — Gestión de usuarios operativos por SQL (solo GO)
-- Correr en Supabase SQL Editor, DESPUÉS de 01_schema.sql.
-- Login de la app: email + contraseña (signInWithPassword).
--
-- ⚠ Toca tablas internas de Supabase Auth (auth.users / auth.identities).
--   Es el método estándar para seeds, pero si tras una actualización de
--   Supabase un usuario nuevo no pudiera entrar, plan B: dashboard →
--   Authentication → Users → Add user (y avisar para ajustar este script).
-- ⚠ Las contraseñas viajan en texto plano DENTRO del SQL Editor: no
--   guardes este archivo con contraseñas reales en el repo. Edita, corre,
--   y deja aquí solo placeholders CAMBIAME.
-- ============================================================

-- ---------- A. FUNCIONES HELPER (correr UNA sola vez) ----------

create or replace function go_crear_usuario(p_email text, p_password text, p_nombre text default '')
returns text language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  p_email := lower(trim(p_email));
  if exists (select 1 from auth.users where email = p_email) then
    return 'YA EXISTE: ' || p_email;
  end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
    'authenticated', p_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre', p_nombre), now(), now())
  returning id into v_id;
  insert into auth.identities (id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
    'email', null, now(), now());
  return 'CREADO: ' || p_email;
end $$;

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

-- Rotación de personal: bloquear conserva el historial de bitácora intacto
-- (NUNCA borrar usuarios — la bitácora referencia su email).
create or replace function go_bloquear_usuario(p_email text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  update auth.users set banned_until = 'infinity', updated_at = now()
  where email = lower(trim(p_email));
  if not found then return 'NO EXISTE: ' || p_email; end if;
  return 'BLOQUEADO: ' || p_email;
end $$;

create or replace function go_reactivar_usuario(p_email text)
returns text language plpgsql security definer set search_path = '' as $$
begin
  update auth.users set banned_until = null, updated_at = now()
  where email = lower(trim(p_email));
  if not found then return 'NO EXISTE: ' || p_email; end if;
  return 'REACTIVADO: ' || p_email;
end $$;

-- Eliminación TOTAL por SQL. El botón de borrar del dashboard falla con
-- usuarios creados por SQL (filas huérfanas en tablas internas de auth);
-- esta función limpia todas las dependencias en orden y luego el usuario.
-- Úsala para usuarios basura/typos. Para bajas por rotación con historial
-- de bitácora, mejor go_bloquear_usuario (conserva last_sign_in).
-- La bitácora NO se rompe al eliminar: guarda el email como texto.
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

-- CRÍTICO: sin esto, cualquier usuario de la app podría llamar estas
-- funciones vía la API REST (rpc) y crearse accesos o cambiar contraseñas.
-- Solo el SQL Editor (rol postgres) puede ejecutarlas.
revoke execute on function go_crear_usuario(text, text, text) from public, anon, authenticated;
revoke execute on function go_cambiar_password(text, text) from public, anon, authenticated;
revoke execute on function go_bloquear_usuario(text) from public, anon, authenticated;
revoke execute on function go_reactivar_usuario(text) from public, anon, authenticated;
revoke execute on function go_eliminar_usuario(text) from public, anon, authenticated;

-- ---------- B. USUARIOS DEL PILOTO (EDITAR correos/contraseñas y correr) ----------
-- Contraseñas: mínimo 8 caracteres, únicas por persona (la bitácora
-- atribuye por email — si comparten contraseña, comparten culpa).

select go_crear_usuario('randall@CAMBIAME.com', 'CAMBIAME-Go-2026',  'Randall Cruz (GO)');
select go_crear_usuario('lesly@CAMBIAME.com',   'CAMBIAME-Pm-2026',  'Lesly Palacios (PM R2)');
select go_crear_usuario('alondra@CAMBIAME.com', 'CAMBIAME-Cs-2026',  'Alondra Hernández (Gestoría/ATC R2)');
-- agrega aquí los demás (5-8 máx para el piloto)...

-- ---------- C. OPERACIÓN DIARIA (ejemplos — copiar, editar, correr) ----------

-- Cambiar contraseña:
--   select go_cambiar_password('lesly@kenet.mx', 'NuevaSegura-99');

-- Baja por rotación (bloquea acceso, conserva historial):
--   select go_bloquear_usuario('exempleado@kenet.mx');

-- Reactivar:
--   select go_reactivar_usuario('lesly@kenet.mx');

-- Eliminar de raíz (usuario basura/typo — para rotación usa bloquear):
--   select go_eliminar_usuario('typo@correo.com');

-- Recrear desde cero ("YA EXISTE" pero lo quieres nuevo):
--   select go_eliminar_usuario('persona@kenet.mx');
--   select go_crear_usuario('persona@kenet.mx', 'PassNueva-2026', 'Nombre (rol)');

-- Listar usuarios y último acceso:
--   select email, raw_user_meta_data->>'nombre' as nombre,
--          banned_until is not null and banned_until > now() as bloqueado,
--          last_sign_in_at, created_at
--   from auth.users order by email;
