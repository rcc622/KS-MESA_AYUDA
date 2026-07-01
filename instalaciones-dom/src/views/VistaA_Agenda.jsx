import { useState, useEffect, useCallback } from 'react';
import { getProyectos, getCuadrillas, crearProyecto, agregarBitacora, eliminarProyectos, mensajeError } from '../lib/api';
import { sincronizarEventoCalendar } from '../lib/gcal';
import SLABadge from '../components/SLABadge';
import EstatusBadge from '../components/EstatusBadge';
import FiltroColumna from '../components/FiltroColumna';
import Modal from '../components/Modal';

// Columnas con filtro estilo Excel y cómo obtener su valor por proyecto.
const COLS_FILTRO = {
  cliente:   p => p.cliente || '—',
  zona:      p => p.zona || '—',
  cuadrilla: p => p.cuadrilla?.nombre || 'Sin asignar',
  estatus:   p => p.estatus || '—',
};

const ZONAS = ['MTY', 'SLT', 'TRC', 'MVA'];

export default function VistaA_Agenda({ setVista, setProyectoSeleccionado, usuarioActual }) {
  const [proyectos, setProyectos] = useState([]);
  const [cuadrillas, setCuadrillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState({});        // { campo: Set(valores) | null(todos) }
  const [orden, setOrden] = useState(null);          // { campo, dir }
  const [seleccion, setSeleccion] = useState(new Set()); // ids de filas marcadas
  const [verTodos, setVerTodos] = useState(false);   // admin: incluir completados/cancelados
  const [borrando, setBorrando] = useState(false);
  const [modalAgendar, setModalAgendar] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const PROY_VACIO = {
    folio: '', folio_odoo: '', vendedor: '', cliente: '', correo_cliente: '', direccion: '', maps_url: '',
    zona: 'MTY', cuadrilla_id: '', fecha_agenda: '', paneles: '', kw: '', notas: '',
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
  const base = verTodos ? proyectos : activos;   // admin puede ver todos para limpiar pruebas

  const valorDe = (p, campo) => COLS_FILTRO[campo]?.(p) ?? '';
  const valoresCol = (campo) => {
    const m = new Map();
    base.forEach(p => { const v = valorDe(p, campo); if (!m.has(v)) m.set(v, { val: v, label: v }); });
    return [...m.values()].sort((a, b) => String(a.label).localeCompare(String(b.label), 'es', { numeric: true }));
  };

  let filtered = base.filter(p => {
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!(p.cliente || '').toLowerCase().includes(q) && !(p.folio || '').toLowerCase().includes(q)) return false;
    }
    for (const campo of Object.keys(COLS_FILTRO)) {
      const sel = filtros[campo];
      if (sel != null && !sel.has(valorDe(p, campo))) return false;
    }
    return true;
  });
  if (orden) {
    const dir = orden.dir === 'desc' ? -1 : 1;
    filtered = [...filtered].sort((a, b) =>
      String(valorDe(a, orden.campo)).localeCompare(String(valorDe(b, orden.campo)), 'es', { numeric: true }) * dir);
  }

  const setFiltroCol = (campo, sel) => setFiltros(f => ({ ...f, [campo]: sel }));
  const fcol = (campo) => (
    <FiltroColumna
      valores={valoresCol(campo)}
      seleccionados={filtros[campo] ?? null}
      onChange={sel => setFiltroCol(campo, sel)}
      onSort={dir => setOrden({ campo, dir })}
      sortDir={orden?.campo === campo ? orden.dir : null}
    />
  );

  const idsFiltrados = filtered.map(p => p.id);
  const todosMarcados = idsFiltrados.length > 0 && idsFiltrados.every(id => seleccion.has(id));
  const toggleTodos = () => setSeleccion(prev => {
    const s = new Set(prev);
    if (todosMarcados) idsFiltrados.forEach(id => s.delete(id));
    else idsFiltrados.forEach(id => s.add(id));
    return s;
  });
  const toggleUno = (id) => setSeleccion(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const eliminarSeleccion = async () => {
    const ids = [...seleccion];
    if (!ids.length) return;
    if (!confirm(`¿Eliminar ${ids.length} proyecto(s) de la base de datos? También se borra su bitácora y trámites CFE. Esta acción NO se puede deshacer.`)) return;
    setBorrando(true);
    try { await eliminarProyectos(ids); setSeleccion(new Set()); cargar(); }
    catch (e) { alert(mensajeError(e)); }
    finally { setBorrando(false); }
  };

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
        vendedor:     nuevoProy.vendedor || null,
        folio_odoo:   nuevoProy.folio_odoo || null,
        correo_cliente: nuevoProy.correo_cliente || null,
        direccion:    nuevoProy.direccion || null,
        maps_url:     nuevoProy.maps_url || null,
        fecha_agenda: nuevoProy.fecha_agenda || null,
        paneles,
        kw: nuevoProy.kw ? parseFloat(nuevoProy.kw) : null,
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
      // Si se creó con fecha y cuadrilla, sincronizar evento en Google Calendar
      if (payload.fecha_agenda && payload.cuadrilla_id) {
        sincronizarEventoCalendar(proyecto.id, 'crear');
      }
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

  const esAdmin    = usuarioActual?.rol === 'admin';
  const puedeCrear = ['admin', 'pm_domestico'].includes(usuarioActual?.rol);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>📅 Agenda e Instalaciones</h2>
          <div className="sub">Proyectos activos · SLA máx. 18 días</div>
        </div>
        {puedeCrear && (
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
          <input type="text" placeholder="🔍 Buscar cliente por nombre o folio…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <button className="btn btn-outline btn-sm" onClick={cargar}>↺ Actualizar</button>
          {esAdmin && (
            <label className="text-xs" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gris-secundario)', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={verTodos} onChange={e => setVerTodos(e.target.checked)} /> Ver todos (incl. completados)
            </label>
          )}
          <span className="text-xs text-gray" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>Mostrando {filtered.length}</span>
        </div>

        {esAdmin && seleccion.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 14px', marginBottom: 12 }}>
            <span className="text-sm" style={{ fontWeight: 600, color: '#991B1B' }}>{seleccion.size} seleccionado(s)</span>
            <button className="btn btn-sm" style={{ background: 'var(--rojo)', color: 'white' }} onClick={eliminarSeleccion} disabled={borrando}>
              {borrando ? 'Eliminando…' : '🗑️ Eliminar de la base'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setSeleccion(new Set())}>Quitar selección</button>
          </div>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {esAdmin && <th style={{ width: 34 }}><input type="checkbox" checked={todosMarcados} onChange={toggleTodos} aria-label="Seleccionar todos" /></th>}
                <th>Folio</th>
                <th><span className="th-flex">Cliente {fcol('cliente')}</span></th>
                <th><span className="th-flex">Zona {fcol('zona')}</span></th>
                <th><span className="th-flex">Cuadrilla {fcol('cuadrilla')}</span></th>
                <th>Fecha agenda</th><th>SLA</th>
                <th><span className="th-flex">Estatus {fcol('estatus')}</span></th>
                <th>Pago</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={esAdmin ? 10 : 9} className="text-center text-gray" style={{ padding: 32 }}>Sin proyectos con estos filtros</td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} style={{ background: seleccion.has(p.id) ? '#EFF6FF' : undefined }}>
                  {esAdmin && <td><input type="checkbox" checked={seleccion.has(p.id)} onChange={() => toggleUno(p.id)} aria-label="Seleccionar fila" /></td>}
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
            <label>Vendedor</label>
            <input value={nuevoProy.vendedor} onChange={e => setNuevoProy(p => ({ ...p, vendedor: e.target.value }))} placeholder="Nombre del vendedor" />
          </div>
          <div className="form-group">
            <label>Cliente</label>
            <input value={nuevoProy.cliente} onChange={e => setNuevoProy(p => ({ ...p, cliente: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Correo del cliente <span className="text-gray text-xs">(opcional)</span></label>
            <input type="email" value={nuevoProy.correo_cliente} onChange={e => setNuevoProy(p => ({ ...p, correo_cliente: e.target.value }))} placeholder="cliente@ejemplo.com" />
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
              <input type="number" min="0" placeholder="0" value={nuevoProy.paneles} onChange={e => setNuevoProy(p => ({ ...p, paneles: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Potencia por panel (W)</label>
              <input type="number" min="0" placeholder="0" value={nuevoProy.panel_potencia_w} onChange={e => setNuevoProy(p => ({ ...p, panel_potencia_w: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Marca de panel</label>
              <input type="text" placeholder="Ej: Trina, JA Solar" value={nuevoProy.panel_marca} onChange={e => setNuevoProy(p => ({ ...p, panel_marca: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tamaño del sistema (kWp)</label>
              <input type="number" min="0" step="0.01" placeholder="0" value={nuevoProy.kw} onChange={e => setNuevoProy(p => ({ ...p, kw: e.target.value }))} />
            </div>
          </div>

          <div className="form-section-label">Inversor</div>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select value={nuevoProy.inversor_tipo} onChange={e => setNuevoProy(p => ({ ...p, inversor_tipo: e.target.value }))}>
                <option value="">Selecciona…</option>
                <option value="central">Central</option>
                <option value="hibrido">Híbrido</option>
                <option value="microinversor">Microinversor</option>
              </select>
            </div>
            <div className="form-group">
              <label>Cantidad de inversores</label>
              <input type="number" min="0" placeholder="0" value={nuevoProy.inversor_cantidad} onChange={e => setNuevoProy(p => ({ ...p, inversor_cantidad: e.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Capacidad del inversor (kW)</label>
              <input type="number" min="0" step="0.1" placeholder="0" value={nuevoProy.inversor_capacidad_kw} onChange={e => setNuevoProy(p => ({ ...p, inversor_capacidad_kw: e.target.value }))} />
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
