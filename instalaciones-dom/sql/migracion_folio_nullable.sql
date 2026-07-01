-- ============================================================
-- KENET Solar · Permite folio KENET vacío (proyectos de Saltillo sin MY/SL aún)
-- Ejecutar en Supabase SQL Editor. No borra datos.
-- ============================================================
-- Antes: folio era NOT NULL. Ahora se permite NULL para importar proyectos que
-- todavía no tienen folio KENET (ej. Saltillo, hasta que se les asigne su SL).
-- El índice UNIQUE sigue vigente: Postgres permite MÚLTIPLES NULL (los nulos no
-- se consideran iguales entre sí), así que varios proyectos pueden tener folio
-- en blanco sin chocar. El OV de Odoo (folio_odoo) queda como referencia.

ALTER TABLE proyectos ALTER COLUMN folio DROP NOT NULL;
