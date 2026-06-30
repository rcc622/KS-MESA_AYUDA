-- ============================================================
-- KENET Solar · Mesa de Control · Módulo CFE / Gestoría (Fase 3)
-- Ejecutar en Supabase SQL Editor. Idempotente (no borra datos).
-- ============================================================
-- Trámites ante CFE por proyecto: UVIE, UIIE, RMU, interconexión y el
-- MEDIDOR BIDIRECCIONAL. Cuando el medidor bidireccional llega, se marca y
-- queda una bandera para Cobranza ("ya se puede cobrar"; hito 6.1 del journey).

CREATE TABLE IF NOT EXISTS cfe_tramites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id     UUID REFERENCES proyectos(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN
                    ('uvie','uiie','rmu','interconexion','medidor_bidireccional')),
  estado          TEXT NOT NULL DEFAULT 'solicitud' CHECK (estado IN
                    ('solicitud','en_revision','inspeccion','aprobado','rechazado','completado')),
  folio_cfe       TEXT,
  responsable_id  UUID REFERENCES usuarios(id),
  fecha_solicitud   DATE,
  fecha_inspeccion  DATE,
  fecha_aprobacion  DATE,
  accion_requerida  TEXT,
  -- Medidor bidireccional → dispara alerta a Cobranza
  medidor_bidireccional_llego BOOLEAN DEFAULT false,
  fecha_medidor     DATE,
  cobranza_alertada BOOLEAN DEFAULT false,  -- "ya se puede cobrar" (Cobranza/TOKU a futuro)
  notas             TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cfe_proyecto ON cfe_tramites(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_cfe_estado   ON cfe_tramites(estado);

-- Trigger updated_at (reusa la función set_updated_at del schema base).
DROP TRIGGER IF EXISTS cfe_tramites_updated_at ON cfe_tramites;
CREATE TRIGGER cfe_tramites_updated_at
  BEFORE UPDATE ON cfe_tramites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE cfe_tramites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cfe_select" ON cfe_tramites;
DROP POLICY IF EXISTS "cfe_insert" ON cfe_tramites;
DROP POLICY IF EXISTS "cfe_update" ON cfe_tramites;
DROP POLICY IF EXISTS "cfe_delete" ON cfe_tramites;

-- Lectura: admin todo; pm/coordinador por su zona (vía el proyecto).
CREATE POLICY "cfe_select" ON cfe_tramites
  FOR SELECT TO authenticated
  USING (
    get_my_rol() = 'admin'
    OR (get_my_rol() IN ('pm_domestico','coordinador')
        AND proyecto_id IN (SELECT id FROM proyectos WHERE zona = get_my_zona()))
  );

-- Alta/edición: admin, pm y coordinador (gestoría).
CREATE POLICY "cfe_insert" ON cfe_tramites
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_rol() = 'admin'
    OR (get_my_rol() IN ('pm_domestico','coordinador')
        AND proyecto_id IN (SELECT id FROM proyectos WHERE zona = get_my_zona()))
  );

CREATE POLICY "cfe_update" ON cfe_tramites
  FOR UPDATE TO authenticated
  USING (
    get_my_rol() = 'admin'
    OR (get_my_rol() IN ('pm_domestico','coordinador')
        AND proyecto_id IN (SELECT id FROM proyectos WHERE zona = get_my_zona()))
  )
  WITH CHECK (
    get_my_rol() = 'admin'
    OR (get_my_rol() IN ('pm_domestico','coordinador')
        AND proyecto_id IN (SELECT id FROM proyectos WHERE zona = get_my_zona()))
  );

CREATE POLICY "cfe_delete" ON cfe_tramites
  FOR DELETE TO authenticated
  USING (get_my_rol() = 'admin');
