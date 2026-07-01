import { supabase } from './supabase';

// ── CONTROL DE ACCESO ─────────────────────────────────────────
// El usuario actual se registra desde App.jsx al hacer login.
// Las funciones sensibles llaman a requireRol() antes de tocar Supabase.
let _currentUser = null;

export function setCurrentUser(usuario) {
  _currentUser = usuario;
}

function requireRol(...rolesPermitidos) {
  const rol = _currentUser?.rol;
  if (!rol || !rolesPermitidos.includes(rol)) {
    throw new Error('No tienes permiso para esta acción.');
  }
}

// ── RESPALDO GENERAL ──────────────────────────────────────────
// Tablas a respaldar (se amplía conforme se agreguen módulos).
const TABLAS_RESPALDO = [
  'usuarios', 'cuadrillas', 'cuadrilla_miembros', 'reglas_cuadrilla',
  'proyectos', 'bitacora', 'cortes_pago', 'vueltas', 'corte_kpis',
];

// Descarga toda la data de cada tabla en un objeto. Errores por tabla no
// abortan el respaldo (se listan aparte).
export async function respaldoGeneral() {
  requireRol('admin');
  const tablas = {};
  const errores = [];
  for (const t of TABLAS_RESPALDO) {
    const { data, error } = await supabase.from(t).select('*');
    if (error) { errores.push(`${t}: ${error.message}`); continue; }
    tablas[t] = data || [];
  }
  return { generado_en: new Date().toISOString(), version: 1, tablas, errores };
}

// Sube el respaldo al bucket "respaldos" de Supabase Storage (si existe).
export async function subirRespaldoStorage(nombre, blob) {
  const { error } = await supabase.storage.from('respaldos').upload(nombre, blob, {
    contentType: 'application/json', upsert: true,
  });
  if (error) throw error;
  return true;
}

// Sube evidencia (foto o PDF del reporte) al bucket "evidencias".
export async function subirEvidencia(path, blob) {
  const { error } = await supabase.storage.from('evidencias').upload(path, blob, {
    contentType: blob.type || 'application/octet-stream', upsert: true,
  });
  if (error) throw error;
  return true;
}

// ── PROYECTOS ─────────────────────────────────────────────────
export async function getProyectos({ zona, estatus } = {}) {
  let q = supabase
    .from('proyectos')
    .select('*, cuadrilla:cuadrillas(*), instalador:usuarios!proyectos_instalador_id_fkey(id,nombre,zona)')
    .order('created_at', { ascending: false });
  if (zona)    q = q.eq('zona', zona);
  if (estatus) q = q.eq('estatus', estatus);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getProyecto(id) {
  const { data, error } = await supabase
    .from('proyectos')
    .select('*, cuadrilla:cuadrillas(*), instalador:usuarios!proyectos_instalador_id_fkey(id,nombre,zona)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function crearProyecto(payload) {
  requireRol('admin', 'pm_domestico');
  const { data, error } = await supabase.from('proyectos').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarProyecto(id, payload) {
  const { data, error } = await supabase.from('proyectos').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// Elimina proyectos de la base (solo admin). Borra en cascada su bitácora y trámites CFE
// (ON DELETE CASCADE). Pensado para limpiar datos durante desarrollo/pruebas.
export async function eliminarProyectos(ids) {
  requireRol('admin');
  if (!ids?.length) return;
  const { error } = await supabase.from('proyectos').delete().in('id', ids);
  if (error) throw error;
}

// ── BITÁCORA ─────────────────────────────────────────────────
export async function getBitacora(proyecto_id) {
  const { data, error } = await supabase
    .from('bitacora')
    .select('*, usuario:usuarios(id,nombre)')
    .eq('proyecto_id', proyecto_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Log global: todos los movimientos de todos los proyectos (con proyecto + usuario).
export async function getBitacoraGlobal({ limite = 100 } = {}) {
  const { data, error } = await supabase
    .from('bitacora')
    .select('*, usuario:usuarios(id,nombre), proyecto:proyectos(folio,cliente,zona)')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data;
}

export async function agregarBitacora({ proyecto_id, tipo, descripcion, usuario_id }) {
  const { data, error } = await supabase
    .from('bitacora')
    .insert({ proyecto_id, tipo, descripcion, usuario_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── CUADRILLAS ───────────────────────────────────────────────
export async function getCuadrillas({ zona, activa } = {}) {
  let q = supabase
    .from('cuadrillas')
    .select('*, pm:usuarios!cuadrillas_pm_id_fkey(id,nombre,zona), reglas:reglas_cuadrilla(*)')
    .order('nombre');
  if (zona)          q = q.eq('zona', zona);
  if (activa != null) q = q.eq('activa', activa);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function crearCuadrilla(payload) {
  requireRol('admin', 'pm_domestico');
  const { data, error } = await supabase.from('cuadrillas').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarCuadrilla(id, payload) {
  requireRol('admin', 'pm_domestico');
  const { data, error } = await supabase.from('cuadrillas').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ── REGLAS KPI ───────────────────────────────────────────────
export async function crearRegla(payload) {
  requireRol('admin');
  const { data, error } = await supabase.from('reglas_cuadrilla').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function eliminarRegla(id) {
  requireRol('admin');
  const { error } = await supabase.from('reglas_cuadrilla').delete().eq('id', id);
  if (error) throw error;
}

// ── USUARIOS ─────────────────────────────────────────────────
export async function getUsuarios({ rol, zona } = {}) {
  let q = supabase.from('usuarios').select('*').eq('activo', true).order('nombre');
  if (rol)  q = q.eq('rol', rol);
  if (zona) q = q.eq('zona', zona);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getTodosUsuarios() {
  requireRol('admin');
  const { data, error } = await supabase.from('usuarios').select('*').order('nombre');
  if (error) throw error;
  return data;
}

export async function crearUsuarioPerfil(payload) {
  requireRol('admin');
  const { data, error } = await supabase.from('usuarios').insert(payload).select().single();
  if (error) throw error;
  return data;
}

// Crea la cuenta de acceso (Supabase Auth) y el perfil en `usuarios` en un
// solo paso, vía la Edge Function `crear-usuario` (requiere la service_role
// key, que solo vive en el backend). Evita que el admin tenga que entrar a
// Supabase → Authentication → Users manualmente.
export async function crearUsuarioConCuenta({ nombre, email, password, rol, zona }) {
  requireRol('admin');
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crear-usuario`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ nombre, email, password, rol, zona: zona || null }),
  });
  const json = await resp.json();
  if (!resp.ok || !json.ok) throw new Error(json.error || 'No se pudo crear el usuario.');
  return json.usuario;
}

export async function actualizarUsuarioPerfil(id, payload) {
  requireRol('admin');
  const { data, error } = await supabase.from('usuarios').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// Traduce errores técnicos de Postgres/PostgREST a mensajes claros en español.
export function mensajeError(e) {
  const m = e?.message || String(e || '');
  if (/duplicate key/i.test(m) && /folio/i.test(m)) return 'Ya existe un proyecto con ese folio. Usa un folio diferente.';
  if (/duplicate key/i.test(m)) return 'Ese registro ya existe (valor duplicado).';
  const col = m.match(/Could not find the '([^']+)' column/);
  if (col) return `Falta la columna "${col[1]}" en la base de datos. Corre la migración SQL (sql/migracion_completa.sql) y vuelve a intentar.`;
  if (/invalid input syntax for type date/i.test(m)) return 'Hay una fecha inválida. Revisa los campos de fecha.';
  if (/invalid input syntax for type (integer|numeric)/i.test(m)) return 'Hay un número inválido. Revisa los campos numéricos.';
  if (/violates foreign key/i.test(m)) return 'Un dato relacionado no existe (referencia inválida).';
  if (/violates check constraint/i.test(m)) return 'Un valor no es válido para ese campo.';
  if (/violates not-null constraint/i.test(m)) return 'Falta un campo obligatorio.';
  if (/JWT|permission denied|row-level security|RLS/i.test(m)) return 'No tienes permiso para esta acción.';
  return 'No se pudo guardar: ' + m;
}

// Mapea el usuario logueado (Supabase Auth) a su fila en la tabla `usuarios`
// por email. Devuelve null si no existe (la bitácora acepta usuario_id null).
export async function getUsuarioPorEmail(email) {
  if (!email) return null;
  const { data, error } = await supabase.from('usuarios').select('*').eq('email', email).maybeSingle();
  if (error) throw error;
  return data;
}

// ── CORTES DE PAGO ───────────────────────────────────────────
export async function getCortes({ semana_inicio } = {}) {
  let q = supabase
    .from('cortes_pago')
    .select('*, cuadrilla:cuadrillas(*), vueltas(*), kpis:corte_kpis(*)')
    .order('semana_inicio', { ascending: false });
  if (semana_inicio) q = q.eq('semana_inicio', semana_inicio);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function actualizarCorte(id, payload) {
  requireRol('admin', 'pm_domestico');
  const { data, error } = await supabase.from('cortes_pago').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function agregarVuelta({ corte_id, concepto, monto }) {
  requireRol('admin', 'pm_domestico');
  const { data, error } = await supabase.from('vueltas').insert({ corte_id, concepto, monto }).select().single();
  if (error) throw error;
  return data;
}

// ── IMPORTACIÓN ──────────────────────────────────────────────
export async function upsertProyectos(rows) {
  requireRol('admin', 'pm_domestico');
  const { data, error } = await supabase
    .from('proyectos')
    .upsert(rows, { onConflict: 'folio', ignoreDuplicates: false })   // folio es UNIQUE; folio_odoo no
    .select();
  if (error) throw error;
  return data;
}

// ── CFE / GESTORÍA ───────────────────────────────────────────
export async function getTramitesCFE({ estado, tipo } = {}) {
  let q = supabase
    .from('cfe_tramites')
    .select('*, proyecto:proyectos(folio,cliente,zona,maps_url), responsable:usuarios!cfe_tramites_responsable_id_fkey(id,nombre)')
    .order('created_at', { ascending: false });
  if (estado) q = q.eq('estado', estado);
  if (tipo)   q = q.eq('tipo', tipo);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function crearTramiteCFE(payload) {
  requireRol('admin', 'pm_domestico', 'coordinador');
  const { data, error } = await supabase.from('cfe_tramites').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarTramiteCFE(id, payload) {
  requireRol('admin', 'pm_domestico', 'coordinador');
  const { data, error } = await supabase.from('cfe_tramites').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ── SEMANAS disponibles para selector de cortes ──────────────
export async function getSemanas() {
  const { data, error } = await supabase
    .from('cortes_pago')
    .select('semana_inicio, semana_fin')
    .order('semana_inicio', { ascending: false });
  if (error) throw error;
  // deduplicar
  const seen = new Set();
  return data.filter(r => {
    const k = r.semana_inicio;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
