import { useState } from 'react';
import { proyectos, cuadrillas, usuarios, zonas } from '../data/mockData';
import SLABadge from '../components/SLABadge';
import EstatusBadge from '../components/EstatusBadge';
import Modal from '../components/Modal';

const cuadrillasMap = Object.fromEntries(cuadrillas.map(c => [c.id, c]));
const usuariosMap = Object.fromEntries(usuarios.map(u => [u.id, u]));

export default function VistaA_Agenda({ setVista, setProyectoSeleccionado }) {
  const [filtrZona, setFiltrZona] = useState('');
  const [filtrEstatus, setFiltrEstatus] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modalAgendar, setModalAgendar] = useState(false);
  const [nuevoProy, setNuevoProy] = useState({
    folio: 'KS-2026-00', folio_odoo: '', cliente: '', direccion: '',
    zona: 'MTY', cuadrilla_id: '', fecha_agenda: '', paneles: '', kw: '', notas: '',
  });
  const [proyList, setProjList] = useState(proyectos);

  const activos = proyList.filter(p =>
    p.estatus !== 'completado' && p.estatus !== 'cancelado'
  );

  const filtered = activos.filter(p => {
    const matchZona = !filtrZona || p.zona === filtrZona;
    const matchEst = !filtrEstatus || p.estatus === filtrEstatus;
    const matchBus = !busqueda ||
      p.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.folio.toLowerCase().includes(busqueda.toLowerCase());
    return matchZona && matchEst && matchBus;
  });

  const stats = {
    total: activos.length,
    enSLA: activos.filter(p => p.dias_en_etapa <= 15).length,
    criticos: activos.filter(p => p.dias_en_etapa > 15).length,
    agendados: activos.filter(p => p.estatus === 'agendado').length,
  };

  const handleAgendar = (e) => {
    e.preventDefault();
    const nuevo = {
      ...nuevoProy,
      id: `p${Date.now()}`,
      estatus: 'agendado',
      dias_en_etapa: 0,
      fecha_instalacion: null,
      anticipo_pagado: false, instalado_cobrado: false, medidor_pagado: false,
    };
    setProjList(prev => [...prev, nuevo]);
    setModalAgendar(false);
    setNuevoProy({ folio: 'KS-2026-00', folio_odoo: '', cliente: '', direccion: '', zona: 'MTY', cuadrilla_id: '', fecha_agenda: '', paneles: '', kw: '', notas: '' });
  };

  const handleVerDetalle = (p) => {
    setProyectoSeleccionado(p);
    setVista('detalle');
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>📅 Agenda e Instalaciones</h2>
          <div className="sub">Proyectos activos · SLA máx. 18 días</div>
        </div>
        <button className="btn btn-ambar" onClick={() => setModalAgendar(true)}>
          + Agendar instalación
        </button>
      </div>

      <div className="page-body">
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-val">{stats.total}</div>
            <div className="stat-label">Proyectos activos</div>
          </div>
          <div className="stat-card verde">
            <div className="stat-val">{stats.enSLA}</div>
            <div className="stat-label">Dentro de SLA</div>
          </div>
          <div className="stat-card rojo">
            <div className="stat-val">{stats.criticos}</div>
            <div className="stat-label">Críticos (&gt;15 días)</div>
          </div>
          <div className="stat-card ambar">
            <div className="stat-val">{stats.agendados}</div>
            <div className="stat-label">Por instalar</div>
          </div>
        </div>

        <div className="filters-bar">
          <input
            type="text"
            placeholder="🔍 Buscar cliente o folio…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          <select value={filtrZona} onChange={e => setFiltrZona(e.target.value)}>
            <option value="">Todas las zonas</option>
            {zonas.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <select value={filtrEstatus} onChange={e => setFiltrEstatus(e.target.value)}>
            <option value="">Todos los estatus</option>
            <option value="agendado">Agendado</option>
            <option value="en_progreso">En progreso</option>
            <option value="reagendado">Reagendado</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Cliente</th>
                <th>Zona</th>
                <th>Cuadrilla</th>
                <th>Fecha agenda</th>
                <th>SLA</th>
                <th>Estatus</th>
                <th>Pago</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-gray" style={{ padding: 32 }}>Sin proyectos que coincidan con los filtros</td></tr>
              )}
              {filtered.map(p => {
                const cuadrilla = cuadrillasMap[p.cuadrilla_id];
                return (
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
                      <div style={{ fontSize: 12 }}>{cuadrilla?.nombre || '—'}</div>
                      <div className="text-xs">
                        <span className={`badge badge-tipo-${cuadrilla?.tipo || 'externa'}`} style={{ fontSize: 10 }}>
                          {cuadrilla?.tipo || '—'}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{p.fecha_agenda || '—'}</td>
                    <td><SLABadge dias={p.dias_en_etapa} /></td>
                    <td><EstatusBadge estatus={p.estatus} /></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 10, color: p.anticipo_pagado ? '#16A34A' : '#D64545' }}>
                          {p.anticipo_pagado ? '✅' : '⭕'} Anticipo
                        </span>
                        <span style={{ fontSize: 10, color: p.instalado_cobrado ? '#16A34A' : '#9CA3AF' }}>
                          {p.instalado_cobrado ? '✅' : '⭕'} Enganche
                        </span>
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleVerDetalle(p)}
                      >
                        Ver →
                      </button>
                    </td>
                  </tr>
                );
              })}
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
            <button className="btn btn-ambar" onClick={handleAgendar}>Agendar instalación</button>
          </>
        }
      >
        <form onSubmit={handleAgendar}>
          <div className="form-row">
            <div className="form-group">
              <label>Folio KENET</label>
              <input value={nuevoProy.folio} onChange={e => setNuevoProy(p => ({ ...p, folio: e.target.value }))} required />
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
          <div className="form-row">
            <div className="form-group">
              <label>Zona</label>
              <select value={nuevoProy.zona} onChange={e => setNuevoProy(p => ({ ...p, zona: e.target.value }))}>
                {zonas.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Cuadrilla</label>
              <select value={nuevoProy.cuadrilla_id} onChange={e => setNuevoProy(p => ({ ...p, cuadrilla_id: e.target.value }))} required>
                <option value="">Seleccionar…</option>
                {cuadrillas.filter(c => c.activa).map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fecha de agenda</label>
              <input type="date" value={nuevoProy.fecha_agenda} onChange={e => setNuevoProy(p => ({ ...p, fecha_agenda: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Paneles / kW</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input placeholder="# paneles" type="number" value={nuevoProy.paneles} onChange={e => setNuevoProy(p => ({ ...p, paneles: e.target.value }))} />
                <input placeholder="kW" type="number" step="0.1" value={nuevoProy.kw} onChange={e => setNuevoProy(p => ({ ...p, kw: e.target.value }))} />
              </div>
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
