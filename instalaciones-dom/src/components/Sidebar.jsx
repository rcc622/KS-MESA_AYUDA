export default function Sidebar({ vista, setVista }) {
  const navItems = [
    { id: 'agenda', icon: '📅', label: 'Agenda / SLA', section: 'Instalaciones' },
    { id: 'reagendados', icon: '🔄', label: 'Reagendados', badge: 2, section: null },
    { id: 'detalle', icon: '📋', label: 'Detalle Proyecto', section: null },
    { id: 'reporte', icon: '📱', label: 'Reporte Instalador', section: null },
    { id: 'import', icon: '📤', label: 'Importar Proyectos', section: 'Datos' },
    { id: 'cortes', icon: '💰', label: 'Cortes de Pago', section: 'Finanzas' },
    { id: 'cuadrillas', icon: '👷', label: 'Config. Cuadrillas', section: 'Configuración' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>☀️ KENET Solar</h1>
        <span>Mesa de Control · Instalaciones</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div key={item.id}>
            {item.section && (
              <div className="nav-section-label">{item.section}</div>
            )}
            <button
              className={`nav-item${vista === item.id ? ' active' : ''}`}
              onClick={() => setVista(item.id)}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && <span className="badge">{item.badge}</span>}
            </button>
          </div>
        ))}
      </nav>
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Sesión activa</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Lizeth Garza</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>PM Doméstico · MTY</div>
      </div>
    </aside>
  );
}
