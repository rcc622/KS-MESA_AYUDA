import { useState, useRef } from 'react';
import { upsertProyectos, agregarBitacora, mensajeError } from '../lib/api';

const MAX_FILE_SIZE  = 5 * 1024 * 1024; // 5 MB
const MAX_FILAS      = 500;
const WATTS_POR_PANEL = 600;
const ZONAS = ['MTY', 'SLT', 'TRC', 'MVA'];

// Columnas de la plantilla (mismas que el formulario, EXCEPTO el link de Maps que es manual).
const COLUMNAS = [
  'folio', 'folio_odoo', 'cliente', 'telefono', 'direccion', 'zona', 'fecha_agenda',
  'paneles', 'panel_potencia_w', 'panel_marca',
  'inversor_tipo', 'inversor_cantidad', 'inversor_capacidad_kw', 'inversor_marca', 'notas',
];
const EJEMPLO = {
  folio: 'MY-2026-0101', folio_odoo: 'S57443', cliente: 'Juan Pérez', telefono: '8112345678',
  direccion: 'Calle Falsa 123, Monterrey N.L.', zona: 'MTY', fecha_agenda: '2026-07-10',
  paneles: 12, panel_potencia_w: 600, panel_marca: 'Trina',
  inversor_tipo: 'inversor', inversor_cantidad: 1, inversor_capacidad_kw: 6, inversor_marca: 'Growatt',
  notas: 'Ejemplo — borra esta fila antes de importar',
};

// Anti-inyección de fórmulas (=, +, -, @) + recorte de longitud
const sanitizar = (v, max = 500) => {
  if (v === '' || v == null) return null;
  const s = String(v).replace(/^[=+\-@\t\r]+/, '').trim().slice(0, max);
  return s === '' ? null : s;
};
const fechaISO = (v) => {
  if (v === '' || v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/); // DD/MM/YYYY
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
};

const validarFila = (r, idx) => {
  const errores = [];
  if (!sanitizar(r.folio)) errores.push('folio vacío');
  else if (String(r.folio).length > 100) errores.push('folio excede 100 caracteres');
  if (!sanitizar(r.cliente)) errores.push('cliente vacío');
  else if (String(r.cliente).length > 255) errores.push('cliente excede 255 caracteres');
  const zona = sanitizar(r.zona)?.toUpperCase();
  if (zona && !ZONAS.includes(zona)) errores.push(`zona inválida (válidas: ${ZONAS.join(', ')})`);
  if (r.paneles) { const n = parseInt(r.paneles); if (isNaN(n) || n < 1 || n > 999) errores.push('paneles 1–999'); }
  if (r.inversor_cantidad) { const n = parseInt(r.inversor_cantidad); if (isNaN(n) || n < 0 || n > 99) errores.push('cantidad de inversor inválida'); }
  const tipo = sanitizar(r.inversor_tipo)?.toLowerCase();
  if (tipo && !['inversor', 'microinversor'].includes(tipo)) errores.push("inversor_tipo: 'inversor' o 'microinversor'");
  if (r.fecha_agenda && !fechaISO(r.fecha_agenda)) errores.push('fecha_agenda inválida (usa YYYY-MM-DD)');
  if (r.direccion && String(r.direccion).length > 500) errores.push('direccion excede 500 caracteres');
  if (r.notas && String(r.notas).length > 1000) errores.push('notas excede 1000 caracteres');
  return { fila: idx + 1, errores, valida: errores.length === 0 };
};

const mapear = (r) => {
  const paneles = r.paneles ? parseInt(r.paneles) : null;
  const zona = sanitizar(r.zona)?.toUpperCase();
  const tipo = sanitizar(r.inversor_tipo)?.toLowerCase();
  return {
    folio: sanitizar(r.folio, 100),
    folio_odoo: sanitizar(r.folio_odoo, 100),
    cliente: sanitizar(r.cliente, 255),
    telefono: sanitizar(r.telefono, 50),
    direccion: sanitizar(r.direccion, 500),
    zona: ZONAS.includes(zona) ? zona : null,
    fecha_agenda: fechaISO(r.fecha_agenda),
    paneles,
    kw: paneles ? (paneles * WATTS_POR_PANEL) / 1000 : null,
    panel_potencia_w: r.panel_potencia_w ? parseInt(r.panel_potencia_w) : null,
    panel_marca: sanitizar(r.panel_marca, 100),
    inversor_tipo: tipo === 'microinversor' ? 'microinversor' : (tipo === 'inversor' ? 'inversor' : null),
    inversor_cantidad: r.inversor_cantidad ? parseInt(r.inversor_cantidad) : null,
    inversor_capacidad_kw: r.inversor_capacidad_kw ? parseFloat(r.inversor_capacidad_kw) : null,
    inversor_marca: sanitizar(r.inversor_marca, 100),
    notas: sanitizar(r.notas, 1000),
    estatus: 'agendado',
    dias_en_etapa: 0,
  };
};

export default function VistaE_Import({ usuarioActual, setVista }) {
  const [archivo, setArchivo] = useState(null);
  const [etapa, setEtapa] = useState('seleccion');
  const [drag, setDrag] = useState(false);
  const [filas, setFilas] = useState([]);
  const [validaciones, setValidaciones] = useState([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const fileRef = useRef();

  const descargarPlantilla = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet([EJEMPLO], { header: COLUMNAS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Proyectos');
    XLSX.writeFile(wb, 'Plantilla-importacion-KENET.xlsx');
  };

  const handleFile = async (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) { alert('Sube un archivo .xlsx, .xls o .csv'); return; }
    if (f.size > MAX_FILE_SIZE) { alert('El archivo supera el límite de 5 MB'); return; }
    setArchivo(f);
    try {
      const XLSX = await import('xlsx');
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      let rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      rows = rows.map(r => { const o = {}; for (const k in r) o[String(k).trim().toLowerCase()] = r[k]; return o; }); // normaliza encabezados
      if (rows.length > MAX_FILAS) { alert(`El archivo tiene ${rows.length} filas. El límite es ${MAX_FILAS} por importación.`); return; }
      setFilas(rows);
      setValidaciones(rows.map((r, i) => validarFila(r, i)));
      setEtapa('preview');
    } catch (e) {
      alert('No se pudo leer el archivo: ' + (e?.message || e));
    }
  };

  const handleDrop = (e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); };

  const filasValidas = validaciones.filter(v => v.valida).length;
  const filasConError = validaciones.filter(v => !v.valida).length;

  const handleImportar = async () => {
    setImportando(true);
    try {
      const payload = filas.filter((_, i) => validaciones[i]?.valida).map(mapear);
      const data = await upsertProyectos(payload);
      for (const p of data) {
        await agregarBitacora({
          proyecto_id: p.id, tipo: 'import',
          descripcion: `Importado masivamente desde ${archivo.name}`,
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
        <div><h2>📤 Importar Proyectos</h2><div className="sub">Carga masiva con plantilla · XLSX o CSV · Upsert por folio</div></div>
      </div>

      <div className="page-body" style={{ maxWidth: 680 }}>
        <div className="card mb-16">
          <div className="card-header"><h3>1. Descarga la plantilla</h3></div>
          <div className="card-body">
            <div className="text-sm text-gray" style={{ marginBottom: 12 }}>
              Llena la plantilla (un renglón por instalación) y súbela. Trae las mismas columnas que el
              formulario; el <strong>link de Google Maps se pone a mano</strong> después.
            </div>
            <button className="btn btn-primary" onClick={descargarPlantilla}>⬇️ Descargar plantilla (.xlsx)</button>
            <div style={{ fontSize: 12, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 12px', marginTop: 12 }}>
              💡 <strong>Usa XLSX (Excel), no CSV.</strong> El CSV suele dañar las <em>ñ</em> y los acentos; el XLSX los conserva bien.
            </div>
            <div style={{ fontSize: 12, color: 'var(--gris-secundario)', padding: '8px 12px', background: '#F9FAFB', borderRadius: 8, marginTop: 10 }}>
              <strong>Requeridas:</strong> <code>folio</code>, <code>cliente</code> &nbsp;·&nbsp;
              <strong>Opcionales:</strong> folio_odoo, telefono, direccion, zona, fecha_agenda, paneles, panel_potencia_w, panel_marca, inversor_tipo, inversor_cantidad, inversor_capacidad_kw, inversor_marca, notas.
              <br />El <strong>kWp se calcula solo</strong> (paneles × 600 W). Máx. 500 filas · 5 MB.
            </div>
          </div>
        </div>

        {etapa === 'seleccion' && (
          <div className="card mb-16">
            <div className="card-header"><h3>2. Sube el archivo lleno</h3></div>
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
                <div className="text-xs text-gray mt-12">Formatos: .xlsx · .xls · .csv</div>
              </div>
              <input type="file" ref={fileRef} style={{ display: 'none' }} accept=".xlsx,.xls,.csv" onChange={e => handleFile(e.target.files[0])} />
              <div className="text-xs text-gray" style={{ marginTop: 10 }}>Próximamente: Google Sheets y Odoo (fases siguientes).</div>
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
                  {validaciones.filter(v => !v.valida).slice(0, 15).map(v => (
                    <div key={v.fila} style={{ fontSize: 12, color: '#DC2626', marginBottom: 2 }}>Fila {v.fila}: {v.errores.join(' · ')}</div>
                  ))}
                </div>
              )}

              {filas.length > 0 && (
                <div className="table-wrap" style={{ marginBottom: 16, maxHeight: 240, overflowY: 'auto' }}>
                  <table>
                    <thead><tr><th>#</th><th>folio</th><th>cliente</th><th>zona</th><th>paneles</th><th>Estado</th></tr></thead>
                    <tbody>
                      {filas.slice(0, 20).map((r, i) => {
                        const v = validaciones[i];
                        return (
                          <tr key={i} style={{ background: v?.valida ? 'transparent' : '#FFF4F4' }}>
                            <td style={{ fontSize: 11, color: 'var(--gris-secundario)' }}>{i + 1}</td>
                            <td style={{ fontSize: 12 }}>{r.folio}</td>
                            <td style={{ fontSize: 12 }}>{r.cliente}</td>
                            <td style={{ fontSize: 12 }}>{r.zona}</td>
                            <td style={{ fontSize: 12 }}>{r.paneles}</td>
                            <td style={{ fontSize: 11 }}>{v?.valida ? <span style={{ color: '#16A34A' }}>✓</span> : <span style={{ color: '#DC2626' }} title={v?.errores.join('\n')}>✗ {v?.errores[0]}</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ fontSize: 11, color: 'var(--gris-secundario)', marginBottom: 16 }}>
                Cada proyecto importado registra un evento en su bitácora. Re-importar un mismo <code>folio</code> lo actualiza.
                {filas.length > 20 && ` · Mostrando 20 de ${filas.length} filas.`}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={reiniciar}>Cancelar</button>
                <button className="btn btn-green" onClick={handleImportar} disabled={importando || filasValidas === 0}>
                  {importando ? 'Importando…' : `✓ Importar ${filasValidas} proyecto(s)`}
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
