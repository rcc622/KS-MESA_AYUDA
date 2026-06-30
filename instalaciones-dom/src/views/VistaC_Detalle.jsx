import { useState, useEffect, useCallback } from 'react';
import { getBitacora, getProyecto, getCuadrillas, agregarBitacora, actualizarProyecto, mensajeError } from '../lib/api';
import { sincronizarEventoCalendar } from '../lib/gcal';
import EstatusBadge from '../components/EstatusBadge';
import SLABadge from '../components/SLABadge';
import Modal from '../components/Modal';

const FACTORES = {
  interno: { label: 'Interno (KENET)', motivos: [['material', 'Falta de material'], ['instalador', 'Instalador / cuadrilla']] },
  externo: { label: 'Externo',         motivos: [['clima', 'Clima'], ['cliente', 'Cliente']] },
};

const TIPOS_BITACORA = {
  agenda:   { label: 'Agendado',    icon: '📅', color: '#1F4E79' },
  inicio:   { label: 'Inicio',      icon: '🔧', color: '#F5A623' },
  cierre:   { label: 'Completado',  icon: '✅', color: '#2E9E5B' },
  reagenda: { label: 'Reagenda',    icon: '🔄', color: '#6B4E9B' },
  nota:     { label: 'Nota',        icon: '📝', color: '#6B7280' },
  import:   { label: 'Import',      icon: '📤', color: '#0891B2' },
};

const WATTS_POR_PANEL = 600;

export default function VistaC_Detalle({ proyecto, setVista, setProyectoSeleccionado, usuarioActual }) {
  const [bitacora, setBitacora] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNota, setModalNota] = useState(false);
  const [nota, setNota] = useState('');
  const [tipoNota, setTipoNota] = useState('nota');
  const [guardando, setGuardando] = useState(false);
  const [modalFecha, setModalFecha] = useState(false);
  const [fechaAgenda, setFechaAgenda] = useState('');
  const [fechaMostrada, setFechaMostrada] = useState(proyecto?.fecha_agenda || null);
  const [modalReag, setModalReag] = useState(false);
  const [reagFecha, setReagFecha] = useState('');
  const [reagFactor, setReagFactor] = useState('');
  const [reagMotivo, setReagMotivo] = useState('');
  const [reagNota, setReagNota] = useState('');
  const [cuadrillas, setCuadrillas] = useState([]);
  const [modalEditar, setModalEditar] = useState(false);
  const [formEdit, setFormEdit] = useState(null);
  const esAdmin = usuarioActual?.rol === 'admin';

  const cargarBitacora = useCallback(async () => {
    if (!proyecto) return;
    setFechaMostrada(proyecto.fecha_agenda || null);
    setLoading(true);
    try {
      const data = await getBitacora(proyecto.id);
      setBitacora(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [proyecto]);

  useEffect(() => { cargarBitacora(); }, [cargarBitacora]);
  useEffect(() => { getCuadrillas({ activa: true }).then(setCuadrillas).catch(() => {}); }, []);

  const refrescar = async () => {
    try { const fresh = await getProyecto(proyecto.id); setProyectoSeleccionado?.(fresh); } catch (e) { console.error(e); }
  };

  if (!proyecto) {
    return (
      <>
        <div className="page-header"><h2>📋 Detalle de Proyecto</h2></div>
        <div className="page-body">
          <div className="empty-state">
            <div className="es-icon">📋</div>
            <p>Selecciona un proyecto desde la Agenda para ver su detalle.</p>
            <button className="btn btn-primary mt-16" onClick={() => setVista('agenda')}>Ir a Agenda</button>
          </div>
        </div>
      </>
    );
  }

  const agregarNota = async () => {
    if (!nota.trim()) return;
    setGuardando(true);
    try {
      await agregarBitacora({
        proyecto_id: proyecto.id,
        tipo: tipoNota,
        descripcion: nota,
        usuario_id: usuarioActual?.id ?? null,
      });
      setNota('');
      setModalNota(false);
      cargarBitacora();

      if (tipoNota === 'cierre') {
        await actualizarProyecto(proyecto.id, { estatus: 'completado', fecha_instalacion: new Date().toISOString().slice(0, 10) });
      } else if (tipoNota === 'inicio') {
        await actualizarProyecto(proyecto.id, { estatus: 'en_progreso' });
      }
    } catch (e) {
      alert(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const handleAgendarFecha = async () => {
    if (!fechaAgenda) return;
    setGuardando(true);
    try {
      await actualizarProyecto(proyecto.id, {
        fecha_agenda: fechaAgenda,
        estatus: 'agendado',   // al agendar/cambiar fecha el proyecto queda agendado (no "en progreso")
        dias_en_etapa: 0,
      });
      await agregarBitacora({
        proyecto_id: proyecto.id,
        tipo: 'agenda',
        descripcion: `Fecha de instalación agendada: ${fechaAgenda}`,
        usuario_id: usuarioActual?.id ?? null,
      });
      setFechaMostrada(fechaAgenda);
      setModalFecha(false);
      setFechaAgenda('');
      cargarBitacora();
      refrescar();
      // Crear o actualizar evento en Google Calendar del responsable de la cuadrilla
      const accionCal = proyecto.gcal_event_id ? 'actualizar' : 'crear';
      sincronizarEventoCalendar(proyecto.id, accionCal);
    } catch (e) {
      alert(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const abrirEditar = () => {
    const p = proyecto;
    setFormEdit({
      cliente: p.cliente || '', telefono: p.telefono || '', direccion: p.direccion || '', maps_url: p.maps_url || '',
      zona: p.zona || 'MTY', folio_odoo: p.folio_odoo || '', cuadrilla_id: p.cuadrilla_id || '',
      paneles: p.paneles ?? '', panel_potencia_w: p.panel_potencia_w ?? '', panel_marca: p.panel_marca || '',
      inversor_tipo: p.inversor_tipo || '', inversor_cantidad: p.inversor_cantidad ?? '',
      inversor_capacidad_kw: p.inversor_capacidad_kw ?? '', inversor_marca: p.inversor_marca || '',
      notas: p.notas || '',
    });
    setModalEditar(true);
  };

  const handleEditar = async () => {
    if (!formEdit?.cliente?.trim()) return;
    setGuardando(true);
    try {
      const paneles = formEdit.paneles ? parseInt(formEdit.paneles) : null;
      await actualizarProyecto(proyecto.id, {
        cliente: formEdit.cliente,
        telefono: formEdit.telefono || null,
        direccion: formEdit.direccion || null,
        maps_url: formEdit.maps_url || null,
        zona: formEdit.zona,
        folio_odoo: formEdit.folio_odoo || null,
        cuadrilla_id: formEdit.cuadrilla_id || null,
        paneles,
        kw: paneles ? (paneles * WATTS_POR_PANEL) / 1000 : null,
        panel_potencia_w: formEdit.panel_potencia_w ? parseInt(formEdit.panel_potencia_w) : null,
        panel_marca: formEdit.panel_marca || null,
        inversor_tipo: formEdit.inversor_tipo || null,
        inversor_cantidad: formEdit.inversor_cantidad ? parseInt(formEdit.inversor_cantidad) : null,
        inversor_capacidad_kw: formEdit.inversor_capacidad_kw ? parseFloat(formEdit.inversor_capacidad_kw) : null,
        inversor_marca: formEdit.inversor_marca || null,
        notas: formEdit.notas || null,
      });
      await agregarBitacora({ proyecto_id: proyecto.id, tipo: 'nota', descripcion: 'Proyecto editado por admin (datos / equipo).', usuario_id: usuarioActual?.id ?? null });
      await refrescar();
      cargarBitacora();
      setModalEditar(false);
      // Si se cambió la cuadrilla y el proyecto ya tiene fecha, sincronizar el evento
      const cuadrillacambio = formEdit.cuadrilla_id !== (proyecto.cuadrilla_id || '');
      if (cuadrillacambio && proyecto.fecha_agenda) {
        const accionCal = proyecto.gcal_event_id ? 'actualizar' : 'crear';
        sincronizarEventoCalendar(proyecto.id, accionCal);
      }
    } catch (e) {
      alert(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const abrirReagendar = () => {
    setReagFecha(''); setReagFactor(''); setReagMotivo(''); setReagNota('');
    setModalReag(true);
  };

  const handleReagendar = async () => {
    if (!reagFecha || !reagFactor || !reagMotivo) return;
    setGuardando(true);
    try {
      const esExterno = reagFactor === 'externo';
      const enCurso = proyecto.estatus === 'en_progreso';
      const motivoLabel = FACTORES[reagFactor]?.motivos.find(m => m[0] === reagMotivo)?.[1] || reagMotivo;
      await actualizarProyecto(proyecto.id, {
        fecha_agenda: reagFecha,
        fecha_original: proyecto.fecha_original || fechaMostrada || proyecto.fecha_agenda,
        motivo_reagendo: reagNota || null,
        reagenda_factor: reagFactor,
        reagenda_motivo: reagMotivo,
        estatus: 'reagendado',
        dias_en_etapa: esExterno ? 0 : (proyecto.dias_en_etapa ?? 0),
      });
      await agregarBitacora({
        proyecto_id: proyecto.id,
        tipo: 'reagenda',
        descripcion: `Reagendado → ${reagFecha}. Factor ${reagFactor} · ${motivoLabel}${enCurso ? ' · movimiento de último minuto' : ''}${reagNota ? '. ' + reagNota : ''}. SLA: ${esExterno ? 'reinicia (no penaliza a KENET)' : 'conserva (cuenta contra KENET)'}.`,
        usuario_id: usuarioActual?.id ?? null,
      });
      setFechaMostrada(reagFecha);
      setModalReag(false);
      cargarBitacora();
      refrescar();
      // Actualizar evento en Google Calendar con la nueva fecha
      sincronizarEventoCalendar(proyecto.id, 'actualizar');
    } catch (e) {
      alert(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const cuadrilla = proyecto.cuadrilla;
  const instalador = proyecto.instalador;

  return (
    <>
      <div className="page-header">
        <div>
          <button onClick={() => setVista('agenda')} style={{ fontSize: 12, color: 'var(--gris-secundario)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 2 }}>
            ← Volver a Agenda
          </button>
          <h2>📋 {proyecto.folio}</h2>
          <div className="sub">{proyecto.cliente}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <EstatusBadge estatus={proyecto.estatus} fecha={fechaMostrada} />
          <button className="btn btn-outline btn-sm" onClick={() => setModalNota(true)}>+ Agregar nota</button>
        </div>
      </div>

      <div className="page-body">
        <div className="detalle-grid">
          <div>
            <div className="card mb-16">
              <div className="card-header">
                <h3>Información del proyecto</h3>
                <SLABadge dias={proyecto.dias_en_etapa} />
              </div>
              <div className="card-body">
                <div className="info-grid">
                  <div className="info-item"><div className="info-label">Folio KENET</div><div className="info-val text-blue">{proyecto.folio}</div></div>
                  <div className="info-item"><div className="info-label">OV Odoo</div><div className="info-val">{proyecto.folio_odoo || '—'}</div></div>
                  <div className="info-item"><div className="info-label">Zona</div><div className="info-val"><span className="badge badge-zona">{proyecto.zona}</span></div></div>
                  <div className="info-item"><div className="info-label">Paneles / kW</div><div className="info-val">{proyecto.paneles ?? '—'} pnl · {proyecto.kw ?? '—'} kW</div></div>
                  <div className="info-item"><div className="info-label">Fecha agenda</div><div className="info-val">{fechaMostrada || '—'}</div></div>
                  <div className="info-item"><div className="info-label">Fecha instalación</div><div className="info-val">{proyecto.fecha_instalacion || '—'}</div></div>
                  <div className="info-item" style={{ gridColumn: '1/-1' }}><div className="info-label">Dirección</div><div className="info-val" style={{ fontWeight: 400 }}>{proyecto.direccion || '—'}</div></div>
                  {proyecto.maps_url && <div className="info-item" style={{ gridColumn: '1/-1' }}><div className="info-label">Ubicación</div><div className="info-val"><a href={proyecto.maps_url} target="_blank" rel="noreferrer" className="text-blue" style={{ fontWeight: 600 }}>📍 Abrir en Google Maps</a></div></div>}
                </div>
                {proyecto.notas && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginTop: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 11, color: '#92400E' }}>NOTA: </span>{proyecto.notas}
                  </div>
                )}
              </div>
            </div>

            <div className="card mb-16">
              <div className="card-header"><h3>Cuadrilla asignada</h3></div>
              <div className="card-body">
                {cuadrilla ? (
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 32 }}>👷</div>
                    <div style={{ flex: 1 }}>
                      <div className="fw-700 mb-8">{cuadrilla.nombre}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span className={`badge badge-tipo-${cuadrilla.tipo}`}>{cuadrilla.tipo}</span>
                        <span className="badge badge-zona">{cuadrilla.zona}</span>
                        {cuadrilla.aplica_vueltas && <span className="badge" style={{ background: '#F0FBF4', color: '#065F46' }}>🚗 Vueltas activas</span>}
                      </div>
                      <div className="text-sm text-gray mt-8">Esquema: <strong>{cuadrilla.esquema_pago?.replace(/_/g, ' ')}</strong></div>
                    </div>
                    {instalador && <div style={{ textAlign: 'right' }}><div className="text-sm text-gray">Instalador reportista</div><div className="fw-600">{instalador.nombre}</div></div>}
                  </div>
                ) : (
                  <div className="text-gray text-sm">Sin cuadrilla asignada</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Bitácora inmutable</h3>
                <span className="text-xs text-gray">{bitacora.length} eventos</span>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-gray text-sm">Cargando…</div>
                ) : bitacora.length === 0 ? (
                  <div className="text-gray text-sm">Sin eventos registrados.</div>
                ) : (
                  <div className="timeline">
                    {bitacora.map(log => {
                      const tipo = TIPOS_BITACORA[log.tipo] || { label: log.tipo, icon: '📝', color: '#6B7280' };
                      return (
                        <div key={log.id} className="timeline-item">
                          <div className="timeline-dot" style={{ background: tipo.color }} />
                          <div className="timeline-fecha">
                            {log.created_at?.slice(0, 16).replace('T', ' ')} · {log.usuario?.nombre || '—'}
                            {' · '}<span style={{ color: tipo.color, fontWeight: 600, fontSize: 10 }}>{tipo.icon} {tipo.label}</span>
                          </div>
                          <div className="timeline-desc">{log.descripcion}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="card mb-16">
              <div className="card-header"><h3>Estado de pago (Odoo)</h3></div>
              <div className="card-body">
                <div style={{ fontSize: 11, color: 'var(--gris-secundario)', marginBottom: 12, padding: '6px 10px', background: '#F3F4F6', borderRadius: 6 }}>
                  ℹ️ Solo lectura — sincroniza desde Odoo
                </div>
                {[
                  { label: '1. Anticipo', ok: proyecto.anticipo_pagado, desc: 'Al cierre de contrato' },
                  { label: '2. Enganche', ok: proyecto.instalado_cobrado, desc: 'Al terminar instalación' },
                  { label: '3. Medidor BD', ok: proyecto.medidor_pagado, desc: 'Al instalar medidor bidireccional' },
                ].map(hito => (
                  <div key={hito.label} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--borde)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: hito.ok ? '#D1FAE5' : '#F3F4F6', color: hito.ok ? 'var(--verde)' : 'var(--gris-secundario)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      {hito.ok ? '✓' : '○'}
                    </div>
                    <div><div className="fw-600" style={{ fontSize: 13 }}>{hito.label}</div><div className="text-xs text-gray">{hito.desc}</div></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>Acciones rápidas</h3></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {esAdmin && (
                  <button className="btn btn-primary w-full" onClick={abrirEditar}>✏️ Editar proyecto</button>
                )}
                {esAdmin && (
                  <button className="btn btn-ambar w-full" onClick={() => { setFechaAgenda(fechaMostrada || ''); setModalFecha(true); }}>
                    📅 {fechaMostrada ? 'Cambiar fecha de agenda' : 'Agendar fecha'}
                  </button>
                )}
                <button className="btn btn-outline w-full" onClick={() => setModalNota(true)}>📝 Agregar nota</button>
                <button className="btn btn-outline w-full" onClick={abrirReagendar}>🔄 Reagendar</button>
                <hr className="divider" />
                <button className="btn btn-red w-full btn-sm" style={{ justifyContent: 'center' }}
                  onClick={async () => {
                    if (!confirm('¿Cancelar este proyecto?')) return;
                    await actualizarProyecto(proyecto.id, { estatus: 'cancelado' });
                    sincronizarEventoCalendar(proyecto.id, 'eliminar');
                    setVista('agenda');
                  }}>
                  ✕ Cancelar proyecto
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={modalEditar}
        onClose={() => setModalEditar(false)}
        title="Editar proyecto"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalEditar(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleEditar} disabled={!formEdit?.cliente?.trim() || guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </>
        }
      >
        {formEdit && (
          <>
            <div className="form-row">
              <div className="form-group"><label>Cliente</label><input value={formEdit.cliente} onChange={e => setFormEdit(f => ({ ...f, cliente: e.target.value }))} /></div>
              <div className="form-group"><label>Teléfono</label><input value={formEdit.telefono} onChange={e => setFormEdit(f => ({ ...f, telefono: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label>Dirección</label><input value={formEdit.direccion} onChange={e => setFormEdit(f => ({ ...f, direccion: e.target.value }))} /></div>
            <div className="form-group"><label>Link de Google Maps</label><input type="url" value={formEdit.maps_url} onChange={e => setFormEdit(f => ({ ...f, maps_url: e.target.value }))} placeholder="https://maps.app.goo.gl/…" /></div>
            <div className="form-row">
              <div className="form-group"><label>Zona</label>
                <select value={formEdit.zona} onChange={e => setFormEdit(f => ({ ...f, zona: e.target.value }))}>
                  {['MTY', 'SLT', 'TRC', 'MVA'].map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div className="form-group"><label>OV Odoo</label><input value={formEdit.folio_odoo} onChange={e => setFormEdit(f => ({ ...f, folio_odoo: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label>Cuadrilla</label>
              <select value={formEdit.cuadrilla_id} onChange={e => setFormEdit(f => ({ ...f, cuadrilla_id: e.target.value }))}>
                <option value="">Sin asignar</option>
                {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.zona})</option>)}
              </select>
            </div>

            <div className="form-section-label">Equipo</div>
            <div className="form-row">
              <div className="form-group"><label>Paneles</label><input type="number" value={formEdit.paneles} onChange={e => setFormEdit(f => ({ ...f, paneles: e.target.value }))} /></div>
              <div className="form-group"><label>Potencia por panel (W)</label><input type="number" value={formEdit.panel_potencia_w} onChange={e => setFormEdit(f => ({ ...f, panel_potencia_w: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label>Marca de panel</label><input value={formEdit.panel_marca} onChange={e => setFormEdit(f => ({ ...f, panel_marca: e.target.value }))} /></div>
            <div className="form-row">
              <div className="form-group"><label>Tipo de inversor</label>
                <select value={formEdit.inversor_tipo} onChange={e => setFormEdit(f => ({ ...f, inversor_tipo: e.target.value }))}>
                  <option value="">Selecciona…</option>
                  <option value="inversor">Inversor</option>
                  <option value="microinversor">Microinversor</option>
                </select>
              </div>
              <div className="form-group"><label>Cantidad de inversores</label><input type="number" value={formEdit.inversor_cantidad} onChange={e => setFormEdit(f => ({ ...f, inversor_cantidad: e.target.value }))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Capacidad del inversor (kW)</label><input type="number" step="0.1" value={formEdit.inversor_capacidad_kw} onChange={e => setFormEdit(f => ({ ...f, inversor_capacidad_kw: e.target.value }))} /></div>
              <div className="form-group"><label>Marca de inversor</label><input value={formEdit.inversor_marca} onChange={e => setFormEdit(f => ({ ...f, inversor_marca: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label>Notas</label><textarea value={formEdit.notas} onChange={e => setFormEdit(f => ({ ...f, notas: e.target.value }))} rows={2} /></div>
            <div style={{ fontSize: 11, color: 'var(--gris-secundario)', padding: '6px 10px', background: '#F9FAFB', borderRadius: 6 }}>
              El folio KENET no se edita (es la llave del proyecto). El tamaño (kWp) se recalcula solo.
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={modalReag}
        onClose={() => setModalReag(false)}
        title="Reagendar instalación"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalReag(false)}>Cancelar</button>
            <button className="btn btn-ambar" onClick={handleReagendar} disabled={!reagFecha || !reagFactor || !reagMotivo || guardando}>
              {guardando ? 'Guardando…' : 'Confirmar reagenda'}
            </button>
          </>
        }
      >
        {proyecto.estatus === 'en_progreso' && (
          <div style={{ fontSize: 12, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 6, padding: '8px 12px', marginBottom: 14 }}>
            ⚠️ Instalación en curso — se registra como <strong>movimiento de último minuto</strong>.
          </div>
        )}
        <div className="form-group">
          <label>Nueva fecha de instalación</label>
          <input type="date" value={reagFecha} onChange={e => setReagFecha(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Factor</label>
            <select value={reagFactor} onChange={e => { setReagFactor(e.target.value); setReagMotivo(''); }}>
              <option value="">Selecciona…</option>
              <option value="interno">Interno (KENET)</option>
              <option value="externo">Externo</option>
            </select>
          </div>
          <div className="form-group">
            <label>Motivo</label>
            <select value={reagMotivo} onChange={e => setReagMotivo(e.target.value)} disabled={!reagFactor}>
              <option value="">{reagFactor ? 'Selecciona…' : '— elige factor —'}</option>
              {(FACTORES[reagFactor]?.motivos || []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Nota (opcional)</label>
          <textarea value={reagNota} onChange={e => setReagNota(e.target.value)} placeholder="Detalle del reagende…" rows={2} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--gris-secundario)', padding: '8px 10px', background: '#F9FAFB', borderRadius: 6 }}>
          {reagFactor === 'externo'
            ? 'Factor externo → el SLA se reinicia (no penaliza a KENET).'
            : reagFactor === 'interno'
            ? 'Factor interno → el SLA conserva los días (cuenta contra KENET).'
            : 'El factor define el SLA: externo no penaliza · interno sí.'}
        </div>
      </Modal>

      <Modal
        open={modalFecha}
        onClose={() => setModalFecha(false)}
        title={fechaMostrada ? 'Cambiar fecha de agenda' : 'Agendar fecha de instalación'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalFecha(false)}>Cancelar</button>
            <button className="btn btn-ambar" onClick={handleAgendarFecha} disabled={!fechaAgenda || guardando}>
              {guardando ? 'Guardando…' : 'Guardar fecha'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Fecha de instalación</label>
          <input type="date" value={fechaAgenda} onChange={e => setFechaAgenda(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--gris-secundario)', padding: '6px 10px', background: '#F9FAFB', borderRadius: 6 }}>
          Se registra en la bitácora. La cuadrilla asignada la verá como su próxima instalación.
        </div>
      </Modal>

      <Modal
        open={modalNota}
        onClose={() => setModalNota(false)}
        title="Agregar evento a bitácora"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalNota(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={agregarNota} disabled={!nota.trim() || guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Tipo de evento</label>
          <select value={tipoNota} onChange={e => setTipoNota(e.target.value)}>
            <option value="nota">📝 Nota</option>
            <option value="inicio">🔧 Inicio de instalación</option>
            <option value="cierre">✅ Cierre / Completado</option>
            <option value="reagenda">🔄 Reagenda</option>
          </select>
        </div>
        <div className="form-group">
          <label>Descripción</label>
          <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Describe el evento…" rows={4} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--gris-secundario)', padding: '6px 10px', background: '#F9FAFB', borderRadius: 6 }}>
          ⚠️ La bitácora es inmutable — los eventos no pueden editarse ni eliminarse.
        </div>
      </Modal>
    </>
  );
}
