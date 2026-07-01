import { useState, useEffect } from 'react';
import { getBitacoraGlobal } from '../lib/api';

const TIPOS = {
  agenda:      { label: 'Agendado',   icon: '📅', color: '#1F4E79' },
  inicio:      { label: 'Inicio',     icon: '🔧', color: '#F5A623' },
  cierre:      { label: 'Completado', icon: '✅', color: '#2E9E5B' },
  reagenda:    { label: 'Reagenda',   icon: '🔄', color: '#6B4E9B' },
  nota:        { label: 'Nota',       icon: '📝', color: '#6B7280' },
  import:      { label: 'Import',     icon: '📤', color: '#0891B2' },
  eliminacion: { label: 'Eliminado',  icon: '🗑️', color: '#DC2626' },
};

export default function VistaLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');

  const cargar = () => {
    setLoading(true);
    getBitacoraGlobal({ limite: 500 }).then(setLogs).catch(e => console.error(e)).finally(() => setLoading(false));
  };
  useEffect(() => { cargar(); }, []);

  if (loading) return <div className="page-body"><div className="empty-state"><div className="es-icon">⏳</div><p>Cargando movimientos…</p></div></div>;

  const filtrados = logs.filter(l => {
    const matchTipo = !tipo || l.tipo === tipo;
    const q = busqueda.toLowerCase();
    const matchBus = !q ||
      (l.proyecto?.folio || '').toLowerCase().includes(q) ||
      (l.proyecto?.cliente || '').toLowerCase().includes(q) ||
      (l.descripcion || '').toLowerCase().includes(q);
    return matchTipo && matchBus;
  });

  const porDia = {};
  for (const l of filtrados) {
    const dia = (l.created_at || '').slice(0, 10);
    (porDia[dia] = porDia[dia] || []).push(l);
  }
  const dias = Object.keys(porDia).sort().reverse();

  return (
    <>
      <div className="page-header">
        <div><h2>🧾 Movimientos</h2><div className="sub">Bitácora de todos los proyectos · {filtrados.length} eventos</div></div>
        <button className="btn btn-outline btn-sm" onClick={cargar}>↺ Actualizar</button>
      </div>
      <div className="page-body">
        <div className="filters-bar">
          <input type="text" placeholder="🔍 Buscar folio, cliente o texto…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <select value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {filtrados.length === 0 ? (
          <div className="empty-state"><div className="es-icon">🧾</div><p>Sin movimientos con estos filtros.</p></div>
        ) : (
          dias.map(dia => (
            <div key={dia} style={{ marginBottom: 8 }}>
              <div className="log-dia">{dia}</div>
              {porDia[dia].map(l => {
                const t = TIPOS[l.tipo] || { label: l.tipo, icon: '•', color: '#6B7280' };
                return (
                  <div key={l.id} className="log-item">
                    <div className="log-dot" style={{ background: t.color }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="log-meta">
                        {(l.created_at || '').slice(11, 16)} · <span className="text-blue fw-700">{l.proyecto?.folio || '—'}</span>
                        {l.proyecto?.cliente ? ` · ${l.proyecto.cliente}` : ''} · <span style={{ color: t.color, fontWeight: 600 }}>{t.icon} {t.label}</span> · {l.usuario?.nombre || 'Sistema'}
                        {!l.proyecto && l.tipo === 'eliminacion' && <span style={{ color: '#9CA3AF', fontSize: 11, marginLeft: 4 }}>(proyecto eliminado)</span>}
                      </div>
                      <div className="log-desc">{l.descripcion}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </>
  );
}
