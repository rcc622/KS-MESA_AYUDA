import { useState } from 'react';
import Icon from './Icon';

const MODULOS = [
  { id: 'mesa',          label: 'Mesa de Control',          disponible: true },
  { id: 'instalaciones', label: 'Instalaciones Domésticas', disponible: true },
  { id: 'cfe',           label: 'CFE / Gestoría',           disponible: false },
  { id: 'soporte',       label: 'Soporte Técnico',          disponible: false },
  { id: 'portal',        label: 'Portal Cliente',           disponible: false },
];

export default function Sidebar({ vista, setVista, onLogout, usuario, rol, vistasPermitidas, modulo, setModulo, open, onClose }) {
  const esInstalador = rol === 'instalador';
  const [modOpen, setModOpen] = useState(false);
  const navItems = [
    { id: 'agenda',      icon: 'calendar',   label: 'Agenda / SLA',       section: 'Instalaciones' },
    { id: 'reagendados', icon: 'refresh',    label: 'Reagendados',         section: null },
    { id: 'detalle',     icon: 'clipboard',  label: 'Detalle Proyecto',    section: null },
    { id: 'reporte',     icon: 'smartphone', label: esInstalador ? 'Mis instalaciones' : 'Reporte Instalador',  section: esInstalador ? 'Campo' : null },
    { id: 'archivo',     icon: 'archive',    label: esInstalador ? 'Historial' : 'Archivo',  section: esInstalador ? null : 'Histórico' },
    { id: 'movimientos', icon: 'clipboard',  label: 'Movimientos (log)',   section: null },
    { id: 'import',      icon: 'upload',     label: 'Importar Proyectos',  section: 'Datos' },
    { id: 'cortes',      icon: 'dollar',     label: 'Cortes de Pago',      section: 'Finanzas' },
    { id: 'cuadrillas',  icon: 'users',      label: 'Config. Cuadrillas',  section: 'Configuración' },
  ].filter(i => !vistasPermitidas || vistasPermitidas.includes(i.id));

  const handleNav = (id) => {
    setModulo?.('instalaciones');   // las vistas del nav viven en el módulo de instalaciones
    setVista(id);
    onClose?.();                     // cierra el drawer en móvil al elegir vista
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
              <span>{({ admin: 'Admin · Mesa de Control', pm_domestico: 'PM · Instalaciones', coordinador: 'Coordinador · Mesa', instalador: 'Instalador · Campo' })[rol] || 'Mesa de Control · Instalaciones'}</span>
            </div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Cerrar menú">
            <Icon name="close" size={22} strokeWidth={2} />
          </button>
        </div>

        {!esInstalador && (
          <div className="mod-switcher">
            <button className="mod-current" onClick={() => setModOpen(o => !o)}>
              <div style={{ textAlign: 'left', minWidth: 0 }}>
                <div className="mod-label-sm">Módulo</div>
                <div className="mod-name">{MODULOS.find(m => m.id === modulo)?.label || 'Instalaciones Domésticas'}</div>
              </div>
              <span className={`mod-chevron${modOpen ? ' open' : ''}`}>▾</span>
            </button>
            {modOpen && (
              <div className="mod-list">
                {MODULOS.map(m => (
                  <button key={m.id} className={`mod-item${m.id === modulo ? ' active' : ''}`} disabled={!m.disponible}
                    onClick={() => { if (m.disponible) { setModulo?.(m.id); setModOpen(false); onClose?.(); } }}>
                    <span>{m.label}</span>
                    {m.id === modulo ? <span className="mod-check">✓</span> : (!m.disponible && <span className="mod-tag">Pronto</span>)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div key={item.id}>
              {item.section && <div className="nav-section-label">{item.section}</div>}
              <button
                className={`nav-item${vista === item.id && modulo !== 'mesa' ? ' active' : ''}`}
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
