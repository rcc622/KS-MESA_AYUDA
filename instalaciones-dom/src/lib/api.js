import { supabase } from './supabase';

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
  const { data, error } = await supabase.from('proyectos').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarProyecto(id, payload) {
  const { data, error } = await supabase.from('proyectos').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
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
  const { data, error } = await supabase.from('cuadrillas').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarCuadrilla(id, payload) {
  const { data, error } = await supabase.from('cuadrillas').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ── REGLAS KPI ───────────────────────────────────────────────
export async function crearRegla(payload) {
  const { data, error } = await supabase.from('reglas_cuadrilla').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function eliminarRegla(id) {
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
  const { data, error } = await supabase.from('cortes_pago').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function agregarVuelta({ corte_id, concepto, monto }) {
  const { data, error } = await supabase.from('vueltas').insert({ corte_id, concepto, monto }).select().single();
  if (error) throw error;
  return data;
}

// ── IMPORTACIÓN ──────────────────────────────────────────────
export async function upsertProyectos(rows) {
  // upsert por folio_odoo
  const { data, error } = await supabase
    .from('proyectos')
    .upsert(rows, { onConflict: 'folio_odoo', ignoreDuplicates: false })
    .select();
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
