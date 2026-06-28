import { useState, useEffect, useCallback } from 'react';
import { getCuadrillas, getUsuarios, crearCuadrilla, actualizarCuadrilla, crearRegla, eliminarRegla } from '../lib/api';
import Modal from '../components/Modal';

const ZONAS = ['MTY', 'SLT', 'TRC', 'MVA'];
const ESQUEMAS = [
  { value: 'por_instalacion', label: 'Por instalación' },
  { value: 'por_panel',       label: 'Por panel' },
  { value: 'salario_bono',    label: 'Salario + bono' },
  { value: 'otro',            label: 'Otro' },
];
const KPIS = [
  { value: 'instalaciones_a_tiempo', label: 'Instalaciones a tiempo' },
  { value: 'reportes_completos',     label: 'Reportes completos' },
  { value: 'sin_correcciones',       label: 'Sin correcciones' },
];

export default function VistaL_Cuadrillas() {
  const [cuadrillas, setCuadrillas] = useState([]);
  const [pms, setPms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandida, setExpandida] = useState(null);
  const [modalNueva, setModalNueva] = useState(false);
  const [editId, setEditId] = useState(null);
  const [modalRegla, setModalRegla] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [formC, setFormC] = useState({ nombre: '', tipo: 'externa', zona: 'MTY', pm_id: '', aplica_vueltas: false, esquema_pago: 'por_instalacion' });
  const [formR, setFormR] = useState({ kpi: 'instalaciones_a_tiempo', meta: '', consecuencia: 'descuento_pago', valor: '' });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [cdata, udata] = await Promise.all([getCuadrillas(), getUsuarios({ rol: 'pm_domestico' })]);
      setCuadrillas(cdata);
      setPms(udata);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const resetForm = () => setFormC({ nombre: '', tipo: 'externa', zona: 'MTY', pm_id: '', aplica_vueltas: false, esquema_pago: 'por_instalacion' });

  const abrirNueva = () => { setEditId(null); resetForm(); setModalNueva(true); };

  const abrirEditar = (c) => {
    setEditId(c.id);
    setFormC({ nombre: c.nombre, tipo: c.tipo, zona: c.zona, pm_id: c.pm_id || '', aplica_vueltas: c.aplica_vueltas, esquema_pago: c.esquema_pago });
    setModalNueva(true);
  };

  const cerrarModal = () => { setModalNueva(false); setEditId(null); resetForm(); };

  const handleGuardarCuadrilla = async () => {
    if (!formC.nombre) return;
    setGuardando(true);
    try {
      const payload = { ...formC, pm_id: formC.pm_id || null };
      if (editId) await actualizarCuadrilla(editId, payload);
      else        await crearCuadrilla(payload);
      cerrarModal();
      cargar();
    } catch (e) { alert('Error: ' + e.message); }
    finally { setGuardando(false); }
  };

  const handleToggleVueltas = async (c) => {
    await actualizarCuadrilla(c.id, { aplica_vueltas: !c.aplica_vueltas });
    cargar();
  };

  const handleToggleActiva = async (c) => {
    await actualizarCuadrilla(c.id, { activa: !c.activa });
    cargar();
  };

  const handleCrearRegla = async () => {
    setGuardando(true);
    try {
      await crearRegla({ cuadrilla_id: modalRegla, ...formR, meta: parseFloat(formR.meta), valor: parseFloat(formR.valor) });
      setModalRegla(null);
      setFormR({ kpi: 'instalaciones_a_tiempo', meta: '', consecuencia: 'descuento_pago', valor: '' });
      cargar();
    } catch (e) { alert('Error: ' + e.message); }
    finally { setGuardando(false); }
  };

  const handleEliminarRegla = async (id) => {
    if (!confirm('¿Eliminar esta regla?')) return;
    await eliminarRegla(id);
    cargar();
  };

  if (loading) return <div className="page-body"><div className="empty-state"><div className="es-icon">⏳</div><p>Cargando…</p></div></div>;

  return (
    <>
      <div className="page-header">
        <div><h2>👷 Configuración de Cuadrillas</h2><div className="sub">Equipos de instalación · KPIs y reglas por cuadrilla</div></div>
        <button className="btn btn-ambar" onClick={abrirNueva}>+ Nueva cuadrilla</button>
      </div>

      <div className="page-body">
        {cuadrillas.length === 0 && (
          <div className="empty-state"><div className="es-icon">👷</div><p>Sin cuadrillas configuradas. Crea la primera.</p></div>
        )}

        {cuadrillas.map(c => {
          const pm = pms.find(u => u.id === c.pm_id);
          const reglas = c.reglas || [];
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
                      <span className="badge" style={{ background: '#F3F4F6', color: '#374151', fontSize: 10 }}>{ESQUEMAS.find(e => e.value === c.esquema_pago)?.label}</span>
                      {!c.activa && <span className="badge" style={{ background: '#FEE2E2', color: 'var(--rojo)' }}>Inactiva</span>}
                    </div>
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setExpandida(isExpandida ? null : c.id)}>
                  {isExpandida ? '▲ Ocultar' : '▼ Configurar'}
                </button>
              </div>

              {isExpandida && (
                <div className="cuadrilla-card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gris-secundario)' }}>Configuración</div>
                        <button className="btn btn-outline btn-sm" onClick={() => abrirEditar(c)}>✏️ Editar</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>PM responsable</span><strong>{pm?.nombre || '—'}</strong></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Esquema de pago</span><strong>{ESQUEMAS.find(e => e.value === c.esquema_pago)?.label}</strong></div>
                        <hr className="divider" />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                          <div>
                            <div className="fw-600" style={{ fontSize: 13 }}>🚗 Aplica vueltas</div>
                            <div className="text-xs text-gray">Viáticos a zonas extendidas</div>
                          </div>
                          <label className="toggle">
                            <input type="checkbox" checked={c.aplica_vueltas} onChange={() => handleToggleVueltas(c)} />
                            <span className="toggle-slider" />
                          </label>
                        </div>
                        {c.tipo === 'externa' && c.zona === 'MVA' && (
                          <div style={{ fontSize: 11, color: '#92400E', background: '#FEF3C7', padding: '6px 10px', borderRadius: 6 }}>
                            ⚠️ Pregunta abierta #9: ¿Monclova paga vueltas?
                          </div>
                        )}
                        {c.tipo === 'interna' && (
                          <div style={{ fontSize: 11, color: '#0369A1', background: '#E0F2FE', padding: '6px 10px', borderRadius: 6 }}>
                            ℹ️ Cuadrilla interna — vueltas no aplican.
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="fw-600" style={{ fontSize: 13 }}>Cuadrilla activa</div>
                          <label className="toggle">
                            <input type="checkbox" checked={c.activa} onChange={() => handleToggleActiva(c)} />
                            <span className="toggle-slider" />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gris-secundario)' }}>Reglas KPI ({reglas.filter(r => r.activa).length})</div>
                        <button className="btn btn-outline btn-sm" onClick={() => {
                          setModalRegla(c.id);
                          setFormR(f => ({ ...f, consecuencia: c.tipo === 'externa' ? 'descuento_pago' : 'afecta_kpi_bono' }));
                        }}>+ Regla</button>
                      </div>
                      {reglas.filter(r => r.activa).length === 0 ? (
                        <div className="text-gray text-sm">Sin reglas configuradas</div>
                      ) : reglas.filter(r => r.activa).map(r => (
                        <div key={r.id} className="regla-item">
                          <div style={{ flex: 1 }}>
                            <div className="fw-600" style={{ fontSize: 12 }}>{KPIS.find(k => k.value === r.kpi)?.label || r.kpi}</div>
                            <div className="text-xs text-gray">
                              Meta: {r.meta}% · {r.consecuencia === 'descuento_pago' ? `Desc. −$${r.valor}` : `Peso KPI: ${r.valor}%`}
                            </div>
                          </div>
                          <span className="badge" style={{ background: r.consecuencia === 'descuento_pago' ? '#FEE2E2' : '#EDE9FE', color: r.consecuencia === 'descuento_pago' ? 'var(--rojo)' : 'var(--morado)', fontSize: 10 }}>
                            {r.consecuencia === 'descuento_pago' ? '$ Descuento' : 'KPI Bono'}
                          </span>
                          <button onClick={() => handleEliminarRegla(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 14 }}>✕</button>
                        </div>
                      ))}
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
        onClose={cerrarModal}
        title={editId ? 'Editar cuadrilla' : 'Nueva cuadrilla'}
        footer={
          <>
            <button className="btn btn-outline" onClick={cerrarModal}>Cancelar</button>
            <button className="btn btn-ambar" onClick={handleGuardarCuadrilla} disabled={!formC.nombre || guardando}>
              {guardando ? 'Guardando…' : (editId ? 'Guardar cambios' : 'Crear cuadrilla')}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Nombre</label>
          <input value={formC.nombre} onChange={e => setFormC(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Cuadrilla MTY-Externa-2" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Tipo</label>
            <select value={formC.tipo} onChange={e => setFormC(f => ({ ...f, tipo: e.target.value }))}>
              <option value="externa">Externa</option>
              <option value="interna">Interna</option>
            </select>
          </div>
          <div className="form-group">
            <label>Zona</label>
            <select value={formC.zona} onChange={e => setFormC(f => ({ ...f, zona: e.target.value }))}>
              {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>PM responsable</label>
            <select value={formC.pm_id} onChange={e => setFormC(f => ({ ...f, pm_id: e.target.value }))}>
              <option value="">Sin asignar</option>
              {pms.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.zona})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Esquema de pago</label>
            <select value={formC.esquema_pago} onChange={e => setFormC(f => ({ ...f, esquema_pago: e.target.value }))}>
              {ESQUEMAS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
        </div>
        {formC.tipo === 'externa' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--borde)' }}>
            <label className="toggle">
              <input type="checkbox" checked={formC.aplica_vueltas} onChange={e => setFormC(f => ({ ...f, aplica_vueltas: e.target.checked }))} />
              <span className="toggle-slider" />
            </label>
            <div>
              <div className="fw-600" style={{ fontSize: 13 }}>Aplica vueltas</div>
              <div className="text-xs text-gray">MTY/SLT confirmados · MVA pendiente de definir</div>
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
            <button className="btn btn-primary" onClick={handleCrearRegla} disabled={!formR.meta || !formR.valor || guardando}>
              {guardando ? 'Guardando…' : 'Guardar regla'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>KPI</label>
          <select value={formR.kpi} onChange={e => setFormR(f => ({ ...f, kpi: e.target.value }))}>
            {KPIS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Meta (%)</label>
            <input type="number" min="0" max="100" value={formR.meta} onChange={e => setFormR(f => ({ ...f, meta: e.target.value }))} placeholder="90" />
          </div>
          <div className="form-group">
            <label>Consecuencia</label>
            <select value={formR.consecuencia} onChange={e => setFormR(f => ({ ...f, consecuencia: e.target.value }))}>
              <option value="descuento_pago">Descuento al pago (externa)</option>
              <option value="afecta_kpi_bono">Afecta KPI bono (interna)</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>{formR.consecuencia === 'descuento_pago' ? 'Monto descuento ($)' : 'Peso en bono (%)'}</label>
          <input type="number" min="0" value={formR.valor} onChange={e => setFormR(f => ({ ...f, valor: e.target.value }))} placeholder={formR.consecuencia === 'descuento_pago' ? '500' : '30'} />
        </div>
        {formR.consecuencia === 'afecta_kpi_bono' && (
          <div style={{ fontSize: 11, color: '#92400E', background: '#FEF3C7', padding: '8px 12px', borderRadius: 6 }}>
            🔴 Pregunta abierta #10: el cálculo del bono en $ aún no está definido. Esta regla registra el peso del KPI para uso futuro.
          </div>
        )}
      </Modal>
    </>
  );
}
