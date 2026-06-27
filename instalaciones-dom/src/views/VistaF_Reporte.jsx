import { useState } from 'react';
import { proyectos } from '../data/mockData';

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

export default function VistaF_Reporte() {
  const [proyectoId, setProyectoId] = useState(proyectos[1].id);
  const [checks, setChecks] = useState({});
  const [fotos, setFotos] = useState({ antes: [], durante: [], despues: [] });
  const [observaciones, setObservaciones] = useState('');
  const [firmado, setFirmado] = useState(false);
  const [nombreFirma, setNombreFirma] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [etapaActiva, setEtapaActiva] = useState('checklist');

  const proyecto = proyectos.find(p => p.id === proyectoId);
  const checksPasados = CHECKLIST.filter((_, i) => checks[i]).length;
  const pct = Math.round((checksPasados / CHECKLIST.length) * 100);

  const toggleCheck = (i) => setChecks(c => ({ ...c, [i]: !c[i] }));

  const simularFoto = (etapa) => {
    setFotos(f => ({
      ...f,
      [etapa]: [...f[etapa], `foto_${Date.now()}`],
    }));
  };

  const handleEnviar = () => {
    if (!firmado || !nombreFirma.trim()) {
      alert('Obtén la firma del cliente antes de enviar.');
      return;
    }
    setEnviado(true);
  };

  if (enviado) {
    return (
      <>
        <div className="page-header">
          <h2>📱 Reporte Instalador</h2>
        </div>
        <div className="page-body">
          <div className="reporte-wrap">
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
              <div className="fw-700" style={{ fontSize: 17, marginBottom: 8 }}>Reporte enviado</div>
              <div className="text-gray text-sm mb-16">
                Instalación registrada para {proyecto?.cliente}.<br />
                El PM recibirá notificación para validación.
              </div>
              <button className="btn btn-primary" onClick={() => { setEnviado(false); setChecks({}); setFotos({ antes: [], durante: [], despues: [] }); setFirmado(false); setNombreFirma(''); setObservaciones(''); }}>
                Nuevo reporte
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>📱 Reporte Instalador</h2>
          <div className="sub">Captura de campo · {proyecto?.cliente}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 12,
            background: pct === 100 ? '#D1FAE5' : '#EAF2F9',
            color: pct === 100 ? 'var(--verde)' : 'var(--azul-primario)',
          }}>
            {pct}% completado
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="reporte-wrap">
          {/* Selector de proyecto */}
          <div className="card mb-16">
            <div className="card-body">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Proyecto a reportar</label>
                <select value={proyectoId} onChange={e => setProyectoId(e.target.value)}>
                  {proyectos.filter(p => ['agendado', 'en_progreso'].includes(p.estatus)).map(p => (
                    <option key={p.id} value={p.id}>{p.folio} — {p.cliente}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Info del proyecto */}
          {proyecto && (
            <div style={{ background: 'var(--azul-claro)', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
              <div className="fw-700 text-blue">{proyecto.folio}</div>
              <div>{proyecto.direccion}</div>
              <div className="text-gray">{proyecto.paneles} paneles · {proyecto.kw} kW</div>
            </div>
          )}

          {/* Tabs de navegación */}
          <div className="tabs">
            {[
              { id: 'checklist', label: `✅ Checklist (${checksPasados}/${CHECKLIST.length})` },
              { id: 'fotos', label: `📸 Evidencia (${fotos.antes.length + fotos.durante.length + fotos.despues.length})` },
              { id: 'cierre', label: '✍️ Cierre' },
            ].map(t => (
              <button key={t.id} className={`tab${etapaActiva === t.id ? ' active' : ''}`} onClick={() => setEtapaActiva(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* CHECKLIST */}
          {etapaActiva === 'checklist' && (
            <div className="card">
              <div className="card-header">
                <h3>Checklist de instalación</h3>
                <div style={{ fontSize: 12, color: 'var(--gris-secundario)' }}>{checksPasados} / {CHECKLIST.length}</div>
              </div>
              <div className="card-body" style={{ padding: '8px 16px' }}>
                {/* Barra de progreso */}
                <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, marginBottom: 14, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--verde)' : 'var(--ambar)', borderRadius: 3, transition: 'width .3s' }} />
                </div>
                {CHECKLIST.map((item, i) => (
                  <div key={i} className="checklist-item" onClick={() => toggleCheck(i)}>
                    <input type="checkbox" checked={!!checks[i]} onChange={() => {}} />
                    <span style={{ fontSize: 13, textDecoration: checks[i] ? 'line-through' : 'none', color: checks[i] ? 'var(--gris-secundario)' : undefined }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--borde)' }}>
                <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => setEtapaActiva('fotos')}>
                  Continuar → Evidencia fotográfica
                </button>
              </div>
            </div>
          )}

          {/* FOTOS */}
          {etapaActiva === 'fotos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'antes', label: 'Antes de la instalación', icon: '🏠' },
                { key: 'durante', label: 'Durante la instalación', icon: '🔧' },
                { key: 'despues', label: 'Resultado final', icon: '☀️' },
              ].map(etapa => (
                <div key={etapa.key} className="card">
                  <div className="card-header">
                    <h3>{etapa.icon} {etapa.label}</h3>
                    <span className="text-sm text-gray">{fotos[etapa.key].length} foto(s)</span>
                  </div>
                  <div className="card-body">
                    {fotos[etapa.key].length > 0 && (
                      <div className="foto-preview mb-12">
                        {fotos[etapa.key].map((_, i) => (
                          <div key={i} className="foto-thumb">📸</div>
                        ))}
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
                <textarea
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Condiciones del techo, hallazgos, notas para el PM…"
                  rows={3}
                />
              </div>
              <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={() => setEtapaActiva('cierre')}>
                Continuar → Cierre y firma
              </button>
            </div>
          )}

          {/* CIERRE */}
          {etapaActiva === 'cierre' && (
            <div className="card">
              <div className="card-header"><h3>✍️ Cierre de instalación</h3></div>
              <div className="card-body">
                {/* Resumen */}
                <div style={{ background: '#F9FAFB', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <div className="text-xs text-gray mb-8">Resumen de la instalación</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                    <div><span className="text-gray">Checklist:</span> <strong style={{ color: pct === 100 ? 'var(--verde)' : 'var(--ambar)' }}>{pct}%</strong></div>
                    <div><span className="text-gray">Fotos:</span> <strong>{fotos.antes.length + fotos.durante.length + fotos.despues.length}</strong></div>
                    <div><span className="text-gray">Paneles:</span> <strong>{proyecto?.paneles}</strong></div>
                    <div><span className="text-gray">kW:</span> <strong>{proyecto?.kw}</strong></div>
                  </div>
                </div>

                {/* Firma */}
                <div className="form-group">
                  <label>Nombre del cliente (firma)</label>
                  <input
                    value={nombreFirma}
                    onChange={e => setNombreFirma(e.target.value)}
                    placeholder="Nombre completo del cliente"
                  />
                </div>
                <div
                  style={{
                    border: `2px dashed ${firmado ? 'var(--verde)' : 'var(--borde)'}`,
                    borderRadius: 10, padding: '32px 20px', textAlign: 'center',
                    cursor: 'pointer', marginBottom: 16, background: firmado ? '#F0FBF4' : 'white',
                    transition: 'all .2s',
                  }}
                  onClick={() => setFirmado(true)}
                >
                  {firmado ? (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                      <div className="fw-700 text-green">Firma capturada</div>
                      <div className="text-sm text-gray">{nombreFirma}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>✍️</div>
                      <div className="fw-700">Zona de firma del cliente</div>
                      <div className="text-sm text-gray">Toca aquí para capturar la firma</div>
                    </>
                  )}
                </div>

                <button
                  className={`btn w-full ${firmado && nombreFirma ? 'btn-green' : 'btn-outline'}`}
                  style={{ justifyContent: 'center', fontSize: 14 }}
                  onClick={handleEnviar}
                  disabled={!firmado || !nombreFirma.trim()}
                >
                  📤 Enviar reporte al PM
                </button>

                {(!firmado || !nombreFirma) && (
                  <div className="text-xs text-gray text-center mt-8">
                    Se requiere nombre y firma del cliente para enviar
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
