// ──────────────────────────────────────────────
// MOCK DATA — Módulo Instalaciones Domésticas
// KENET Solar · Mesa de Control
// ──────────────────────────────────────────────

export const zonas = ['MTY', 'SLT', 'TRC', 'MVA'];

export const usuarios = [
  { id: 'u1', nombre: 'Carlos Medina', rol: 'instalador', zona: 'MTY' },
  { id: 'u2', nombre: 'Jesús Ramírez', rol: 'instalador', zona: 'MTY' },
  { id: 'u3', nombre: 'Omar Pérez', rol: 'instalador', zona: 'SLT' },
  { id: 'u4', nombre: 'Andrés Torres', rol: 'instalador', zona: 'TRC' },
  { id: 'u5', nombre: 'Eduardo Flores', rol: 'instalador', zona: 'TRC' },
  { id: 'pm1', nombre: 'Lizeth Garza', rol: 'pm_domestico', zona: 'MTY' },
  { id: 'pm2', nombre: 'Gamaliel Soto', rol: 'pm_domestico', zona: 'SLT' },
  { id: 'pm3', nombre: 'Lesly Palacios', rol: 'pm_domestico', zona: 'TRC' },
];

export const cuadrillas = [
  {
    id: 'c1',
    nombre: 'Cuadrilla MTY-Externa-1',
    tipo: 'externa',
    zona: 'MTY',
    pm_id: 'pm1',
    aplica_vueltas: true,
    esquema_pago: 'por_instalacion',
    activa: true,
    miembros: ['u1', 'u2'],
  },
  {
    id: 'c2',
    nombre: 'Cuadrilla SLT-Externa-1',
    tipo: 'externa',
    zona: 'SLT',
    pm_id: 'pm2',
    aplica_vueltas: true,
    esquema_pago: 'por_instalacion',
    activa: true,
    miembros: ['u3'],
  },
  {
    id: 'c3',
    nombre: 'Cuadrilla TRC-Interna-1',
    tipo: 'interna',
    zona: 'TRC',
    pm_id: 'pm3',
    aplica_vueltas: false,
    esquema_pago: 'salario_bono',
    activa: true,
    miembros: ['u4', 'u5'],
  },
  {
    id: 'c4',
    nombre: 'Cuadrilla MVA-Externa-1',
    tipo: 'externa',
    zona: 'MVA',
    pm_id: 'pm3',
    aplica_vueltas: false, // pendiente de definir
    esquema_pago: 'por_panel',
    activa: true,
    miembros: ['u5'],
  },
];

export const reglasKPI = [
  { id: 'r1', cuadrilla_id: 'c1', kpi: 'instalaciones_a_tiempo', meta: 90, consecuencia: 'descuento_pago', valor: 500, activa: true },
  { id: 'r2', cuadrilla_id: 'c1', kpi: 'reportes_completos', meta: 95, consecuencia: 'descuento_pago', valor: 300, activa: true },
  { id: 'r3', cuadrilla_id: 'c1', kpi: 'sin_correcciones', meta: 80, consecuencia: 'descuento_pago', valor: 200, activa: true },
  { id: 'r4', cuadrilla_id: 'c2', kpi: 'instalaciones_a_tiempo', meta: 85, consecuencia: 'descuento_pago', valor: 400, activa: true },
  { id: 'r5', cuadrilla_id: 'c2', kpi: 'reportes_completos', meta: 90, consecuencia: 'descuento_pago', valor: 200, activa: true },
  { id: 'r6', cuadrilla_id: 'c3', kpi: 'instalaciones_a_tiempo', meta: 90, consecuencia: 'afecta_kpi_bono', valor: 30, activa: true },
  { id: 'r7', cuadrilla_id: 'c3', kpi: 'reportes_completos', meta: 95, consecuencia: 'afecta_kpi_bono', valor: 20, activa: true },
  { id: 'r8', cuadrilla_id: 'c3', kpi: 'sin_correcciones', meta: 85, consecuencia: 'afecta_kpi_bono', valor: 50, activa: true },
];

export const proyectos = [
  {
    id: 'p1', folio: 'KS-2026-0042', folio_odoo: 'S10042',
    cliente: 'Roberto Martínez García', telefono: '8111234567',
    direccion: 'Av. Constitución 1500 Col. Centro, MTY',
    zona: 'MTY', cuadrilla_id: 'c1', instalador_id: 'u1',
    estatus: 'agendado',
    fecha_agenda: '2026-06-28', fecha_instalacion: null,
    dias_en_etapa: 5, paneles: 12, kw: 5.4,
    anticipo_pagado: true, instalado_cobrado: false, medidor_pagado: false,
    notas: 'Techo de dos aguas. Acceso por puerta lateral.',
  },
  {
    id: 'p2', folio: 'KS-2026-0038', folio_odoo: 'S10038',
    cliente: 'Ana Laura Vázquez Soto', telefono: '8119876543',
    direccion: 'Calle Roble 245 Col. Del Valle, MTY',
    zona: 'MTY', cuadrilla_id: 'c1', instalador_id: 'u2',
    estatus: 'en_progreso',
    fecha_agenda: '2026-06-26', fecha_instalacion: null,
    dias_en_etapa: 7, paneles: 8, kw: 3.6,
    anticipo_pagado: true, instalado_cobrado: false, medidor_pagado: false,
    notas: 'Cliente solicita instalación antes del mediodía.',
  },
  {
    id: 'p3', folio: 'KS-2026-0031', folio_odoo: 'S10031',
    cliente: 'Jorge Hernández Leal', telefono: '8113456789',
    direccion: 'Blvd. Escobedo 890, SLT',
    zona: 'SLT', cuadrilla_id: 'c2', instalador_id: 'u3',
    estatus: 'completado',
    fecha_agenda: '2026-06-20', fecha_instalacion: '2026-06-21',
    dias_en_etapa: 12, paneles: 16, kw: 7.2,
    anticipo_pagado: true, instalado_cobrado: true, medidor_pagado: false,
    notas: '',
  },
  {
    id: 'p4', folio: 'KS-2026-0029', folio_odoo: 'S10029',
    cliente: 'María Elena Torres Ríos', telefono: '8447890123',
    direccion: 'Calzada del Trabajo 500 TRC',
    zona: 'TRC', cuadrilla_id: 'c3', instalador_id: 'u4',
    estatus: 'reagendado',
    fecha_agenda: '2026-06-30', fecha_instalacion: null,
    dias_en_etapa: 14,
    fecha_original: '2026-06-18',
    motivo_reagendo: 'Lluvia · Se reprogramó por condiciones meteorológicas',
    paneles: 20, kw: 9.0,
    anticipo_pagado: true, instalado_cobrado: false, medidor_pagado: false,
    notas: 'Segunda reagenda. Verificar clima antes.',
  },
  {
    id: 'p5', folio: 'KS-2026-0025', folio_odoo: 'S10025',
    cliente: 'Luis Alberto Gómez Vargas', telefono: '8113001122',
    direccion: 'Privada Laureles 12 Col. Cumbres, MTY',
    zona: 'MTY', cuadrilla_id: 'c1', instalador_id: 'u1',
    estatus: 'agendado',
    fecha_agenda: '2026-07-02', fecha_instalacion: null,
    dias_en_etapa: 2, paneles: 10, kw: 4.5,
    anticipo_pagado: true, instalado_cobrado: false, medidor_pagado: false,
    notas: '',
  },
  {
    id: 'p6', folio: 'KS-2026-0019', folio_odoo: 'S10019',
    cliente: 'Patricia Salinas Montoya', telefono: '8449881234',
    direccion: 'Av. Hidalgo 320, MVA',
    zona: 'MVA', cuadrilla_id: 'c4', instalador_id: 'u5',
    estatus: 'reagendado',
    fecha_agenda: '2026-07-05', fecha_instalacion: null,
    dias_en_etapa: 19,
    fecha_original: '2026-06-10',
    motivo_reagendo: 'Cliente no estaba en casa · Se coordinó nueva fecha',
    paneles: 14, kw: 6.3,
    anticipo_pagado: false, instalado_cobrado: false, medidor_pagado: false,
    notas: 'Anticipo pendiente. Confirmar antes de reagendar.',
  },
  {
    id: 'p7', folio: 'KS-2026-0015', folio_odoo: 'S10015',
    cliente: 'Fernando Reyes Castillo', telefono: '8181556677',
    direccion: 'Av. Morones Prieto 1100, MTY',
    zona: 'MTY', cuadrilla_id: 'c1', instalador_id: 'u2',
    estatus: 'completado',
    fecha_agenda: '2026-06-15', fecha_instalacion: '2026-06-15',
    dias_en_etapa: 18, paneles: 6, kw: 2.7,
    anticipo_pagado: true, instalado_cobrado: true, medidor_pagado: true,
    notas: '',
  },
];

export const bitacora = [
  { id: 'b1', proyecto_id: 'p1', tipo: 'agenda', descripcion: 'Proyecto agendado para 28-Jun-2026', usuario: 'pm1', fecha: '2026-06-23 09:14' },
  { id: 'b2', proyecto_id: 'p1', tipo: 'nota', descripcion: 'Cliente confirmó disponibilidad todo el día', usuario: 'pm1', fecha: '2026-06-23 11:30' },
  { id: 'b3', proyecto_id: 'p2', tipo: 'agenda', descripcion: 'Proyecto agendado para 26-Jun-2026', usuario: 'pm1', fecha: '2026-06-20 10:00' },
  { id: 'b4', proyecto_id: 'p2', tipo: 'inicio', descripcion: 'Instalación iniciada. Cuadrilla en sitio.', usuario: 'u2', fecha: '2026-06-26 08:30' },
  { id: 'b5', proyecto_id: 'p3', tipo: 'agenda', descripcion: 'Proyecto agendado para 20-Jun-2026', usuario: 'pm2', fecha: '2026-06-15 14:00' },
  { id: 'b6', proyecto_id: 'p3', tipo: 'inicio', descripcion: 'Instalación iniciada.', usuario: 'u3', fecha: '2026-06-21 08:00' },
  { id: 'b7', proyecto_id: 'p3', tipo: 'cierre', descripcion: 'Instalación completada. 16 paneles instalados. Firma del cliente obtenida.', usuario: 'u3', fecha: '2026-06-21 17:30' },
  { id: 'b8', proyecto_id: 'p4', tipo: 'agenda', descripcion: 'Proyecto agendado para 18-Jun-2026', usuario: 'pm3', fecha: '2026-06-12 09:00' },
  { id: 'b9', proyecto_id: 'p4', tipo: 'reagenda', descripcion: 'Reagendado por lluvia → 30-Jun-2026', usuario: 'pm3', fecha: '2026-06-17 16:00' },
  { id: 'b10', proyecto_id: 'p6', tipo: 'agenda', descripcion: 'Proyecto agendado para 10-Jun-2026', usuario: 'pm3', fecha: '2026-06-05 11:00' },
  { id: 'b11', proyecto_id: 'p6', tipo: 'reagenda', descripcion: 'Cliente no en casa → reagendado 05-Jul-2026', usuario: 'pm3', fecha: '2026-06-10 14:00' },
];

// Semana 23-Jun al 29-Jun-2026
export const cortesPago = [
  {
    id: 'cp1',
    semana: '23-Jun — 29-Jun 2026',
    cuadrilla_id: 'c1',
    esquema: 'externa',
    instalaciones: 4,
    pago_base: 8000,
    vueltas: [
      { concepto: 'Traslado Marín 24-Jun', monto: 350 },
      { concepto: 'Traslado Hidalgo 25-Jun', monto: 350 },
    ],
    descuentos: [
      { kpi: 'instalaciones_a_tiempo', cumplido: false, descuento: 500 },
      { kpi: 'reportes_completos', cumplido: true, descuento: 0 },
      { kpi: 'sin_correcciones', cumplido: true, descuento: 0 },
    ],
    estado: 'abierto',
  },
  {
    id: 'cp2',
    semana: '23-Jun — 29-Jun 2026',
    cuadrilla_id: 'c2',
    esquema: 'externa',
    instalaciones: 2,
    pago_base: 4000,
    vueltas: [
      { concepto: 'Traslado Saltillo-Centro 25-Jun', monto: 200 },
    ],
    descuentos: [
      { kpi: 'instalaciones_a_tiempo', cumplido: true, descuento: 0 },
      { kpi: 'reportes_completos', cumplido: false, descuento: 200 },
    ],
    estado: 'abierto',
  },
  {
    id: 'cp3',
    semana: '23-Jun — 29-Jun 2026',
    cuadrilla_id: 'c3',
    esquema: 'interna',
    instalaciones: 3,
    pago_base: null, // nómina, no aplica
    vueltas: [],
    descuentos: [],
    kpis_cumplidos: [
      { kpi: 'instalaciones_a_tiempo', meta: 90, real: 100, cumplido: true },
      { kpi: 'reportes_completos', meta: 95, real: 90, cumplido: false },
      { kpi: 'sin_correcciones', meta: 85, real: 85, cumplido: true },
    ],
    estado: 'abierto',
  },
  {
    id: 'cp4',
    semana: '16-Jun — 22-Jun 2026',
    cuadrilla_id: 'c1',
    esquema: 'externa',
    instalaciones: 5,
    pago_base: 10000,
    vueltas: [],
    descuentos: [
      { kpi: 'instalaciones_a_tiempo', cumplido: true, descuento: 0 },
      { kpi: 'reportes_completos', cumplido: true, descuento: 0 },
      { kpi: 'sin_correcciones', cumplido: true, descuento: 0 },
    ],
    estado: 'cerrado',
  },
];

export const kpisLabels = {
  instalaciones_a_tiempo: 'Instalaciones a tiempo',
  reportes_completos: 'Reportes completos',
  sin_correcciones: 'Sin correcciones',
};

export const estatusConfig = {
  agendado: { label: 'Agendado', color: '#1F4E79', bg: '#EAF2F9' },
  en_progreso: { label: 'En progreso', color: '#F5A623', bg: '#FFF8EC' },
  completado: { label: 'Completado', color: '#2E9E5B', bg: '#F0FBF4' },
  reagendado: { label: 'Reagendado', color: '#6B4E9B', bg: '#F5F0FC' },
  cancelado: { label: 'Cancelado', color: '#D64545', bg: '#FDF0F0' },
};

export const tiposBitacora = {
  agenda: { label: 'Agendado', icon: '📅', color: '#1F4E79' },
  inicio: { label: 'Inicio', icon: '🔧', color: '#F5A623' },
  cierre: { label: 'Completado', icon: '✅', color: '#2E9E5B' },
  reagenda: { label: 'Reagenda', icon: '🔄', color: '#6B4E9B' },
  nota: { label: 'Nota', icon: '📝', color: '#6B7280' },
  import: { label: 'Import', icon: '📤', color: '#0891B2' },
};
