-- ============================================================
-- Migración: campos de equipo en proyectos
-- Pegar en Supabase → SQL Editor y ejecutar (una sola vez).
-- Seguro de re-correr: usa IF NOT EXISTS.
-- ============================================================

ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS panel_potencia_w      INTEGER,        -- potencia por panel (W)
  ADD COLUMN IF NOT EXISTS panel_marca           TEXT,
  ADD COLUMN IF NOT EXISTS inversor_capacidad_kw NUMERIC(6,2),   -- capacidad del inversor (kW)
  ADD COLUMN IF NOT EXISTS inversor_marca        TEXT;

-- Nota: la columna existente `kw` representa el tamaño del sistema (kWp).
-- Solo cambió la etiqueta en la interfaz; no requiere migración de datos.
