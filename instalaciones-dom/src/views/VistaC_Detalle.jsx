import { useState } from 'react';
import { bitacora as bitacoraInit, cuadrillas, usuarios, tiposBitacora } from '../data/mockData';
import EstatusBadge from '../components/EstatusBadge';
import SLABadge from '../components/SLABadge';
import Modal from '../components/Modal';

const cuadrillasMap = Object.fromEntries(cuadrillas.map(c => [c.id, c]));
const usuariosMap = Object.fromEntries(usuarios.map(u => [u.id, u]));

export default function VistaC_Detalle({ proyecto, setVista }) {
  const [bitacora, setBitacora] = useState(bitacoraInit);
  const [modalNota, setModalNota] = useState(false);
  const [nota, setNota] = useState('');
  const [tipoNota, setTipoNota] = useState('nota');

  if (!proyecto) {
    return (
      <>
        <div className="page-header">
          <h2>📋 Detalle de Proyecto</h2>
        </div>
        <div className="page-body">
          <div className="empty-state">
            <div className="es-icon">📋</div>
            <p>Selecciona un proyecto desde la Agenda para ver su detalle.</p>
            <button className="btn btn-primary mt-16" onClick={() => setVista('agenda')}>
              Ir a Agenda
            </button>
          </div>
        </div>
      </>
    );
  }

  const cuadrilla = cuadrillasMap[proyecto.cuadrilla_id];
  const instalador = usuariosMap[proyecto.instalador_id];
  const logs = bitacora.filter(b => b.proyecto_id === proyecto.id).sort((a, b) => b.fecha.localeCompare(a.fecha));

  const agregarNota = () => {
    const nuevo = {
      id: `b${Date.now()}`,
      proyecto_id: proyecto.id,
      tipo: tipoNota,
      descripcion: nota,
      usuario: 'pm1',
      fecha: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    setBitacora(prev => [...prev, nuevo]);
    setNota('');
    setModalNota(false);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <button
            onClick={() => setVista('agenda')}
            style={{ fontSize: 12, color: 'var(--gris-secundario)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 2 }}
          >
            ← Volver a Agenda
          </button>
          <h2>📋 {proyecto.folio}</h2>
          <div className="sub">{proyecto.cliente}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <EstatusBadge estatus={proyecto.estatus} />
          <button className="btn btn-outline btn-sm" onClick={() => setModalNota(true)}>+ Agregar nota</button>
          {proyecto.estatus === 'agendado' && (
            <button className="btn btn-green btn-sm">Iniciar instalación</button>
          )}
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Main */}
          <div>
            {/* Info general */}
            <div className="card mb-16">
              <div className="card-header">
                <h3>Información del proyecto</h3>
                <SLABadge dias={proyecto.dias_en_etapa} />
              </div>
              <div className="card-body">
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-label">Folio KENET</div>
                    <div className="info-val text-blue">{proyecto.folio}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">OV Odoo</div>
                    <div className="info-val">{proyecto.folio_odoo}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Zona</div>
                    <div className="info-val"><span className="badge badge-zona">{proyecto.zona}</span></div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Paneles / kW</div>
                    <div className="info-val">{proyecto.paneles} pnl · {proyecto.kw} kW</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Fecha agenda</div>
                    <div className="info-val">{proyecto.fecha_agenda || '—'}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Instalación completada</div>
                    <div className="info-val">{proyecto.fecha_instalacion || '—'}</div>
                  </div>
                  <div className="info-item" style={{ gridColumn: '1/-1' }}>
                    <div className="info-label">Dirección</div>
                    <div className="info-val" style={{ fontWeight: 400, fontSize: 13 }}>{proyecto.direccion}</div>
                  </div>
                </div>

                {proyecto.notas && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginTop: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 11, color: '#92400E' }}>NOTA: </span>
                    {proyecto.notas}
                  </div>
                )}
              </div>
            </div>

            {/* Cuadrilla e instalador */}
            <div className="card mb-16">
              <div className="card-header"><h3>Cuadrilla asignada</h3></div>
              <div className="card-body">
                {cuadrilla ? (
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 32 }}>👷</div>
                    <div style={{ flex: 1 }}>
                      <div className="fw-700" style={{ marginBottom: 4 }}>{cuadrilla.nombre}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span className={`badge badge-tipo-${cuadrilla.tipo}`}>{cuadrilla.tipo}</span>
                        <span className="badge badge-zona">{cuadrilla.zona}</span>
                        {cuadrilla.aplica_vueltas && (
                          <span className="badge" style={{ background: '#F0FBF4', color: '#065F46' }}>🚗 Vueltas activas</span>
                        )}
                      </div>
                      <div className="text-sm text-gray mt-8">
                        Esquema: <strong>{cuadrilla.esquema_pago.replace(/_/g, ' ')}</strong>
                      </div>
                    </div>
                    {instalador && (
                      <div style={{ textAlign: 'right' }}>
                        <div className="text-sm text-gray">Instalador reportista</div>
                        <div className="fw-600">{instalador.nombre}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray text-sm">Sin cuadrilla asignada</div>
                )}
              </div>
            </div>

            {/* Bitácora */}
            <div className="card">
              <div className="card-header">
                <h3>Bitácora inmutable</h3>
                <span className="text-xs text-gray">{logs.length} eventos</span>
              </div>
              <div className="card-body">
                {logs.length === 0 ? (
                  <div className="text-gray text-sm">Sin eventos registrados.</div>
                ) : (
                  <div className="timeline">
                    {logs.map(log => {
                      const tipo = tiposBitacora[log.tipo] || { label: log.tipo, icon: '📝', color: '#6B7280' };
                      const usuario = usuariosMap[log.usuario];
                      return (
                        <div key={log.id} className="timeline-item">
                          <div className="timeline-dot" style={{ background: tipo.color }} />
                          <div className="timeline-fecha">
                            {log.fecha} · {usuario?.nombre || log.usuario}
                            {' · '}
                            <span style={{ color: tipo.color, fontWeight: 600, fontSize: 10 }}>
                              {tipo.icon} {tipo.label}
                            </span>
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

          {/* Right panel — pagos */}
          <div>
            <div className="card mb-16">
              <div className="card-header"><h3>Estado de pago (Odoo)</h3></div>
              <div className="card-body">
                <div style={{ fontSize: 11, color: 'var(--gris-secundario)', marginBottom: 12, padding: '6px 10px', background: '#F3F4F6', borderRadius: 6 }}>
                  ℹ️ Solo lectura — se sincroniza desde Odoo
                </div>
                {[
                  { label: '1. Anticipo', ok: proyecto.anticipo_pagado, desc: 'Al cierre de contrato' },
                  { label: '2. Enganche', ok: proyecto.instalado_cobrado, desc: 'Al terminar instalación' },
                  { label: '3. Medidor BD', ok: proyecto.medidor_pagado, desc: 'Al instalar medidor bidireccional' },
                ].map(hito => (
                  <div key={hito.label} style={{
                    display: 'flex', gap: 10, alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid var(--borde)'
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: hito.ok ? '#D1FAE5' : '#F3F4F6',
                      color: hito.ok ? 'var(--verde)' : 'var(--gris-secundario)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, flexShrink: 0
                    }}>{hito.ok ? '✓' : '○'}</div>
                    <div>
                      <div className="fw-600" style={{ fontSize: 13 }}>{hito.label}</div>
                      <div className="text-xs text-gray">{hito.desc}</div>
                    </div>
                  </div>
                ))}
                <div className="mt-12" style={{ fontSize: 11, color: 'var(--gris-secundario)' }}>
                  Candado: sin enganche no se ingresa interconexión CFE
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>Acciones rápidas</h3></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-outline w-full" onClick={() => setModalNota(true)}>📝 Agregar nota</button>
                <button className="btn btn-outline w-full">🔄 Reagendar</button>
                <button className="btn btn-outline w-full">📱 Ver reporte instalador</button>
                <hr className="divider" />
                <button className="btn btn-red w-full btn-sm" style={{ justifyContent: 'center' }}>✕ Cancelar proyecto</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={modalNota}
        onClose={() => setModalNota(false)}
        title="Agregar evento a bitácora"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalNota(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={agregarNota} disabled={!nota.trim()}>Guardar</button>
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
          <textarea
            value={nota}
            onChange={e => setNota(e.target.value)}
            placeholder="Describe el evento o nota…"
            rows={4}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--gris-secundario)', padding: '6px 10px', background: '#F9FAFB', borderRadius: 6 }}>
          ⚠️ La bitácora es inmutable. Los eventos no pueden editarse ni eliminarse.
        </div>
      </Modal>
    </>
  );
}
