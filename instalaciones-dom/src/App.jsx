import { useState, useEffect } from 'react';
import './index.css';
import { supabase } from './lib/supabase';
import { getUsuarioPorEmail } from './lib/api';
import Sidebar from './components/Sidebar';
import Icon from './components/Icon';
import VistaPanel from './views/VistaPanel';
import VistaArchivo from './views/VistaArchivo';
import VistaLog from './views/VistaLog';
import VistaA_Agenda from './views/VistaA_Agenda';
import VistaC_Detalle from './views/VistaC_Detalle';
import VistaD_Reagendados from './views/VistaD_Reagendados';
import VistaE_Import from './views/VistaE_Import';
import VistaF_Reporte from './views/VistaF_Reporte';
import VistaI_Cortes from './views/VistaI_Cortes';
import VistaL_Cuadrillas from './views/VistaL_Cuadrillas';

// Qué vistas ve cada rol. El instalador (jefe de cuadrilla) solo ve su módulo
// de campo; los demás roles ven la plataforma completa.
function vistasPorRol(rol) {
  if (rol === 'instalador') return ['reporte', 'archivo'];   // su módulo de campo + su historial
  // admin / pm_domestico / coordinador: todo MENOS el reporte de campo (lo llena el instalador)
  return ['agenda', 'reagendados', 'detalle', 'import', 'cortes', 'cuadrillas', 'archivo', 'movimientos'];
}
function rolLabel(rol) {
  return ({ admin: 'Admin', pm_domestico: 'PM', coordinador: 'Coordinador', instalador: 'Instalador' })[rol] || 'Usuario';
}

export default function App() {
  const [vista, setVista] = useState('agenda');
  const [modulo, setModulo] = useState('instalaciones');
  const [navOpen, setNavOpen] = useState(false);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [session, setSession] = useState(null);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    setLoginLoading(false);
  };

  const handleLogout = () => supabase.auth.signOut();

  // Mapea el usuario de Auth a su fila en `usuarios` (por email) para que la
  // bitácora guarde un usuario_id válido (o null si no está en la tabla).
  useEffect(() => {
    if (!session?.user?.email) { setUsuarioActual(null); return; }
    let cancelado = false;
    getUsuarioPorEmail(session.user.email)
      .then(u => { if (!cancelado) setUsuarioActual({ id: u?.id ?? null, email: session.user.email, nombre: u?.nombre ?? null, rol: u?.rol ?? null }); })
      .catch(() => { if (!cancelado) setUsuarioActual({ id: null, email: session.user.email }); });
    return () => { cancelado = true; };
  }, [session]);

  // Bloquea el scroll del fondo mientras el drawer móvil está abierto
  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [navOpen]);

  // Redirige a una vista permitida si el rol no puede ver la actual
  useEffect(() => {
    if (!usuarioActual) return;
    const permitidas = vistasPorRol(usuarioActual.rol);
    if (!permitidas.includes(vista)) setVista(permitidas[0]);
  }, [usuarioActual, vista]);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--fondo)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>☀️</div>
          <div style={{ color: 'var(--gris-secundario)' }}>Cargando Mesa de Control…</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--fondo)' }}>
        <div style={{ background: 'white', borderRadius: 12, padding: '40px 36px', width: 360, boxShadow: 'var(--shadow-md)', border: '1px solid var(--borde)' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>☀️</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--azul-primario)' }}>KENET Solar</div>
            <div style={{ fontSize: 13, color: 'var(--gris-secundario)' }}>Mesa de Control · Instalaciones</div>
          </div>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {authError && (
              <div style={{ color: 'var(--rojo)', fontSize: 12, marginBottom: 12, padding: '6px 10px', background: '#FEE2E2', borderRadius: 6 }}>
                {authError}
              </div>
            )}
            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', fontSize: 14 }} disabled={loginLoading}>
              {loginLoading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!usuarioActual) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--fondo)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>☀️</div>
          <div style={{ color: 'var(--gris-secundario)' }}>Cargando tu cuenta…</div>
        </div>
      </div>
    );
  }

  const props = { setVista, setProyectoSeleccionado, usuarioActual };

  const renderVista = () => {
    if (modulo === 'mesa') return <VistaPanel goTo={(v) => { setModulo('instalaciones'); setVista(v); }} usuarioActual={usuarioActual} />;
    switch (vista) {
      case 'agenda':      return <VistaA_Agenda      {...props} />;
      case 'detalle':     return <VistaC_Detalle      {...props} proyecto={proyectoSeleccionado} />;
      case 'reagendados': return <VistaD_Reagendados  {...props} />;
      case 'import':      return <VistaE_Import        {...props} />;
      case 'reporte':     return <VistaF_Reporte       {...props} />;
      case 'archivo':     return <VistaArchivo         {...props} />;
      case 'movimientos': return <VistaLog />;
      case 'cortes':      return <VistaI_Cortes />;
      case 'cuadrillas':  return <VistaL_Cuadrillas />;
      default: return null;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        vista={vista}
        setVista={setVista}
        onLogout={handleLogout}
        usuario={session.user}
        rol={usuarioActual?.rol}
        vistasPermitidas={vistasPorRol(usuarioActual?.rol)}
        modulo={modulo}
        setModulo={setModulo}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      <main className="main-content">
        <header className="mobile-topbar">
          <button className="hamburger" onClick={() => setNavOpen(true)} aria-label="Abrir menú">
            <Icon name="menu" size={24} strokeWidth={2} />
          </button>
          <div className="mobile-topbar-title">
            <Icon name="sun" size={18} strokeWidth={2} />
            KENET Solar
            {usuarioActual?.rol && (
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(245,166,35,0.22)', color: 'var(--ambar)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                {rolLabel(usuarioActual.rol)}
              </span>
            )}
          </div>
        </header>
        {renderVista()}
      </main>
    </div>
  );
}
