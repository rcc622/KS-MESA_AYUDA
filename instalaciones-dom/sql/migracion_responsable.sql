-- ============================================================
-- Migración: responsable (jefe) de cuadrilla
-- Pegar en Supabase → SQL Editor y ejecutar. Idempotente.
-- ============================================================

ALTER TABLE cuadrillas
  ADD COLUMN IF NOT EXISTS responsable_id UUID REFERENCES usuarios(id);

-- El responsable es el usuario (jefe de cuadrilla) que verá los proyectos de
-- su cuadrilla en el módulo "Reporte Instalador". El admin sigue viendo todo.
