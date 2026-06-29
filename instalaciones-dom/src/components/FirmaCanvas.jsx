import { useRef, useEffect, useState } from 'react';

// Pad de firma con el dedo/mouse. Llama onChange(dataUrl|null) al soltar.
export default function FirmaCanvas({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const last = useRef(null);
  const [vacia, setVacia] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1F2937';
  }, []);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - rect.left, y: p.clientY - rect.top };
  };
  const start = (e) => { e.preventDefault(); drawing.current = true; last.current = pos(e); };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
    if (!dirty.current) { dirty.current = true; setVacia(false); }
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange?.(dirty.current ? canvasRef.current.toDataURL('image/png') : null);
  };

  const limpiar = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false; setVacia(true); onChange?.(null);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="firma-canvas"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span className="text-xs" style={{ color: vacia ? 'var(--gris-secundario)' : 'var(--verde)' }}>
          {vacia ? 'El cliente firma aquí con el dedo' : '✓ Firma capturada'}
        </span>
        <button type="button" className="btn btn-outline btn-sm" onClick={limpiar}>Limpiar</button>
      </div>
    </div>
  );
}
