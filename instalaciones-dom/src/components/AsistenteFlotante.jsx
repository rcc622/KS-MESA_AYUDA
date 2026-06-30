import { useState, useRef, useEffect } from 'react';
import { chatIA } from '../lib/ia';
import Icon from './Icon';

const TOOL_LABEL = {
  resumen_kpis: 'panorama general',
  listar_proyectos: 'lista de proyectos',
  detalle_proyecto: 'detalle de proyecto',
  bitacora_proyecto: 'bitácora',
};
const SUGERENCIAS = ['¿Cómo vamos en general?', '¿Qué hay por agendar?', 'Proyectos críticos'];
const LS_PROVIDER = 'ks_ia_provider';
const MOTORES_VALIDOS = ['llama', 'qwen'];

// Burbuja flotante de chat, presente sobre todas las pantallas. Comparte el motor
// (Llama/Qwen) con la vista completa vía localStorage. Claude queda fuera para no
// gastar la cuenta personal de Claude.
export default function AsistenteFlotante({ usuarioActual, oculto }) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [provider, setProvider] = useState(() => {
    const s = localStorage.getItem(LS_PROVIDER);
    return MOTORES_VALIDOS.includes(s) ? s : 'llama';
  });
  const finRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { localStorage.setItem(LS_PROVIDER, provider); }, [provider]);
  useEffect(() => { if (abierto) finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes, cargando, abierto]);
  useEffect(() => { if (abierto) setTimeout(() => inputRef.current?.focus(), 100); }, [abierto]);

  const enviar = async (textoForzado) => {
    const pregunta = (textoForzado ?? texto).trim();
    if (!pregunta || cargando) return;
    setTexto('');
    const historial = [
      ...mensajes.filter(m => !m.error).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: pregunta },
    ];
    setMensajes(prev => [...prev, { role: 'user', content: pregunta }]);
    setCargando(true);
    try {
      const r = await chatIA(historial, { provider });
      setMensajes(prev => [...prev, { role: 'assistant', content: r.reply, usadas: r.usadas }]);
    } catch (e) {
      setMensajes(prev => [...prev, { role: 'assistant', content: e.message || 'Error desconocido', error: true }]);
    } finally {
      setCargando(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } };

  if (oculto) return null;

  return (
    <>
      {!abierto && (
        <button className="ia-fab" onClick={() => setAbierto(true)} aria-label="Abrir asistente IA" title="Asistente IA">
          <Icon name="message" size={24} strokeWidth={2} />
        </button>
      )}

      {abierto && (
        <div className="ia-pop">
          <div className="ia-pop-head">
            <div className="ia-pop-title">
              <span className="ia-pop-dot" />
              <span>Asistente IA</span>
            </div>
            <div className="ia-pop-actions">
              <select value={provider} onChange={e => setProvider(e.target.value)} aria-label="Motor de IA">
                <option value="llama">Llama</option>
                <option value="qwen">Qwen</option>
              </select>
              <button className="ia-pop-close" onClick={() => setAbierto(false)} aria-label="Cerrar">
                <Icon name="close" size={20} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="ia-chat ia-pop-chat">
            {mensajes.length === 0 && (
              <div className="ia-welcome ia-welcome-sm">
                <div className="ia-welcome-emoji">☀️</div>
                <p className="text-sm">Hola{usuarioActual?.nombre ? `, ${usuarioActual.nombre.split(' ')[0]}` : ''}. Pregúntame por el estatus.</p>
                <div className="ia-sugerencias">
                  {SUGERENCIAS.map(s => <button key={s} className="ia-chip" onClick={() => enviar(s)}>{s}</button>)}
                </div>
              </div>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={`ia-msg ia-msg-${m.role}${m.error ? ' ia-msg-error' : ''}`}>
                <div className="ia-bubble">
                  {m.content.split('\n').map((linea, j) => <div key={j}>{linea || ' '}</div>)}
                  {m.usadas?.length > 0 && (
                    <div className="ia-tools">🔎 {[...new Set(m.usadas)].map(t => TOOL_LABEL[t] || t).join(', ')}</div>
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
            <textarea ref={inputRef} value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={onKeyDown}
              placeholder="Escribe tu pregunta…" rows={1} disabled={cargando} />
            <button className="btn btn-primary btn-sm" onClick={() => enviar()} disabled={cargando || !texto.trim()}>Enviar</button>
          </div>
        </div>
      )}
    </>
  );
}
