import { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { getProyectos, actualizarProyecto, agregarBitacora, mensajeError, subirEvidencia } from '../lib/api';
import EstatusBadge from '../components/EstatusBadge';
import SLABadge from '../components/SLABadge';
import FirmaCanvas from '../components/FirmaCanvas';

const CHECKLIST = [
  'Revisión de estructura de techo',
  'Marcado de puntos de montaje',
  'Instalación de riel de aluminio',
  'Colocación de paneles solares',
  'Conexión eléctrica DC',
  'Instalación de inversor',
  'Conexión AC al tablero',
  'Prueba de generación',
  'Verificación de parámetros en app',
  'Limpieza del área de trabajo',
];

// Resumen legible del equipo a instalar
function equipoChips(p) {
  const chips = [];
  if (p.paneles) {
    const det = [p.panel_potencia_w ? `${p.panel_potencia_w} W` : null, p.panel_marca].filter(Boolean).join(' · ');
    chips.push(`☀️ ${p.paneles} paneles${det ? ` (${det})` : ''}`);
  }
  if (p.kw) chips.push(`⚡ ${p.kw} kWp`);
  if (p.inversor_tipo || p.inversor_capacidad_kw || p.inversor_marca) {
    const tipo = p.inversor_tipo === 'microinversor' ? 'Microinversor' : 'Inversor';
    const cant = p.inversor_cantidad ? `${p.inversor_cantidad}× ` : '';
    const det = [p.inversor_capacidad_kw ? `${p.inversor_capacidad_kw} kW` : null, p.inversor_marca].filter(Boolean).join(' · ');
    chips.push(`🔌 ${cant}${tipo}${det ? ` (${det})` : ''}`);
  }
  return chips;
}

function dataURLtoBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',');
  const mime = (meta.match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export default function VistaF_Reporte({ usuarioActual }) {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proyectoId, setProyectoId] = useState('');   // '' = vista de lista
  const [checks, setChecks] = useState({});
  const [fotos, setFotos] = useState({ antes: [], durante: [], despues: [] });
  const [observaciones, setObservaciones] = useState('');
  const [firmaUrl, setFirmaUrl] = useState(null);
  const [nombreFirma, setNombreFirma] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [respaldoEv, setRespaldoEv] = useState('');
  const [etapaActiva, setEtapaActiva] = useState('checklist');

  const esInstalador = usuarioActual?.rol === 'instalador';
  const titulo = esInstalador ? 'Mis instalaciones' : 'Reporte Instalador';

  const cargar = useCallback(async () => {
    if (usuarioActual == null) return;
    setLoading(true);
    try {
      const data = await getProyectos();
      const esAdmin = usuarioActual?.rol === 'admin';
      const uid = usuarioActual?.id ?? null;
      const mios = data.filter(p =>
        ['agendado', 'en_progreso', 'reagendado'].includes(p.estatus) &&
        (esAdmin || (uid != null && p.cuadrilla?.responsable_id === uid))
      );
      setProyectos(mios);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [usuarioActual]);

  useEffect(() => { cargar(); }, [cargar]);

  const proyecto = proyectos.find(p => p.id === proyectoId);
  const checksPasados = CHECKLIST.filter((_, i) => checks[i]).length;
  const pct = Math.round((checksPasados / CHECKLIST.length) * 100);

  const agregarFotos = (etapa, fileList) => {
    Array.from(fileList || []).forEach(f => {
      if (!f.type?.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => setFotos(prev => ({ ...prev, [etapa]: [...prev[etapa], { name: f.name, dataUrl: reader.result }] }));
      reader.readAsDataURL(f);
    });
  };
  const quitarFoto = (etapa, idx) => setFotos(prev => ({ ...prev, [etapa]: prev[etapa].filter((_, i) => i !== idx) }));

  const reiniciar = () => {
    setEnviado(false); setChecks({}); setFotos({ antes: [], durante: [], despues: [] });
    setFirmaUrl(null); setNombreFirma(''); setObservaciones(''); setEtapaActiva('checklist'); setRespaldoEv('');
  };

  const abrirReporte = async (p) => {
    reiniciar();
    setProyectoId(p.id);
    if (p.estatus === 'agendado') {   // al iniciar, la instalación queda en progreso
      try {
        await actualizarProyecto(p.id, { estatus: 'en_progreso' });
        await agregarBitacora({ proyecto_id: p.id, tipo: 'inicio', descripcion: 'Instalación iniciada por el instalador.', usuario_id: usuarioActual?.id ?? null });
        setProyectos(prev => prev.map(x => x.id === p.id ? { ...x, estatus: 'en_progreso' } : x));
      } catch (e) { console.error(e); }
    }
  };
  const volverALista = () => { reiniciar(); setProyectoId(''); cargar(); };

  const generarPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const fmtOf = (url) => (url && url.includes('image/png') ? 'PNG' : 'JPEG');
    const hoy = new Date().toISOString().slice(0, 10);
    let y = 44;
    doc.setFontSize(16); doc.setTextColor('#1F4E79'); doc.text('Reporte de Instalación · KENET Solar', 40, y); y += 24;
    doc.setFontSize(10); doc.setTextColor('#333333');
    const linea = (t) => { doc.text(t, 40, y, { maxWidth: W - 80 }); y += 15; };
    linea(`Folio: ${proyecto?.folio || '—'}    OV Odoo: ${proyecto?.folio_odoo || '—'}`);
    linea(`Cliente: ${proyecto?.cliente || '—'}`);
    linea(`Direccion: ${proyecto?.direccion || '—'}`);
    if (proyecto?.maps_url) linea(`Maps: ${proyecto.maps_url}`);
    linea(`Zona: ${proyecto?.zona || '—'}    Fecha de instalacion: ${hoy}`);
    linea(`Equipo: ${equipoChips(proyecto || {}).join('   ')}`);
    y += 8;
    doc.setFontSize(12); doc.setTextColor('#1F4E79'); doc.text(`Checklist (${pct}%)`, 40, y); y += 16;
    doc.setFontSize(10); doc.setTextColor('#333333');
    CHECKLIST.forEach((item, i) => { doc.text(`${checks[i] ? '[X]' : '[  ]'}  ${item}`, 48, y); y += 14; });
    y += 10;
    doc.setFontSize(12); doc.setTextColor('#1F4E79'); doc.text('Observaciones', 40, y); y += 15;
    doc.setFontSize(10); doc.setTextColor('#333333'); doc.text(observaciones || 'Ninguna', 48, y, { maxWidth: W - 96 }); y += 36;
    doc.setFontSize(12); doc.setTextColor('#1F4E79'); doc.text('Conformidad del cliente', 40, y); y += 12;
    if (firmaUrl) { try { doc.addImage(firmaUrl, 'PNG', 48, y, 170, 66); } catch (e) { /* firma invalida */ } }
    doc.setFontSize(10); doc.setTextColor('#333333'); doc.text(`Firma: ${nombreFirma}`, 240, y + 36);
    const todas = [
      ...fotos.antes.map(f => ({ ...f, etapa: 'Antes' })),
      ...fotos.durante.map(f => ({ ...f, etapa: 'Durante' })),
      ...fotos.despues.map(f => ({ ...f, etapa: 'Resultado' })),
    ];
    if (todas.length) {
      doc.addPage(); let py = 44; let px = 40; const imgW = 150; const imgH = 112; const gap = 16;
      doc.setFontSize(14); doc.setTextColor('#1F4E79'); doc.text('Evidencia fotografica', 40, py); py += 22;
      todas.forEach((f) => {
        if (px + imgW > W - 40) { px = 40; py += imgH + 26; }
        if (py + imgH + 26 > H - 30) { doc.addPage(); py = 44; px = 40; }
        try { doc.addImage(f.dataUrl, fmtOf(f.dataUrl), px, py, imgW, imgH); } catch (e) { /* imagen invalida */ }
        doc.setFontSize(8); doc.setTextColor('#666666'); doc.text(f.etapa, px, py + imgH + 12);
        px += imgW + gap;
      });
    }
    return doc;
  };

  const compartirPDF = async (doc) => {
    const nombre = `Reporte-${proyecto?.folio || 'instalacion'}.pdf`;
    const texto = `Reporte de instalación ${proyecto?.folio || ''} — ${proyecto?.cliente || ''}`;
    const blob = doc.output('blob');
    const file = new File([blob], nombre, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: nombre, text: texto }); return; } catch (e) { /* cancelado o no soportado -> descarga */ }
    }
    doc.save(nombre);
    try { window.open(`https://wa.me/?text=${encodeURIComponent(texto + ' (PDF descargado, adjúntalo aquí)')}`, '_blank'); } catch (e) { /* popup bloqueado */ }
  };

  const handleEnviar = async () => {
    if (!firmaUrl || !nombreFirma.trim()) { alert('Captura la firma del cliente antes de enviar.'); return; }
    setEnviando(true);
    try {
      const doc = generarPDF();
      await actualizarProyecto(proyectoId, { estatus: 'completado', fecha_instalacion: new Date().toISOString().slice(0, 10) });
      await agregarBitacora({
        proyecto_id: proyectoId,
        tipo: 'cierre',
        descripcion: `Instalación completada. ${proyecto?.paneles ?? '—'} paneles. Checklist: ${pct}%. Fotos: ${fotos.antes.length + fotos.durante.length + fotos.despues.length}. Firma: ${nombreFirma}. Obs: ${observaciones || 'ninguna'}`,
        usuario_id: usuarioActual?.id ?? null,
      });
      // Respaldo de evidencias en Supabase Storage (best-effort, no bloquea el envío)
      const folio = proyecto?.folio || 'sin-folio';
      const ts = Date.now();
      try {
        let n = 0;
        for (const [etapa, lista] of [['antes', fotos.antes], ['durante', fotos.durante], ['despues', fotos.despues]]) {
          for (let i = 0; i < lista.length; i++) {
            const blob = dataURLtoBlob(lista[i].dataUrl);
            const ext = blob.type.includes('png') ? 'png' : 'jpg';
            await subirEvidencia(`${folio}/${ts}/${etapa}-${i + 1}.${ext}`, blob);
            n++;
          }
        }
        await subirEvidencia(`${folio}/${ts}/reporte.pdf`, doc.output('blob'));
        setRespaldoEv(`☁️ ${n} foto(s) + PDF respaldados en la nube`);
      } catch (e) {
        setRespaldoEv('⚠️ Evidencias no respaldadas — crea el bucket "evidencias" en Supabase Storage');
      }
      await compartirPDF(doc);
      setEnviado(true);
    } catch (e) {
      alert(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <div className="page-body"><div className="empty-state"><div className="es-icon">⏳</div><p>Cargando…</p></div></div>;

  // ── Pantalla de éxito ──
  if (enviado) {
    return (
      <>
        <div className="page-header"><h2>{titulo}</h2></div>
        <div className="page-body">
          <div className="reporte-wrap">
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
              <div className="fw-700" style={{ fontSize: 17, marginBottom: 8 }}>Reporte enviado</div>
              <div className="text-gray text-sm mb-16">Instalación registrada y reporte en PDF generado. Si no se abrió el menú de compartir, el PDF se descargó — adjúntalo en WhatsApp a tu PM.</div>
              {respaldoEv && <div className="text-xs text-gray mb-16">{respaldoEv}</div>}
              <button className="btn btn-primary" onClick={volverALista}>← Volver a mis instalaciones</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Vista de LISTA (no hay proyecto abierto) ──
  if (!proyecto) {
    return (
      <>
        <div className="page-header">
          <div><h2>{titulo}</h2><div className="sub">{proyectos.length} {proyectos.length === 1 ? 'instalación' : 'instalaciones'} por atender</div></div>
          <button className="btn btn-outline btn-sm" onClick={cargar}>↺ Actualizar</button>
        </div>
        <div className="page-body">
          <div className="reporte-wrap">
            {proyectos.length === 0 ? (
              <div className="empty-state">
                <div className="es-icon">📋</div>
                <p>No tienes instalaciones asignadas.</p>
                <div className="text-xs text-gray mt-8">Aparecerán aquí cuando la mesa te despache un proyecto.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {proyectos.map(p => {
                  const hoy = new Date().toISOString().slice(0, 10);
                  const conFecha = !!p.fecha_agenda;
                  const puedeIniciar = conFecha && p.fecha_agenda <= hoy;   // hay fecha y ya llegó el día
                  return (
                  <div key={p.id} className="card" style={{ cursor: puedeIniciar ? 'pointer' : 'default' }} onClick={() => puedeIniciar && abrirReporte(p)}>
                    <div className="card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <div>
                          <div className="fw-700 text-blue" style={{ fontSize: 13 }}>{p.folio}</div>
                          <div className="fw-600" style={{ fontSize: 14 }}>{p.cliente}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                          <SLABadge dias={p.dias_en_etapa} />
                          <EstatusBadge estatus={p.estatus} fecha={p.fecha_agenda} />
                        </div>
                      </div>
                      {p.direccion && <div className="text-sm text-gray" style={{ marginBottom: p.maps_url ? 2 : 8 }}>📍 {p.direccion}</div>}
                      {p.maps_url && <a href={p.maps_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-blue fw-600" style={{ display: 'inline-block', fontSize: 12, marginBottom: 8 }}>🧭 Cómo llegar (Maps)</a>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        <span className="badge badge-zona">{p.zona}</span>
                        <span className="badge" style={{ background: conFecha ? '#EAF2F9' : '#FEF3C7', color: conFecha ? 'var(--azul-primario)' : '#92400E' }}>📅 {p.fecha_agenda || 'Sin fecha confirmada'}</span>
                      </div>
                      {equipoChips(p).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', background: '#F9FAFB', borderRadius: 8, fontSize: 12, marginBottom: 10 }}>
                          {equipoChips(p).map((c, i) => <span key={i}>{c}</span>)}
                        </div>
                      )}
                      {puedeIniciar ? (
                        <button className="btn btn-ambar w-full" style={{ justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); abrirReporte(p); }}>
                          {p.estatus === 'en_progreso' ? 'Continuar instalación →' : 'Iniciar instalación →'}
                        </button>
                      ) : (
                        <button className="btn btn-outline w-full" disabled style={{ justifyContent: 'center', opacity: 0.65 }}>
                          {!conFecha ? '⏳ Pendiente de agendar fecha' : `📅 Programada para ${p.fecha_agenda}`}
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Vista de REPORTE (proyecto abierto) ──
  return (
    <>
      <div className="page-header">
        <div>
          <button onClick={volverALista} style={{ fontSize: 12, color: 'var(--gris-secundario)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 2 }}>
            ← Mis instalaciones
          </button>
          <h2>{titulo}</h2>
          <div className="sub">{proyecto?.cliente}</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 12, background: pct === 100 ? '#D1FAE5' : '#EAF2F9', color: pct === 100 ? 'var(--verde)' : 'var(--azul-primario)' }}>
          {pct}% completado
        </div>
      </div>

      <div className="page-body">
        <div className="reporte-wrap">
          <div style={{ background: 'var(--azul-claro)', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
            <div className="fw-700 text-blue">{proyecto.folio} · {proyecto.cliente}</div>
            {proyecto.direccion && <div>📍 {proyecto.direccion}</div>}
            {proyecto.maps_url && <div><a href={proyecto.maps_url} target="_blank" rel="noreferrer" className="text-blue fw-600">🧭 Cómo llegar (Maps)</a></div>}
            <div className="text-gray" style={{ marginTop: 2 }}>📅 {proyecto.fecha_agenda || 'Sin fecha'} · {proyecto.zona}</div>
            {equipoChips(proyecto).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {equipoChips(proyecto).map((c, i) => <span key={i} style={{ fontSize: 12 }}>{c}</span>)}
              </div>
            )}
          </div>

          <div className="tabs">
            {[
              { id: 'checklist', label: `✅ Checklist (${checksPasados}/${CHECKLIST.length})` },
              { id: 'fotos',    label: `📸 Evidencia (${fotos.antes.length + fotos.durante.length + fotos.despues.length})` },
              { id: 'cierre',  label: '✍️ Cierre' },
            ].map(t => <button key={t.id} className={`tab${etapaActiva === t.id ? ' active' : ''}`} onClick={() => setEtapaActiva(t.id)}>{t.label}</button>)}
          </div>

          {etapaActiva === 'checklist' && (
            <div className="card">
              <div className="card-header"><h3>Checklist de instalación</h3><div style={{ fontSize: 12, color: 'var(--gris-secundario)' }}>{checksPasados}/{CHECKLIST.length}</div></div>
              <div className="card-body" style={{ padding: '8px 16px' }}>
                <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, marginBottom: 14, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--verde)' : 'var(--ambar)', borderRadius: 3, transition: 'width .3s' }} />
                </div>
                {CHECKLIST.map((item, i) => (
                  <div key={i} className="checklist-item" onClick={() => setChecks(c => ({ ...c, [i]: !c[i] }))}>
                    <input type="checkbox" checked={!!checks[i]} onChange={() => {}} />
                    <span style={{ fontSize: 13, textDecoration: checks[i] ? 'line-through' : 'none', color: checks[i] ? 'var(--gris-secundario)' : undefined }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--borde)' }}>
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => setEtapaActiva('fotos')}>Continuar → Evidencia fotográfica</button>
              </div>
            </div>
          )}

          {etapaActiva === 'fotos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'antes',   label: 'Antes de la instalación', icon: '🏠' },
                { key: 'durante', label: 'Durante la instalación',  icon: '🔧' },
                { key: 'despues', label: 'Resultado final',          icon: '☀️' },
              ].map(etapa => (
                <div key={etapa.key} className="card">
                  <div className="card-header"><h3>{etapa.icon} {etapa.label}</h3><span className="text-sm text-gray">{fotos[etapa.key].length} foto(s)</span></div>
                  <div className="card-body">
                    {fotos[etapa.key].length > 0 && (
                      <div className="foto-preview mb-12">
                        {fotos[etapa.key].map((foto, i) => (
                          <div key={i} className="foto-thumb-wrap" onClick={() => quitarFoto(etapa.key, i)} title="Tocar para quitar">
                            <img src={foto.dataUrl} alt="" className="foto-thumb-img" />
                            <span className="foto-thumb-x">✕</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="upload-box" style={{ cursor: 'pointer' }}>
                      <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { agregarFotos(etapa.key, e.target.files); e.target.value = ''; }} />
                      <div className="ub-icon">📷</div>
                      <div className="text-sm fw-600">Tomar foto / Seleccionar</div>
                      <div className="text-xs text-gray mt-4">Cámara o galería · varias a la vez</div>
                    </label>
                  </div>
                </div>
              ))}
              <div className="form-group">
                <label>Observaciones adicionales</label>
                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Condiciones del techo, hallazgos, notas…" rows={3} />
              </div>
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => setEtapaActiva('cierre')}>Continuar → Cierre y firma</button>
            </div>
          )}

          {etapaActiva === 'cierre' && (
            <div className="card">
              <div className="card-header"><h3>✍️ Cierre de instalación</h3></div>
              <div className="card-body">
                <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <div className="text-xs text-gray mb-8">Resumen</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                    <div><span className="text-gray">Checklist:</span> <strong style={{ color: pct === 100 ? 'var(--verde)' : 'var(--ambar)' }}>{pct}%</strong></div>
                    <div><span className="text-gray">Fotos:</span> <strong>{fotos.antes.length + fotos.durante.length + fotos.despues.length}</strong></div>
                    <div><span className="text-gray">Paneles:</span> <strong>{proyecto?.paneles ?? '—'}</strong></div>
                    <div><span className="text-gray">kWp:</span> <strong>{proyecto?.kw ?? '—'}</strong></div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Nombre del cliente (firma)</label>
                  <input value={nombreFirma} onChange={e => setNombreFirma(e.target.value)} placeholder="Nombre completo del cliente" />
                </div>
                <div className="form-group">
                  <label>Firma del cliente</label>
                  <FirmaCanvas onChange={setFirmaUrl} />
                </div>
                <button
                  className={`btn w-full ${firmaUrl && nombreFirma ? 'btn-green' : 'btn-outline'}`}
                  style={{ justifyContent: 'center', fontSize: 14 }}
                  onClick={handleEnviar}
                  disabled={!firmaUrl || !nombreFirma.trim() || enviando}
                >
                  {enviando ? 'Generando PDF…' : '📤 Enviar reporte (PDF / WhatsApp)'}
                </button>
                {(!firmaUrl || !nombreFirma) && <div className="text-xs text-gray text-center mt-8">Se requiere nombre y firma del cliente</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
