import { useState } from 'react';
import { proyectos, cuadrillas, zonas } from '../data/mockData';
import SLABadge from '../components/SLABadge';
import Modal from '../components/Modal';

const cuadrillasMap = Object.fromEntries(cuadrillas.map(c => [c.id, c]));

export default function VistaD_Reagendados({ setVista, setProyectoSeleccionado }) {
  const [filtrZona, setFiltrZona] = useState('');
  const [modalReagendar, setModalReagendar] = useState(false);
  const [proyectoActivo, setProyectoActivo] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [listaProyectos, setListaProyectos] = useState(proyectos);

  const reagendados = listaProyectos.filter(p =>
    p.estatus === 'reagendado' &&
    (!filtrZona || p.zona === filtrZona)
  );

  const handleAbrirReagendar = (p) => {
    setProyectoActivo(p);
    setNuevaFecha('');
    setMotivo('');
    setModalReagendar(true);
  };

  const handleConfirmarReagenda = () => {
    setListaProyectos(prev => prev.map(p =>
      p.id === proyectoActivo.id
        ? {
          ...p,
          fecha_agenda: nuevaFecha,
          motivo_reagendo: motivo || p.motivo_reagendo,
          dias_en_etapa: 0,
        }
        : p
    ));
    setModalReagendar(false);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>🔄 Reagendados</h2>
          <div className="sub">{reagendados.length} proyectos con reagenda activa</div>
        </div>
      </div>

      <div className="page-body">
        <div className="stats-row">
          <div className="stat-card rojo">
            <div className="stat-val">{reagendados.length}</div>
            <div className="stat-label">Total reagendados</div>
          </div>
          <div className="stat-card ambar">
            <div className="stat-val">{reagendados.filter(p => p.dias_en_etapa > 15).length}</div>
            <div className="stat-label">SLA crítico (&gt;15d)</div>
          </div>
          <div className="stat-card">
            <div className="stat-val">{reagendados.filter(p => !p.anticipo_pagado).length}</div>
            <div className="stat-label">Sin anticipo</div>
          </div>
        </div>

        <div className="filters-bar">
          <select value={filtrZona} onChange={e => setFiltrZona(e.target.value)}>
            <option value="">Todas las zonas</option>
            {zonas.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>

        {reagendados.length === 0 ? (
          <div className="empty-state">
            <div className="es-icon">🎉</div>
            <p>Sin proyectos reagendados para los filtros seleccionados.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reagendados.map(p => {
              const cuadrilla = cuadrillasMap[p.cuadrilla_id];
              return (
                <div key={p.id} className="card">
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderBottom: '1px solid var(--borde)',
                    background: p.dias_en_etapa > 15 ? '#FFF5F5' : undefined,
                  }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ fontSize: 24 }}>🔄</div>
                      <div>
                        <div className="fw-700 text-blue">{p.folio}</div>
                        <div className="fw-600" style={{ fontSize: 13 }}>{p.cliente}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <SLABadge dias={p.dias_en_etapa} />
                      <span className="badge badge-zona">{p.zona}</span>
                    </div>
                  </div>
                  <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12 }}>
                    <div>
                      <div className="text-xs text-gray">Fecha original</div>
                      <div className="fw-600 mt-4" style={{ color: 'var(--rojo)' }}>
                        {p.fecha_original || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray">Nueva fecha agenda</div>
                      <div className="fw-600 mt-4">{p.fecha_agenda || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray">Cuadrilla</div>
                      <div className="fw-600 mt-4" style={{ fontSize: 12 }}>{cuadrilla?.nombre || '—'}</div>
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <div className="text-xs text-gray">Motivo de reagenda</div>
                      <div style={{ fontSize: 13, marginTop: 4, padding: '6px 10px', background: '#FFF8EC', border: '1px solid #FDE68A', borderRadius: 6 }}>
                        {p.motivo_reagendo || 'Sin motivo registrado'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray">Anticipo</div>
                      <div className="mt-4" style={{ fontSize: 12, color: p.anticipo_pagado ? 'var(--verde)' : 'var(--rojo)', fontWeight: 600 }}>
                        {p.anticipo_pagado ? '✅ Pagado' : '⚠️ Pendiente'}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '10px 16px', borderTop: '1px solid var(--borde)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => {
                      setProyectoSeleccionado(p);
                      setVista('detalle');
                    }}>Ver detalle</button>
                    <button className="btn btn-ambar btn-sm" onClick={() => handleAbrirReagendar(p)}>
                      Cambiar fecha
                    </button>
                    <button className="btn btn-green btn-sm">
                      Confirmar agenda
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={modalReagendar}
        onClose={() => setModalReagendar(false)}
        title={`Reagendar: ${proyectoActivo?.folio}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalReagendar(false)}>Cancelar</button>
            <button className="btn btn-ambar" onClick={handleConfirmarReagenda} disabled={!nuevaFecha}>
              Confirmar reagenda
            </button>
          </>
        }
      >
        {proyectoActivo && (
          <>
            <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13 }}>
              <div className="text-gray text-xs mb-4">Proyecto</div>
              <div className="fw-700">{proyectoActivo.cliente}</div>
              <div className="text-gray">{proyectoActivo.direccion}</div>
              <div className="mt-8 text-sm">
                Fecha anterior: <strong style={{ color: 'var(--rojo)' }}>{proyectoActivo.fecha_agenda || proyectoActivo.fecha_original}</strong>
              </div>
            </div>
            <div className="form-group">
              <label>Nueva fecha de instalación</label>
              <input
                type="date"
                value={nuevaFecha}
                onChange={e => setNuevaFecha(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div className="form-group">
              <label>Motivo de reagenda</label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ej: Lluvia · Cliente no disponible · Material pendiente…"
                rows={3}
              />
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
