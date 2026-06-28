-- =====================================================================
-- MIGRACIÓN COMPLETA — pon la base al día con la app (correr UNA vez)
-- =====================================================================
-- Agrega TODAS las columnas que la app espera. Es idempotente
-- (IF NOT EXISTS): puedes correrla cuantas veces quieras sin romper nada.
-- Con esto desaparecen los errores de "no se encuentra la columna X".
-- =====================================================================

-- Equipo + reagende en proyectos
ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS panel_potencia_w      INTEGER,        -- potencia por panel (W)
  ADD COLUMN IF NOT EXISTS panel_marca           TEXT,
  ADD COLUMN IF NOT EXISTS inversor_tipo         TEXT,           -- 'inversor' | 'microinversor'
  ADD COLUMN IF NOT EXISTS inversor_cantidad     INTEGER,
  ADD COLUMN IF NOT EXISTS inversor_capacidad_kw NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS inversor_marca        TEXT,
  ADD COLUMN IF NOT EXISTS reagenda_factor       TEXT,           -- 'interno' | 'externo'
  ADD COLUMN IF NOT EXISTS reagenda_motivo       TEXT;           -- material|instalador · clima|cliente

-- Responsable (jefe) de cuadrilla
ALTER TABLE cuadrillas
  ADD COLUMN IF NOT EXISTS responsable_id UUID REFERENCES usuarios(id);

-- Verificación: deben aparecer las 8 columnas de proyectos + responsable_id
select 'proyectos' as tabla, column_name from information_schema.columns
 where table_name='proyectos'
   and column_name in ('panel_potencia_w','panel_marca','inversor_tipo','inversor_cantidad',
                       'inversor_capacidad_kw','inversor_marca','reagenda_factor','reagenda_motivo')
union all
select 'cuadrillas', column_name from information_schema.columns
 where table_name='cuadrillas' and column_name='responsable_id'
 order by 1, 2;
