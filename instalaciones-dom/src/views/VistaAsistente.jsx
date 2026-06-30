import { useState, useRef, useEffect } from 'react';
import { chatIA } from '../lib/ia';

const SUGERENCIAS = [
  '¿Cómo vamos en general?',
  '¿Qué instalaciones tengo por agendar?',
  'Proyectos críticos (más de 15 días)',
  'Resúmeme la bitácora de SEED-04',
];

// Etiqueta amigable de cada herramienta que usó la IA (para transparencia).
const TOOL_LABEL = {
  resumen_kpis: 'panorama general',
  listar_proyectos: 'lista de proyectos',
  detalle_proyecto: 'detalle de proyecto',
  bitacora_proyecto: 'bitácora',
};

export default function VistaAsistente({ usuarioActual }) {
  const [mensajes, setMensajes] = useState([]); // {role, content, usadas?, error?}
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [provider, setProvider] = useState('claude');
  const finRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes, cargando]);

  const enviar = async (textoForzado) => {
    const pregunta = (textoForzado ?? texto).trim();
    if (!pregunta || cargando) return;
    setTexto('');

    // Historial que se manda al backend (solo role + content).
    const historialPrevio = mensajes
      .filter(m => !m.error)
      .map(m => ({ role: m.role, content: m.content }));
    const historial = [...historialPrevio, { role: 'user', content: pregunta }];

    setMensajes(prev => [...prev, { role: 'user', content: pregunta }]);
    setCargando(true);
    try {
      const r = await chatIA(historial, { provider });
      setMensajes(prev => [...prev, { role: 'assistant', content: r.reply, usadas: r.usadas, provider: r.provider }]);
    } catch (e) {
      setMensajes(prev => [...prev, { role: 'assistant', content: e.message || 'Error desconocido', error: true }]);
    } finally {
      setCargando(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>💬 Asistente</h2>
          <div className="sub">Pregunta por el estatus, resúmenes y panorama · datos en vivo</div>
        </div>
        <div className="ia-provider">
          <label>Motor</label>
          <select value={provider} onChange={e => setProvider(e.target.value)}>
            <option value="claude">Claude (preciso)</option>
            <option value="llama">Llama · Groq (rápido)</option>
          </select>
        </div>
      </div>

      <div className="page-body ia-body">
        <div className="ia-chat">
          {mensajes.length === 0 && (
            <div className="ia-welcome">
              <div className="ia-welcome-emoji">☀️</div>
              <p>Hola{usuarioActual?.nombre ? `, ${usuarioActual.nombre.split(' ')[0]}` : ''}. Soy el asistente de la Mesa de Control.</p>
              <p className="text-sm text-gray">Te ayudo a consultar el estatus real de las instalaciones. Prueba con:</p>
              <div className="ia-sugerencias">
                {SUGERENCIAS.map(s => (
                  <button key={s} className="ia-chip" onClick={() => enviar(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {mensajes.map((m, i) => (
            <div key={i} className={`ia-msg ia-msg-${m.role}${m.error ? ' ia-msg-error' : ''}`}>
              <div className="ia-bubble">
                {m.content.split('\n').map((linea, j) => <div key={j}>{linea || ' '}</div>)}
                {m.usadas?.length > 0 && (
                  <div className="ia-tools">
                    🔎 consultó: {[...new Set(m.usadas)].map(t => TOOL_LABEL[t] || t).join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}

          {cargando && (
            <div className="ia-msg ia-msg-assistant">
              <div className="ia-bubble ia-typing"><span></span><span></span><span></span></div>
            </div>
          )}
          <div ref={finRef} />
        </div>

        <div className="ia-input-bar">
          <textarea
            ref={inputRef}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribe tu pregunta…"
            rows={1}
            disabled={cargando}
          />
          <button className="btn btn-primary" onClick={() => enviar()} disabled={cargando || !texto.trim()}>
            Enviar
          </button>
        </div>
        <div className="ia-disclaimer">
          La IA puede equivocarse. Verifica datos críticos en la sección correspondiente. Solo lectura.
        </div>
      </div>
    </>
  );
}
