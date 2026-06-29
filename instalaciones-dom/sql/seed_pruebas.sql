-- =====================================================================
-- SEED de PRUEBAS — escenarios variados para QA (módulo Instalaciones)
-- =====================================================================
-- Correr en Supabase → SQL Editor. Idempotente (ON CONFLICT por folio).
-- Requiere: usuario pedro@kenetsolar.com creado y migracion_completa.sql corrida.
-- Para BORRAR los datos de prueba:  delete from proyectos where folio like 'SEED-%';
-- Fechas relativas a CURRENT_DATE, así "ya llegó el día" funciona al probar.
-- =====================================================================

-- 1) Asegurar una cuadrilla de Pedro (para que sus proyectos aparezcan en su portal)
insert into cuadrillas (nombre, tipo, zona, esquema_pago, responsable_id, aplica_vueltas, activa)
select 'Cuadrilla Pedro (MTY)', 'externa', 'MTY', 'por_panel', u.id, true, true
from usuarios u
where lower(u.email) = 'pedro@kenetsolar.com'
  and not exists (select 1 from cuadrillas c where c.nombre = 'Cuadrilla Pedro (MTY)');

-- 2) Proyectos de prueba (estatus, fechas, equipo, pagos y SLA variados)
with cp as (select id as cuadrilla_id from cuadrillas where nombre = 'Cuadrilla Pedro (MTY)' limit 1)
insert into proyectos
  (folio, folio_odoo, cliente, telefono, direccion, zona, cuadrilla_id, estatus,
   fecha_agenda, fecha_instalacion, fecha_original, motivo_reagendo, reagenda_factor, reagenda_motivo,
   dias_en_etapa, paneles, kw, panel_potencia_w, panel_marca,
   inversor_tipo, inversor_cantidad, inversor_capacidad_kw, inversor_marca,
   anticipo_pagado, instalado_cobrado, medidor_pagado, notas)
select * from (values
  -- Pedro · POR AGENDAR (agendado sin fecha)
  ('SEED-001','S90001','Familia Treviño','8112000001','Av. Lázaro Cárdenas 100, Monterrey N.L.','MTY',(select cuadrilla_id from cp),'agendado',
    null::date,null::date,null::date,null,null,null, 2,10,6.0,600,'Trina','inversor',1,5.0,'Growatt', true,false,false,'Cliente disponible entre semana'),
  -- Pedro · AGENDADO PARA HOY (instalable)
  ('SEED-002','S90002','Roberto Salinas','8112000002','Calle Roble 245, San Pedro N.L.','MTY',(select cuadrilla_id from cp),'agendado',
    CURRENT_DATE,null,null,null,null,null, 3,12,7.2,600,'JA Solar','microinversor',3,2.0,'Hoymiles', true,false,false,'Acceso por cochera'),
  -- Pedro · AGENDADO A FUTURO (+5 dias)
  ('SEED-003','S90003','María González','8112000003','Priv. Encinos 12, Guadalupe N.L.','MTY',(select cuadrilla_id from cp),'agendado',
    CURRENT_DATE + 5,null,null,null,null,null, 1,8,4.8,600,'Canadian','inversor',1,4.0,'Huawei', true,false,false,null),
  -- Sin cuadrilla · EN PROGRESO · C&I
  ('SEED-004','S90004','Comercial Delta SA','8112000004','Parque Ind. Stiva, Apodaca N.L.','SLT',null,'en_progreso',
    CURRENT_DATE,null,null,null,null,null, 8,24,14.4,600,'Trina','inversor',2,8.0,'Sungrow', true,true,false,'Proyecto C&I, 2 strings'),
  -- Pedro · REAGENDADO (factor externo / clima)
  ('SEED-005','S90005','Hugo Ramírez','8112000005','Col. Cumbres 4to sector, Monterrey N.L.','MTY',(select cuadrilla_id from cp),'reagendado',
    CURRENT_DATE + 2,null,CURRENT_DATE - 1,'Lluvia el día agendado','externo','clima', 0,10,6.0,600,'Trina','inversor',1,5.0,'Growatt', true,false,false,null),
  -- Sin cuadrilla · AGENDADO · CRÍTICO (>15 dias)
  ('SEED-006','S90006','Laura Méndez','8712000006','Blvd. Independencia 1500, Torreón Coah.','TRC',null,'agendado',
    CURRENT_DATE + 3,null,null,null,null,null, 17,14,8.4,600,'JA Solar','inversor',1,6.0,'Growatt', false,false,false,'Falta anticipo'),
  -- Sin cuadrilla · POR AGENDAR · MUY crítico (despacho)
  ('SEED-007','S90007','Inmobiliaria Sur','8662000007','Centro, Monclova Coah.','MVA',null,'agendado',
    null,null,null,null,null,null, 22,16,9.6,600,'Canadian','microinversor',4,2.0,'Enphase', false,false,false,'Pendiente de despacho'),
  -- Pedro · COMPLETADO (esta semana)
  ('SEED-008','S90008','Armando Villarreal','8112000008','Nopal 451, Apodaca N.L.','MTY',(select cuadrilla_id from cp),'completado',
    CURRENT_DATE - 1,CURRENT_DATE - 1,null,null,null,null, 0,12,7.2,600,'Trina','inversor',1,6.0,'Huawei', true,true,false,null),
  -- Pedro · COMPLETADO (semana pasada) · todos los hitos
  ('SEED-009','S90009','Juan Pérez','8112000009','Valle Soleado 88, Guadalupe N.L.','MTY',(select cuadrilla_id from cp),'completado',
    CURRENT_DATE - 9,CURRENT_DATE - 9,null,null,null,null, 0,10,6.0,600,'JA Solar','microinversor',3,2.0,'Hoymiles', true,true,true,null),
  -- Sin cuadrilla · COMPLETADO (mes pasado) · todos los hitos
  ('SEED-010','S90010','Patricia Lozano','8112000010','Lindavista 300, Monterrey N.L.','MTY',null,'completado',
    CURRENT_DATE - 38,CURRENT_DATE - 38,null,null,null,null, 0,18,10.8,600,'Trina','inversor',1,8.0,'Sungrow', true,true,true,'Cierre con medidor BD'),
  -- CANCELADO
  ('SEED-011','S90011','Gerardo Núñez','8112000011','Mitras Centro, Monterrey N.L.','MTY',null,'cancelado',
    null,null,null,null,null,null, 0,8,4.8,600,'Canadian','inversor',1,4.0,'Growatt', false,false,false,'Cliente desistió'),
  -- Pedro · COMPLETADO (otra semana del mes pasado) · C&I
  ('SEED-012','S90012','Alimentos del Norte','8112000012','Escobedo N.L.','MTY',(select cuadrilla_id from cp),'completado',
    CURRENT_DATE - 24,CURRENT_DATE - 24,null,null,null,null, 0,30,18.0,600,'Trina','inversor',2,10.0,'Huawei', true,true,true,'C&I')
) as v(folio, folio_odoo, cliente, telefono, direccion, zona, cuadrilla_id, estatus,
   fecha_agenda, fecha_instalacion, fecha_original, motivo_reagendo, reagenda_factor, reagenda_motivo,
   dias_en_etapa, paneles, kw, panel_potencia_w, panel_marca,
   inversor_tipo, inversor_cantidad, inversor_capacidad_kw, inversor_marca,
   anticipo_pagado, instalado_cobrado, medidor_pagado, notas)
on conflict (folio) do nothing;

-- 3) Verificación
select estatus, count(*) from proyectos where folio like 'SEED-%' group by estatus order by estatus;
