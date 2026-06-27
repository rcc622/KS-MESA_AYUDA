import { estatusConfig } from '../data/mockData';

export default function EstatusBadge({ estatus }) {
  const cfg = estatusConfig[estatus] || { label: estatus, color: '#6B7280', bg: '#F3F4F6' };
  return (
    <span className="badge" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}
