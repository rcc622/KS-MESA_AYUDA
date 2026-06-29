import { useState, useEffect, useRef } from 'react';
import { getProyectos, getCuadrillas, respaldoGeneral, subirRespaldoStorage, mensajeError } from '../lib/api';

const COOLDOWN_RESPALDO_MS = 5 * 60 * 1000; // 5 minutos
const LS_KEY = 'ks_ultimo_respaldo';

export default function VistaPanel({ goTo, usuarioActual }) {
  const [proyectos, setProyectos] = useState([]);
  const [cuadrillas, setCuadrillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respaldando, setRespaldando] = useState(false);
  const [msgRespaldo, setMsgRespaldo] = useState('');
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const timerRef = useRef(null);

  const esAdmin = usuarioActual?.rol === 'admin';

  // Calcula segundos restantes al montar y arranca countdown si aplica
  useEffect(() => {
    const calcularRestante = () => {
      const ultimo = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
      const restante = Math.max(0, Math.ceil((ultimo + COOLDOWN_RESPALDO_MS - Date.now()) / 1000));
      setSegundosRestantes(restante);
      return restante;
    };

    if (calcularRestante() > 0) {
      timerRef.current = setInterval(() => {
        const r = calcularRestante();
        if (r === 0) clearInterval(timerRef.current);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, []);

  const handleRespaldo = async () => {
    if (segundosRestantes > 0) return;
    setRespaldando(true); setMsgRespaldo('');
    try {
      const data = await respaldoGeneral();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const nombre = `respaldo-kenet-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = nombre; a.click(); URL.revokeObjectURL(url);
      let nube;
      try { await subirRespaldoStorage(nombre, blob); nube = '☁️ guardado en Supabase Storage'; }
      catch { nube = '⚠️ nube no configurada (crea el bucket "respaldos" en Supabase Storage)'; }
      const total = Object.values(data.tablas).reduce((s, arr) => s + (arr?.length || 0), 0);
      setMsgRespaldo(`✅ Respaldo descargado · ${total} registros de ${Object.keys(data.tablas).length} tablas · ${nube}`);

      // Registra timestamp y arranca countdown
      localStorage.setItem(LS_KEY, Date.now().toString());
      setSegundosRestantes(COOLDOWN_RESPALDO_MS / 1000);
      timerRef.current = setInterval(() => {
        setSegundosRestantes(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
      setMsgRespaldo('❌ ' + mensajeError(e));
    } finally {
      setRespaldando(false);
    }
  };

  useEffect(() => {
    Promise.all([getProyectos(), getCuadrillas({ activa: true })])
      .then(([p, c]) => { setProyectos(p); setCuadrillas(c); })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-body"><div className="empty-state"><div className="es-icon">⏳</div><p>Cargando tablero…</p></div></div>;

  const activos = proyectos.filter(p => !['completado', 'cancelado'].includes(p.estatus));
  const k = {
    activos: activos.length,
    enSLA: activos.filter(p => (p.dias_en_etapa ?? 0) <= 15).length,
    criticos: activos.filter(p => (p.dias_en_etapa ?? 0) > 15).length,
    porInstalar: proyectos.filter(p => p.estatus === 'agendado').length,
    reagendados: proyectos.filter(p => p.estatus === 'reagendado').length,
    completados: proyectos.filter(p => p.estatus === 'completado').length,
    porDespachar: activos.filter(p => !p.cuadrilla_id).length,
  };

  const kpis = [
    { v: k.activos, l: 'Proyectos activos', cls: '' },
    { v: k.enSLA, l: 'Dentro de SLA', cls: 'verde' },
    { v: k.criticos, l: 'Críticos (>15 días)', cls: 'rojo' },
    { v: k.porInstalar, l: 'Por instalar', cls: 'ambar' },
    { v: k.reagendados, l: 'Reagendados', cls: '' },
    { v: k.completados, l: 'Completados', cls: 'verde' },
  ];

  const accesos = [
    { v: 'agenda', icon: '📅', l: 'Agenda / SLA' },
    { v: 'reagendados', icon: '🔄', l: 'Reagendados' },
    { v: 'cuadrillas', icon: '👷', l: 'Cuadrillas' },
    { v: 'cortes', icon: '💰', l: 'Cortes de Pago' },
    { v: 'import', icon: '📤', l: 'Importar' },
  ];

  return (
    <>
      <div className="page-header">
        <div><h2>🗼 Mesa de Control</h2><div className="sub">Tablero nacional · Instalaciones Domésticas</div></div>
      </div>
      <div className="page-body">
        <div className="stats-row">
          {kpis.map((c, i) => (
            <div key={i} className={`stat-card ${c.cls}`}><div className="stat-val">{c.v}</div><div className="stat-label">{c.l}</div></div>
          ))}
        </div>

        <div className="col2" style={{ marginBottom: 20 }}>
          <div className="card"><div className="card-body">
            <div className="text-xs text-gray" style={{ textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Bandeja de despacho</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: k.porDespachar ? 'var(--rojo)' : 'var(--verde)' }}>{k.porDespachar}</div>
              <div className="text-sm text-gray">proyectos sin cuadrilla asignada</div>
            </div>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => goTo('agenda')}>Ir a despachar →</button>
          </div></div>
          <div className="card"><div className="card-body">
            <div className="text-xs text-gray" style={{ textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Cuadrillas activas</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--azul-primario)' }}>{cuadrillas.length}</div>
              <div className="text-sm text-gray">equipos configurados</div>
            </div>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => goTo('cuadrillas')}>Configurar →</button>
          </div></div>
        </div>

        {esAdmin && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><h3>🗄️ Respaldo general</h3></div>
            <div className="card-body">
              <div className="text-sm text-gray" style={{ marginBottom: 12 }}>
                Exporta <strong>toda</strong> la información de la plataforma (todos los módulos) a un archivo JSON: se descarga y, si el bucket está configurado, se guarda en la nube (Supabase ahora · Google Drive a futuro).
              </div>
              <button className="btn btn-primary" onClick={handleRespaldo} disabled={respaldando || segundosRestantes > 0}>
                {respaldando
                  ? 'Generando respaldo…'
                  : segundosRestantes > 0
                    ? `⏳ Disponible en ${Math.floor(segundosRestantes / 60)}:${String(segundosRestantes % 60).padStart(2, '0')}`
                    : '⬇️ Generar respaldo'}
              </button>
              {msgRespaldo && (
                <div className="text-sm" style={{ marginTop: 10, color: msgRespaldo.startsWith('❌') ? 'var(--rojo)' : 'var(--gris-texto)' }}>{msgRespaldo}</div>
              )}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header"><h3>Accesos rápidos</h3></div>
          <div className="card-body">
            <div className="stats-row" style={{ marginBottom: 0 }}>
              {accesos.map(a => (
                <button key={a.v} className="stat-card" style={{ cursor: 'pointer', textAlign: 'center', border: 'none' }} onClick={() => goTo(a.v)}>
                  <div style={{ fontSize: 24 }}>{a.icon}</div>
                  <div className="stat-label" style={{ marginTop: 6 }}>{a.l}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
