import { useState, useRef, useEffect } from 'react';

// Filtro por columna estilo Excel: ordenar A→Z / Z→A, buscar valor y elegir valores
// con checkbox. `seleccionados` es un Set de valores elegidos, o null = todos.
export default function FiltroColumna({ valores, seleccionados, onChange, onSort, sortDir }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const todos = valores.map(v => v.val);
  const activo = seleccionados != null && seleccionados.size < todos.length;
  const filtrados = valores.filter(v => String(v.label).toLowerCase().includes(q.toLowerCase()));

  const toggle = (val) => {
    const base = seleccionados == null ? new Set(todos) : new Set(seleccionados);
    if (base.has(val)) base.delete(val); else base.add(val);
    onChange(base.size === todos.length ? null : base);
  };

  return (
    <span className="fcol" ref={ref}>
      <button
        type="button"
        className={`fcol-btn${activo ? ' activo' : ''}${sortDir ? ' sorted' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Filtrar columna"
      >
        {sortDir === 'asc' ? '▴' : sortDir === 'desc' ? '▾' : '▾'}
      </button>
      {open && (
        <div className="fcol-pop" onClick={e => e.stopPropagation()}>
          <button type="button" className="fcol-sort" onClick={() => onSort('asc')}>↑ Ordenar A → Z</button>
          <button type="button" className="fcol-sort" onClick={() => onSort('desc')}>↓ Ordenar Z → A</button>
          <div className="fcol-sep" />
          <div className="fcol-acts">
            <button type="button" onClick={() => onChange(null)}>Seleccionar todo</button>
            <span>·</span>
            <button type="button" onClick={() => onChange(new Set())}>Borrar</button>
            <span className="fcol-count">Mostrando {filtrados.length}</span>
          </div>
          <input className="fcol-search" placeholder="🔍 Buscar valor…" value={q} onChange={e => setQ(e.target.value)} autoFocus />
          <div className="fcol-list">
            {filtrados.length === 0 && <div className="fcol-empty">Sin valores</div>}
            {filtrados.map(v => {
              const checked = seleccionados == null || seleccionados.has(v.val);
              return (
                <label key={v.val} className="fcol-item">
                  <input type="checkbox" checked={checked} onChange={() => toggle(v.val)} />
                  <span>{v.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </span>
  );
}
