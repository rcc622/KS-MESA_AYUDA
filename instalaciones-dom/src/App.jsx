import { useState, useEffect } from 'react';
import './index.css';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import Icon from './components/Icon';
import VistaA_Agenda from './views/VistaA_Agenda';
import VistaC_Detalle from './views/VistaC_Detalle';
import VistaD_Reagendados from './views/VistaD_Reagendados';
import VistaE_Import from './views/VistaE_Import';
import VistaF_Reporte from './views/VistaF_Reporte';
import VistaI_Cortes from './views/VistaI_Cortes';
import VistaL_Cuadrillas from './views/VistaL_Cuadrillas';

export default function App() {
  const [vista, setVista] = useState('agenda');
  const [navOpen, setNavOpen] = useState(false);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [session, setSession] = useState(null);
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

  // Bloquea el scroll del fondo mientras el drawer móvil está abierto
  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [navOpen]);

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

  const usuarioActual = { id: session.user.id, email: session.user.email };

  const props = { setVista, setProyectoSeleccionado, usuarioActual };

  const renderVista = () => {
    switch (vista) {
      case 'agenda':      return <VistaA_Agenda      {...props} />;
      case 'detalle':     return <VistaC_Detalle      {...props} proyecto={proyectoSeleccionado} />;
      case 'reagendados': return <VistaD_Reagendados  {...props} />;
      case 'import':      return <VistaE_Import        {...props} />;
      case 'reporte':     return <VistaF_Reporte       {...props} />;
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
          </div>
        </header>
        {renderVista()}
      </main>
    </div>
  );
}
