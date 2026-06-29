import { useState, useRef } from 'react';
import { upsertProyectos, agregarBitacora, mensajeError } from '../lib/api';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILAS     = 500;
const ZONAS_VALIDAS = ['MTY', 'SLT', 'TRC', 'MVA'];

// Parseo CSV robusto: maneja campos entre comillas con comas adentro
const parsearCSV = (texto) => {
  const parsearLinea = (linea) => {
    const campos = [];
    let actual = '';
    let dentroComillas = false;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') {
        if (dentroComillas && linea[i + 1] === '"') { actual += '"'; i++; }
        else dentroComillas = !dentroComillas;
      } else if (c === ',' && !dentroComillas) {
        campos.push(actual.trim());
        actual = '';
      } else {
        actual += c;
      }
    }
    campos.push(actual.trim());
    return campos;
  };

  const lineas = texto.trim().split(/\r?\n/);
  const cabeceras = parsearLinea(lineas[0]).map(h => h.toLowerCase().trim());
  return lineas.slice(1)
    .filter(l => l.trim())
    .map(linea => {
      const vals = parsearLinea(linea);
      return Object.fromEntries(cabeceras.map((h, i) => [h, vals[i] ?? '']));
    });
};

// Elimina prefijos que disparan fórmulas en Excel/Sheets
const sanitizar = (val) => {
  if (typeof val !== 'string') return val;
  return val.replace(/^[=+\-@\t\r]+/, '').slice(0, 500);
};

const validarFila = (r, idx) => {
  const errores = [];

  if (!r.folio_odoo?.trim())
    errores.push('folio_odoo vacío');
  else if (r.folio_odoo.length > 100)
    errores.push('folio_odoo excede 100 caracteres');

  if (!r.cliente?.trim())
    errores.push('cliente vacío');
  else if (r.cliente.length > 255)
    errores.push('cliente excede 255 caracteres');

  if (r.zona && !ZONAS_VALIDAS.includes(r.zona.trim().toUpperCase()))
    errores.push(`zona inválida (válidas: ${ZONAS_VALIDAS.join(', ')})`);

  if (r.paneles) {
    const n = parseInt(r.paneles);
    if (isNaN(n) || n < 1 || n > 999)
      errores.push('paneles debe ser un número entre 1 y 999');
  }

  if (r.kw) {
    const n = parseFloat(r.kw);
    if (isNaN(n) || n < 0.1 || n > 500)
      errores.push('kw debe estar entre 0.1 y 500');
  }

  if (r.fecha_agenda && !/^\d{4}-\d{2}-\d{2}$/.test(r.fecha_agenda.trim()))
    errores.push('fecha_agenda debe ser YYYY-MM-DD');

  if (r.direccion && r.direccion.length > 500)
    errores.push('direccion excede 500 caracteres');

  if (r.notas && r.notas.length > 1000)
    errores.push('notas excede 1000 caracteres');

  return { fila: idx + 1, errores, valida: errores.length === 0 };
};

export default function VistaE_Import({ usuarioActual, setVista }) {
  const [fuente, setFuente] = useState('csv');
  const [archivo, setArchivo] = useState(null);
  const [etapa, setEtapa] = useState('seleccion');
  const [drag, setDrag] = useState(false);
  const [filas, setFilas] = useState([]);
  const [validaciones, setValidaciones] = useState([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const fileRef = useRef();

  const fuentes = [
    { id: 'csv',    icon: '📄', label: 'CSV',           sub: 'Archivo .csv',           activo: true },
    { id: 'xlsx',   icon: '📊', label: 'Excel / XLSX',  sub: 'Archivo .xlsx / .xls',   activo: false },
    { id: 'sheets', icon: '🔗', label: 'Google Sheets', sub: 'Requiere OAuth',          activo: false },
    { id: 'odoo',   icon: '⚙️', label: 'Odoo API',      sub: 'Fase 3',                  activo: false },
  ];

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (ext !== 'csv') { alert('Selecciona un archivo .csv'); return; }
    if (f.size > MAX_FILE_SIZE) { alert('El archivo supera el límite de 5 MB'); return; }
    setArchivo(f);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const rows = parsearCSV(e.target.result);
        if (rows.length > MAX_FILAS) {
          alert(`El archivo tiene ${rows.length} filas. El límite es ${MAX_FILAS} por importación.`);
          return;
        }
        const vals = rows.map((r, i) => validarFila(r, i));
        setFilas(rows);
        setValidaciones(vals);
        setEtapa('preview');
      } catch {
        alert('Error al parsear el CSV. Verifica el formato.');
      }
    };
    reader.readAsText(f, 'UTF-8');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const filasValidas = validaciones.filter(v => v.valida).length;
  const filasConError = validaciones.filter(v => !v.valida).length;

  const handleImportar = async () => {
    setImportando(true);
    try {
      const payload = filas
        .filter((_, i) => validaciones[i]?.valida)
        .map(r => ({
          folio:         r.folio        ? sanitizar(r.folio.trim())    : null,
          folio_odoo:    sanitizar(r.folio_odoo.trim()),
          cliente:       sanitizar(r.cliente.trim()),
          zona:          r.zona         ? r.zona.trim().toUpperCase()  : null,
          paneles:       r.paneles      ? parseInt(r.paneles)          : null,
          kw:            r.kw           ? parseFloat(r.kw)             : null,
          fecha_agenda:  r.fecha_agenda ? r.fecha_agenda.trim()        : null,
          direccion:     r.direccion    ? sanitizar(r.direccion.trim()) : null,
          notas:         r.notas        ? sanitizar(r.notas.trim())    : null,
          estatus:       'agendado',
          dias_en_etapa: 0,
        }));

      const data = await upsertProyectos(payload);

      for (const p of data) {
        await agregarBitacora({
          proyecto_id: p.id,
          tipo: 'import',
          descripcion: `Importado desde CSV — ${archivo.name}`,
          usuario_id: usuarioActual?.id ?? null,
        });
      }

      setResultado({ total: data.length, errores: filasConError, archivo: archivo.name });
      setEtapa('resultado');
    } catch (e) {
      alert('Error al importar: ' + mensajeError(e));
    } finally {
      setImportando(false);
    }
  };

  const reiniciar = () => { setArchivo(null); setFilas([]); setValidaciones([]); setEtapa('seleccion'); setResultado(null); };

  return (
    <>
      <div className="page-header">
        <div><h2>📤 Importar Proyectos</h2><div className="sub">Carga masiva por CSV o XLSX · Upsert por folio_odoo</div></div>
      </div>

      <div className="page-body" style={{ maxWidth: 680 }}>
        <div className="card mb-16">
          <div className="card-header"><h3>1. Selecciona la fuente</h3></div>
          <div className="card-body">
            <div className="source-grid">
              {fuentes.map(f => (
                <div key={f.id} className={`source-card${fuente === f.id ? ' active' : ''}${!f.activo ? ' disabled' : ''}`} onClick={() => f.activo && setFuente(f.id)}>
                  <div className="s-icon">{f.icon}</div>
                  <div className="s-label">{f.label}</div>
                  <div className="s-sub">{f.sub}</div>
                  {!f.activo && <div className="soon-badge">Próximamente</div>}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gris-secundario)', padding: '8px 12px', background: '#F9FAFB', borderRadius: 8 }}>
              <strong>Columnas requeridas:</strong> <code>folio_odoo, cliente, zona</code> &nbsp;·&nbsp;
              <strong>Opcionales:</strong> <code>folio, paneles, kw, fecha_agenda, direccion, notas</code>
            </div>
          </div>
        </div>

        {etapa === 'seleccion' && (
          <div className="card mb-16">
            <div className="card-header"><h3>2. Sube el archivo</h3></div>
            <div className="card-body">
              <div
                className={`drop-zone${drag ? ' dragover' : ''}`}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
              >
                <div className="dz-icon">📂</div>
                <div className="fw-700 mb-8">Arrastra tu archivo aquí</div>
                <div className="text-sm text-gray mb-16">o haz clic para seleccionarlo</div>
                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); fileRef.current.click(); }}>Seleccionar archivo</button>
                <div className="text-xs text-gray mt-12">Formato: {fuente === 'csv' ? '.csv' : '.xlsx, .xls'}</div>
              </div>
              <input type="file" ref={fileRef} style={{ display: 'none' }} accept={fuente === 'csv' ? '.csv' : '.xlsx,.xls'} onChange={e => handleFile(e.target.files[0])} />
            </div>
          </div>
        )}

        {etapa === 'preview' && (
          <div className="card mb-16">
            <div className="card-header">
              <h3>3. Previsualización · {archivo?.name}</h3>
              <button className="btn btn-outline btn-sm" onClick={reiniciar}>← Cambiar archivo</button>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, background: '#F0FBF4', border: '1px solid #86EFAC', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--verde)' }}>{filasValidas}</div>
                  <div style={{ fontSize: 11, color: '#065F46' }}>Filas válidas</div>
                </div>
                <div style={{ flex: 1, background: filasConError > 0 ? '#FFF4F4' : '#F9FAFB', border: `1px solid ${filasConError > 0 ? '#FCA5A5' : '#E5E7EB'}`, borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: filasConError > 0 ? '#DC2626' : 'var(--gris-secundario)' }}>{filasConError}</div>
                  <div style={{ fontSize: 11, color: filasConError > 0 ? '#991B1B' : 'var(--gris-secundario)' }}>Filas con error (se omiten)</div>
                </div>
              </div>

              {filasConError > 0 && (
                <div style={{ background: '#FFF4F4', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#991B1B', marginBottom: 6 }}>Errores detectados — estas filas no se importarán:</div>
                  {validaciones.filter(v => !v.valida).map(v => (
                    <div key={v.fila} style={{ fontSize: 12, color: '#DC2626', marginBottom: 2 }}>
                      Fila {v.fila}: {v.errores.join(' · ')}
                    </div>
                  ))}
                </div>
              )}

              <div className="table-wrap" style={{ marginBottom: 16, maxHeight: 240, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      {Object.keys(filas[0] || {}).slice(0, 5).map(h => <th key={h}>{h}</th>)}
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.slice(0, 20).map((r, i) => {
                      const v = validaciones[i];
                      return (
                        <tr key={i} style={{ background: v?.valida ? 'transparent' : '#FFF4F4' }}>
                          <td style={{ fontSize: 11, color: 'var(--gris-secundario)' }}>{i + 1}</td>
                          {Object.values(r).slice(0, 5).map((val, j) => <td key={j} style={{ fontSize: 12 }}>{val}</td>)}
                          <td style={{ fontSize: 11 }}>
                            {v?.valida
                              ? <span style={{ color: '#16A34A' }}>✓</span>
                              : <span style={{ color: '#DC2626' }} title={v?.errores.join('\n')}>✗ {v?.errores[0]}</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: 11, color: 'var(--gris-secundario)', marginBottom: 16 }}>
                ⚠️ La importación registra un evento en la bitácora de cada proyecto.
                {filas.length > 20 && ` · Mostrando 20 de ${filas.length} filas.`}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={reiniciar}>Cancelar</button>
                <button className="btn btn-green" onClick={handleImportar} disabled={importando || filasValidas === 0}>
                  {importando ? 'Importando…' : `✓ Importar ${filasValidas} fila${filasValidas !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {etapa === 'resultado' && resultado && (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
              <div className="fw-700" style={{ fontSize: 16, marginBottom: 8 }}>Importación completada</div>
              <div className="text-gray text-sm mb-16">
                {resultado.total} proyectos procesados desde {resultado.archivo}
                {resultado.errores > 0 && ` · ${resultado.errores} filas omitidas por errores`}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={reiniciar}>Nueva importación</button>
                <button className="btn btn-primary" onClick={() => setVista?.('agenda')}>Ver en Agenda →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
