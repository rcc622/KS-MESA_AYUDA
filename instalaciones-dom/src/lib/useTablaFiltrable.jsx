import { useState } from 'react';
import FiltroColumna from '../components/FiltroColumna';

// Hook reutilizable: da búsqueda + filtros por columna estilo Excel + orden a cualquier tabla.
//   rows      : array de filas
//   columnas  : { campo: (row) => valor }  (valores para filtrar/ordenar por esa columna)
//   buscarEn  : array de getters (row)=>texto para la barra de búsqueda, o fn (row,q)=>bool
// Devuelve: { filtered, busqueda, setBusqueda, fcol(campo), total }
export function useTablaFiltrable(rows, columnas, buscarEn) {
  const [busqueda, setBusqueda] = useState('');
  const [filtros, setFiltros] = useState({});   // { campo: Set(strings) | null }
  const [orden, setOrden] = useState(null);      // { campo, dir }

  const valorDe = (r, campo) => { const f = columnas[campo]; const v = f ? f(r) : ''; return v == null ? '' : String(v); };
  const valoresCol = (campo) => {
    const m = new Map();
    rows.forEach(r => { const v = valorDe(r, campo); if (!m.has(v)) m.set(v, { val: v, label: v }); });
    return [...m.values()].sort((a, b) => String(a.label).localeCompare(String(b.label), 'es', { numeric: true }));
  };

  let filtered = rows.filter(r => {
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const match = typeof buscarEn === 'function'
        ? buscarEn(r, q)
        : (buscarEn || []).some(g => String(g(r) || '').toLowerCase().includes(q));
      if (!match) return false;
    }
    for (const campo of Object.keys(columnas)) {
      const sel = filtros[campo];
      if (sel != null && !sel.has(valorDe(r, campo))) return false;
    }
    return true;
  });
  if (orden) {
    const dir = orden.dir === 'desc' ? -1 : 1;
    filtered = [...filtered].sort((a, b) =>
      String(valorDe(a, orden.campo)).localeCompare(String(valorDe(b, orden.campo)), 'es', { numeric: true }) * dir);
  }

  const fcol = (campo) => (
    <FiltroColumna
      valores={valoresCol(campo)}
      seleccionados={filtros[campo] ?? null}
      onChange={sel => setFiltros(f => ({ ...f, [campo]: sel }))}
      onSort={dir => setOrden({ campo, dir })}
      sortDir={orden?.campo === campo ? orden.dir : null}
    />
  );

  return { filtered, busqueda, setBusqueda, fcol, total: filtered.length };
}
