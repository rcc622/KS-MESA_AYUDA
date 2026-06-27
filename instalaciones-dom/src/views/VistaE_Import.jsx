import { useState, useRef } from 'react';

const PREVIEW_ROWS = [
  { folio: 'KS-2026-0055', folio_odoo: 'S10055', cliente: 'Marcos López Ávila', zona: 'MTY', paneles: 10, kw: 4.5, estatus: 'nuevo' },
  { folio: 'KS-2026-0056', folio_odoo: 'S10056', cliente: 'Sofía Ramírez Toro', zona: 'SLT', paneles: 8, kw: 3.6, estatus: 'nuevo' },
  { folio: 'KS-2026-0042', folio_odoo: 'S10042', cliente: 'Roberto Martínez García', zona: 'MTY', paneles: 12, kw: 5.4, estatus: 'actualizado' },
];

export default function VistaE_Import() {
  const [fuente, setFuente] = useState('csv');
  const [archivo, setArchivo] = useState(null);
  const [etapa, setEtapa] = useState('seleccion'); // seleccion | preview | resultado
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const fuentes = [
    { id: 'csv', icon: '📄', label: 'CSV', sub: 'Archivo .csv', activo: true },
    { id: 'xlsx', icon: '📊', label: 'Excel / XLSX', sub: 'Archivo .xlsx / .xls', activo: true },
    { id: 'sheets', icon: '🔗', label: 'Google Sheets', sub: 'Requiere OAuth', activo: false },
    { id: 'odoo', icon: '⚙️', label: 'Odoo API', sub: 'Fase 3', activo: false },
  ];

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (fuente === 'csv' && ext !== 'csv') { alert('Selecciona un archivo .csv'); return; }
    if (fuente === 'xlsx' && !['xlsx', 'xls'].includes(ext)) { alert('Selecciona un archivo .xlsx o .xls'); return; }
    setArchivo(f);
    setEtapa('preview');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImportar = () => {
    setEtapa('resultado');
  };

  const handleReinicio = () => {
    setArchivo(null);
    setEtapa('seleccion');
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>📤 Importar Proyectos</h2>
          <div className="sub">Carga masiva por CSV o XLSX · Upsert por folio_odoo</div>
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 680 }}>
        {/* Paso 1 — Selección de fuente */}
        <div className="card mb-16">
          <div className="card-header">
            <h3>1. Selecciona la fuente</h3>
          </div>
          <div className="card-body">
            <div className="source-grid">
              {fuentes.map(f => (
                <div
                  key={f.id}
                  className={`source-card${fuente === f.id ? ' active' : ''}${!f.activo ? ' disabled' : ''}`}
                  onClick={() => f.activo && setFuente(f.id)}
                >
                  <div className="s-icon">{f.icon}</div>
                  <div className="s-label">{f.label}</div>
                  <div className="s-sub">{f.sub}</div>
                  {!f.activo && <div className="soon-badge">Próximamente</div>}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gris-secundario)', padding: '8px 12px', background: '#F9FAFB', borderRadius: 8 }}>
              <strong>Patrón:</strong> upsert por <code>folio_odoo</code> — si el folio ya existe, se actualiza; si no, se crea. La operación queda registrada en la bitácora.
            </div>
          </div>
        </div>

        {/* Paso 2 — Carga del archivo */}
        {etapa === 'seleccion' && (
          <div className="card mb-16">
            <div className="card-header">
              <h3>2. Sube el archivo</h3>
            </div>
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
                <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); fileRef.current.click(); }}>
                  Seleccionar archivo
                </button>
                <div className="text-xs text-gray mt-12">
                  Formatos soportados: {fuente === 'csv' ? '.csv' : '.xlsx, .xls'}
                </div>
              </div>
              <input
                type="file"
                ref={fileRef}
                style={{ display: 'none' }}
                accept={fuente === 'csv' ? '.csv' : '.xlsx,.xls'}
                onChange={e => handleFile(e.target.files[0])}
              />

              {/* Template hint */}
              <div className="mt-16" style={{ fontSize: 12, color: 'var(--gris-secundario)' }}>
                <strong>Columnas requeridas:</strong>{' '}
                <code>folio_odoo, cliente, zona, paneles, kw, fecha_agenda</code>
                <br />
                <strong>Columnas opcionales:</strong>{' '}
                <code>folio, direccion, notas, cuadrilla_id</code>
              </div>
            </div>
          </div>
        )}

        {/* Paso 3 — Preview */}
        {etapa === 'preview' && (
          <div className="card mb-16">
            <div className="card-header">
              <h3>3. Previsualización · {archivo?.name}</h3>
              <button className="btn btn-outline btn-sm" onClick={handleReinicio}>← Cambiar archivo</button>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, background: '#F0FBF4', border: '1px solid #86EFAC', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--verde)' }}>2</div>
                  <div style={{ fontSize: 11, color: '#065F46' }}>Nuevos</div>
                </div>
                <div style={{ flex: 1, background: '#EAF2F9', border: '1px solid #93C5FD', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--azul-primario)' }}>1</div>
                  <div style={{ fontSize: 11, color: 'var(--azul-primario)' }}>Actualizados</div>
                </div>
                <div style={{ flex: 1, background: '#F9FAFB', border: '1px solid var(--borde)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gris-texto)' }}>3</div>
                  <div style={{ fontSize: 11, color: 'var(--gris-secundario)' }}>Total filas</div>
                </div>
              </div>

              <div className="table-wrap" style={{ marginBottom: 16 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Folio KENET</th>
                      <th>Folio Odoo</th>
                      <th>Cliente</th>
                      <th>Zona</th>
                      <th>Paneles</th>
                      <th>kW</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PREVIEW_ROWS.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 12 }}>{r.folio}</td>
                        <td style={{ fontSize: 12 }}>{r.folio_odoo}</td>
                        <td>{r.cliente}</td>
                        <td><span className="badge badge-zona">{r.zona}</span></td>
                        <td>{r.paneles}</td>
                        <td>{r.kw}</td>
                        <td>
                          <span className="badge" style={{
                            background: r.estatus === 'nuevo' ? '#D1FAE5' : '#EAF2F9',
                            color: r.estatus === 'nuevo' ? '#065F46' : 'var(--azul-primario)'
                          }}>
                            {r.estatus === 'nuevo' ? '+ Nuevo' : '↺ Actualizar'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: 11, color: 'var(--gris-secundario)', marginBottom: 16 }}>
                ⚠️ La importación es irreversible. Verifica los datos antes de confirmar.
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={handleReinicio}>Cancelar</button>
                <button className="btn btn-green" onClick={handleImportar}>
                  ✓ Confirmar importación
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Paso 4 — Resultado */}
        {etapa === 'resultado' && (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
              <div className="fw-700" style={{ fontSize: 16, marginBottom: 8 }}>Importación completada</div>
              <div className="text-gray text-sm mb-16">
                2 proyectos creados · 1 actualizado · Registrado en bitácora
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={handleReinicio}>Nueva importación</button>
                <button className="btn btn-primary">Ver en Agenda →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
