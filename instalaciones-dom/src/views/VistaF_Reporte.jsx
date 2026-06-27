import { useState, useEffect } from 'react';
import { getProyectos, actualizarProyecto, agregarBitacora } from '../lib/api';

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

export default function VistaF_Reporte({ usuarioActual }) {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proyectoId, setProyectoId] = useState('');
  const [checks, setChecks] = useState({});
  const [fotos, setFotos] = useState({ antes: [], durante: [], despues: [] });
  const [observaciones, setObservaciones] = useState('');
  const [firmado, setFirmado] = useState(false);
  const [nombreFirma, setNombreFirma] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [etapaActiva, setEtapaActiva] = useState('checklist');

  useEffect(() => {
    getProyectos()
      .then(data => {
        const activos = data.filter(p => ['agendado', 'en_progreso'].includes(p.estatus));
        setProyectos(activos);
        if (activos.length > 0) setProyectoId(activos[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const proyecto = proyectos.find(p => p.id === proyectoId);
  const checksPasados = CHECKLIST.filter((_, i) => checks[i]).length;
  const pct = Math.round((checksPasados / CHECKLIST.length) * 100);

  const simularFoto = (etapa) => setFotos(f => ({ ...f, [etapa]: [...f[etapa], Date.now()] }));

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

  const reiniciar = () => {
    setEnviado(false); setChecks({}); setFotos({ antes: [], durante: [], despues: [] });
    setFirmado(false); setNombreFirma(''); setObservaciones(''); setEtapaActiva('checklist');
  };

  if (loading) return <div className="page-body"><div className="empty-state"><div className="es-icon">⏳</div><p>Cargando…</p></div></div>;

  if (enviado) {
    return (
      <>
        <div className="page-header"><h2>📱 Reporte Instalador</h2></div>
        <div className="page-body">
          <div className="reporte-wrap">
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
              <div className="fw-700" style={{ fontSize: 17, marginBottom: 8 }}>Reporte enviado</div>
              <div className="text-gray text-sm mb-16">Instalación registrada. El PM recibirá notificación.</div>
              <button className="btn btn-primary" onClick={reiniciar}>Nuevo reporte</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (proyectos.length === 0) {
    return (
      <>
        <div className="page-header"><h2>📱 Reporte Instalador</h2></div>
        <div className="page-body"><div className="empty-state"><div className="es-icon">📋</div><p>No hay proyectos agendados o en progreso.</p></div></div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div><h2>📱 Reporte Instalador</h2><div className="sub">Captura de campo · {proyecto?.cliente}</div></div>
        <div style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 12, background: pct === 100 ? '#D1FAE5' : '#EAF2F9', color: pct === 100 ? 'var(--verde)' : 'var(--azul-primario)' }}>
          {pct}% completado
        </div>
      </div>

      <div className="page-body">
        <div className="reporte-wrap">
          <div className="card mb-16">
            <div className="card-body">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Proyecto a reportar</label>
                <select value={proyectoId} onChange={e => { setProyectoId(e.target.value); reiniciar(); }}>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.folio} — {p.cliente}</option>)}
                </select>
              </div>
            </div>
          </div>

          {proyecto && (
            <div style={{ background: 'var(--azul-claro)', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
              <div className="fw-700 text-blue">{proyecto.folio}</div>
              <div>{proyecto.direccion}</div>
              <div className="text-gray">{proyecto.paneles} paneles · {proyecto.kw} kW</div>
            </div>
          )}

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
                    <div><span className="text-gray">kW:</span> <strong>{proyecto?.kw ?? '—'}</strong></div>
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
