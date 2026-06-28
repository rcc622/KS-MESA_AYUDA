import { useState, useEffect, useCallback } from 'react';
import { getProyectos, actualizarProyecto, agregarBitacora } from '../lib/api';
import EstatusBadge from '../components/EstatusBadge';
import SLABadge from '../components/SLABadge';

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

export default function VistaF_Reporte({ usuarioActual }) {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proyectoId, setProyectoId] = useState('');   // '' = vista de lista
  const [checks, setChecks] = useState({});
  const [fotos, setFotos] = useState({ antes: [], durante: [], despues: [] });
  const [observaciones, setObservaciones] = useState('');
  const [firmado, setFirmado] = useState(false);
  const [nombreFirma, setNombreFirma] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
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

  const simularFoto = (etapa) => setFotos(f => ({ ...f, [etapa]: [...f[etapa], 'foto'] }));

  const reiniciar = () => {
    setEnviado(false); setChecks({}); setFotos({ antes: [], durante: [], despues: [] });
    setFirmado(false); setNombreFirma(''); setObservaciones(''); setEtapaActiva('checklist');
  };

  const abrirReporte = (p) => { reiniciar(); setProyectoId(p.id); };
  const volverALista = () => { reiniciar(); setProyectoId(''); cargar(); };

  const handleEnviar = async () => {
    if (!firmado || !nombreFirma.trim()) { alert('Obtén la firma del cliente antes de enviar.'); return; }
    setEnviando(true);
    try {
      await actualizarProyecto(proyectoId, {
        estatus: 'completado',
        fecha_instalacion: new Date().toISOString().slice(0, 10),
      });
      await agregarBitacora({
        proyecto_id: proyectoId,
        tipo: 'cierre',
        descripcion: `Instalación completada. ${proyecto?.paneles ?? '—'} paneles instalados. Checklist: ${pct}%. Firma: ${nombreFirma}. Observaciones: ${observaciones || 'ninguna'}`,
        usuario_id: usuarioActual?.id ?? null,
      });
      setEnviado(true);
    } catch (e) {
      alert('Error: ' + e.message);
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
              <div className="text-gray text-sm mb-16">Instalación registrada. El PM recibirá notificación.</div>
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
                {proyectos.map(p => (
                  <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => abrirReporte(p)}>
                    <div className="card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <div>
                          <div className="fw-700 text-blue" style={{ fontSize: 13 }}>{p.folio}</div>
                          <div className="fw-600" style={{ fontSize: 14 }}>{p.cliente}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                          <SLABadge dias={p.dias_en_etapa} />
                          <EstatusBadge estatus={p.estatus} />
                        </div>
                      </div>
                      {p.direccion && <div className="text-sm text-gray" style={{ marginBottom: 8 }}>📍 {p.direccion}</div>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        <span className="badge badge-zona">{p.zona}</span>
                        <span className="badge" style={{ background: '#EAF2F9', color: 'var(--azul-primario)' }}>📅 {p.fecha_agenda || 'Sin fecha'}</span>
                      </div>
                      {equipoChips(p).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', background: '#F9FAFB', borderRadius: 8, fontSize: 12, marginBottom: 10 }}>
                          {equipoChips(p).map((c, i) => <span key={i}>{c}</span>)}
                        </div>
                      )}
                      <button className="btn btn-ambar w-full" style={{ justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); abrirReporte(p); }}>
                        Iniciar reporte →
                      </button>
                    </div>
                  </div>
                ))}
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
                        {fotos[etapa.key].map((_, i) => <div key={i} className="foto-thumb">📸</div>)}
                      </div>
                    )}
                    <div className="upload-box" onClick={() => simularFoto(etapa.key)}>
                      <div className="ub-icon">📷</div>
                      <div className="text-sm fw-600">Tomar foto / Seleccionar</div>
                      <div className="text-xs text-gray mt-4">JPG, PNG · Máx. 10 MB</div>
                    </div>
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
                <div
                  style={{ border: `2px dashed ${firmado ? 'var(--verde)' : 'var(--borde)'}`, borderRadius: 10, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: firmado ? '#F0FBF4' : 'white', transition: 'all .2s' }}
                  onClick={() => setFirmado(true)}
                >
                  {firmado ? (
                    <><div style={{ fontSize: 32, marginBottom: 8 }}>✅</div><div className="fw-700 text-green">Firma capturada</div><div className="text-sm text-gray">{nombreFirma}</div></>
                  ) : (
                    <><div style={{ fontSize: 32, marginBottom: 8 }}>✍️</div><div className="fw-700">Zona de firma del cliente</div><div className="text-sm text-gray">Toca aquí para capturar la firma</div></>
                  )}
                </div>
                <button
                  className={`btn w-full ${firmado && nombreFirma ? 'btn-green' : 'btn-outline'}`}
                  style={{ justifyContent: 'center', fontSize: 14 }}
                  onClick={handleEnviar}
                  disabled={!firmado || !nombreFirma.trim() || enviando}
                >
                  {enviando ? 'Enviando…' : '📤 Enviar reporte al PM'}
                </button>
                {(!firmado || !nombreFirma) && <div className="text-xs text-gray text-center mt-8">Se requiere nombre y firma del cliente</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
