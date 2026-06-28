import { useState, useEffect, useCallback } from 'react';
import { getBitacora, agregarBitacora, actualizarProyecto } from '../lib/api';
import EstatusBadge from '../components/EstatusBadge';
import SLABadge from '../components/SLABadge';
import Modal from '../components/Modal';

const TIPOS_BITACORA = {
  agenda:   { label: 'Agendado',    icon: '📅', color: '#1F4E79' },
  inicio:   { label: 'Inicio',      icon: '🔧', color: '#F5A623' },
  cierre:   { label: 'Completado',  icon: '✅', color: '#2E9E5B' },
  reagenda: { label: 'Reagenda',    icon: '🔄', color: '#6B4E9B' },
  nota:     { label: 'Nota',        icon: '📝', color: '#6B7280' },
  import:   { label: 'Import',      icon: '📤', color: '#0891B2' },
};

export default function VistaC_Detalle({ proyecto, setVista, usuarioActual }) {
  const [bitacora, setBitacora] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNota, setModalNota] = useState(false);
  const [nota, setNota] = useState('');
  const [tipoNota, setTipoNota] = useState('nota');
  const [guardando, setGuardando] = useState(false);
  const [modalFecha, setModalFecha] = useState(false);
  const [fechaAgenda, setFechaAgenda] = useState('');
  const [fechaMostrada, setFechaMostrada] = useState(proyecto?.fecha_agenda || null);
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
      alert('Error: ' + e.message);
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
        estatus: proyecto.estatus === 'reagendado' ? 'agendado' : proyecto.estatus,
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
    } catch (e) {
      alert('Error: ' + e.message);
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
          <EstatusBadge estatus={proyecto.estatus} />
          <button className="btn btn-outline btn-sm" onClick={() => setModalNota(true)}>+ Agregar nota</button>
          {proyecto.estatus === 'agendado' && (
            <button className="btn btn-green btn-sm" onClick={async () => {
              await agregarBitacora({ proyecto_id: proyecto.id, tipo: 'inicio', descripcion: 'Instalación iniciada. Cuadrilla en sitio.', usuario_id: usuarioActual?.id ?? null });
              await actualizarProyecto(proyecto.id, { estatus: 'en_progreso' });
              cargarBitacora();
            }}>Iniciar instalación</button>
          )}
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
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
                  <button className="btn btn-ambar w-full" onClick={() => { setFechaAgenda(fechaMostrada || ''); setModalFecha(true); }}>
                    📅 {fechaMostrada ? 'Cambiar fecha de agenda' : 'Agendar fecha'}
                  </button>
                )}
                <button className="btn btn-outline w-full" onClick={() => setModalNota(true)}>📝 Agregar nota</button>
                <button className="btn btn-outline w-full" onClick={() => setVista('reagendados')}>🔄 Reagendar</button>
                <hr className="divider" />
                <button className="btn btn-red w-full btn-sm" style={{ justifyContent: 'center' }}
                  onClick={async () => {
                    if (!confirm('¿Cancelar este proyecto?')) return;
                    await actualizarProyecto(proyecto.id, { estatus: 'cancelado' });
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
