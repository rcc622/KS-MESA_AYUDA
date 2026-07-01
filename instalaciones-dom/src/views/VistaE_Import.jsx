import { useState, useRef } from 'react';
import { upsertProyectos, agregarBitacora, mensajeError } from '../lib/api';
import { mapearColumnasIA } from '../lib/ia';

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
const MESES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };
const fechaISO = (v) => {
  if (v === '' || v == null) return null;
  if (v instanceof Date) return isNaN(v) ? null : v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  let m = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/); // YYYY/MM/DD
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/); // DD/MM/YY(YY)
  if (m) { let y = m[3]; if (y.length === 2) y = '20' + y; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  m = s.match(/^(\d{1,2})[\-\s/]+([a-záéíóú]{3,})[\-\s/]+(\d{2,4})$/i); // DD-mmm-YYYY (español)
  if (m) {
    const mesKey = m[2].slice(0, 3).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const mes = MESES[mesKey];
    if (mes) { let y = m[3]; if (y.length === 2) y = '20' + y; return `${y}-${String(mes).padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  }
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
};

// Traduce nombres/variantes de ciudad al código de zona de KENET (MTY/SLT/TRC/MVA).
const ZONA_ALIAS = {
  monterrey: 'MTY', mty: 'MTY',
  saltillo: 'SLT', slt: 'SLT',
  torreon: 'TRC', trc: 'TRC',
  monclova: 'MVA', mva: 'MVA',
};
const normalizarZona = (v) => {
  const s = sanitizar(v);
  if (!s) return null;
  const key = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  return ZONA_ALIAS[key] || (ZONAS.includes(s.toUpperCase()) ? s.toUpperCase() : null);
};
const numEntre = (v, min, max) => { const n = parseInt(v, 10); return (!isNaN(n) && n >= min && n <= max) ? n : null; };

// Mapeo DETERMINISTA de nombres de columna comunes (Odoo/Excel) → campo KENET.
// Se aplica solo, sin IA, al cargar el archivo. La IA queda como refuerzo opcional.
const normHeader = (h) => String(h).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.#°]/g, '').replace(/\s+/g, ' ').trim();
const ALIAS_COLUMNAS = {
  'folio': 'folio', 'folio ks': 'folio', 'folio kenet': 'folio',
  'nombre': 'cliente', 'cliente': 'cliente', 'nombre cliente': 'cliente', 'nombre del cliente': 'cliente', 'cliente final': 'cliente', 'razon social': 'cliente',
  'folio odoo': 'folio_odoo', 'ov': 'folio_odoo', 'ov odoo': 'folio_odoo', 'orden de venta': 'folio_odoo',
  'telefono': 'telefono', 'tel': 'telefono', 'celular': 'telefono', 'whatsapp': 'telefono', 'movil': 'telefono',
  'direccion': 'direccion', 'domicilio': 'direccion', 'dir': 'direccion', 'ubicacion': 'direccion',
  'zona': 'zona', 'ciudad': 'zona', 'plaza': 'zona', 'sucursal': 'zona',
  'fecha': 'fecha_agenda', 'fecha agenda': 'fecha_agenda', 'fecha de agenda': 'fecha_agenda', 'fecha instalacion': 'fecha_agenda', 'fecha de instalacion': 'fecha_agenda', 'fecha programada': 'fecha_agenda',
  'paneles': 'paneles', 'no paneles': 'paneles', 'num paneles': 'paneles', 'numero de paneles': 'paneles', 'cantidad de paneles': 'paneles', 'modulos': 'paneles', 'no de paneles': 'paneles',
  'potencia panel': 'panel_potencia_w', 'watts panel': 'panel_potencia_w', 'w panel': 'panel_potencia_w', 'potencia por panel': 'panel_potencia_w',
  'marca panel': 'panel_marca', 'marca de panel': 'panel_marca', 'panel marca': 'panel_marca', 'tipo panel': 'panel_marca', 'tipo de panel': 'panel_marca',
  'inversor': 'inversor_tipo', 'tipo inversor': 'inversor_tipo', 'tipo de inversor': 'inversor_tipo',
  'cantidad inversor': 'inversor_cantidad', 'no inversores': 'inversor_cantidad', 'numero de inversores': 'inversor_cantidad',
  'capacidad inversor': 'inversor_capacidad_kw', 'kw inversor': 'inversor_capacidad_kw', 'capacidad kw': 'inversor_capacidad_kw',
  'marca inversor': 'inversor_marca', 'marca de inversor': 'inversor_marca',
  'notas': 'notas', 'nota': 'notas', 'comentarios': 'notas', 'comentarios cxc': 'notas', 'observaciones': 'notas', 'comentario': 'notas',
};
const campoDe = (header) => {
  const n = normHeader(header);
  return ALIAS_COLUMNAS[n] || (COLUMNAS.includes(n) ? n : null);
};
// Separa un folio compuesto "S57443 / MY511" en: folio KENET (MY/KS) y OV de Odoo (S#####).
// Convención KENET (ver BASES/HANDOFF): S##### = referencia Odoo · MY###/KS-… = folio propio.
const separarFolios = (valor) => {
  const s = sanitizar(valor, 200);
  if (!s) return { folioK: null, folioO: null };
  const partes = s.split(/[/|]+/).map(t => t.trim()).filter(Boolean);
  let odoo = null, kenet = null;
  for (const p of partes) {
    if (/^S\d/i.test(p) && !odoo) odoo = p;                 // OV de Odoo (S#####)
    else if (/^(MY|SL|KS)/i.test(p) && !kenet) kenet = p;   // folio KENET (MY, SL a futuro, o KS)
  }
  // Si NO hay folio KENET (MY/SL/KS), se deja en blanco (esos no se importan por ahora).
  return { folioK: kenet ? kenet.slice(0, 100) : null, folioO: odoo ? odoo.slice(0, 100) : null };
};

// Convierte una fila con encabezados arbitrarios a una con campos canónicos KENET.
const aplicarAlias = (r) => {
  const o = {};
  for (const k in r) {
    const campo = campoDe(k);
    if (campo && (o[campo] == null || o[campo] === '')) o[campo] = r[k];
  }
  // Separa el folio compuesto: MY→folio KENET, S→folio Odoo (si no viene ya un folio_odoo).
  if (o.folio) {
    const { folioK, folioO } = separarFolios(o.folio);
    o.folio = folioK;
    if (folioO && !sanitizar(o.folio_odoo)) o.folio_odoo = folioO;
  }
  return o;
};

// Solo folio + cliente son OBLIGATORIOS (bloquean la fila). Lo demás, si viene raro,
// es un AVISO: ese dato se omite pero la fila SÍ se importa.
const validarFila = (r, idx) => {
  const errores = [];  // bloquean la fila
  const avisos = [];   // no bloquean: el dato opcional se omite/recorta
  // El folio KENET (MY/SL) puede ir en blanco (ej. Saltillo aún sin SL); basta que haya
  // folio KENET o OV de Odoo (S) para identificar el proyecto. Solo cliente es obligatorio.
  if (!sanitizar(r.folio) && !sanitizar(r.folio_odoo)) errores.push('sin folio ni OV de Odoo');
  if (sanitizar(r.folio) && String(r.folio).length > 100) errores.push('folio excede 100 caracteres');
  if (!sanitizar(r.cliente)) errores.push('cliente vacío');
  else if (String(r.cliente).length > 255) errores.push('cliente excede 255 caracteres');
  if (r.zona && !normalizarZona(r.zona)) avisos.push(`zona "${sanitizar(r.zona)}" no reconocida (se omite)`);
  if (r.paneles && numEntre(r.paneles, 1, 999) == null) avisos.push('paneles fuera de 1–999 (se omite)');
  if (r.inversor_cantidad && numEntre(r.inversor_cantidad, 0, 99) == null) avisos.push('cantidad de inversor inválida (se omite)');
  const tipo = sanitizar(r.inversor_tipo)?.toLowerCase();
  if (tipo && !['inversor', 'microinversor'].includes(tipo)) avisos.push(`inversor tipo "${sanitizar(r.inversor_tipo)}" no reconocido (se omite)`);
  if (r.fecha_agenda && !fechaISO(r.fecha_agenda)) avisos.push('fecha no reconocida (se omite)');
  if (r.direccion && String(r.direccion).length > 500) avisos.push('dirección recortada a 500');
  if (r.notas && String(r.notas).length > 1000) avisos.push('notas recortadas a 1000');
  return { fila: idx + 1, errores, avisos, valida: errores.length === 0 };
};

const mapear = (r) => {
  const paneles = numEntre(r.paneles, 1, 999);
  const zona = normalizarZona(r.zona);
  const tipo = sanitizar(r.inversor_tipo)?.toLowerCase();
  const capKw = r.inversor_capacidad_kw != null && r.inversor_capacidad_kw !== '' ? parseFloat(r.inversor_capacidad_kw) : null;
  return {
    folio: sanitizar(r.folio, 100),
    folio_odoo: sanitizar(r.folio_odoo, 100),
    cliente: sanitizar(r.cliente, 255),
    telefono: sanitizar(r.telefono, 50),
    direccion: sanitizar(r.direccion, 500),
    zona,
    fecha_agenda: fechaISO(r.fecha_agenda),
    paneles,
    kw: paneles ? (paneles * WATTS_POR_PANEL) / 1000 : null,
    panel_potencia_w: numEntre(r.panel_potencia_w, 1, 100000),
    panel_marca: sanitizar(r.panel_marca, 100),
    inversor_tipo: tipo === 'microinversor' ? 'microinversor' : (tipo === 'inversor' ? 'inversor' : null),
    inversor_cantidad: numEntre(r.inversor_cantidad, 0, 99),
    inversor_capacidad_kw: (capKw != null && !isNaN(capKw)) ? capKw : null,
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
  const [filasRaw, setFilasRaw] = useState([]);     // filas con encabezados ORIGINALES (para IA)
  const [validaciones, setValidaciones] = useState([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [mapeando, setMapeando] = useState(false);  // IA mapeando columnas
  const [mapeoIA, setMapeoIA] = useState(null);     // { columna_origen: campo_destino }
  const [errorIA, setErrorIA] = useState('');
  const [filasIgnoradas, setFilasIgnoradas] = useState(0); // filas sin folio (totales/vacías) descartadas
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
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    // Acepta por extensión O por tipo MIME (en móvil a veces el nombre viene raro).
    const tipoOk = ['xlsx', 'xls', 'csv'].includes(ext) || /spreadsheet|excel|csv/i.test(f.type || '');
    if (!tipoOk) { alert(`Ese archivo no parece Excel/CSV (${f.name || 'sin nombre'}). Sube un .xlsx, .xls o .csv.`); return; }
    if (f.size > MAX_FILE_SIZE) { alert('El archivo supera el límite de 5 MB'); return; }
    setArchivo(f);
    try {
      const XLSX = await import('xlsx');
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rowsRaw = XLSX.utils.sheet_to_json(ws, { defval: '' });  // encabezados ORIGINALES
      if (rowsRaw.length > MAX_FILAS) { alert(`El archivo tiene ${rowsRaw.length} filas. El límite es ${MAX_FILAS} por importación.`); return; }
      // Auto-mapea nombres de columna comunes a los campos KENET (sin IA) y descarta
      // filas SIN folio (totales, resúmenes y renglones vacíos que traen los reportes).
      const rawReal = rowsRaw.filter(r => { const a = aplicarAlias(r); return sanitizar(a.folio) || sanitizar(a.folio_odoo); });
      const rows = rawReal.map(aplicarAlias);
      setFilasIgnoradas(rowsRaw.length - rawReal.length);
      setFilasRaw(rawReal);
      setFilas(rows);
      setValidaciones(rows.map((r, i) => validarFila(r, i)));
      setMapeoIA(null); setErrorIA('');
      setEtapa('preview');
    } catch (e) {
      alert('No se pudo leer el archivo: ' + (e?.message || e));
    }
  };

  const handleDrop = (e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); };

  // Fase 2 · Pide a la IA que mapee columnas arbitrarias al esquema KENET.
  // La IA SOLO propone el mapeo; aquí lo aplicamos y el humano lo revisa antes de importar.
  const formatearConIA = async () => {
    if (!filasRaw.length) return;
    setMapeando(true); setErrorIA('');
    try {
      const columnas = Object.keys(filasRaw[0] || {});
      // 1) Base DETERMINISTA (diccionario de alias, sin IA): { columna_origen: campo }
      const mapeoNorm = {};
      for (const col of columnas) {
        const campo = campoDe(col);
        if (campo && !Object.values(mapeoNorm).includes(campo)) mapeoNorm[col] = campo;
      }
      // 2) IA como REFUERZO para lo que el diccionario no reconoció (tolerante a fallos).
      try {
        const provider = localStorage.getItem('ks_ia_provider') || 'llama';
        const muestra = filasRaw.slice(0, 3);
        const { mapping } = await mapearColumnasIA(columnas, muestra, { provider });
        for (const [a, b] of Object.entries(mapping || {})) {
          let src, dest;
          if (COLUMNAS.includes(b)) { src = a; dest = b; }        // origen→destino
          else if (COLUMNAS.includes(a)) { src = b; dest = a; }   // invertido
          else continue;
          if (!(src in mapeoNorm) && !Object.values(mapeoNorm).includes(dest)) mapeoNorm[src] = dest;
        }
      } catch (e) {
        if (!Object.keys(mapeoNorm).length) throw e;   // sin base determinista, sí es error
        setErrorIA('La IA no respondió, pero mapeé las columnas conocidas automáticamente. Revisa el mapeo.');
      }
      if (!Object.keys(mapeoNorm).length) throw new Error('No se pudo mapear ninguna columna a los campos KENET. Revisa que el archivo tenga encabezados claros.');
      const nuevas = filasRaw.map(r => {
        const o = {};
        for (const src in mapeoNorm) { if (src in r) o[mapeoNorm[src]] = r[src]; }
        // Separa el folio compuesto igual que al cargar: MY→folio KENET, S→folio Odoo.
        if (o.folio) {
          const { folioK, folioO } = separarFolios(o.folio);
          o.folio = folioK;
          if (folioO && !sanitizar(o.folio_odoo)) o.folio_odoo = folioO;
        }
        return o;
      });
      setFilas(nuevas);
      setValidaciones(nuevas.map((r, i) => validarFila(r, i)));
      setMapeoIA(mapeoNorm);
    } catch (e) {
      setErrorIA(e.message || 'No se pudo formatear con IA.');
    } finally {
      setMapeando(false);
    }
  };

  const filasValidas = validaciones.filter(v => v.valida).length;
  const filasConError = validaciones.filter(v => !v.valida).length;
  const filasConAviso = validaciones.filter(v => v.valida && v.avisos?.length).length;

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

  const reiniciar = () => { setArchivo(null); setFilas([]); setFilasRaw([]); setValidaciones([]); setEtapa('seleccion'); setResultado(null); setMapeoIA(null); setErrorIA(''); setFilasIgnoradas(0); };

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
              >
                <div className="dz-icon">📂</div>
                <div className="fw-700 mb-8">Sube tu archivo</div>
                <div className="text-sm text-gray mb-16">Toca el botón para elegirlo (o arrástralo en computadora)</div>
                {/* <label> nativo: la forma más confiable de abrir el selector en móvil */}
                <label htmlFor="ks-import-file" className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>Seleccionar archivo</label>
                <div className="text-xs text-gray mt-12">Formatos: .xlsx · .xls · .csv</div>
              </div>
              <input
                id="ks-import-file"
                type="file"
                ref={fileRef}
                style={{ display: 'none' }}
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }}
              />
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
              <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#5B21B6', marginBottom: 4 }}>🪄 ¿Las columnas no cuadran?</div>
                <div className="text-xs text-gray" style={{ marginBottom: 10 }}>
                  Si tu archivo trae nombres de columna distintos (de Odoo, otro Excel, etc.), la IA puede
                  mapearlos al formato KENET. <strong>Tú revisas el resultado antes de importar.</strong>
                </div>
                <button className="btn btn-sm" style={{ background: '#6B4E9B', color: 'white' }} onClick={formatearConIA} disabled={mapeando}>
                  {mapeando ? 'Formateando con IA…' : '🪄 Formatear con IA'}
                </button>
                {errorIA && <div className="text-xs" style={{ color: 'var(--rojo)', marginTop: 8 }}>⚠️ {errorIA}</div>}
                {mapeoIA && (
                  <div style={{ marginTop: 10, background: 'white', borderRadius: 6, padding: '8px 10px', border: '1px solid #E9D5FF' }}>
                    <div className="text-xs" style={{ fontWeight: 700, color: '#5B21B6', marginBottom: 4 }}>Mapeo propuesto (revísalo):</div>
                    {Object.entries(mapeoIA).filter(([, d]) => d && COLUMNAS.includes(d)).map(([src, dest]) => (
                      <div key={src} className="text-xs text-gray" style={{ marginBottom: 1 }}>
                        <span style={{ color: 'var(--gris-texto)' }}>{src}</span> → <code>{dest}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

              {filasIgnoradas > 0 && (
                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: 'var(--gris-secundario)' }}>
                  ℹ️ Se ignoraron <strong>{filasIgnoradas}</strong> filas sin folio (totales, resúmenes o renglones vacíos del archivo). Solo se procesan las filas que son proyectos reales.
                </div>
              )}

              {filasConError > 0 && (
                <div style={{ background: '#FFF4F4', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#991B1B', marginBottom: 6 }}>Errores detectados — estas filas no se importarán (falta cliente):</div>
                  {validaciones.filter(v => !v.valida).slice(0, 15).map(v => (
                    <div key={v.fila} style={{ fontSize: 12, color: '#DC2626', marginBottom: 2 }}>Fila {v.fila}: {v.errores.join(' · ')}</div>
                  ))}
                </div>
              )}

              {filasConAviso > 0 && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>
                    ⚠️ {filasConAviso} fila(s) se importan con avisos: algún dato opcional no se reconoció y se omitió (folio y cliente sí entran).
                  </div>
                  <div style={{ fontSize: 11, color: '#92400E' }}>
                    Ej.: {[...new Set(validaciones.filter(v => v.valida && v.avisos?.length).flatMap(v => v.avisos))].slice(0, 4).join(' · ')}
                  </div>
                </div>
              )}

              {filas.length > 0 && (
                <div className="table-wrap" style={{ marginBottom: 16, maxHeight: 240, overflowY: 'auto' }}>
                  <table>
                    <thead><tr><th>#</th><th>Folio KENET</th><th>Folio Odoo</th><th>Cliente</th><th>Zona</th><th>Paneles</th><th>Estado</th></tr></thead>
                    <tbody>
                      {filas.slice(0, 20).map((r, i) => {
                        const v = validaciones[i];
                        return (
                          <tr key={i} style={{ background: v?.valida ? 'transparent' : '#FFF4F4' }}>
                            <td style={{ fontSize: 11, color: 'var(--gris-secundario)' }}>{i + 1}</td>
                            <td style={{ fontSize: 12, fontWeight: 600 }}>{r.folio || <span style={{ color: 'var(--gris-secundario)', fontStyle: 'italic', fontWeight: 400 }}>(en blanco)</span>}</td>
                            <td style={{ fontSize: 12, color: 'var(--gris-secundario)' }}>{r.folio_odoo || '—'}</td>
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
