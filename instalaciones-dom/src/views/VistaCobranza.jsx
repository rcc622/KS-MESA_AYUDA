import { useState, useEffect } from 'react';
import { getProyectos, getTramitesCFE, actualizarProyecto, agregarBitacora, mensajeError } from '../lib/api';

const hoyISO = () => new Date().toISOString().slice(0, 10);
const diasDesde = (f) => { if (!f) return null; const d = Math.floor((Date.now() - new Date(f).getTime()) / 86400000); return isNaN(d) ? null : d; };

// Módulo de Cobranza — objetivo central de la Mesa de Ayuda: subir la efectividad de cobranza.
// Cobro por hitos (ver BASES/HANDOFF): anticipo (contrato) · enganche (instalación terminada)
// · restante + 1ª mensualidad (medidor bidireccional instalado).
export default function VistaCobranza({ usuarioActual }) {
  const [proyectos, setProyectos] = useState([]);
  const [tramites, setTramites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState('');

  const cargar = async () => {
    setLoading(true); setError('');
    try {
      const [p, t] = await Promise.all([getProyectos(), getTramitesCFE().catch(() => [])]);
      setProyectos(p); setTramites(t);
    } catch (e) { setError(mensajeError(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  // Marca un hito como cobrado (operativo; el monto se lee de Odoo, aquí solo el estatus).
  const marcarCobrado = async (p, campo, etiqueta) => {
    if (!confirm(`¿Confirmas que se cobró el ${etiqueta} de ${p.cliente}?`)) return;
    setGuardando(p.id + campo);
    try {
      await actualizarProyecto(p.id, { [campo]: true });
      await agregarBitacora({ proyecto_id: p.id, tipo: 'cobranza', descripcion: `💰 ${etiqueta} cobrado.`, usuario_id: usuarioActual?.id ?? null });
      cargar();
    } catch (e) { alert(mensajeError(e)); }
    finally { setGuardando(''); }
  };

  if (loading) return <div className="page-body"><div className="empty-state"><div className="es-icon">⏳</div><p>Cargando cobranza…</p></div></div>;

  const hoy = hoyISO();
  const medidorLlegado = new Map(tramites.filter(t => t.medidor_bidireccional_llego).map(t => [t.proyecto_id, t.fecha_medidor]));

  // Agenda confirmada = con fecha y aún por instalar (agendado/en progreso).
  const conFecha = proyectos.filter(p => p.fecha_agenda && ['agendado', 'en_progreso'].includes(p.estatus));
  const agendaHoy = conFecha.filter(p => p.fecha_agenda === hoy);
  const agendaProximos = conFecha.filter(p => p.fecha_agenda > hoy).sort((a, b) => a.fecha_agenda.localeCompare(b.fecha_agenda));

  // Hitos de cobro pendientes.
  const engancheXCobrar = proyectos.filter(p => p.estatus === 'completado' && !p.instalado_cobrado);
  const restanteXCobrar = proyectos.filter(p => medidorLlegado.has(p.id) && !p.medidor_pagado);

  // Efectividad de cobranza = hitos cobrados / hitos alcanzados (proxy sin montos, hasta TOKU).
  const engancheAlcanzado = proyectos.filter(p => p.estatus === 'completado');
  const restanteAlcanzado = proyectos.filter(p => medidorLlegado.has(p.id));
  const alcanzados = engancheAlcanzado.length + restanteAlcanzado.length;
  const cobrados = engancheAlcanzado.filter(p => p.instalado_cobrado).length + restanteAlcanzado.filter(p => p.medidor_pagado).length;
  const efectividad = alcanzados ? Math.round((cobrados / alcanzados) * 100) : 0;

  // Atrasados (proxy): pendientes de cobro con más de 3 días desde el hito.
  const atrasados = engancheXCobrar.filter(p => (diasDesde(p.fecha_instalacion) ?? 0) > 3).length
    + restanteXCobrar.filter(p => (diasDesde(medidorLlegado.get(p.id)) ?? 0) > 3).length;

  const efColor = efectividad >= 80 ? 'var(--verde)' : efectividad >= 50 ? 'var(--ambar)' : 'var(--rojo)';

  const FilaCobro = ({ p, fecha, campo, etiqueta, extra }) => {
    const d = diasDesde(fecha);
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--borde)', paddingTop: 8, marginTop: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.cliente} <span className="text-xs text-gray">· {p.folio || (p.folio_odoo ? `OV ${p.folio_odoo}` : 's/folio')}</span></div>
          <div className="text-xs text-gray">{p.zona || ''}{extra ? ` · ${extra}` : ''}{d != null ? ` · hace ${d} día(s)` : ''}{d != null && d > 3 ? ' ⚠️' : ''}</div>
        </div>
        <button className="btn btn-green btn-sm" disabled={guardando === p.id + campo} onClick={() => marcarCobrado(p, campo, etiqueta)}>
          {guardando === p.id + campo ? '…' : '💰 Marcar cobrado'}
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="page-header">
        <div><h2>💰 Cobranza</h2><div className="sub">Efectividad de cobranza · cobro por hitos</div></div>
        <button className="btn btn-outline btn-sm" onClick={cargar}>↺ Actualizar</button>
      </div>

      <div className="page-body">
        {error && <div className="card mb-16"><div className="card-body" style={{ color: 'var(--rojo)' }}>⚠️ {error}</div></div>}

        <div className="stats-row">
          <div className="stat-card"><div className="stat-val" style={{ color: efColor }}>{efectividad}%</div><div className="stat-label">Efectividad de cobranza</div></div>
          <div className="stat-card ambar"><div className="stat-val">{engancheXCobrar.length}</div><div className="stat-label">Enganche por cobrar</div></div>
          <div className="stat-card ambar"><div className="stat-val">{restanteXCobrar.length}</div><div className="stat-label">Restante por cobrar</div></div>
          <div className="stat-card rojo"><div className="stat-val">{atrasados}</div><div className="stat-label">Atrasados (&gt;3 días)</div></div>
        </div>

        {/* AGENDA CONFIRMADA */}
        <div className="card mb-16">
          <div className="card-header"><h3>📅 Agenda confirmada</h3></div>
          <div className="card-body">
            <div className="text-xs text-gray" style={{ marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>Hoy ({agendaHoy.length})</div>
            {agendaHoy.length === 0 ? <div className="text-sm text-gray">Nada agendado para hoy.</div>
              : agendaHoy.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', fontSize: 13 }}>
                  <span><strong>{p.cliente}</strong> <span className="text-xs text-gray">· {p.folio || (p.folio_odoo ? `OV ${p.folio_odoo}` : '')}</span></span>
                  <span className="text-xs text-gray">{p.zona} · {p.estatus === 'en_progreso' ? 'en progreso' : 'por instalar'}</span>
                </div>
              ))}
            <div className="text-xs text-gray" style={{ margin: '14px 0 8px', textTransform: 'uppercase', fontWeight: 700 }}>Próximos ({agendaProximos.length})</div>
            {agendaProximos.length === 0 ? <div className="text-sm text-gray">Sin próximas fechas confirmadas.</div>
              : agendaProximos.slice(0, 15).map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '4px 0', fontSize: 13 }}>
                  <span><strong>{p.cliente}</strong> <span className="text-xs text-gray">· {p.zona}</span></span>
                  <span className="text-xs text-gray">📅 {p.fecha_agenda}</span>
                </div>
              ))}
          </div>
        </div>

        {/* ENGANCHE POR COBRAR (instalación terminada) */}
        <div className="card mb-16">
          <div className="card-header"><h3>🔨 Enganche por cobrar <span className="text-xs text-gray">· instalación terminada</span></h3></div>
          <div className="card-body">
            {engancheXCobrar.length === 0 ? <div className="text-sm text-gray">Nada pendiente de enganche. 🎉</div>
              : engancheXCobrar.map(p => <FilaCobro key={p.id} p={p} fecha={p.fecha_instalacion} campo="instalado_cobrado" etiqueta="enganche" extra={p.fecha_instalacion ? `instalado ${p.fecha_instalacion}` : ''} />)}
          </div>
        </div>

        {/* RESTANTE POR COBRAR (medidor bidireccional instalado) */}
        <div className="card mb-16">
          <div className="card-header"><h3>🔌 Restante + 1ª mensualidad por cobrar <span className="text-xs text-gray">· medidor instalado</span></h3></div>
          <div className="card-body">
            {restanteXCobrar.length === 0 ? <div className="text-sm text-gray">Nada pendiente de restante. 🎉</div>
              : restanteXCobrar.map(p => <FilaCobro key={p.id} p={p} fecha={medidorLlegado.get(p.id)} campo="medidor_pagado" etiqueta="restante + 1ª mensualidad" extra="medidor instalado" />)}
          </div>
        </div>

        {/* MOROSOS — pendiente de definir reglas */}
        <div className="card">
          <div className="card-header"><h3>⏳ Morosos (1 · 2 · 3)</h3></div>
          <div className="card-body">
            <div className="text-sm text-gray">
              Los niveles de morosidad (1, 2, 3) se definirán con el KPI que enviará Randall y se conectarán con
              <strong> Odoo / TOKU</strong> (montos y fechas de pago reales). Por ahora esta sección es un marcador.
            </div>
          </div>
        </div>

        <div className="text-xs text-gray" style={{ marginTop: 16 }}>
          💡 Los montos se leen de Odoo (no se teclean aquí). Al integrar <strong>TOKU</strong>, el estatus de cobro se actualizará solo.
        </div>
      </div>
    </>
  );
}
