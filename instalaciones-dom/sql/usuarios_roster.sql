-- =====================================================================
-- 👥 USUARIOS — Roster DECLARATIVO (Mesa de Control · Instalaciones Domésticas)
-- =====================================================================
-- Crea LOGINS (auth.users) + filas en la tabla `usuarios` que usa la app nueva.
-- (Actualizado al esquema nuevo: tabla public.usuarios — NO profiles —
--  con roles: admin | pm_domestico | instalador | coordinador.)
--
-- CÓMO SE USA:
--   1. Edita SOLO la tabla de la SECCIÓN 1 (un renglón por persona).
--   2. Corre TODO el script (Run). Reconcilia la base con tu lista:
--      crea los logins nuevos, actualiza nombre/rol/zona, y bloquea/reactiva.
--   3. Re-córrelo cuantas veces quieras: es idempotente.
--
-- REGLAS DEL ROSTER:
--   · password: déjala en '' para NO tocarla. Pon un valor SOLO cuando
--     quieras crear/resetear esa contraseña (y luego vuelve a dejarla en '').
--   · activo: true = puede entrar; false = bloqueado (NO se borra).
--   · Quitar un renglón NO hace nada. Para dar de baja: activo => false.
--   · role: admin | pm_domestico | instalador | coordinador
--       - admin        = ve y agenda todo (Coordinador de Mesa / Dirección)
--       - pm_domestico = PM que administra cuadrillas
--       - instalador   = jefe de cuadrilla; ve SOLO sus proyectos en Reporte Instalador
--       - coordinador  = apoyo de mesa
--   · zone: MTY | SLT | TRC | MVA   (déjala NULL = ve todas las zonas)
--   · ⚠ No subas contraseñas reales al repo: ponlas aquí en el SQL Editor
--     al momento de resetear, y vuelve a dejarlas en '' antes de commitear.
--
-- Orden de instalación: schema.sql → este.
-- =====================================================================

-- ---------- SECCIÓN 1 — EDITA AQUÍ (única fuente de verdad) ----------
drop table if exists _roster;
create temp table _roster(email text, nombre text, password text, role text, zone text, activo boolean);

insert into _roster(email, nombre, password, role, zone, activo) values
  -- ( correo,                    nombre,               password,         role,           zone,  activo )
  ('rcc622@gmail.com',            'Randall (pruebas)',  'CAMBIAME-1234',  'admin',        null,  true),
  ('randall@kenetsolar.com',      'Randall Cruz',       '',               'admin',        null,  true),
  ('pedro@kenetsolar.com',        'Pedro',              'CAMBIAME-1234',  'instalador',   'MTY', true)
  -- ,('lizeth@kenetsolar.com',   'Lizeth',             '',               'pm_domestico', 'MTY', true)
  -- ,('gamaliel@kenetsolar.com', 'Gamaliel',           '',               'pm_domestico', 'SLT', true)
  -- ,('lesly@kenetsolar.com',    'Lesly Palacios',     '',               'pm_domestico', 'TRC', true)
;
update _roster set email = lower(email);

-- ===== De aquí para abajo NO necesitas editar nada =====

-- ---------- 2. Crea logins nuevos (con fix de tokens GoTrue) ----------
-- Tokens en '' (NO NULL) o el login truena con error 500. Password vacía en
-- un usuario nuevo => 'CAMBIAME-1234' por defecto (resetéala luego).
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  r.email, extensions.crypt(coalesce(nullif(r.password,''),'CAMBIAME-1234'), extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('nombre', r.nombre), now(), now(),
  '', '', '', '', '', '', '', ''
from _roster r
where not exists (select 1 from auth.users u where u.email = r.email);

-- ---------- 3. Identidad email faltante (sin ella el login es imposible) ----------
insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now()
  from auth.users u
  join _roster r on r.email = u.email
  left join auth.identities i on i.user_id = u.id and i.provider = 'email'
 where i.id is null;

-- ---------- 4. Sanea tokens NULL preexistentes (idempotente) ----------
update auth.users u set
  confirmation_token         = coalesce(u.confirmation_token, ''),
  recovery_token             = coalesce(u.recovery_token, ''),
  email_change               = coalesce(u.email_change, ''),
  email_change_token_new     = coalesce(u.email_change_token_new, ''),
  email_change_token_current = coalesce(u.email_change_token_current, ''),
  phone_change               = coalesce(u.phone_change, ''),
  phone_change_token         = coalesce(u.phone_change_token, ''),
  reauthentication_token     = coalesce(u.reauthentication_token, '')
from _roster r where r.email = u.email;

-- ---------- 5. Sincroniza CONTRASEÑA (solo si el roster trae una) ----------
update auth.users u
   set encrypted_password = extensions.crypt(r.password, extensions.gen_salt('bf'))
from _roster r
where r.email = u.email and coalesce(r.password,'') <> '';

-- ---------- 6. Sincroniza NOMBRE en auth (metadata) ----------
update auth.users u
   set raw_user_meta_data = jsonb_set(coalesce(u.raw_user_meta_data,'{}'::jsonb), '{nombre}', to_jsonb(r.nombre))
from _roster r
where r.email = u.email and coalesce(r.nombre,'') <> '';

-- ---------- 7. Activa / bloquea según `activo` ----------
update auth.users u
   set banned_until = case when r.activo then null else 'infinity'::timestamptz end
from _roster r
where r.email = u.email;

-- ---------- 8. Sincroniza la tabla `usuarios` (la que LEE la app) — declarativo ----------
-- id = id del login (auth.users) para los nuevos; en los existentes se conserva
-- su id (ON CONFLICT por email) para no romper las FK (bitacora, cuadrillas).
insert into public.usuarios (id, email, nombre, rol, zona, activo)
select u.id, u.email, r.nombre, r.role, r.zone, r.activo
  from _roster r
  join auth.users u on u.email = r.email
on conflict (email) do update
   set nombre = excluded.nombre,
       rol    = excluded.rol,
       zona   = excluded.zona,
       activo = excluded.activo;

-- ---------- 9. VERIFICACIÓN (lo que quedó) ----------
select x.rol, x.zona, x.nombre, x.email,
       (u.banned_until is not null and u.banned_until > now()) as bloqueado,
       u.last_sign_in_at
  from _roster r
  join auth.users u      on u.email = r.email
  join public.usuarios x on x.email = u.email
 order by x.rol, x.zona nulls last, x.nombre nulls last;

drop table _roster;

-- =====================================================================
-- RECETA RARA (fuera del roster) — BORRAR DE RAÍZ un usuario typo/basura.
-- El dashboard de Supabase falla por las FKs; estos deletes limpian todo.
-- Úsalo SOLO para basura; para una baja normal usa activo=false en el roster.
-- (Si el usuario está referenciado en bitacora/cuadrillas, primero reasigna.)
-- =====================================================================
-- delete from auth.mfa_amr_claims where session_id in (select id from auth.sessions where user_id=(select id from auth.users where email='typo@x.com'));
-- delete from auth.mfa_challenges where factor_id in (select id from auth.mfa_factors where user_id=(select id from auth.users where email='typo@x.com'));
-- delete from auth.mfa_factors    where user_id=(select id from auth.users where email='typo@x.com');
-- delete from auth.refresh_tokens where user_id=(select id from auth.users where email='typo@x.com')::text;
-- delete from auth.sessions       where user_id=(select id from auth.users where email='typo@x.com');
-- delete from auth.one_time_tokens where user_id=(select id from auth.users where email='typo@x.com');
-- delete from public.usuarios     where email='typo@x.com';
-- delete from auth.identities     where user_id=(select id from auth.users where email='typo@x.com');
-- delete from auth.users          where email='typo@x.com';
