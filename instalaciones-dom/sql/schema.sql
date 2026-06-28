-- ============================================================
-- KENET Solar · Mesa de Control · Instalaciones Domésticas
-- Schema v1 — pegar en Supabase SQL Editor y ejecutar
-- ============================================================

-- ── 1. USUARIOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  nombre      TEXT NOT NULL,
  rol         TEXT NOT NULL CHECK (rol IN ('admin', 'pm_domestico', 'instalador', 'coordinador')),
  zona        TEXT          CHECK (zona IN ('MTY', 'SLT', 'TRC', 'MVA')),
  activo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 2. CUADRILLAS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cuadrillas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('externa', 'interna')),
  zona            TEXT NOT NULL CHECK (zona IN ('MTY', 'SLT', 'TRC', 'MVA')),
  pm_id           UUID REFERENCES usuarios(id),
  aplica_vueltas  BOOLEAN DEFAULT false,
  esquema_pago    TEXT CHECK (esquema_pago IN ('por_instalacion', 'por_panel', 'salario_bono', 'otro')),
  activa          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Tabla de miembros de cuadrilla
CREATE TABLE IF NOT EXISTS cuadrilla_miembros (
  cuadrilla_id  UUID REFERENCES cuadrillas(id) ON DELETE CASCADE,
  usuario_id    UUID REFERENCES usuarios(id)   ON DELETE CASCADE,
  PRIMARY KEY (cuadrilla_id, usuario_id)
);

-- ── 3. REGLAS KPI POR CUADRILLA ──────────────────────────────
CREATE TABLE IF NOT EXISTS reglas_cuadrilla (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuadrilla_id  UUID REFERENCES cuadrillas(id) ON DELETE CASCADE,
  kpi           TEXT NOT NULL,   -- 'instalaciones_a_tiempo' | 'reportes_completos' | 'sin_correcciones'
  meta          NUMERIC NOT NULL,
  consecuencia  TEXT CHECK (consecuencia IN ('descuento_pago', 'afecta_kpi_bono')),
  valor         NUMERIC NOT NULL,
  activa        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── 4. PROYECTOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proyectos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio             TEXT UNIQUE NOT NULL,
  folio_odoo        TEXT,
  cliente           TEXT NOT NULL,
  telefono          TEXT,
  direccion         TEXT,
  zona              TEXT CHECK (zona IN ('MTY', 'SLT', 'TRC', 'MVA')),
  cuadrilla_id      UUID REFERENCES cuadrillas(id),
  instalador_id     UUID REFERENCES usuarios(id),
  estatus           TEXT DEFAULT 'agendado'
                    CHECK (estatus IN ('agendado','en_progreso','completado','reagendado','cancelado')),
  fecha_agenda      DATE,
  fecha_instalacion DATE,
  fecha_original    DATE,          -- fecha antes del último reagendo
  motivo_reagendo   TEXT,
  dias_en_etapa     INTEGER DEFAULT 0,
  paneles               INTEGER,
  kw                    NUMERIC(6,2),   -- tamaño del sistema (kWp)
  panel_potencia_w      INTEGER,        -- potencia por panel (W)
  panel_marca           TEXT,
  inversor_tipo         TEXT,           -- 'inversor' | 'microinversor'
  inversor_cantidad     INTEGER,
  inversor_capacidad_kw NUMERIC(6,2),
  inversor_marca        TEXT,
  anticipo_pagado   BOOLEAN DEFAULT false,
  instalado_cobrado BOOLEAN DEFAULT false,
  medidor_pagado    BOOLEAN DEFAULT false,
  notas             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Trigger: actualiza updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER proyectos_updated_at
  BEFORE UPDATE ON proyectos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 5. BITÁCORA (inmutable) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS bitacora (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,        -- 'agenda'|'inicio'|'cierre'|'reagenda'|'nota'|'import'
  descripcion TEXT NOT NULL,
  usuario_id  UUID REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ DEFAULT now()
  -- SIN updated_at: la bitácora no se modifica
);

-- ── 6. CORTES DE PAGO ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cortes_pago (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_inicio  DATE NOT NULL,
  semana_fin     DATE NOT NULL,
  cuadrilla_id   UUID REFERENCES cuadrillas(id),
  esquema        TEXT CHECK (esquema IN ('externa', 'interna')),
  instalaciones  INTEGER DEFAULT 0,
  pago_base      NUMERIC(10,2),
  descuentos     NUMERIC(10,2) DEFAULT 0,
  estado         TEXT DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ── 7. VUELTAS (solo cuadrillas externas con aplica_vueltas) ─
CREATE TABLE IF NOT EXISTS vueltas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corte_id   UUID REFERENCES cortes_pago(id) ON DELETE CASCADE,
  concepto   TEXT NOT NULL,
  monto      NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 8. CUMPLIMIENTO KPI POR CORTE ────────────────────────────
CREATE TABLE IF NOT EXISTS corte_kpis (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corte_id  UUID REFERENCES cortes_pago(id) ON DELETE CASCADE,
  kpi       TEXT NOT NULL,
  meta      NUMERIC NOT NULL,
  real      NUMERIC,
  descuento NUMERIC(10,2) DEFAULT 0,
  cumplido  BOOLEAN DEFAULT false
);

-- ── 9. ÍNDICES ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_proyectos_zona     ON proyectos(zona);
CREATE INDEX IF NOT EXISTS idx_proyectos_estatus  ON proyectos(estatus);
CREATE INDEX IF NOT EXISTS idx_proyectos_cuadrilla ON proyectos(cuadrilla_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_proyecto  ON bitacora(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_cortes_cuadrilla   ON cortes_pago(cuadrilla_id);
CREATE INDEX IF NOT EXISTS idx_vueltas_corte      ON vueltas(corte_id);
CREATE INDEX IF NOT EXISTS idx_corte_kpis_corte   ON corte_kpis(corte_id);

-- ── 10. RLS (Row Level Security) ─────────────────────────────
-- Activa RLS en todas las tablas
ALTER TABLE usuarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuadrillas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuadrilla_miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE reglas_cuadrilla  ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cortes_pago       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vueltas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE corte_kpis        ENABLE ROW LEVEL SECURITY;

-- Política temporal: acceso total para usuarios autenticados
-- (ajustar por rol en la siguiente fase)
CREATE POLICY "acceso_autenticados" ON usuarios
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acceso_autenticados" ON cuadrillas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acceso_autenticados" ON cuadrilla_miembros
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acceso_autenticados" ON reglas_cuadrilla
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acceso_autenticados" ON proyectos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acceso_autenticados" ON bitacora
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acceso_autenticados" ON cortes_pago
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acceso_autenticados" ON vueltas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "acceso_autenticados" ON corte_kpis
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
