import { useState, useRef } from 'react';
import { upsertProyectos, agregarBitacora } from '../lib/api';

export default function VistaE_Import({ usuarioActual }) {
  const [fuente, setFuente] = useState('csv');
  const [archivo, setArchivo] = useState(null);
  const [etapa, setEtapa] = useState('seleccion');
  const [drag, setDrag] = useState(false);
  const [filas, setFilas] = useState([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const fileRef = useRef();

  const fuentes = [
    { id: 'csv',    icon: '📄', label: 'CSV',           sub: 'Archivo .csv',           activo: true },
    { id: 'xlsx',   icon: '📊', label: 'Excel / XLSX',  sub: 'Archivo .xlsx / .xls',   activo: true },
    { id: 'sheets', icon: '🔗', label: 'Google Sheets', sub: 'Requiere OAuth',          activo: false },
    { id: 'odoo',   icon: '⚙️', label: 'Odoo API',      sub: 'Fase 3',                  activo: false },
  ];

  // Parseo CSV simple (sin dependencia externa)
  const parsearCSV = (texto) => {
    const lineas = texto.trim().split('\n');
    const cabeceras = lineas[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lineas.slice(1).map(linea => {
      const vals = linea.split(',').map(v => v.trim().replace(/"/g, ''));
      return Object.fromEntries(cabeceras.map((h, i) => [h, vals[i] ?? '']));
    });
  };

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (fuente === 'csv' && ext !== 'csv') { alert('Selecciona un archivo .csv'); return; }
    if (fuente === 'xlsx' && !['xlsx', 'xls'].includes(ext)) { alert('Selecciona un archivo .xlsx o .xls'); return; }
    setArchivo(f);

    if (fuente === 'csv') {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const rows = parsearCSV(e.target.result);
          setFilas(rows);
          setEtapa('preview');
        } catch {
          alert('Error al parsear el CSV. Verifica el formato.');
        }
      };
      reader.readAsText(f);
    } else {
      // XLSX: mostrar preview simulado (requeriría librería xlsx para parseo real)
      setFilas([]);
      setEtapa('preview');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImportar = async () => {
    setImportando(true);
    try {
      const payload = filas.map(r => ({
        folio:        r.folio || null,
        folio_odoo:   r.folio_odoo || null,
        cliente:      r.cliente || '',
        zona:         r.zona   || null,
        paneles:      r.paneles ? parseInt(r.paneles) : null,
        kw:           r.kw     ? parseFloat(r.kw)    : null,
        fecha_agenda: r.fecha_agenda || null,
        direccion:    r.direccion || null,
        notas:        r.notas || null,
        estatus:      'agendado',
        dias_en_etapa: 0,
      })).filter(r => r.folio_odoo);

      const data = await upsertProyectos(payload);

      // bitácora por cada proyecto importado
      for (const p of data) {
        await agregarBitacora({
          proyecto_id: p.id,
          tipo: 'import',
          descripcion: `Importado desde ${fuente.toUpperCase()} — ${archivo.name}`,
          usuario_id: usuarioActual?.id ?? null,
        });
      }

      setResultado({ total: data.length, archivo: archivo.name });
      setEtapa('resultado');
    } catch (e) {
      alert('Error al importar: ' + e.message);
    } finally {
      setImportando(false);
    }
  };

  const reiniciar = () => { setArchivo(null); setFilas([]); setEtapa('seleccion'); setResultado(null); };

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
              {filas.length > 0 ? (
                <>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1, background: '#F0FBF4', border: '1px solid #86EFAC', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--verde)' }}>{filas.length}</div>
                      <div style={{ fontSize: 11, color: '#065F46' }}>Filas detectadas</div>
                    </div>
                    <div style={{ flex: 1, background: '#EAF2F9', border: '1px solid #93C5FD', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--azul-primario)' }}>{filas.filter(r => r.folio_odoo).length}</div>
                      <div style={{ fontSize: 11, color: 'var(--azul-primario)' }}>Con folio_odoo (upsert)</div>
                    </div>
                  </div>
                  <div className="table-wrap" style={{ marginBottom: 16, maxHeight: 240, overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          {Object.keys(filas[0]).slice(0, 6).map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {filas.slice(0, 10).map((r, i) => (
                          <tr key={i}>{Object.values(r).slice(0, 6).map((v, j) => <td key={j} style={{ fontSize: 12 }}>{v}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gris-secundario)', fontSize: 13 }}>
                  ℹ️ Archivo XLSX cargado: <strong>{archivo?.name}</strong><br />
                  El parseo de XLSX requiere la librería <code>xlsx</code> (fase siguiente). Se importarán {filas.length} filas.
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--gris-secundario)', marginBottom: 16 }}>⚠️ La importación registra un evento en la bitácora de cada proyecto.</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={reiniciar}>Cancelar</button>
                <button className="btn btn-green" onClick={handleImportar} disabled={importando || (filas.length === 0 && fuente === 'csv')}>
                  {importando ? 'Importando…' : '✓ Confirmar importación'}
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
              <div className="text-gray text-sm mb-16">{resultado.total} proyectos procesados desde {resultado.archivo}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={reiniciar}>Nueva importación</button>
                <button className="btn btn-primary">Ver en Agenda →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
