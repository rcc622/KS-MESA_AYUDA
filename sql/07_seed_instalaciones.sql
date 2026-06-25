-- ============================================================
-- 07_seed_instalaciones.sql — Datos DEMO del Módulo Instalaciones
-- Correr DESPUÉS de 01_schema.sql y 06_instalaciones.sql
--
-- ⚠ ESTE SCRIPT REINICIA LOS DATOS (truncate). Úsalo SOLO en el proyecto de
--   demo/piloto vacío. NO lo corras sobre una base con datos reales del piloto:
--   borraría clientes, eventos y bitácora. Todos los datos de aquí son FICTICIOS
--   (tomados del prototipo KENET Desktop), no hay información sensible.
--
-- Las fechas se anclan a current_date para que el CLT (= LT actual / LT máximo)
-- caiga en el rango esperado del prototipo el día que se corra.
-- ============================================================

-- ---------- 0. Reset limpio (dummies fuera) ----------
truncate table reportes_instalacion, instalaciones, instaladores,
               eventos, clientes, bitacora
restart identity cascade;

-- ---------- 1. Instaladores ----------
insert into instaladores (nombre, iniciales, zona, activo) values
  ('Luis P.',   'LP', 'TRC', true),
  ('Miguel T.', 'MT', 'MVA', true),
  ('Carlos M.', 'CM', 'TRC', true);

-- ---------- 2. Clientes (R2, en/alrededor de la etapa Instalación del journey) ----------
insert into clientes (nombre, zona, region, orden_venta, sistema, vendedor, esquema_pago,
                      premium, etapa_actual, etapa_validada, cobro_estado, proxima_accion, responsable, observaciones)
values
  ('Bodega Log. Sonora', 'TRC', 'R2', 'S10241', '84-46/3-25K', 'A. Ruiz',   'CONTADO',  true,  2, true, 'al_corriente',     'Confirmar arranque con cliente', 'Lizeth M.', 'Acceso por anden trasero, grúa requerida'),
  ('Planta Monterrey',   'MVA', 'R2', 'S10255', '120-66/4-40K','J. Salas',  'FIDE',     true,  2, true, 'al_corriente',     'Revisión DU técnico',            'Lizeth M.', 'Subestación: validar UVIE'),
  ('Almacén Puebla Sur', 'TRC', 'R2', 'S10260', '40-22/1-12K', 'A. Ruiz',   'MSI',      false, 2, true, 'al_corriente',     'Aprobar cotización materiales',  'Lizeth M.', ''),
  ('Hotel Centro CDMX',  'MVA', 'R2', 'S10271', '48-24/2-15K', 'M. Lozano', 'CONTADO',  false, 2, true, 'anticipo_pendiente','Coordinar envío CD',            'Lizeth M.', 'Incluye banco de baterías'),
  ('Casa García',        'TRC', 'R2', 'S10288', '12-6/1-6K',   'M. Lozano', 'MEJORAVIT',false, 3, true, 'enganche_vencido', 'Confirmar fin de instalación',   'Lizeth M.', 'Instalación terminada, cobrar enganche'),
  ('Nave Industrial Qro.','MVA','R2', 'S10290', '60-33/2-20K', 'J. Salas',  'CONTADO',  false, 2, true, 'al_corriente',     'Instalación CD — día 2',         'Lizeth M.', '');

-- ---------- 3. Instalaciones (detalle de ejecución, FK a clientes) ----------
-- fecha_inicio_lt = current_date - round(clt*dias_max) para reproducir el CLT del prototipo.
insert into instalaciones (cliente_id, tipo, instalador_id, etapa_inst, fecha_inst,
                           fecha_inicio_lt, fecha_maxima, dias_max, paneles, proxima_accion,
                           fecha_compromiso, completado_at)
select c.id, v.tipo, i.id, v.etapa_inst, v.fecha_inst,
       (current_date - v.dias_lt) as fecha_inicio_lt,
       (current_date - v.dias_lt + v.dias_max) as fecha_maxima,
       v.dias_max, v.paneles, v.proxima_accion, v.fecha_comp, v.completado_at
from (values
  ('Bodega Log. Sonora', 'Luis P.',   'C&I Foráneo',  8,  (current_date+2), 57, 40, 84, 'Confirmar arranque con cliente', (current_date+1),  null::timestamptz),
  ('Planta Monterrey',   'Carlos M.', 'FIDE C&I',     3,  (current_date+3), 54, 40, 120,'Revisión DU técnico',            (current_date+2),  null),
  ('Almacén Puebla Sur', 'Miguel T.', 'C&I Local',    4,  (current_date+5), 43, 40, 40, 'Aprobar cotización materiales',  (current_date+5),  null),
  ('Hotel Centro CDMX',  'Luis P.',   'Baterías C&I', 5,  (current_date+5), 37, 40, 48, 'Coordinar envío CD',             (current_date+7),  null),
  ('Casa García',        'Miguel T.', 'Doméstico',    10, (current_date-3), 31, 40, 12, '',                               null,              (now()-interval '3 days')),
  ('Nave Industrial Qro.','Carlos M.','C&I Local',    6,  (current_date+1), 42, 40, 60, 'Instalación CD — día 2',         (current_date+3),  null)
) as v(cliente, instalador, tipo, etapa_inst, fecha_inst, dias_lt, dias_max, paneles, proxima_accion, fecha_comp, completado_at)
join clientes c    on c.nombre = v.cliente
join instaladores i on i.nombre = v.instalador;

-- ---------- 4. Reportes PMD-P2 ----------
insert into reportes_instalacion (instalacion_id, instalador_id, enviado, enviado_at, a_tiempo,
                                  pendientes, paneles, modelo, inversor, checklist_6,
                                  val_reporte, val_evidencias, val_monitoreo, val_pago,
                                  pago_liberado, pago_liberado_at)
select ins.id, ins.instalador_id, v.enviado,
       case when v.enviado then now()-interval '1 day' else null end,
       v.a_tiempo, v.pendientes, v.paneles, v.modelo, v.inversor, v.checklist_6,
       v.v1, v.v2, v.v3, v.v4, v.pago,
       case when v.pago then now()-interval '12 hours' else null end
from (values
  ('Bodega Log. Sonora', true,  true,  0,  84, 'Canadian Solar 450W', '2× Enphase IQ8H', '6/6 ✓', false,false,false,false, false),
  ('Planta Monterrey',   false, null,  0,  120,'',                    '',                '—',     false,false,false,false, false),
  ('Almacén Puebla Sur', false, null,  0,  40, '',                    '',                '—',     false,false,false,false, false),
  ('Hotel Centro CDMX',  true,  false, 2,  48, 'REC Alpha 405W',      'SMA Sunny Boy',   '4/6',   false,false,false,false, false),
  ('Casa García',        true,  true,  0,  12, 'Astronergy 400W',     'Enphase IQ7+',    '6/6 ✓', true, true, true, true,  true)
) as v(cliente, enviado, a_tiempo, pendientes, paneles, modelo, inversor, checklist_6, v1, v2, v3, v4, pago)
join clientes c on c.nombre = v.cliente
join instalaciones ins on ins.cliente_id = c.id;

-- ---------- 5. Verificación rápida ----------
-- select cliente_nombre, etapa_nombre, dias_actual, clt, clt_sem from v_instalaciones order by clt desc nulls last;
