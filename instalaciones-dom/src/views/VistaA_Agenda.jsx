import { useState, useEffect, useCallback } from 'react';
import { getProyectos, getCuadrillas, crearProyecto, agregarBitacora, mensajeError } from '../lib/api';
import SLABadge from '../components/SLABadge';
import EstatusBadge from '../components/EstatusBadge';
import Modal from '../components/Modal';

const ZONAS = ['MTY', 'SLT', 'TRC', 'MVA'];

export default function VistaA_Agenda({ setVista, setProyectoSeleccionado, usuarioActual }) {
  const [proyectos, setProyectos] = useState([]);
  const [cuadrillas, setCuadrillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filtrZona, setFiltrZona] = useState('');
  const [filtrEstatus, setFiltrEstatus] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modalAgendar, setModalAgendar] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const WATTS_POR_PANEL = 600;   // base fija para calcular el tamaño del sistema (kWp)
  const PROY_VACIO = {
    folio: '', folio_odoo: '', cliente: '', direccion: '', maps_url: '',
    zona: 'MTY', cuadrilla_id: '', fecha_agenda: '', paneles: '', notas: '',
    panel_potencia_w: '', panel_marca: '',
    inversor_tipo: '', inversor_cantidad: '', inversor_capacidad_kw: '', inversor_marca: '',
  };
  const [nuevoProy, setNuevoProy] = useState(PROY_VACIO);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, cdata] = await Promise.all([
        getProyectos(),
        getCuadrillas({ activa: true }),
      ]);
      setProyectos(data);
      setCuadrillas(cdata);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const activos = proyectos.filter(p => p.estatus !== 'completado' && p.estatus !== 'cancelado');

  const filtered = activos.filter(p => {
    const matchZona = !filtrZona || p.zona === filtrZona;
    const matchEst  = !filtrEstatus || p.estatus === filtrEstatus;
    const matchBus  = !busqueda ||
      p.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.folio.toLowerCase().includes(busqueda.toLowerCase());
    return matchZona && matchEst && matchBus;
  });

  const stats = {
    total:     activos.length,
    enSLA:     activos.filter(p => p.dias_en_etapa <= 15).length,
    criticos:  activos.filter(p => p.dias_en_etapa > 15).length,
    agendados: activos.filter(p => p.estatus === 'agendado').length,
  };

  const handleAgendar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const paneles = nuevoProy.paneles ? parseInt(nuevoProy.paneles) : null;
      const payload = {
        ...nuevoProy,
        folio_odoo:   nuevoProy.folio_odoo || null,
        direccion:    nuevoProy.direccion || null,
        maps_url:     nuevoProy.maps_url || null,
        fecha_agenda: nuevoProy.fecha_agenda || null,
        paneles,
        kw: paneles ? (paneles * WATTS_POR_PANEL) / 1000 : null,   // auto: paneles × 600 W
        panel_potencia_w:      nuevoProy.panel_potencia_w ? parseInt(nuevoProy.panel_potencia_w) : null,
        panel_marca:           nuevoProy.panel_marca || null,
        inversor_tipo:         nuevoProy.inversor_tipo || null,
        inversor_cantidad:     nuevoProy.inversor_cantidad ? parseInt(nuevoProy.inversor_cantidad) : null,
        inversor_capacidad_kw: nuevoProy.inversor_capacidad_kw ? parseFloat(nuevoProy.inversor_capacidad_kw) : null,
        inversor_marca:        nuevoProy.inversor_marca || null,
        cuadrilla_id: nuevoProy.cuadrilla_id || null,
        estatus: 'agendado',
        dias_en_etapa: 0,
      };
      const proyecto = await crearProyecto(payload);
      await agregarBitacora({
        proyecto_id: proyecto.id,
        tipo: 'agenda',
        descripcion: nuevoProy.fecha_agenda
          ? `Proyecto agendado para ${nuevoProy.fecha_agenda}`
          : 'Proyecto creado sin fecha de agenda (por agendar)',
        usuario_id: usuarioActual?.id ?? null,
      });
      setModalAgendar(false);
      setNuevoProy(PROY_VACIO);
      cargar();
    } catch (e) {
      alert(mensajeError(e));
    } finally {
      setGuardando(false);
    }
  };

  const handleVerDetalle = (p) => {
    setProyectoSeleccionado(p);
    setVista('detalle');
  };

  if (loading) return <div className="page-body"><div className="empty-state"><div className="es-icon">⏳</div><p>Cargando proyectos…</p></div></div>;
  if (error)   return <div className="page-body"><div className="empty-state"><div className="es-icon">❌</div><p>Error: {error}</p><button className="btn btn-primary mt-16" onClick={cargar}>Reintentar</button></div></div>;

  const kwpAuto = nuevoProy.paneles ? +((parseInt(nuevoProy.paneles) * WATTS_POR_PANEL) / 1000).toFixed(2) : '';
  const esAdmin = usuarioActual?.rol === 'admin';

  return (
    <>
      <div className="page-header">
        <div>
          <h2>📅 Agenda e Instalaciones</h2>
          <div className="sub">Proyectos activos · SLA máx. 18 días</div>
        </div>
        {esAdmin && (
          <button className="btn btn-ambar" onClick={() => setModalAgendar(true)}>
            + Agendar instalación
          </button>
        )}
      </div>

      <div className="page-body">
        <div className="stats-row">
          <div className="stat-card"><div className="stat-val">{stats.total}</div><div className="stat-label">Proyectos activos</div></div>
          <div className="stat-card verde"><div className="stat-val">{stats.enSLA}</div><div className="stat-label">Dentro de SLA</div></div>
          <div className="stat-card rojo"><div className="stat-val">{stats.criticos}</div><div className="stat-label">Críticos (&gt;15 días)</div></div>
          <div className="stat-card ambar"><div className="stat-val">{stats.agendados}</div><div className="stat-label">Por instalar</div></div>
        </div>

        <div className="filters-bar">
          <input type="text" placeholder="🔍 Buscar cliente o folio…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select value={filtrZona} onChange={e => setFiltrZona(e.target.value)}>
            <option value="">Todas las zonas</option>
            {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <select value={filtrEstatus} onChange={e => setFiltrEstatus(e.target.value)}>
            <option value="">Todos los estatus</option>
            <option value="agendado">Agendado</option>
            <option value="en_progreso">En progreso</option>
            <option value="reagendado">Reagendado</option>
          </select>
          <button className="btn btn-outline btn-sm" onClick={cargar}>↺ Actualizar</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Folio</th><th>Cliente</th><th>Zona</th><th>Cuadrilla</th>
                <th>Fecha agenda</th><th>SLA</th><th>Estatus</th><th>Pago</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-gray" style={{ padding: 32 }}>Sin proyectos con estos filtros</td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="fw-700 text-blue" style={{ fontSize: 12 }}>{p.folio}</div>
                    <div className="text-xs text-gray">{p.folio_odoo}</div>
                  </td>
                  <td>
                    <div className="fw-600">{p.cliente}</div>
                    <div className="text-xs text-gray" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.direccion}</div>
                  </td>
                  <td><span className="badge badge-zona">{p.zona}</span></td>
                  <td>
                    <div style={{ fontSize: 12 }}>{p.cuadrilla?.nombre || '—'}</div>
                    {p.cuadrilla && <span className={`badge badge-tipo-${p.cuadrilla.tipo}`} style={{ fontSize: 10 }}>{p.cuadrilla.tipo}</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>{p.fecha_agenda || '—'}</td>
                  <td><SLABadge dias={p.dias_en_etapa} /></td>
                  <td><EstatusBadge estatus={p.estatus} fecha={p.fecha_agenda} /></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 10, color: p.anticipo_pagado ? '#16A34A' : '#D64545' }}>{p.anticipo_pagado ? '✅' : '⭕'} Anticipo</span>
                      <span style={{ fontSize: 10, color: p.instalado_cobrado ? '#16A34A' : '#9CA3AF' }}>{p.instalado_cobrado ? '✅' : '⭕'} Enganche</span>
                    </div>
                  </td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => handleVerDetalle(p)}>Ver →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalAgendar}
        onClose={() => setModalAgendar(false)}
        title="Agendar nueva instalación"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalAgendar(false)}>Cancelar</button>
            <button className="btn btn-ambar" onClick={handleAgendar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Agendar instalación'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAgendar}>
          <div className="form-row">
            <div className="form-group">
              <label>Folio KENET</label>
              <input value={nuevoProy.folio} onChange={e => setNuevoProy(p => ({ ...p, folio: e.target.value }))} placeholder="KS-2026-0050" required />
            </div>
            <div className="form-group">
              <label>OV Odoo (S#####)</label>
              <input value={nuevoProy.folio_odoo} onChange={e => setNuevoProy(p => ({ ...p, folio_odoo: e.target.value }))} placeholder="S10050" />
            </div>
          </div>
          <div className="form-group">
            <label>Cliente</label>
            <input value={nuevoProy.cliente} onChange={e => setNuevoProy(p => ({ ...p, cliente: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input value={nuevoProy.direccion} onChange={e => setNuevoProy(p => ({ ...p, direccion: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Link de Google Maps <span className="text-gray text-xs">(opcional)</span></label>
            <input type="url" value={nuevoProy.maps_url} onChange={e => setNuevoProy(p => ({ ...p, maps_url: e.target.value }))} placeholder="https://maps.app.goo.gl/…" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Zona</label>
              <select value={nuevoProy.zona} onChange={e => setNuevoProy(p => ({ ...p, zona: e.target.value }))}>
                {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Cuadrilla</label>
              <select value={nuevoProy.cuadrilla_id} onChange={e => setNuevoProy(p => ({ ...p, cuadrilla_id: e.target.value }))}>
                <option value="">Sin asignar</option>
                {cuadrillas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fecha de agenda <span className="text-gray text-xs">(opcional)</span></label>
              <input type="date" value={nuevoProy.fecha_agenda} onChange={e => setNuevoProy(p => ({ ...p, fecha_agenda: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Paneles</label>
              <input type="number" placeholder="12" value={nuevoProy.paneles} onChange={e => setNuevoProy(p => ({ ...p, paneles: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Potencia por panel (W)</label>
              <input type="number" placeholder="600" value={nuevoProy.panel_potencia_w} onChange={e => setNuevoProy(p => ({ ...p, panel_potencia_w: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Marca de panel</label>
              <input type="text" placeholder="Ej: Trina, JA Solar" value={nuevoProy.panel_marca} onChange={e => setNuevoProy(p => ({ ...p, panel_marca: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tamaño del sistema (kWp) <span className="text-gray text-xs">· automático · {WATTS_POR_PANEL} W/panel</span></label>
              <input type="text" value={kwpAuto !== '' ? `${kwpAuto} kWp` : '—'} readOnly disabled />
            </div>
          </div>

          <div className="form-section-label">Inversor</div>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select value={nuevoProy.inversor_tipo} onChange={e => setNuevoProy(p => ({ ...p, inversor_tipo: e.target.value }))}>
                <option value="">Selecciona…</option>
                <option value="inversor">Inversor</option>
                <option value="microinversor">Microinversor</option>
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad de inversores</label>
              <input type="number" min="0" placeholder="1" value={nuevoProy.inversor_cantidad} onChange={e => setNuevoProy(p => ({ ...p, inversor_cantidad: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Capacidad del inversor (kW)</label>
              <input type="number" step="0.1" placeholder="5.0" value={nuevoProy.inversor_capacidad_kw} onChange={e => setNuevoProy(p => ({ ...p, inversor_capacidad_kw: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Marca de inversor</label>
              <input type="text" placeholder="Ej: Growatt, Huawei" value={nuevoProy.inversor_marca} onChange={e => setNuevoProy(p => ({ ...p, inversor_marca: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label>Notas</label>
            <textarea value={nuevoProy.notas} onChange={e => setNuevoProy(p => ({ ...p, notas: e.target.value }))} rows={2} />
          </div>
        </form>
      </Modal>
    </>
  );
}
