import { useState, useEffect } from 'react';
import { getProyectos } from '../lib/api';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const parseFecha = (p) => p.fecha_instalacion || p.updated_at?.slice(0, 10) || p.created_at?.slice(0, 10) || null;

function mesKeyLabel(fecha) {
  const d = new Date(fecha + 'T00:00:00');
  return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${MESES[d.getMonth()]} ${d.getFullYear()}` };
}
function semanaKeyLabel(fecha) {
  const d = new Date(fecha + 'T00:00:00');
  const day = d.getDay();                       // 0 = domingo
  const mon = new Date(d); mon.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));  // lunes de esa semana
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const key = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
  const fmt = (x) => `${x.getDate()} ${MESES_CORTO[x.getMonth()]}`;
  return { key, label: `Semana ${fmt(mon)} – ${fmt(sun)}` };
}

export default function VistaArchivo({ usuarioActual, setVista, setProyectoSeleccionado }) {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abierto, setAbierto] = useState({});

  const esInstalador = usuarioActual?.rol === 'instalador';

  useEffect(() => {
    if (usuarioActual == null) return;
    setLoading(true);
    getProyectos()
      .then(data => {
        const uid = usuarioActual?.id ?? null;
        const comp = data.filter(p => p.estatus === 'completado' &&
          (!esInstalador || (uid != null && p.cuadrilla?.responsable_id === uid)));
        setProyectos(comp);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [usuarioActual, esInstalador]);

  if (loading) return <div className="page-body"><div className="empty-state"><div className="es-icon">⏳</div><p>Cargando archivo…</p></div></div>;

  // Agrupar: mes -> semana -> [proyectos]
  const conFecha = proyectos.map(p => ({ p, fecha: parseFecha(p) })).filter(x => x.fecha);
  conFecha.sort((a, b) => b.fecha.localeCompare(a.fecha));
  const meses = {};
  for (const { p, fecha } of conFecha) {
    const m = mesKeyLabel(fecha), s = semanaKeyLabel(fecha);
    meses[m.key] = meses[m.key] || { label: m.label, total: 0, semanas: {} };
    meses[m.key].total++;
    meses[m.key].semanas[s.key] = meses[m.key].semanas[s.key] || { label: s.label, items: [] };
    meses[m.key].semanas[s.key].items.push(p);
  }
  const mesKeys = Object.keys(meses).sort().reverse();

  const irDetalle = (p) => { if (!esInstalador) { setProyectoSeleccionado?.(p); setVista?.('detalle'); } };

  return (
    <>
      <div className="page-header">
        <div><h2>📁 {esInstalador ? 'Historial' : 'Archivo'}</h2><div className="sub">{proyectos.length} instalaciones completadas</div></div>
      </div>
      <div className="page-body">
        {proyectos.length === 0 ? (
          <div className="empty-state"><div className="es-icon">📁</div><p>Aún no hay instalaciones completadas.</p></div>
        ) : (
          mesKeys.map(mk => {
            const mes = meses[mk];
            const exp = abierto[mk] ?? (mk === mesKeys[0]);
            return (
              <div className="card mb-12" key={mk}>
                <button className="archivo-mes" onClick={() => setAbierto(a => ({ ...a, [mk]: !exp }))}>
                  <span style={{ fontWeight: 700 }}>{mes.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--gris-secundario)' }}>{mes.total} · {exp ? '▲' : '▼'}</span>
                </button>
                {exp && Object.keys(mes.semanas).sort().reverse().map(sk => {
                  const sem = mes.semanas[sk];
                  return (
                    <div key={sk} className="archivo-semana">
                      <div className="archivo-semana-label">{sem.label} <span className="text-xs text-gray">({sem.items.length})</span></div>
                      {sem.items.map(p => (
                        <div key={p.id} className="archivo-item" style={{ cursor: esInstalador ? 'default' : 'pointer' }} onClick={() => irDetalle(p)}>
                          <div style={{ minWidth: 0 }}>
                            <div className="fw-700 text-blue" style={{ fontSize: 12 }}>{p.folio}</div>
                            <div className="fw-600" style={{ fontSize: 13 }}>{p.cliente}</div>
                            <div className="text-xs text-gray">{p.zona} · {p.paneles ?? '—'} pnl{p.kw ? ` · ${p.kw} kWp` : ''}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div className="text-xs text-gray">Instalado</div>
                            <div className="fw-600" style={{ fontSize: 12 }}>{parseFecha(p)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
