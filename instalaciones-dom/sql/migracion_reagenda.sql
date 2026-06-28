-- ============================================================
-- Migración: clasificación del reagende (factor + motivo)
-- Pegar en Supabase → SQL Editor y ejecutar. Idempotente.
-- ============================================================

ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS reagenda_factor TEXT,   -- 'interno' | 'externo'
  ADD COLUMN IF NOT EXISTS reagenda_motivo TEXT;   -- interno: material|instalador · externo: clima|cliente

-- Interpretación del SLA al reagendar:
--   externo (clima/cliente) -> el reloj se reinicia (no penaliza a KENET)
--   interno (material/instalador) -> conserva los dias (cuenta contra KENET)
