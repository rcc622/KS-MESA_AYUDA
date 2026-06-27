import { useState } from 'react';
import { cuadrillas as cuadrillasInit, reglasKPI as reglasInit, usuarios, zonas, kpisLabels } from '../data/mockData';
import Modal from '../components/Modal';

const usuariosMap = Object.fromEntries(usuarios.map(u => [u.id, u]));
const PMs = usuarios.filter(u => u.rol === 'pm_domestico');

const KPIS_OPCIONES = [
  'instalaciones_a_tiempo',
  'reportes_completos',
  'sin_correcciones',
];

const ESQUEMAS_PAGO = [
  { value: 'por_instalacion', label: 'Por instalación' },
  { value: 'por_panel', label: 'Por panel' },
  { value: 'salario_bono', label: 'Salario + bono' },
  { value: 'otro', label: 'Otro' },
];

export default function VistaL_Cuadrillas() {
  const [cuadrillas, setCuadrillas] = useState(cuadrillasInit);
  const [reglas, setReglas] = useState(reglasInit);
  const [modalNueva, setModalNueva] = useState(false);
  const [modalRegla, setModalRegla] = useState(null); // cuadrilla_id
  const [expandida, setExpandida] = useState(null);

  const [formCuadrilla, setFormCuadrilla] = useState({
    nombre: '', tipo: 'externa', zona: 'MTY', pm_id: 'pm1',
    aplica_vueltas: false, esquema_pago: 'por_instalacion',
  });

  const [formRegla, setFormRegla] = useState({
    kpi: 'instalaciones_a_tiempo', meta: '', consecuencia: 'descuento_pago', valor: '',
  });

  const guardarCuadrilla = () => {
    const nueva = {
      ...formCuadrilla,
      id: `c${Date.now()}`,
      activa: true,
      miembros: [],
    };
    setCuadrillas(c => [...c, nueva]);
    setModalNueva(false);
    setFormCuadrilla({ nombre: '', tipo: 'externa', zona: 'MTY', pm_id: 'pm1', aplica_vueltas: false, esquema_pago: 'por_instalacion' });
  };

  const toggleAplicaVueltas = (id) => {
    setCuadrillas(c => c.map(q => q.id === id ? { ...q, aplica_vueltas: !q.aplica_vueltas } : q));
  };

  const toggleActiva = (id) => {
    setCuadrillas(c => c.map(q => q.id === id ? { ...q, activa: !q.activa } : q));
  };

  const guardarRegla = () => {
    const nueva = {
      ...formRegla,
      id: `r${Date.now()}`,
      cuadrilla_id: modalRegla,
      meta: parseFloat(formRegla.meta),
      valor: parseFloat(formRegla.valor),
      activa: true,
    };
    setReglas(r => [...r, nueva]);
    setModalRegla(null);
    setFormRegla({ kpi: 'instalaciones_a_tiempo', meta: '', consecuencia: 'descuento_pago', valor: '' });
  };

  const eliminarRegla = (id) => {
    setReglas(r => r.filter(rr => rr.id !== id));
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>👷 Configuración de Cuadrillas</h2>
          <div className="sub">Equipos de instalación · KPIs y reglas por cuadrilla</div>
        </div>
        <button className="btn btn-ambar" onClick={() => setModalNueva(true)}>
          + Nueva cuadrilla
        </button>
      </div>

      <div className="page-body">
        {cuadrillas.map(c => {
          const pm = usuariosMap[c.pm_id];
          const reglasC = reglas.filter(r => r.cuadrilla_id === c.id && r.activa);
          const isExpandida = expandida === c.id;

          return (
            <div key={c.id} className="cuadrilla-card" style={{ opacity: c.activa ? 1 : 0.6 }}>
              <div className="cuadrilla-card-header">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 26 }}>👷</div>
                  <div>
                    <div className="fw-700" style={{ fontSize: 14 }}>{c.nombre}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <span className={`badge badge-tipo-${c.tipo}`}>{c.tipo}</span>
                      <span className="badge badge-zona">{c.zona}</span>
                      <span className="badge" style={{ background: '#F3F4F6', color: '#374151', fontSize: 10 }}>
                        {ESQUEMAS_PAGO.find(e => e.value === c.esquema_pago)?.label || c.esquema_pago}
                      </span>
                      {!c.activa && <span className="badge" style={{ background: '#FEE2E2', color: 'var(--rojo)' }}>Inactiva</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setExpandida(isExpandida ? null : c.id)}
                  >
                    {isExpandida ? '▲ Ocultar' : '▼ Configurar'}
                  </button>
                </div>
              </div>

              {isExpandida && (
                <div className="cuadrilla-card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* Columna izquierda — Info */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gris-secundario)', marginBottom: 10 }}>Configuración</div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                          <span>PM responsable</span>
                          <strong>{pm?.nombre || '—'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                          <span>Miembros</span>
                          <strong>{c.miembros.length}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                          <span>Esquema de pago</span>
                          <strong>{ESQUEMAS_PAGO.find(e => e.value === c.esquema_pago)?.label}</strong>
                        </div>
                        <hr className="divider" />

                        {/* Toggle vueltas */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                          <div>
                            <div className="fw-600" style={{ fontSize: 13 }}>🚗 Aplica vueltas</div>
                            <div className="text-xs text-gray">Viáticos a zonas extendidas</div>
                          </div>
                          <label className="toggle">
                            <input
                              type="checkbox"
                              checked={c.aplica_vueltas}
                              onChange={() => toggleAplicaVueltas(c.id)}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>
                        {c.tipo === 'externa' && c.zona === 'MVA' && (
                          <div style={{ fontSize: 11, color: '#92400E', background: '#FEF3C7', padding: '6px 10px', borderRadius: 6 }}>
                            ⚠️ Pregunta abierta #9: ¿Monclova paga vueltas? El PM decide activar el switch.
                          </div>
                        )}
                        {c.tipo === 'interna' && (
                          <div style={{ fontSize: 11, color: '#0369A1', background: '#E0F2FE', padding: '6px 10px', borderRadius: 6 }}>
                            ℹ️ Cuadrilla interna — vueltas no aplican por diseño.
                          </div>
                        )}

                        {/* Toggle activa */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="fw-600" style={{ fontSize: 13 }}>Cuadrilla activa</div>
                          <label className="toggle">
                            <input
                              type="checkbox"
                              checked={c.activa}
                              onChange={() => toggleActiva(c.id)}
                            />
                            <span className="toggle-slider" />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Columna derecha — Reglas KPI */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gris-secundario)' }}>
                          Reglas KPI ({reglasC.length})
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={() => {
                          setModalRegla(c.id);
                          setFormRegla(f => ({
                            ...f,
                            consecuencia: c.tipo === 'externa' ? 'descuento_pago' : 'afecta_kpi_bono',
                          }));
                        }}>
                          + Regla
                        </button>
                      </div>

                      {reglasC.length === 0 ? (
                        <div className="text-gray text-sm" style={{ padding: '12px 0' }}>Sin reglas configuradas</div>
                      ) : (
                        reglasC.map(r => (
                          <div key={r.id} className="regla-item">
                            <div style={{ flex: 1 }}>
                              <div className="fw-600" style={{ fontSize: 12 }}>{kpisLabels[r.kpi] || r.kpi}</div>
                              <div className="text-xs text-gray">
                                Meta: {r.meta}% ·{' '}
                                {r.consecuencia === 'descuento_pago'
                                  ? `Desc. −$${r.valor}`
                                  : `Peso KPI: ${r.valor}%`}
                              </div>
                            </div>
                            <div>
                              <span className="badge" style={{
                                background: r.consecuencia === 'descuento_pago' ? '#FEE2E2' : '#EDE9FE',
                                color: r.consecuencia === 'descuento_pago' ? 'var(--rojo)' : 'var(--morado)',
                                fontSize: 10,
                              }}>
                                {r.consecuencia === 'descuento_pago' ? '$ Descuento' : 'KPI Bono'}
                              </span>
                            </div>
                            <button
                              onClick={() => eliminarRegla(r.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 14 }}
                            >✕</button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal nueva cuadrilla */}
      <Modal
        open={modalNueva}
        onClose={() => setModalNueva(false)}
        title="Nueva cuadrilla"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalNueva(false)}>Cancelar</button>
            <button className="btn btn-ambar" onClick={guardarCuadrilla} disabled={!formCuadrilla.nombre}>
              Crear cuadrilla
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Nombre de la cuadrilla</label>
          <input
            value={formCuadrilla.nombre}
            onChange={e => setFormCuadrilla(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej: Cuadrilla MTY-Externa-2"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Tipo</label>
            <select value={formCuadrilla.tipo} onChange={e => setFormCuadrilla(f => ({
              ...f, tipo: e.target.value,
              consecuencia: e.target.value === 'externa' ? 'descuento_pago' : 'afecta_kpi_bono'
            }))}>
              <option value="externa">Externa</option>
              <option value="interna">Interna</option>
            </select>
          </div>
          <div className="form-group">
            <label>Zona</label>
            <select value={formCuadrilla.zona} onChange={e => setFormCuadrilla(f => ({ ...f, zona: e.target.value }))}>
              {zonas.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>PM responsable</label>
            <select value={formCuadrilla.pm_id} onChange={e => setFormCuadrilla(f => ({ ...f, pm_id: e.target.value }))}>
              {PMs.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.zona})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Esquema de pago</label>
            <select value={formCuadrilla.esquema_pago} onChange={e => setFormCuadrilla(f => ({ ...f, esquema_pago: e.target.value }))}>
              {ESQUEMAS_PAGO.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
        </div>
        {formCuadrilla.tipo === 'externa' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--borde)' }}>
            <label className="toggle">
              <input
                type="checkbox"
                checked={formCuadrilla.aplica_vueltas}
                onChange={e => setFormCuadrilla(f => ({ ...f, aplica_vueltas: e.target.checked }))}
              />
              <span className="toggle-slider" />
            </label>
            <div>
              <div className="fw-600" style={{ fontSize: 13 }}>Aplica vueltas</div>
              <div className="text-xs text-gray">Viáticos por zonas extendidas (MTY/SLT confirmados)</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal nueva regla KPI */}
      <Modal
        open={!!modalRegla}
        onClose={() => setModalRegla(null)}
        title="Agregar regla KPI"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalRegla(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={guardarRegla} disabled={!formRegla.meta || !formRegla.valor}>
              Guardar regla
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>KPI</label>
          <select value={formRegla.kpi} onChange={e => setFormRegla(f => ({ ...f, kpi: e.target.value }))}>
            {KPIS_OPCIONES.map(k => <option key={k} value={k}>{kpisLabels[k] || k}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Meta (%)</label>
            <input
              type="number" min="0" max="100"
              value={formRegla.meta}
              onChange={e => setFormRegla(f => ({ ...f, meta: e.target.value }))}
              placeholder="90"
            />
          </div>
          <div className="form-group">
            <label>Consecuencia</label>
            <select value={formRegla.consecuencia} onChange={e => setFormRegla(f => ({ ...f, consecuencia: e.target.value }))}>
              <option value="descuento_pago">Descuento al pago (externa)</option>
              <option value="afecta_kpi_bono">Afecta KPI bono (interna)</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>{formRegla.consecuencia === 'descuento_pago' ? 'Monto descuento ($)' : 'Peso en bono (%)'}</label>
          <input
            type="number" min="0"
            value={formRegla.valor}
            onChange={e => setFormRegla(f => ({ ...f, valor: e.target.value }))}
            placeholder={formRegla.consecuencia === 'descuento_pago' ? '500' : '30'}
          />
        </div>
        {formRegla.consecuencia === 'afecta_kpi_bono' && (
          <div style={{ fontSize: 11, color: '#92400E', background: '#FEF3C7', padding: '8px 12px', borderRadius: 6 }}>
            🔴 Pregunta abierta #10: El cálculo del bono en $ para cuadrillas internas aún no está definido. Esta regla solo registra el peso del KPI para uso futuro.
          </div>
        )}
      </Modal>
    </>
  );
}
