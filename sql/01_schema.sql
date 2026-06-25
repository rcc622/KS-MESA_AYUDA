-- ============================================================
-- 01_schema.sql — MVP Mesa de Ayuda KENET Solar (piloto R2)
-- Supabase / Postgres. Correr ANTES que 02_seed.sql
-- Modelo: CJ AS-IS v9 (etapas 2→7) + Modelo Mesa de Ayuda (PROTEXO jun-2026)
-- ============================================================

-- ---------- 1. CATÁLOGO DE ETAPAS (cerrado — solo GO lo modifica) ----------
create table etapas (
  id          int primary key,
  corto       text not null,
  nombre      text not null,
  ola_dias    int  not null,          -- OLA placeholder, se firma en F0
  orden       int  not null
);

insert into etapas (id, corto, nombre, ola_dias, orden) values
  (0, 'Contrato·V5',  'Contrato y anticipo (V5)',        3,  0),
  (1, 'Viabilidad',   'Viabilidad — Levantamiento',      5,  1),
  (2, 'Instalación',  'Instalación (PM)',               10,  2),
  (3, 'Trámite CFE',  'Trámite CFE (interconexión)',    15,  3),
  (4, 'Monitoreo',    'Puesta en marcha y monitoreo',    7,  4),
  (5, 'Entrega·CS',   'Entrega a Customer Success',      7,  5);

-- ---------- 2. CATÁLOGO DE ESTADOS DE COBRO (hitos del CJ) ----------
create table cobro_estados (
  id    text primary key,
  label text not null,
  sem   text not null check (sem in ('ok','warn','bad'))
);

insert into cobro_estados values
  ('anticipo_pendiente', 'Anticipo por cobrar — V5 no detona', 'warn'),
  ('al_corriente',       'Al corriente (hito vigente pagado)', 'ok'),
  ('enganche_vencido',   'Enganche vencido (instalación terminada)', 'bad'),
  ('restante_vencido',   'Restante vencido (medidor BD instalado)', 'bad'),
  ('liquidado',          'Liquidado', 'ok');

-- ---------- 3. CLIENTES / PROYECTOS ----------
create table clientes (
  id            bigint generated always as identity primary key,
  folio         text generated always as ('KS-2026-' || lpad(id::text, 4, '0')) stored,
  nombre        text not null,
  zona          text not null check (zona in ('MTY','SLT','TRC','MVA')),
  region        text not null check (region in ('R1','R2')),
  orden_venta   text default '',          -- OV (S#####) — futura FK con Odoo
  factura_folio text default '',
  sistema       text default '',          -- ej. 10-630/1-6K
  vendedor      text default '',
  esquema_pago  text default '',          -- CONTADO / MSI / MEJORAVIT / FIDE...
  premium       boolean default false,    -- C&I Póliza Premium (On-Call P1)
  etapa_actual  int not null default 0 references etapas(id),
  etapa_desde   timestamptz not null default now(),
  etapa_validada boolean default false,   -- false = etapa inferida del Excel, Lesly valida
  cobro_estado  text not null default 'al_corriente' references cobro_estados(id),
  proxima_accion text default '',
  responsable   text default '',
  observaciones text default '',
  activo        boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index idx_clientes_activo on clientes(activo, region, etapa_actual);

-- ---------- 4. EVENTOS (transiciones + bitácora operativa) ----------
create table eventos (
  id            bigint generated always as identity primary key,
  cliente_id    bigint not null references clientes(id),
  tipo          text not null,            -- 'cambio_etapa' | 'evento' | 'nota' | 'correccion'
  etapa_origen  int references etapas(id),
  etapa_destino int references etapas(id),
  descripcion   text default '',
  usuario       text not null,            -- email del usuario autenticado
  created_at    timestamptz default now()
);

create index idx_eventos_cliente on eventos(cliente_id, created_at desc);

-- ---------- 5. AUDIT LOG automático (quién cambió qué) ----------
create table bitacora (
  id         bigint generated always as identity primary key,
  tabla      text not null,
  registro   bigint not null,
  campo      text not null,
  valor_old  text,
  valor_new  text,
  usuario    text not null default coalesce(current_setting('request.jwt.claims', true)::json->>'email','sistema'),
  created_at timestamptz default now()
);

create or replace function fn_audit_clientes() returns trigger as $$
declare
  usr text := coalesce(current_setting('request.jwt.claims', true)::json->>'email','sistema');
begin
  if new.etapa_actual is distinct from old.etapa_actual then
    insert into bitacora(tabla, registro, campo, valor_old, valor_new, usuario)
    values ('clientes', old.id, 'etapa_actual', old.etapa_actual::text, new.etapa_actual::text, usr);
    -- transición de etapa: registra evento + reinicia contador de días
    insert into eventos(cliente_id, tipo, etapa_origen, etapa_destino, descripcion, usuario)
    values (old.id, 'cambio_etapa', old.etapa_actual, new.etapa_actual, 'Cambio de etapa', usr);
    new.etapa_desde := now();
    new.etapa_validada := true;
  end if;
  if new.cobro_estado is distinct from old.cobro_estado then
    insert into bitacora(tabla, registro, campo, valor_old, valor_new, usuario)
    values ('clientes', old.id, 'cobro_estado', old.cobro_estado, new.cobro_estado, usr);
  end if;
  if new.proxima_accion is distinct from old.proxima_accion then
    insert into bitacora(tabla, registro, campo, valor_old, valor_new, usuario)
    values ('clientes', old.id, 'proxima_accion', old.proxima_accion, new.proxima_accion, usr);
  end if;
  if new.activo is distinct from old.activo then
    insert into bitacora(tabla, registro, campo, valor_old, valor_new, usuario)
    values ('clientes', old.id, 'activo', old.activo::text, new.activo::text, usr);
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_audit_clientes before update on clientes
for each row execute function fn_audit_clientes();

-- ---------- 6. VISTA: tabla maestra con días en etapa y semáforo ----------
-- security_invoker: la vista respeta el RLS de las tablas base. Sin esto,
-- corre con permisos del dueño (postgres) y expone TODOS los clientes al
-- rol anon — la anon key es pública, sería fuga total de datos.
create or replace view v_journey with (security_invoker = true) as
select
  c.id, c.folio, c.nombre, c.zona, c.region, c.orden_venta, c.factura_folio,
  c.sistema, c.vendedor, c.esquema_pago, c.premium,
  c.etapa_actual, e.corto as etapa_corto, e.nombre as etapa_nombre, e.ola_dias,
  extract(day from now() - c.etapa_desde)::int as dias_en_etapa,
  case
    when extract(day from now() - c.etapa_desde) > e.ola_dias then 'rojo'
    when extract(day from now() - c.etapa_desde) >= e.ola_dias * 0.75 then 'ambar'
    else 'verde'
  end as semaforo,
  c.etapa_validada, c.cobro_estado, ce.label as cobro_label, ce.sem as cobro_sem,
  c.proxima_accion, c.responsable, c.observaciones, c.activo, c.etapa_desde
from clientes c
join etapas e on e.id = c.etapa_actual
join cobro_estados ce on ce.id = c.cobro_estado;

-- Cinturón y tirantes: anon no puede ni intentar leer la vista.
revoke select on v_journey from anon;

-- ---------- 7. RLS (Row Level Security) ----------
alter table clientes enable row level security;
alter table eventos enable row level security;
alter table bitacora enable row level security;
alter table etapas enable row level security;
alter table cobro_estados enable row level security;

-- MVP: cualquier usuario AUTENTICADO lee y escribe; bitácora registra quién.
-- (Roles finos por área llegan en F3 — no bloquear el piloto con permisos.)
create policy p_sel_clientes on clientes for select to authenticated using (true);
create policy p_upd_clientes on clientes for update to authenticated using (true) with check (true);
create policy p_ins_clientes on clientes for insert to authenticated with check (true);

create policy p_sel_eventos on eventos for select to authenticated using (true);
create policy p_ins_eventos on eventos for insert to authenticated with check (true);

create policy p_sel_bitacora on bitacora for select to authenticated using (true);
-- SIN política de INSERT para bitácora: solo escribe el trigger fn_audit_clientes
-- (security definer, ignora RLS). Si la app pudiera insertar directo, un usuario
-- autenticado podría sembrar registros falsos y el control antifraude muere.

create policy p_sel_etapas on etapas for select to authenticated using (true);
create policy p_sel_cobro on cobro_estados for select to authenticated using (true);

-- Catálogos: NADIE los edita desde la app (solo GO vía SQL editor = control de cambios)
