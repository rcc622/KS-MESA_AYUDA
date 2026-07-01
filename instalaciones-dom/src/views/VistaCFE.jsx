import { useState, useEffect } from 'react';
import { getTramitesCFE, crearTramiteCFE, actualizarTramiteCFE, getProyectos, agregarBitacora, mensajeError } from '../lib/api';
import Modal from '../components/Modal';

const TIPOS = [
  { v: 'uvie',                 l: 'UVIE' },
  { v: 'uiie',                 l: 'UIIE' },
  { v: 'rmu',                  l: 'RMU' },
  { v: 'interconexion',        l: 'Interconexión' },
  { v: 'medidor_bidireccional', l: 'Medidor bidireccional' },
];
const TIPO_LABEL = Object.fromEntries(TIPOS.map(t => [t.v, t.l]));

const ESTADOS = [
  { v: 'solicitud',   l: 'Solicitud',    bg: '#EAF2F9', color: '#1F4E79' },
  { v: 'en_revision', l: 'En revisión',  bg: '#FFF8EC', color: '#92400E' },
  { v: 'inspeccion',  l: 'Inspección',   bg: '#EDE9FE', color: '#6B4E9B' },
  { v: 'aprobado',    l: 'Aprobado',     bg: '#F0FBF4', color: '#2E9E5B' },
  { v: 'rechazado',   l: 'Rechazado',    bg: '#FEE2E2', color: '#DC2626' },
  { v: 'completado',  l: 'Completado',   bg: '#F0FBF4', color: '#065F46' },
];
const ESTADO_INFO = Object.fromEntries(ESTADOS.map(e => [e.v, e]));

const hoyISO = () => new Date().toISOString().slice(0, 10);
const diasDesde = (fecha) => {
  if (!fecha) return null;
  const d = Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
  return isNaN(d) ? null : d;
};

const FORM_VACIO = { proyecto_id: '', tipo: 'uvie', estado: 'solicitud', folio_cfe: '', fecha_solicitud: hoyISO(), accion_requerida: '', notas: '' };

export default function VistaCFE({ usuarioActual }) {
  const [tramites, setTramites] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [modalCrear, setModalCrear] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const esGestor = ['admin', 'pm_domestico', 'coordinador'].includes(usuarioActual?.rol);

  const cargar = async () => {
    setLoading(true); setError('');
    try {
      const [t, p] = await Promise.all([getTramitesCFE(), getProyectos()]);
      setTramites(t); setProyectos(p);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const crear = async () => {
    if (!form.proyecto_id) { alert('Elige un proyecto.'); return; }
    setGuardando(true);
    try {
      await crearTramiteCFE({
        ...form,
        responsable_id: usuarioActual?.id ?? null,
        folio_cfe: form.folio_cfe || null,
        accion_requerida: form.accion_requerida || null,
        notas: form.notas || null,
      });
      setModalCrear(false); setForm(FORM_VACIO);
      cargar();
    } catch (e) { alert(mensajeError(e)); }
    finally { setGuardando(false); }
  };

  const cambiarEstado = async (t, estado) => {
    try {
      const patch = { estado };
      if (estado === 'inspeccion' && !t.fecha_inspeccion) patch.fecha_inspeccion = hoyISO();
      if (estado === 'aprobado' && !t.fecha_aprobacion) patch.fecha_aprobacion = hoyISO();
      await actualizarTramiteCFE(t.id, patch);
      cargar();
    } catch (e) { alert(mensajeError(e)); }
  };

  // Marca que llegó el medidor bidireccional → alerta a Cobranza ("ya se puede cobrar").
  const marcarMedidor = async (t) => {
    if (!confirm('¿Confirmas que el medidor bidireccional ya LLEGÓ? Esto avisa a Cobranza que ya se puede cobrar.')) return;
    try {
      await actualizarTramiteCFE(t.id, {
        medidor_bidireccional_llego: true,
        fecha_medidor: hoyISO(),
        cobranza_alertada: true,
        estado: 'completado',
      });
      if (t.proyecto_id) {
        await agregarBitacora({
          proyecto_id: t.proyecto_id, tipo: 'cfe',
          descripcion: '🔔 Medidor bidireccional llegó — Cobranza puede cobrar (hito 6.1).',
          usuario_id: usuarioActual?.id ?? null,
        });
      }
      cargar();
    } catch (e) { alert(mensajeError(e)); }
  };

  // Instalación terminada → se refleja aquí: inicia el trámite CFE (hito "CFE iniciado").
  const iniciarCFE = async (p) => {
    try {
      await crearTramiteCFE({
        proyecto_id: p.id, tipo: 'interconexion', estado: 'solicitud',
        fecha_solicitud: hoyISO(), responsable_id: usuarioActual?.id ?? null,
        accion_requerida: 'Iniciar trámite ante CFE (instalación terminada).',
      });
      await agregarBitacora({
        proyecto_id: p.id, tipo: 'cfe',
        descripcion: '📋 Trámite CFE iniciado (la instalación quedó terminada).',
        usuario_id: usuarioActual?.id ?? null,
      });
      cargar();
    } catch (e) { alert(mensajeError(e)); }
  };

  if (loading) return <div className="page-body"><div className="empty-state"><div className="es-icon">⏳</div><p>Cargando trámites CFE…</p></div></div>;

  const activos = tramites.filter(t => !['completado', 'rechazado'].includes(t.estado));
  const alertasCobranza = tramites.filter(t => t.cobranza_alertada).length;
  // Instalaciones TERMINADAS que aún no tienen ningún trámite CFE → "por iniciar".
  const conTramite = new Set(tramites.map(t => t.proyecto_id));
  const porIniciar = proyectos.filter(p => p.estatus === 'completado' && !conTramite.has(p.id));
  const k = {
    activos: activos.length,
    inspeccion: tramites.filter(t => t.estado === 'inspeccion').length,
    aprobados: tramites.filter(t => t.estado === 'aprobado').length,
    medidores: alertasCobranza,
  };

  const lista = filtro === 'todos' ? tramites
    : filtro === 'activos' ? activos
    : tramites.filter(t => t.estado === filtro);

  return (
    <>
      <div className="page-header">
        <div><h2>🔌 CFE / Gestoría</h2><div className="sub">Trámites ante CFE · UVIE · UIIE · interconexión · medidor bidireccional</div></div>
        {esGestor && <button className="btn btn-primary" onClick={() => { setForm(FORM_VACIO); setModalCrear(true); }}>+ Nuevo trámite</button>}
      </div>

      <div className="page-body">
        {error && <div className="card mb-16"><div className="card-body" style={{ color: 'var(--rojo)' }}>⚠️ {error}<div className="text-xs text-gray" style={{ marginTop: 6 }}>Si dice que falta la tabla, corre <code>sql/migracion_cfe.sql</code> en Supabase.</div></div></div>}

        <div className="stats-row">
          <div className="stat-card"><div className="stat-val">{k.activos}</div><div className="stat-label">Trámites activos</div></div>
          <div className="stat-card"><div className="stat-val">{k.inspeccion}</div><div className="stat-label">En inspección</div></div>
          <div className="stat-card verde"><div className="stat-val">{k.aprobados}</div><div className="stat-label">Aprobados</div></div>
          <div className="stat-card ambar"><div className="stat-val">{k.medidores}</div><div className="stat-label">Medidores → Cobranza</div></div>
        </div>

        {alertasCobranza > 0 && (
          <div style={{ background: '#FFF8EC', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', margin: '4px 0 16px', fontSize: 13, color: '#92400E' }}>
            🔔 <strong>{alertasCobranza}</strong> medidor(es) bidireccional(es) marcados como llegados → Cobranza puede cobrar (hito 6.1). <span className="text-xs">La integración con TOKU llega en una fase posterior.</span>
          </div>
        )}

        {porIniciar.length > 0 && (
          <div className="card mb-16" style={{ borderColor: '#93C5FD' }}>
            <div className="card-header" style={{ background: '#EFF6FF' }}>
              <h3>🔨 Instalaciones terminadas · por iniciar CFE ({porIniciar.length})</h3>
            </div>
            <div className="card-body">
              <div className="text-xs text-gray" style={{ marginBottom: 10 }}>
                Estas instalaciones ya se terminaron. Inicia su trámite ante CFE (hito "CFE iniciado").
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {porIniciar.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--borde)', paddingTop: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.cliente} <span className="text-xs text-gray">· {p.folio}</span></div>
                      <div className="text-xs text-gray">{p.zona}{p.fecha_instalacion ? ` · instalado ${p.fecha_instalacion}` : ''}</div>
                    </div>
                    {esGestor && <button className="btn btn-primary btn-sm" onClick={() => iniciarCFE(p)}>📋 Iniciar trámite CFE</button>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {[{ v: 'todos', l: 'Todos' }, { v: 'activos', l: 'Activos' }, ...ESTADOS.map(e => ({ v: e.v, l: e.l }))].map(f => (
            <button key={f.v} className={`btn btn-sm ${filtro === f.v ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFiltro(f.v)}>{f.l}</button>
          ))}
        </div>

        {lista.length === 0 ? (
          <div className="empty-state"><div className="es-icon">🔌</div><p>Sin trámites {filtro !== 'todos' ? 'en este filtro' : 'todavía'}.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {lista.map(t => {
              const e = ESTADO_INFO[t.estado] || ESTADOS[0];
              const dias = diasDesde(t.fecha_solicitud);
              return (
                <div key={t.id} className="card"><div className="card-body" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{t.proyecto?.cliente || 'Proyecto'} <span className="text-xs text-gray">· {t.proyecto?.folio}</span></div>
                      <div className="text-sm" style={{ marginTop: 2 }}>{TIPO_LABEL[t.tipo] || t.tipo}{t.folio_cfe ? ` · CFE ${t.folio_cfe}` : ''}{t.proyecto?.zona ? ` · ${t.proyecto.zona}` : ''}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: e.bg, color: e.color, whiteSpace: 'nowrap' }}>{e.l}</span>
                  </div>

                  {t.accion_requerida && <div className="text-sm" style={{ marginTop: 8, color: '#92400E', background: '#FEF3C7', borderRadius: 6, padding: '6px 10px' }}>⚠️ {t.accion_requerida}</div>}

                  <div className="text-xs text-gray" style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {dias != null && <span>⏱️ {dias} día(s) en trámite</span>}
                    {t.responsable?.nombre && <span>👤 {t.responsable.nombre}</span>}
                    {t.cobranza_alertada && <span style={{ color: 'var(--verde)', fontWeight: 700 }}>✅ Cobranza avisada</span>}
                  </div>

                  {esGestor && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, borderTop: '1px solid var(--borde)', paddingTop: 10 }}>
                      <select value={t.estado} onChange={ev => cambiarEstado(t, ev.target.value)} style={{ fontSize: 12, padding: '5px 8px', borderRadius: 8, border: '1px solid var(--borde)' }}>
                        {ESTADOS.map(es => <option key={es.v} value={es.v}>{es.l}</option>)}
                      </select>
                      {t.tipo === 'medidor_bidireccional' && !t.medidor_bidireccional_llego && (
                        <button className="btn btn-green btn-sm" onClick={() => marcarMedidor(t)}>🔔 Medidor llegó → avisar a Cobranza</button>
                      )}
                    </div>
                  )}
                </div></div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={modalCrear} onClose={() => setModalCrear(false)} title="Nuevo trámite CFE"
        footer={<>
          <button className="btn btn-outline" onClick={() => setModalCrear(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={crear} disabled={guardando}>{guardando ? 'Guardando…' : 'Crear trámite'}</button>
        </>}>
        <div className="form-group">
          <label>Proyecto *</label>
          <select value={form.proyecto_id} onChange={e => setForm({ ...form, proyecto_id: e.target.value })}>
            <option value="">— Elige un proyecto —</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.folio} · {p.cliente}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Tipo de trámite</label>
          <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
            {TIPOS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Estado</label>
          <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
            {ESTADOS.map(es => <option key={es.v} value={es.v}>{es.l}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Folio CFE (opcional)</label>
          <input value={form.folio_cfe} onChange={e => setForm({ ...form, folio_cfe: e.target.value })} placeholder="Ej. UVIE-2026-..." />
        </div>
        <div className="form-group">
          <label>Fecha de solicitud</label>
          <input type="date" value={form.fecha_solicitud} onChange={e => setForm({ ...form, fecha_solicitud: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Acción requerida (opcional)</label>
          <input value={form.accion_requerida} onChange={e => setForm({ ...form, accion_requerida: e.target.value })} placeholder="Ej. Falta acta firmada" />
        </div>
        <div className="form-group">
          <label>Notas (opcional)</label>
          <textarea rows={2} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
        </div>
      </Modal>
    </>
  );
}
