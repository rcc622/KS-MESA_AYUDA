-- ============================================================
-- 06_instalaciones.sql — Módulo Instalaciones (detalle de la etapa 2 del journey)
-- Supabase / Postgres. Correr DESPUÉS de 01_schema.sql
-- Modela el detalle operativo del PM sobre la etapa "Instalación" (CONTEXTO_NEGOCIO §3-4).
-- Diseño tomado del prototipo "KENET Desktop" (designado por dirección como la UI buena).
--
-- ⚠ OJO — puntos que EXTIENDEN/ROZAN reglas firmes y están en docs/PREGUNTAS_NEGOCIO.md
--   (no inventados aquí, pendientes de validar por GO antes de tomarlos como definitivos):
--   · CLT (dias_max placeholder = 40) convive con el modelo OLA del journey.
--   · Las 10 sub-etapas de ejecución son granularidad del prototipo (el journey tiene 6).
--   · "Liberar pago" al instalador = evento de dinero; la arquitectura de 2 capas dice
--     que la plataforma NO captura dinero a mano. Se modela como hito operativo auditado,
--     sujeto a confirmación de si vive aquí o en Odoo.
-- ============================================================

-- ---------- 1. INSTALADORES (cuadrillas / PM de campo) ----------
create table if not exists instaladores (
  id          bigint generated always as identity primary key,
  nombre      text not null,
  iniciales   text default '',
  zona        text check (zona in ('MTY','SLT','TRC','MVA')),
  activo      boolean default true,
  created_at  timestamptz default now()
);

-- ---------- 2. CATÁLOGO CERRADO de sub-etapas de ejecución (prototipo, 10) ----------
-- Solo GO lo modifica por SQL (igual que `etapas`). La UI nunca lo edita.
create table if not exists instalacion_etapas (
  id     int primary key,
  nombre text not null,
  orden  int not null
);
insert into instalacion_etapas (id, nombre, orden) values
  (1,'Ficha técnica',1),(2,'Viabilidad',2),(3,'Ingeniería',3),(4,'Lista de materiales',4),
  (5,'Envío CD',5),(6,'Instalación CD',6),(7,'Envío CA',7),(8,'Instalación CA',8),
  (9,'Evidencias',9),(10,'Completado',10)
on conflict (id) do nothing;

-- ---------- 3. INSTALACIONES (proyecto = detalle de etapa Instalación de un cliente) ----------
create table if not exists instalaciones (
  id              bigint generated always as identity primary key,
  cliente_id      bigint references clientes(id),       -- integración con el journey (puede ser null en demo)
  tipo            text default '',                       -- Doméstico / C&I Local / C&I Foráneo / FIDE C&I / Baterías C&I
  instalador_id   bigint references instaladores(id),
  etapa_inst      int  not null default 1 references instalacion_etapas(id),
  etapa_desde     timestamptz not null default now(),
  completado_at   timestamptz,                           -- se sella al llegar a etapa 10 (congela el LT)
  fecha_inst      date,                                  -- fecha de instalación programada
  fecha_inicio_lt date,                                  -- inicio del lead time (para el CLT)
  fecha_maxima    date,                                  -- fecha máxima comprometida
  dias_max        int  default 40,                       -- LT máximo (PLACEHOLDER — ver PREGUNTAS_NEGOCIO)
  paneles         int  default 0,
  proxima_accion  text default '',
  fecha_compromiso date,
  -- Checklist PMD-P2 a nivel proyecto (4 ítems, del prototipo)
  cl_reporte      boolean default false,                 -- Reporte recibido
  cl_evidencias   boolean default false,                 -- Evidencias validadas
  cl_monitoreo    boolean default false,                 -- Monitoreo verificado
  cl_pago         boolean default false,                 -- Pago liberado
  -- Reagendado (motivo + nueva fecha)
  reag_motivo     text check (reag_motivo in ('Cliente','KENET','Clima')),
  reag_fecha      date,
  reag_nota       text default '',
  activo          boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists idx_inst_activo on instalaciones(activo, etapa_inst);
create index if not exists idx_inst_cliente on instalaciones(cliente_id);

-- ---------- 4. REPORTES DE INSTALADOR (PMD-P2) ----------
create table if not exists reportes_instalacion (
  id               bigint generated always as identity primary key,
  instalacion_id   bigint not null references instalaciones(id),
  instalador_id    bigint references instaladores(id),
  enviado          boolean default false,
  enviado_at       timestamptz,
  a_tiempo         boolean,                              -- nullable: true / false / null (N/A, aún no enviado)
  pendientes       int  default 0,
  paneles          int  default 0,
  modelo           text default '',                      -- modelo de panel
  inversor         text default '',
  checklist_6      text default '',                      -- "6/6 ✓", "4/6", "—"
  -- Validación PM (4 ítems) — candado de liberación de pago
  val_reporte      boolean default false,
  val_evidencias   boolean default false,
  val_monitoreo    boolean default false,
  val_pago         boolean default false,
  pago_liberado    boolean default false,
  pago_liberado_at timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists idx_rep_inst on reportes_instalacion(instalacion_id);

-- ---------- 5. AUDITORÍA (reusa la bitácora del journey — antifraude) ----------
-- Toda mutación crítica del módulo queda registrada con el email del JWT.
create or replace function fn_audit_instalaciones() returns trigger as $$
declare
  usr text := coalesce(current_setting('request.jwt.claims', true)::json->>'email','sistema');
begin
  if new.etapa_inst is distinct from old.etapa_inst then
    insert into bitacora(tabla, registro, campo, valor_old, valor_new, usuario)
    values ('instalaciones', old.id, 'etapa_inst', old.etapa_inst::text, new.etapa_inst::text, usr);
    new.etapa_desde := now();
    if new.etapa_inst = 10 and new.completado_at is null then
      new.completado_at := now();
    end if;
  end if;
  if new.proxima_accion is distinct from old.proxima_accion then
    insert into bitacora(tabla, registro, campo, valor_old, valor_new, usuario)
    values ('instalaciones', old.id, 'proxima_accion', old.proxima_accion, new.proxima_accion, usr);
  end if;
  if new.reag_fecha is distinct from old.reag_fecha or new.reag_motivo is distinct from old.reag_motivo then
    insert into bitacora(tabla, registro, campo, valor_old, valor_new, usuario)
    values ('instalaciones', old.id, 'reagendado',
            coalesce(old.reag_motivo,'') || ' ' || coalesce(old.reag_fecha::text,''),
            coalesce(new.reag_motivo,'') || ' ' || coalesce(new.reag_fecha::text,''), usr);
  end if;
  if new.activo is distinct from old.activo then
    insert into bitacora(tabla, registro, campo, valor_old, valor_new, usuario)
    values ('instalaciones', old.id, 'activo', old.activo::text, new.activo::text, usr);
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_audit_instalaciones on instalaciones;
create trigger trg_audit_instalaciones before update on instalaciones
for each row execute function fn_audit_instalaciones();

-- Liberación de pago = evento de dinero: SIEMPRE auditado.
create or replace function fn_audit_reportes() returns trigger as $$
declare
  usr text := coalesce(current_setting('request.jwt.claims', true)::json->>'email','sistema');
begin
  if new.pago_liberado is distinct from old.pago_liberado then
    insert into bitacora(tabla, registro, campo, valor_old, valor_new, usuario)
    values ('reportes_instalacion', old.id, 'pago_liberado', old.pago_liberado::text, new.pago_liberado::text, usr);
    if new.pago_liberado then new.pago_liberado_at := now(); end if;
  end if;
  if new.enviado is distinct from old.enviado then
    insert into bitacora(tabla, registro, campo, valor_old, valor_new, usuario)
    values ('reportes_instalacion', old.id, 'enviado', old.enviado::text, new.enviado::text, usr);
    if new.enviado and new.enviado_at is null then new.enviado_at := now(); end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_audit_reportes on reportes_instalacion;
create trigger trg_audit_reportes before update on reportes_instalacion
for each row execute function fn_audit_reportes();

-- ---------- 6. VISTA con CLT y semáforo calculados (la UI SIEMPRE lee de aquí) ----------
-- CLT = LT actual / LT máximo.  LT actual = días desde fecha_inicio_lt, congelado al completar.
-- Umbrales del prototipo: <1.0 verde · 1.0–1.19 ámbar · ≥1.2 rojo.
create or replace view v_instalaciones with (security_invoker = true) as
select
  i.id, i.cliente_id, i.tipo, i.instalador_id,
  i.etapa_inst, ie.nombre as etapa_nombre,
  i.fecha_inst, i.fecha_inicio_lt, i.fecha_maxima, i.dias_max, i.paneles,
  i.proxima_accion, i.fecha_compromiso,
  i.cl_reporte, i.cl_evidencias, i.cl_monitoreo, i.cl_pago,
  i.reag_motivo, i.reag_fecha, i.reag_nota, i.activo, i.etapa_desde, i.completado_at,
  c.nombre as cliente_nombre, c.folio, c.zona, c.region,
  ins.nombre as instalador_nombre, ins.iniciales as instalador_iniciales,
  case when i.fecha_inicio_lt is not null
       then (coalesce(i.completado_at::date, current_date) - i.fecha_inicio_lt)
       else null end as dias_actual,
  case when i.fecha_inicio_lt is not null and i.dias_max > 0
       then round((coalesce(i.completado_at::date, current_date) - i.fecha_inicio_lt)::numeric / i.dias_max, 2)
       else null end as clt,
  case
    when i.fecha_inicio_lt is null or i.dias_max = 0 then 'verde'
    when (coalesce(i.completado_at::date, current_date) - i.fecha_inicio_lt)::numeric / i.dias_max >= 1.2 then 'rojo'
    when (coalesce(i.completado_at::date, current_date) - i.fecha_inicio_lt)::numeric / i.dias_max >= 1.0 then 'ambar'
    else 'verde'
  end as clt_sem
from instalaciones i
left join clientes c on c.id = i.cliente_id
left join instaladores ins on ins.id = i.instalador_id
left join instalacion_etapas ie on ie.id = i.etapa_inst;

revoke select on v_instalaciones from anon;
grant  select on v_instalaciones to authenticated;

-- ---------- 7. RLS (mismo patrón que el journey) ----------
alter table instaladores         enable row level security;
alter table instalacion_etapas   enable row level security;
alter table instalaciones        enable row level security;
alter table reportes_instalacion enable row level security;

-- Catálogos: solo lectura desde la app (GO los edita por SQL).
drop policy if exists p_sel_instaladores on instaladores;
create policy p_sel_instaladores on instaladores for select to authenticated using (true);
drop policy if exists p_sel_inst_etapas on instalacion_etapas;
create policy p_sel_inst_etapas  on instalacion_etapas for select to authenticated using (true);

-- Instalaciones y reportes: cualquier autenticado lee/escribe (roles finos = F3).
drop policy if exists p_sel_inst on instalaciones;
create policy p_sel_inst on instalaciones for select to authenticated using (true);
drop policy if exists p_upd_inst on instalaciones;
create policy p_upd_inst on instalaciones for update to authenticated using (true) with check (true);
drop policy if exists p_ins_inst on instalaciones;
create policy p_ins_inst on instalaciones for insert to authenticated with check (true);

drop policy if exists p_sel_rep on reportes_instalacion;
create policy p_sel_rep on reportes_instalacion for select to authenticated using (true);
drop policy if exists p_upd_rep on reportes_instalacion;
create policy p_upd_rep on reportes_instalacion for update to authenticated using (true) with check (true);
drop policy if exists p_ins_rep on reportes_instalacion;
create policy p_ins_rep on reportes_instalacion for insert to authenticated with check (true);

-- NOTA: la bitácora sigue sin política de INSERT — solo los triggers (security definer)
-- escriben en ella. No la abras a la app o el control antifraude muere.
