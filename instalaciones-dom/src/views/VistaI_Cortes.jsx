import { useState, useEffect, useCallback } from 'react';
import { getCortes, getSemanas, actualizarCorte, agregarVuelta, mensajeError } from '../lib/api';
import Modal from '../components/Modal';

const KPIS_LABELS = {
  instalaciones_a_tiempo: 'Instalaciones a tiempo',
  reportes_completos:     'Reportes completos',
  sin_correcciones:       'Sin correcciones',
};

function formatSemana(inicio, fin) {
  return `${inicio} — ${fin}`;
}

export default function VistaI_Cortes() {
  const [semanas, setSemanas] = useState([]);
  const [semanaActiva, setSemanaActiva] = useState('');
  const [cortes, setCortes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVuelta, setModalVuelta] = useState(null);
  const [nuevaVuelta, setNuevaVuelta] = useState({ concepto: '', monto: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getSemanas()
      .then(data => {
        setSemanas(data);
        if (data.length > 0) setSemanaActiva(data[0].semana_inicio);
        else setLoading(false);
      })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  const cargar = useCallback(async () => {
    if (!semanaActiva) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await getCortes({ semana_inicio: semanaActiva });
      setCortes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [semanaActiva]);

  useEffect(() => { cargar(); }, [cargar]);

  const calcTotal = (c) => {
    const vueltas    = (c.vueltas    || []).reduce((s, v) => s + Number(v.monto), 0);
    const descuentos = (c.kpis       || []).filter(k => !k.cumplido).reduce((s, k) => s + Number(k.descuento), 0);
    return (Number(c.pago_base) || 0) + vueltas - descuentos;
  };

  const handleAgregarVuelta = async () => {
    if (!nuevaVuelta.concepto || !nuevaVuelta.monto) return;
    setGuardando(true);
    try {
      await agregarVuelta({ corte_id: modalVuelta, concepto: nuevaVuelta.concepto, monto: parseFloat(nuevaVuelta.monto) });
      setModalVuelta(null);
      setNuevaVuelta({ concepto: '', monto: '' });
      cargar();
    } catch (e) {
      alert(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const handleCerrar = async (id) => {
    if (!confirm('¿Cerrar este corte? No se podrán agregar más vueltas.')) return;
    await actualizarCorte(id, { estado: 'cerrado' });
    cargar();
  };

  const totalExternas = cortes.filter(c => c.esquema === 'externa').reduce((s, c) => s + calcTotal(c), 0);

  if (loading && semanas.length === 0) return <div className="page-body"><div className="empty-state"><div className="es-icon">⏳</div><p>Cargando…</p></div></div>;

  return (
    <>
      <div className="page-header">
        <div><h2>💰 Cortes de Pago</h2><div className="sub">Semana · Externas (base + vueltas − descuentos) · Internas (KPI)</div></div>
        <button className="btn btn-outline btn-sm" onClick={cargar}>↺ Actualizar</button>
      </div>

      <div className="page-body">
        <div className="filters-bar mb-16">
          <select value={semanaActiva} onChange={e => setSemanaActiva(e.target.value)}>
            {semanas.length === 0 && <option value="">Sin semanas</option>}
            {semanas.map(s => (
              <option key={s.semana_inicio} value={s.semana_inicio}>
                {formatSemana(s.semana_inicio, s.semana_fin)}
              </option>
            ))}
          </select>
        </div>

        {!loading && (
          <div className="stats-row">
            <div className="stat-card"><div className="stat-val">{cortes.length}</div><div className="stat-label">Cuadrillas en corte</div></div>
            <div className="stat-card verde"><div className="stat-val">${totalExternas.toLocaleString()}</div><div className="stat-label">Total a pagar (ext.)</div></div>
            <div className="stat-card ambar"><div className="stat-val">{cortes.filter(c => c.estado === 'abierto').length}</div><div className="stat-label">Cortes abiertos</div></div>
          </div>
        )}

        {!loading && cortes.length === 0 && (
          <div className="empty-state"><div className="es-icon">💰</div><p>Sin cortes para esta semana.</p></div>
        )}

        {cortes.map(corte => {
          const isExterna = corte.esquema === 'externa';
          const total = calcTotal(corte);
          const cuadrilla = corte.cuadrilla;

          return (
            <div key={corte.id} className="corte-card">
              <div className="corte-header">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 24 }}>{isExterna ? '🔨' : '🏢'}</div>
                  <div>
                    <div className="fw-700">{cuadrilla?.nombre}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <span className={`badge badge-tipo-${cuadrilla?.tipo}`}>{cuadrilla?.tipo}</span>
                      <span className="badge badge-zona">{cuadrilla?.zona}</span>
                      <span className="badge" style={{ background: '#F3F4F6', color: '#374151' }}>{corte.instalaciones} instalaciones</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="badge" style={{ background: corte.estado === 'cerrado' ? '#D1FAE5' : '#FEF3C7', color: corte.estado === 'cerrado' ? '#065F46' : '#92400E' }}>
                    {corte.estado === 'cerrado' ? '✓ Cerrado' : '⏳ Abierto'}
                  </span>
                  {isExterna && <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--azul-primario)' }}>${total.toLocaleString()}</div>}
                </div>
              </div>

              {isExterna && (
                <div className="corte-body">
                  <div className="col2">
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gris-secundario)', textTransform: 'uppercase', marginBottom: 8 }}>Cálculo</div>
                      <div className="corte-row">
                        <span>Pago base ({corte.instalaciones} inst.)</span>
                        <span className="fw-700">${Number(corte.pago_base || 0).toLocaleString()}</span>
                      </div>
                      {(corte.vueltas || []).map((v, i) => (
                        <div key={i} className="corte-row vuelta">
                          <span>+ {v.concepto}</span>
                          <span className="fw-600 text-green">+${Number(v.monto).toLocaleString()}</span>
                        </div>
                      ))}
                      {(corte.kpis || []).filter(k => !k.cumplido).map((k, i) => (
                        <div key={i} className="corte-row descuento">
                          <span>− KPI: {KPIS_LABELS[k.kpi] || k.kpi}</span>
                          <span className="fw-600 text-red">−${Number(k.descuento).toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="corte-row total"><span>Total neto</span><span>${total.toLocaleString()}</span></div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gris-secundario)', textTransform: 'uppercase', marginBottom: 8 }}>KPIs</div>
                      {(corte.kpis || []).map((k, i) => (
                        <div key={i} className="kpi-row">
                          <div className={`kpi-chip ${k.cumplido ? 'ok' : 'fail'}`}>{k.cumplido ? '✓' : '✕'}</div>
                          <div style={{ flex: 1, fontSize: 12 }}>
                            <div>{KPIS_LABELS[k.kpi] || k.kpi}</div>
                            {!k.cumplido && <div className="text-red" style={{ fontSize: 11 }}>Descuento: −${k.descuento}</div>}
                          </div>
                        </div>
                      ))}
                      {(corte.kpis || []).length === 0 && <div className="text-gray text-sm">Sin KPIs registrados</div>}
                    </div>
                  </div>
                  {corte.estado === 'abierto' && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--borde)' }}>
                      {cuadrilla?.aplica_vueltas && (
                        <button className="btn btn-outline btn-sm" onClick={() => setModalVuelta(corte.id)}>+ Agregar vuelta</button>
                      )}
                      <button className="btn btn-green btn-sm" style={{ marginLeft: 'auto' }} onClick={() => handleCerrar(corte.id)}>Cerrar corte</button>
                    </div>
                  )}
                </div>
              )}

              {!isExterna && (
                <div className="corte-body">
                  <div style={{ marginBottom: 12, padding: '8px 12px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, fontSize: 12, color: '#0369A1' }}>
                    ℹ️ Cuadrilla interna — pago por nómina. Se registra cumplimiento de KPI para bono (cálculo pendiente).
                  </div>
                  {(corte.kpis || []).map((k, i) => (
                    <div key={i} className="kpi-row">
                      <div className={`kpi-chip ${k.cumplido ? 'ok' : 'fail'}`}>{k.cumplido ? '✓' : '✕'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>{KPIS_LABELS[k.kpi] || k.kpi}</div>
                        <div className="text-xs text-gray">Meta: {k.meta}% · Real: {k.real ?? '—'}%</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: k.cumplido ? 'var(--verde)' : 'var(--rojo)' }}>{k.cumplido ? 'Cumplido' : 'No cumplido'}</div>
                    </div>
                  ))}
                  {corte.estado === 'abierto' && (
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn btn-green btn-sm" onClick={() => handleCerrar(corte.id)}>Cerrar corte</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        open={!!modalVuelta}
        onClose={() => setModalVuelta(null)}
        title="Agregar vuelta"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalVuelta(null)}>Cancelar</button>
            <button className="btn btn-green" onClick={handleAgregarVuelta} disabled={!nuevaVuelta.concepto || !nuevaVuelta.monto || guardando}>
              {guardando ? 'Guardando…' : 'Agregar'}
            </button>
          </>
        }
      >
        <div style={{ fontSize: 12, color: 'var(--gris-secundario)', marginBottom: 14, padding: '6px 10px', background: '#F0FBF4', borderRadius: 6 }}>
          Viáticos/traslados a zonas extendidas que se suman al corte.
        </div>
        <div className="form-group">
          <label>Concepto</label>
          <input value={nuevaVuelta.concepto} onChange={e => setNuevaVuelta(v => ({ ...v, concepto: e.target.value }))} placeholder="Ej: Traslado Marín 28-Jun" />
        </div>
        <div className="form-group">
          <label>Monto ($)</label>
          <input type="number" value={nuevaVuelta.monto} onChange={e => setNuevaVuelta(v => ({ ...v, monto: e.target.value }))} placeholder="350" />
        </div>
      </Modal>
    </>
  );
}
