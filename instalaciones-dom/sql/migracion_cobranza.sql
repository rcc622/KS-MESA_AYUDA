-- ============================================================
-- KENET Solar · Cobranza / Morosidad — campos que poblará TOKU/Odoo
-- Ejecutar en Supabase SQL Editor. Idempotente, no borra datos.
-- ============================================================
-- El módulo de Cobranza clasifica morosos con estos campos. HOY quedan en 0/null;
-- cuando se conecte la API de TOKU, esta actualiza automáticamente (montos y fechas
-- se LEEN de Odoo/TOKU, no se teclean).
--
-- Clasificación (política KENET): meses_atraso = mensualidades vencidas sin pagar.
--   1 → Moroso 1 (día 11+, pena $500) · 2 → Moroso 2 · 3 → Moroso 3 · 4+ → cobranza judicial.

ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS meses_atraso            INTEGER DEFAULT 0;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS saldo_vencido           NUMERIC(12,2) DEFAULT 0;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS pena_convencional       NUMERIC(12,2) DEFAULT 0;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS proxima_fecha_pago      DATE;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS cobranza_actualizada_en TIMESTAMPTZ;

-- Para PROBAR la vista sin TOKU, puedes fijar valores en algún proyecto, ej.:
--   UPDATE proyectos SET meses_atraso=1, saldo_vencido=3500, pena_convencional=500,
--     proxima_fecha_pago='2026-07-15', cobranza_actualizada_en=now()
--   WHERE folio='MY511';
