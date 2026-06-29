-- ============================================================
-- KENET Solar · Mesa de Control
-- Migración: RLS basado en roles
-- Ejecutar en Supabase SQL Editor (no borra datos)
-- ============================================================

-- ── 0. FUNCIONES HELPER ──────────────────────────────────────
-- SECURITY DEFINER permite leer la tabla usuarios aunque RLS esté activo.
-- SET search_path = public evita ataques de search_path hijacking.

CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rol FROM usuarios WHERE email = auth.email() AND activo = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_zona()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT zona FROM usuarios WHERE email = auth.email() AND activo = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION my_usuario_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM usuarios WHERE email = auth.email() AND activo = true LIMIT 1;
$$;

-- ── 1. ELIMINAR POLÍTICAS ANTERIORES (permisivas + nuevas si ya existen) ──

DROP POLICY IF EXISTS "acceso_autenticados"      ON usuarios;
DROP POLICY IF EXISTS "usuarios_select"           ON usuarios;
DROP POLICY IF EXISTS "usuarios_insert"           ON usuarios;
DROP POLICY IF EXISTS "usuarios_update"           ON usuarios;
DROP POLICY IF EXISTS "usuarios_delete"           ON usuarios;

DROP POLICY IF EXISTS "acceso_autenticados"       ON cuadrillas;
DROP POLICY IF EXISTS "cuadrillas_select"         ON cuadrillas;
DROP POLICY IF EXISTS "cuadrillas_insert"         ON cuadrillas;
DROP POLICY IF EXISTS "cuadrillas_update"         ON cuadrillas;
DROP POLICY IF EXISTS "cuadrillas_delete"         ON cuadrillas;

DROP POLICY IF EXISTS "acceso_autenticados"       ON cuadrilla_miembros;
DROP POLICY IF EXISTS "cuadrilla_miembros_select" ON cuadrilla_miembros;
DROP POLICY IF EXISTS "cuadrilla_miembros_insert" ON cuadrilla_miembros;
DROP POLICY IF EXISTS "cuadrilla_miembros_delete" ON cuadrilla_miembros;

DROP POLICY IF EXISTS "acceso_autenticados"       ON reglas_cuadrilla;
DROP POLICY IF EXISTS "reglas_cuadrilla_select"   ON reglas_cuadrilla;
DROP POLICY IF EXISTS "reglas_cuadrilla_insert"   ON reglas_cuadrilla;
DROP POLICY IF EXISTS "reglas_cuadrilla_update"   ON reglas_cuadrilla;
DROP POLICY IF EXISTS "reglas_cuadrilla_delete"   ON reglas_cuadrilla;

DROP POLICY IF EXISTS "acceso_autenticados"       ON proyectos;
DROP POLICY IF EXISTS "proyectos_select"          ON proyectos;
DROP POLICY IF EXISTS "proyectos_insert"          ON proyectos;
DROP POLICY IF EXISTS "proyectos_update"          ON proyectos;
DROP POLICY IF EXISTS "proyectos_delete"          ON proyectos;

DROP POLICY IF EXISTS "acceso_autenticados"       ON bitacora;
DROP POLICY IF EXISTS "bitacora_select"           ON bitacora;
DROP POLICY IF EXISTS "bitacora_insert"           ON bitacora;
DROP POLICY IF EXISTS "bitacora_no_update"        ON bitacora;
DROP POLICY IF EXISTS "bitacora_no_delete"        ON bitacora;

DROP POLICY IF EXISTS "acceso_autenticados"       ON cortes_pago;
DROP POLICY IF EXISTS "cortes_pago_select"        ON cortes_pago;
DROP POLICY IF EXISTS "cortes_pago_insert"        ON cortes_pago;
DROP POLICY IF EXISTS "cortes_pago_update"        ON cortes_pago;
DROP POLICY IF EXISTS "cortes_pago_delete"        ON cortes_pago;

DROP POLICY IF EXISTS "acceso_autenticados"       ON vueltas;
DROP POLICY IF EXISTS "vueltas_select"            ON vueltas;
DROP POLICY IF EXISTS "vueltas_insert"            ON vueltas;
DROP POLICY IF EXISTS "vueltas_update"            ON vueltas;
DROP POLICY IF EXISTS "vueltas_delete"            ON vueltas;

DROP POLICY IF EXISTS "acceso_autenticados"       ON corte_kpis;
DROP POLICY IF EXISTS "corte_kpis_select"         ON corte_kpis;
DROP POLICY IF EXISTS "corte_kpis_insert"         ON corte_kpis;
DROP POLICY IF EXISTS "corte_kpis_update"         ON corte_kpis;
DROP POLICY IF EXISTS "corte_kpis_delete"         ON corte_kpis;

-- ════════════════════════════════════════════════════════════
-- USUARIOS
-- admin/pm/coordinador: lectura total (necesitan ver instaladores para asignar)
-- instalador: solo su propio perfil
-- Escritura: solo admin
-- Borrado: nadie (usar activo=false)
-- ════════════════════════════════════════════════════════════

CREATE POLICY "usuarios_select" ON usuarios
  FOR SELECT TO authenticated
  USING (
    get_my_rol() IN ('admin', 'pm_domestico', 'coordinador')
    OR email = auth.email()
  );

CREATE POLICY "usuarios_insert" ON usuarios
  FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() = 'admin');

CREATE POLICY "usuarios_update" ON usuarios
  FOR UPDATE TO authenticated
  USING (get_my_rol() = 'admin')
  WITH CHECK (get_my_rol() = 'admin');

CREATE POLICY "usuarios_delete" ON usuarios
  FOR DELETE TO authenticated
  USING (false);

-- ════════════════════════════════════════════════════════════
-- CUADRILLAS
-- admin/pm/coordinador: lectura total
-- instalador: solo la cuadrilla a la que pertenece
-- Escritura: admin y pm
-- ════════════════════════════════════════════════════════════

CREATE POLICY "cuadrillas_select" ON cuadrillas
  FOR SELECT TO authenticated
  USING (
    get_my_rol() IN ('admin', 'pm_domestico', 'coordinador')
    OR (get_my_rol() = 'instalador' AND (
      responsable_id = my_usuario_id()
      OR id IN (SELECT cuadrilla_id FROM cuadrilla_miembros WHERE usuario_id = my_usuario_id())
    ))
  );

CREATE POLICY "cuadrillas_insert" ON cuadrillas
  FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() IN ('admin', 'pm_domestico'));

CREATE POLICY "cuadrillas_update" ON cuadrillas
  FOR UPDATE TO authenticated
  USING (get_my_rol() IN ('admin', 'pm_domestico'))
  WITH CHECK (get_my_rol() IN ('admin', 'pm_domestico'));

CREATE POLICY "cuadrillas_delete" ON cuadrillas
  FOR DELETE TO authenticated
  USING (get_my_rol() = 'admin');

-- ════════════════════════════════════════════════════════════
-- CUADRILLA_MIEMBROS
-- admin/pm/coordinador: lectura total
-- instalador: solo su propia membresía
-- Escritura: admin y pm
-- ════════════════════════════════════════════════════════════

CREATE POLICY "cuadrilla_miembros_select" ON cuadrilla_miembros
  FOR SELECT TO authenticated
  USING (
    get_my_rol() IN ('admin', 'pm_domestico', 'coordinador')
    OR usuario_id = my_usuario_id()
  );

CREATE POLICY "cuadrilla_miembros_insert" ON cuadrilla_miembros
  FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() IN ('admin', 'pm_domestico'));

CREATE POLICY "cuadrilla_miembros_delete" ON cuadrilla_miembros
  FOR DELETE TO authenticated
  USING (get_my_rol() IN ('admin', 'pm_domestico'));

-- ════════════════════════════════════════════════════════════
-- REGLAS_CUADRILLA (reglas financieras de KPI)
-- Lectura: admin, pm, coordinador
-- Escritura: solo admin
-- ════════════════════════════════════════════════════════════

CREATE POLICY "reglas_cuadrilla_select" ON reglas_cuadrilla
  FOR SELECT TO authenticated
  USING (get_my_rol() IN ('admin', 'pm_domestico', 'coordinador'));

CREATE POLICY "reglas_cuadrilla_insert" ON reglas_cuadrilla
  FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() = 'admin');

CREATE POLICY "reglas_cuadrilla_update" ON reglas_cuadrilla
  FOR UPDATE TO authenticated
  USING (get_my_rol() = 'admin')
  WITH CHECK (get_my_rol() = 'admin');

CREATE POLICY "reglas_cuadrilla_delete" ON reglas_cuadrilla
  FOR DELETE TO authenticated
  USING (get_my_rol() = 'admin');

-- ════════════════════════════════════════════════════════════
-- PROYECTOS
-- admin: todo
-- pm_domestico / coordinador: solo su zona
-- instalador: solo proyectos donde es instalador_id
--             o pertenece a la cuadrilla asignada
-- Borrado: solo admin
-- ════════════════════════════════════════════════════════════

CREATE POLICY "proyectos_select" ON proyectos
  FOR SELECT TO authenticated
  USING (
    get_my_rol() = 'admin'
    OR (get_my_rol() IN ('pm_domestico', 'coordinador') AND zona = get_my_zona())
    OR (get_my_rol() = 'instalador' AND (
      instalador_id = my_usuario_id()
      OR cuadrilla_id IN (SELECT id FROM cuadrillas WHERE responsable_id = my_usuario_id())
      OR cuadrilla_id IN (SELECT cuadrilla_id FROM cuadrilla_miembros WHERE usuario_id = my_usuario_id())
    ))
  );

CREATE POLICY "proyectos_insert" ON proyectos
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_rol() = 'admin'
    OR (get_my_rol() = 'pm_domestico' AND zona = get_my_zona())
  );

CREATE POLICY "proyectos_update" ON proyectos
  FOR UPDATE TO authenticated
  USING (
    get_my_rol() = 'admin'
    OR (get_my_rol() IN ('pm_domestico', 'coordinador') AND zona = get_my_zona())
    OR (get_my_rol() = 'instalador' AND (
      instalador_id = my_usuario_id()
      OR cuadrilla_id IN (SELECT id FROM cuadrillas WHERE responsable_id = my_usuario_id())
      OR cuadrilla_id IN (SELECT cuadrilla_id FROM cuadrilla_miembros WHERE usuario_id = my_usuario_id())
    ))
  )
  WITH CHECK (
    get_my_rol() = 'admin'
    OR (get_my_rol() IN ('pm_domestico', 'coordinador') AND zona = get_my_zona())
    OR (get_my_rol() = 'instalador' AND (
      instalador_id = my_usuario_id()
      OR cuadrilla_id IN (SELECT id FROM cuadrillas WHERE responsable_id = my_usuario_id())
      OR cuadrilla_id IN (SELECT cuadrilla_id FROM cuadrilla_miembros WHERE usuario_id = my_usuario_id())
    ))
  );

CREATE POLICY "proyectos_delete" ON proyectos
  FOR DELETE TO authenticated
  USING (get_my_rol() = 'admin');

-- ════════════════════════════════════════════════════════════
-- BITÁCORA (inmutable por diseño)
-- Lectura: misma lógica que proyectos
-- Insert: cualquier usuario activo (instalador cierra reporte, pm agrega nota)
-- Update/Delete: nadie
-- ════════════════════════════════════════════════════════════

CREATE POLICY "bitacora_select" ON bitacora
  FOR SELECT TO authenticated
  USING (
    get_my_rol() = 'admin'
    OR (get_my_rol() IN ('pm_domestico', 'coordinador') AND proyecto_id IN (
      SELECT id FROM proyectos WHERE zona = get_my_zona()
    ))
    OR (get_my_rol() = 'instalador' AND proyecto_id IN (
      SELECT id FROM proyectos WHERE
        instalador_id = my_usuario_id()
        OR cuadrilla_id IN (SELECT id FROM cuadrillas WHERE responsable_id = my_usuario_id())
        OR cuadrilla_id IN (SELECT cuadrilla_id FROM cuadrilla_miembros WHERE usuario_id = my_usuario_id())
    ))
  );

CREATE POLICY "bitacora_insert" ON bitacora
  FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() IS NOT NULL);

CREATE POLICY "bitacora_no_update" ON bitacora
  FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "bitacora_no_delete" ON bitacora
  FOR DELETE TO authenticated
  USING (false);

-- ════════════════════════════════════════════════════════════
-- CORTES_PAGO (datos financieros de cuadrilla)
-- Lectura: admin, pm, coordinador
-- Escritura: admin y pm
-- Borrado: solo admin
-- ════════════════════════════════════════════════════════════

CREATE POLICY "cortes_pago_select" ON cortes_pago
  FOR SELECT TO authenticated
  USING (get_my_rol() IN ('admin', 'pm_domestico', 'coordinador'));

CREATE POLICY "cortes_pago_insert" ON cortes_pago
  FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() IN ('admin', 'pm_domestico'));

CREATE POLICY "cortes_pago_update" ON cortes_pago
  FOR UPDATE TO authenticated
  USING (get_my_rol() IN ('admin', 'pm_domestico'))
  WITH CHECK (get_my_rol() IN ('admin', 'pm_domestico'));

CREATE POLICY "cortes_pago_delete" ON cortes_pago
  FOR DELETE TO authenticated
  USING (get_my_rol() = 'admin');

-- ════════════════════════════════════════════════════════════
-- VUELTAS
-- Lectura: admin, pm, coordinador
-- Escritura: admin y pm
-- ════════════════════════════════════════════════════════════

CREATE POLICY "vueltas_select" ON vueltas
  FOR SELECT TO authenticated
  USING (get_my_rol() IN ('admin', 'pm_domestico', 'coordinador'));

CREATE POLICY "vueltas_insert" ON vueltas
  FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() IN ('admin', 'pm_domestico'));

CREATE POLICY "vueltas_update" ON vueltas
  FOR UPDATE TO authenticated
  USING (get_my_rol() IN ('admin', 'pm_domestico'))
  WITH CHECK (get_my_rol() IN ('admin', 'pm_domestico'));

CREATE POLICY "vueltas_delete" ON vueltas
  FOR DELETE TO authenticated
  USING (get_my_rol() = 'admin');

-- ════════════════════════════════════════════════════════════
-- CORTE_KPIS
-- Lectura: admin, pm, coordinador
-- Escritura: admin y pm
-- ════════════════════════════════════════════════════════════

CREATE POLICY "corte_kpis_select" ON corte_kpis
  FOR SELECT TO authenticated
  USING (get_my_rol() IN ('admin', 'pm_domestico', 'coordinador'));

CREATE POLICY "corte_kpis_insert" ON corte_kpis
  FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() IN ('admin', 'pm_domestico'));

CREATE POLICY "corte_kpis_update" ON corte_kpis
  FOR UPDATE TO authenticated
  USING (get_my_rol() IN ('admin', 'pm_domestico'))
  WITH CHECK (get_my_rol() IN ('admin', 'pm_domestico'));

CREATE POLICY "corte_kpis_delete" ON corte_kpis
  FOR DELETE TO authenticated
  USING (get_my_rol() = 'admin');
