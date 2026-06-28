export default function Sidebar({ vista, setVista, onLogout, usuario, open, onClose }) {
  const navItems = [
    { id: 'agenda',      icon: '📅', label: 'Agenda / SLA',       section: 'Instalaciones' },
    { id: 'reagendados', icon: '🔄', label: 'Reagendados',         section: null },
    { id: 'detalle',     icon: '📋', label: 'Detalle Proyecto',    section: null },
    { id: 'reporte',     icon: '📱', label: 'Reporte Instalador',  section: null },
    { id: 'import',      icon: '📤', label: 'Importar Proyectos',  section: 'Datos' },
    { id: 'cortes',      icon: '💰', label: 'Cortes de Pago',      section: 'Finanzas' },
    { id: 'cuadrillas',  icon: '👷', label: 'Config. Cuadrillas',  section: 'Configuración' },
  ];

  const handleNav = (id) => {
    setVista(id);
    onClose?.();           // cierra el drawer en móvil al elegir vista
  };

  return (
    <>
      <div className={`sidebar-overlay${open ? ' show' : ''}`} onClick={onClose} />
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <h1>☀️ KENET Solar</h1>
          <span>Mesa de Control · Instalaciones</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div key={item.id}>
              {item.section && <div className="nav-section-label">{item.section}</div>}
              <button
                className={`nav-item${vista === item.id ? ' active' : ''}`}
                onClick={() => handleNav(item.id)}
              >
                <span className="icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </div>
          ))}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Sesión activa</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginBottom: 8, wordBreak: 'break-word' }}>
            {usuario?.email}
          </div>
          <button
            onClick={onLogout}
            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 12, padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
