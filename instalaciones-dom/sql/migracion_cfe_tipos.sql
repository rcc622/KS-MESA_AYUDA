-- ============================================================
-- KENET Solar · CFE — actualiza los tipos de trámite permitidos
-- Ejecutar en Supabase SQL Editor. No borra datos.
-- ============================================================
-- Nuevos tipos: Medidor Bidireccional (MB), Cambio de nombre (CN),
-- Trámite 220V, Preparación 220V, UVIE, UIIE.
-- (Se quitan 'rmu' e 'interconexion' del catálogo.)

ALTER TABLE cfe_tramites DROP CONSTRAINT IF EXISTS cfe_tramites_tipo_check;
ALTER TABLE cfe_tramites ADD CONSTRAINT cfe_tramites_tipo_check
  CHECK (tipo IN ('medidor_bidireccional','cambio_nombre','tramite_220v','prep_220v','uvie','uiie'));
