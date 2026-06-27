import { useState } from 'react';
import { cortesPago, cuadrillas, kpisLabels } from '../data/mockData';
import Modal from '../components/Modal';

const cuadrillasMap = Object.fromEntries(cuadrillas.map(c => [c.id, c]));

const SEMANAS = ['23-Jun — 29-Jun 2026', '16-Jun — 22-Jun 2026'];

export default function VistaI_Cortes() {
  const [semana, setSemana] = useState(SEMANAS[0]);
  const [modalDetalle, setModalDetalle] = useState(null);
  const [modalVuelta, setModalVuelta] = useState(null);
  const [nuevaVuelta, setNuevaVuelta] = useState({ concepto: '', monto: '' });
  const [cortesState, setCortesState] = useState(cortesPago);

  const cortesFiltrados = cortesState.filter(c => c.semana === semana);

  const calcularTotal = (c) => {
    const vueltas = c.vueltas.reduce((s, v) => s + v.monto, 0);
    const descuentos = c.descuentos.reduce((s, d) => s + d.descuento, 0);
    return (c.pago_base || 0) + vueltas - descuentos;
  };

  const agregarVuelta = (corteId) => {
    if (!nuevaVuelta.concepto || !nuevaVuelta.monto) return;
    setCortesState(prev => prev.map(c =>
      c.id === corteId
        ? { ...c, vueltas: [...c.vueltas, { concepto: nuevaVuelta.concepto, monto: parseFloat(nuevaVuelta.monto) }] }
        : c
    ));
    setNuevaVuelta({ concepto: '', monto: '' });
    setModalVuelta(null);
  };

  const cerrarCorte = (corteId) => {
    setCortesState(prev => prev.map(c =>
      c.id === corteId ? { ...c, estado: 'cerrado' } : c
    ));
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>💰 Cortes de Pago</h2>
          <div className="sub">Semana en curso · Externas (base + vueltas − descuentos) · Internas (KPI)</div>
        </div>
      </div>

      <div className="page-body">
        {/* Selector de semana */}
        <div className="filters-bar mb-16">
          <select value={semana} onChange={e => setSemana(e.target.value)}>
            {SEMANAS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Stats rápidas */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-val">{cortesFiltrados.length}</div>
            <div className="stat-label">Cuadrillas en corte</div>
          </div>
          <div className="stat-card verde">
            <div className="stat-val">
              ${cortesFiltrados.filter(c => c.esquema === 'externa').reduce((s, c) => s + calcularTotal(c), 0).toLocaleString()}
            </div>
            <div className="stat-label">Total a pagar (ext.)</div>
          </div>
          <div className="stat-card ambar">
            <div className="stat-val">{cortesFiltrados.filter(c => c.estado === 'abierto').length}</div>
            <div className="stat-label">Cortes abiertos</div>
          </div>
        </div>

        {cortesFiltrados.map(corte => {
          const cuadrilla = cuadrillasMap[corte.cuadrilla_id];
          const isExterna = corte.esquema === 'externa';
          const total = calcularTotal(corte);

          return (
            <div key={corte.id} className="corte-card">
              {/* Header */}
              <div className="corte-header">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 24 }}>{isExterna ? '🔨' : '🏢'}</div>
                  <div>
                    <div className="fw-700">{cuadrilla?.nombre}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <span className={`badge badge-tipo-${cuadrilla?.tipo}`}>{cuadrilla?.tipo}</span>
                      <span className="badge badge-zona">{cuadrilla?.zona}</span>
                      <span className="badge" style={{ background: '#F3F4F6', color: '#374151' }}>
                        {corte.instalaciones} instalaciones
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge ${corte.estado === 'cerrado' ? '' : ''}`} style={{
                    background: corte.estado === 'cerrado' ? '#D1FAE5' : '#FEF3C7',
                    color: corte.estado === 'cerrado' ? '#065F46' : '#92400E',
                  }}>
                    {corte.estado === 'cerrado' ? '✓ Cerrado' : '⏳ Abierto'}
                  </span>
                  {isExterna && corte.estado === 'abierto' && (
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--azul-primario)' }}>
                      ${total.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Body — EXTERNA */}
              {isExterna && (
                <div className="corte-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Columna izquierda */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gris-secundario)', textTransform: 'uppercase', marginBottom: 8 }}>Cálculo</div>
                      <div className="corte-row">
                        <span>Pago base ({corte.instalaciones} inst.)</span>
                        <span className="fw-700">${(corte.pago_base || 0).toLocaleString()}</span>
                      </div>
                      {corte.vueltas.map((v, i) => (
                        <div key={i} className="corte-row vuelta">
                          <span>+ {v.concepto}</span>
                          <span className="val fw-600 text-green">+${v.monto.toLocaleString()}</span>
                        </div>
                      ))}
                      {corte.descuentos.filter(d => !d.cumplido).map((d, i) => (
                        <div key={i} className="corte-row descuento">
                          <span>− KPI: {kpisLabels[d.kpi] || d.kpi}</span>
                          <span className="val fw-600 text-red">−${d.descuento.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="corte-row total">
                        <span>Total neto</span>
                        <span>${total.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Columna derecha — KPIs */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gris-secundario)', textTransform: 'uppercase', marginBottom: 8 }}>
                        KPIs de la semana
                      </div>
                      {corte.descuentos.map((d, i) => (
                        <div key={i} className="kpi-row">
                          <div className={`kpi-chip ${d.cumplido ? 'ok' : 'fail'}`}>
                            {d.cumplido ? '✓' : '✕'}
                          </div>
                          <div style={{ flex: 1, fontSize: 12 }}>
                            <div>{kpisLabels[d.kpi] || d.kpi}</div>
                            {!d.cumplido && <div className="text-red" style={{ fontSize: 11 }}>Descuento: −${d.descuento}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {corte.estado === 'abierto' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--borde)' }}>
                      {cuadrilla?.aplica_vueltas && (
                        <button className="btn btn-outline btn-sm" onClick={() => setModalVuelta(corte.id)}>
                          + Agregar vuelta
                        </button>
                      )}
                      <button className="btn btn-outline btn-sm" onClick={() => setModalDetalle(corte)}>
                        Ver detalle completo
                      </button>
                      <button className="btn btn-green btn-sm" style={{ marginLeft: 'auto' }} onClick={() => cerrarCorte(corte.id)}>
                        Cerrar corte
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Body — INTERNA */}
              {!isExterna && (
                <div className="corte-body">
                  <div style={{ marginBottom: 12, padding: '8px 12px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, fontSize: 12, color: '#0369A1' }}>
                    ℹ️ Cuadrilla interna — el pago es por nómina. Se registra cumplimiento de KPI para bono (cálculo pendiente de definición).
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gris-secundario)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Cumplimiento de KPIs
                  </div>
                  {corte.kpis_cumplidos.map((k, i) => (
                    <div key={i} className="kpi-row">
                      <div className={`kpi-chip ${k.cumplido ? 'ok' : 'fail'}`}>
                        {k.cumplido ? '✓' : '✕'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>{kpisLabels[k.kpi] || k.kpi}</div>
                        <div className="text-xs text-gray">Meta: {k.meta}% · Real: {k.real}%</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: k.cumplido ? 'var(--verde)' : 'var(--rojo)' }}>
                        {k.cumplido ? 'Cumplido' : 'No cumplido'}
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 11, color: '#92400E' }}>
                    🔴 Pregunta abierta #10: cálculo del bono interno aún no definido — no se construye en esta fase.
                  </div>

                  {corte.estado === 'abierto' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--borde)' }}>
                      <button className="btn btn-outline btn-sm">Ver detalle</button>
                      <button className="btn btn-green btn-sm" style={{ marginLeft: 'auto' }} onClick={() => cerrarCorte(corte.id)}>
                        Cerrar corte
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal vuelta */}
      <Modal
        open={!!modalVuelta}
        onClose={() => setModalVuelta(null)}
        title="Agregar vuelta"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalVuelta(null)}>Cancelar</button>
            <button className="btn btn-green" onClick={() => agregarVuelta(modalVuelta)} disabled={!nuevaVuelta.concepto || !nuevaVuelta.monto}>
              Agregar
            </button>
          </>
        }
      >
        <div style={{ fontSize: 12, color: 'var(--gris-secundario)', marginBottom: 14, padding: '6px 10px', background: '#F0FBF4', borderRadius: 6 }}>
          Las vueltas son viáticos/traslados a zonas extendidas (Marín, Hidalgo, Montemorelos) que se suman al corte.
        </div>
        <div className="form-group">
          <label>Concepto</label>
          <input
            value={nuevaVuelta.concepto}
            onChange={e => setNuevaVuelta(v => ({ ...v, concepto: e.target.value }))}
            placeholder="Ej: Traslado Marín 28-Jun"
          />
        </div>
        <div className="form-group">
          <label>Monto ($)</label>
          <input
            type="number"
            value={nuevaVuelta.monto}
            onChange={e => setNuevaVuelta(v => ({ ...v, monto: e.target.value }))}
            placeholder="350"
          />
        </div>
      </Modal>
    </>
  );
}
