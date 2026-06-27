const ESTATUS_CONFIG = {
  agendado:    { label: 'Agendado',    color: '#1F4E79', bg: '#EAF2F9' },
  en_progreso: { label: 'En progreso', color: '#F5A623', bg: '#FFF8EC' },
  completado:  { label: 'Completado',  color: '#2E9E5B', bg: '#F0FBF4' },
  reagendado:  { label: 'Reagendado',  color: '#6B4E9B', bg: '#F5F0FC' },
  cancelado:   { label: 'Cancelado',   color: '#D64545', bg: '#FDF0F0' },
};

export default function EstatusBadge({ estatus }) {
  const cfg = ESTATUS_CONFIG[estatus] || { label: estatus, color: '#6B7280', bg: '#F3F4F6' };
  return (
    <span className="badge" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}
