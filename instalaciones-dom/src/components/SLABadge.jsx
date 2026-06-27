export default function SLABadge({ dias, limite = 18 }) {
  let cls, label;
  if (dias <= 9) { cls = 'sla-verde'; label = `${dias}d`; }
  else if (dias <= 15) { cls = 'sla-ambar'; label = `${dias}d`; }
  else { cls = 'sla-rojo'; label = `${dias}d ⚠`; }

  return (
    <span className={cls}>
      <span className="sla-dot" />
      {label} / {limite}d
    </span>
  );
}
