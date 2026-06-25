-- =====================================================================
-- 👥 GESTIÓN DE USUARIOS — Mesa de Ayuda KENET (piloto R2)
-- IDEMPOTENTE: se puede re-correr completo sin romper nada.
-- Estilo roster: edita los renglones y corre TODO el script.
-- Orden de instalación: 01_schema → 04_perfiles → este.
--
-- ⚠ NO guardar contraseñas reales en el repo: edítalas en el SQL Editor.
-- =====================================================================

-- 1) CREAR USUARIOS NUEVOS — edita la lista values(...). Si el correo ya
--    existe, lo brinca (no toca su contraseña). Incluye las columnas de
--    tokens en '' — con NULL el login truena (error 500 de GoTrue).
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
  'authenticated', lower(v.email), extensions.crypt(v.password, extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('nombre', v.nombre), now(), now(),
  '', '', '', '', '', '', '', ''
from (values
  -- ( correo,                     contraseña inicial,   nombre )
  ('randall@kenetsolar.com',      'CAMBIAME-1234',      'Randall Cruz'),
  ('rcc622@gmail.com',            'CAMBIAME-1234',      'Randall (pruebas)')
  -- ,('lesly@kenet.mx',          'CAMBIAME-1234',      'Lesly Palacios')
  -- ,('alondra@kenet.mx',        'CAMBIAME-1234',      'Alondra Hernández')
) as v(email, password, nombre)
where not exists (select 1 from auth.users u where u.email = lower(v.email));

-- 1b) REPARACIONES (idempotentes, no editan nada que ya esté bien):
-- identidad email faltante = login imposible; tokens NULL = error 500.
insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now()
  from auth.users u
  left join auth.identities i on i.user_id = u.id and i.provider = 'email'
 where i.id is null;

update auth.users set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '');

-- 2) BACKFILL: crea profiles para auth.users que no tengan uno.
insert into public.profiles (id, email, role)
select u.id, u.email, 'operativo'
  from auth.users u
  left join public.profiles p on p.id = u.id
 where p.id is null;

-- 3) GO / DIRECCIÓN
update public.profiles set role='go', full_name='Randall Cruz'
 where email='randall@kenetsolar.com';
update public.profiles set role='go', full_name='Randall (pruebas)'
 where email='rcc622@gmail.com';
-- update public.profiles set role='consulta', full_name='Guillermo Hernández'
--  where email='CORREO_GUILLERMO';

-- 4) EQUIPO POR ZONA (roles: go | coordinador | operativo | consulta;
--    zonas: MTY | SLT | TRC | MVA; sin zone = todas)

-- Nodo R2 — Torreón
-- update public.profiles set role='operativo', full_name='Lesly Palacios',    zone='TRC' where email='lesly@kenet.mx';
-- update public.profiles set role='operativo', full_name='Alondra Hernández', zone='TRC' where email='alondra@kenet.mx';

-- Nodo R2 — Monclova
-- update public.profiles set role='operativo', full_name='Iván Gallegos',     zone='MVA' where email='CORREO_IVAN';

-- Nodo R1 — Monterrey (entra en F3)
-- update public.profiles set role='coordinador', full_name='Coordinador Mesa', zone='MTY' where email='...';

-- 5) CONTRASEÑAS — un renglón por persona, edita y corre solo los que
--    quieras cambiar (re-correr el mismo renglón no hace daño):
-- update auth.users set encrypted_password = extensions.crypt('NuevaPass-99', extensions.gen_salt('bf')) where email='randall@kenetsolar.com';
-- update auth.users set encrypted_password = extensions.crypt('OtraPass-99',  extensions.gen_salt('bf')) where email='lesly@kenet.mx';

--    Lote con contraseña COMÚN (patrón Comisiones) — ⚠ en la Mesa la
--    bitácora atribuye por usuario; contraseña compartida = autoría negable:
-- update auth.users set encrypted_password = extensions.crypt('comun123', extensions.gen_salt('bf'))
--  where email in ('a@kenet.mx','b@kenet.mx');

-- 6) RECETAS SUELTAS (descomenta, edita, corre)

-- 6a) CAMBIAR CORREO (3 renglones, en este orden):
-- update auth.users set email='nuevo@kenet.mx' where email='viejo@kenet.mx';
-- update auth.identities set identity_data = jsonb_set(identity_data,'{email}','"nuevo@kenet.mx"')
--  where provider='email' and user_id=(select id from auth.users where email='nuevo@kenet.mx');
-- update public.profiles set email='nuevo@kenet.mx' where email='viejo@kenet.mx';

-- 6b) CAMBIAR NOMBRE (2 renglones):
-- update public.profiles set full_name='Nombre Nuevo' where email='persona@kenet.mx';
-- update auth.users set raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data,'{}'),'{nombre}','"Nombre Nuevo"')
--  where email='persona@kenet.mx';

-- 6c) BAJA POR ROTACIÓN (bloquea, conserva historial — NO borrar):
-- update auth.users set banned_until='infinity' where email='exempleado@kenet.mx';

-- 6d) REACTIVAR:
-- update auth.users set banned_until=null where email='persona@kenet.mx';

-- 6e) ELIMINAR DE RAÍZ (solo basura/typos; el dashboard falla por FKs —
--     estos 8 deletes limpian todo; corre el bloque completo):
-- delete from auth.mfa_amr_claims where session_id in (select id from auth.sessions where user_id = (select id from auth.users where email='typo@x.com'));
-- delete from auth.mfa_challenges where factor_id in (select id from auth.mfa_factors where user_id = (select id from auth.users where email='typo@x.com'));
-- delete from auth.mfa_factors    where user_id = (select id from auth.users where email='typo@x.com');
-- delete from auth.refresh_tokens where user_id = (select id from auth.users where email='typo@x.com')::text;
-- delete from auth.sessions       where user_id = (select id from auth.users where email='typo@x.com');
-- delete from auth.one_time_tokens where user_id = (select id from auth.users where email='typo@x.com');
-- delete from auth.identities     where user_id = (select id from auth.users where email='typo@x.com');
-- delete from auth.users          where email='typo@x.com';

-- 7) VERIFICACIÓN
select p.role, p.zone, p.full_name, p.email,
       u.banned_until is not null and u.banned_until > now() as bloqueado,
       u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
 order by p.role desc, p.zone nulls last, p.full_name nulls last;

-- 8) (OPCIONAL, una vez) Limpiar las funciones go_* del enfoque anterior:
-- drop function if exists go_crear_usuario(text,text,text);
-- drop function if exists go_crear_usuario(text,text,text,text,text);
-- drop function if exists go_cambiar_password(text,text);
-- drop function if exists go_cambiar_correo(text,text);
-- drop function if exists go_cambiar_nombre(text,text);
-- drop function if exists go_cambiar_rol(text,text);
-- drop function if exists go_cambiar_zona(text,text);
-- drop function if exists go_bloquear_usuario(text);
-- drop function if exists go_reactivar_usuario(text);
-- drop function if exists go_eliminar_usuario(text);
-- drop function if exists go_ver_usuarios();
