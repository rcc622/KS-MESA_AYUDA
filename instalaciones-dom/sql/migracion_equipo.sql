-- ============================================================
-- Migración: campos de equipo en proyectos (panel + inversor)
-- Pegar en Supabase → SQL Editor y ejecutar.
-- Seguro de re-correr: usa IF NOT EXISTS (solo agrega lo que falte).
-- ============================================================

ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS panel_potencia_w      INTEGER,        -- potencia por panel (W)
  ADD COLUMN IF NOT EXISTS panel_marca           TEXT,
  ADD COLUMN IF NOT EXISTS inversor_tipo         TEXT,           -- 'inversor' | 'microinversor'
  ADD COLUMN IF NOT EXISTS inversor_cantidad     INTEGER,
  ADD COLUMN IF NOT EXISTS inversor_capacidad_kw NUMERIC(6,2),   -- capacidad del inversor (kW)
  ADD COLUMN IF NOT EXISTS inversor_marca        TEXT;

-- Nota: la columna `kw` (tamaño del sistema en kWp) se calcula automático en la
-- app = paneles × 600 W ÷ 1000. No requiere captura ni migración de datos.
