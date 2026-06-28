import Icon from './Icon';

export default function Sidebar({ vista, setVista, onLogout, usuario, rol, vistasPermitidas, open, onClose }) {
  const esInstalador = rol === 'instalador';
  const navItems = [
    { id: 'agenda',      icon: 'calendar',   label: 'Agenda / SLA',       section: 'Instalaciones' },
    { id: 'reagendados', icon: 'refresh',    label: 'Reagendados',         section: null },
    { id: 'detalle',     icon: 'clipboard',  label: 'Detalle Proyecto',    section: null },
    { id: 'reporte',     icon: 'smartphone', label: esInstalador ? 'Mis instalaciones' : 'Reporte Instalador',  section: esInstalador ? 'Campo' : null },
    { id: 'import',      icon: 'upload',     label: 'Importar Proyectos',  section: 'Datos' },
    { id: 'cortes',      icon: 'dollar',     label: 'Cortes de Pago',      section: 'Finanzas' },
    { id: 'cuadrillas',  icon: 'users',      label: 'Config. Cuadrillas',  section: 'Configuración' },
  ].filter(i => !vistasPermitidas || vistasPermitidas.includes(i.id));

  const handleNav = (id) => {
    setVista(id);
    onClose?.();           // cierra el drawer en móvil al elegir vista
  };

  return (
    <>
      <div className={`sidebar-overlay${open ? ' show' : ''}`} onClick={onClose} />
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-brand">
            <Icon name="sun" size={20} strokeWidth={2} className="brand-sun" />
            <div>
              <h1>KENET Solar</h1>
              <span>{esInstalador ? 'Instalador · Campo' : 'Mesa de Control · Instalaciones'}</span>
            </div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Cerrar menú">
            <Icon name="close" size={22} strokeWidth={2} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div key={item.id}>
              {item.section && <div className="nav-section-label">{item.section}</div>}
              <button
                className={`nav-item${vista === item.id ? ' active' : ''}`}
                onClick={() => handleNav(item.id)}
              >
                <span className="icon"><Icon name={item.icon} size={19} /></span>
                <span className="nav-label">{item.label}</span>
              </button>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-label">Sesión activa</div>
          <div className="sidebar-footer-email">{usuario?.email}</div>
          <button className="sidebar-logout" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </aside>
    </>
  );
}
