-- =====================================================================
-- 🏠 GESTIÓN DE CLIENTES — Mesa de Ayuda KENET (piloto R2)
-- Estilo roster plano: busca, edita el renglón que necesites y corre.
-- Re-correr cualquier bloque es seguro.
--
-- CATÁLOGOS (referencia rápida):
--   etapa_actual: 0=Contrato·V5 · 1=Viabilidad · 2=Instalación
--                 3=Trámite CFE · 4=Monitoreo · 5=Entrega·CS
--   cobro_estado: 'anticipo_pendiente' | 'al_corriente' |
--                 'enganche_vencido' | 'restante_vencido' | 'liquidado'
--   zona: 'MTY'|'SLT'|'TRC'|'MVA' · region: 'R1'|'R2'
--
-- ⚠ Cambios desde el SQL Editor quedan en bitácora como usuario
--   "sistema". Para el día a día operativo usa la APP (atribuye por
--   persona); este script es mantenimiento masivo del GO.
-- ⚠ NUNCA delete de clientes: archivar con activo=false (el historial
--   de eventos/bitácora referencia al cliente).
-- =====================================================================

-- 1) BUSCAR (edita el texto y corre el que necesites)

-- Por nombre (parcial, sin importar mayúsculas):
-- select * from v_journey where nombre ilike '%garcia%' order by nombre;

-- Por folio:
-- select * from v_journey where folio = 'KS-2026-0001';

-- Por orden de venta (Odoo):
-- select * from v_journey where orden_venta = 'S22225';

-- Activos de una zona y etapa:
-- select * from v_journey where activo and zona='TRC' and etapa_actual=2 order by dias_en_etapa desc;

-- Semáforo ROJO (pasados de OLA):
-- select folio, nombre, zona, etapa_corto, dias_en_etapa, ola_dias, responsable
--   from v_journey where activo and semaforo='rojo' order by dias_en_etapa desc;

-- Cobros vencidos:
-- select folio, nombre, zona, etapa_corto, cobro_label
--   from v_journey where activo and cobro_estado in ('enganche_vencido','restante_vencido');

-- Pendientes de validar (sello VALIDAR en la app):
-- select folio, nombre, zona, etapa_corto from v_journey where activo and not etapa_validada;

-- 2) ALTA DE CLIENTE NUEVO (folio KS-2026-NNNN se genera solo)
-- insert into clientes (nombre, zona, region, orden_venta, factura_folio, sistema,
--                       vendedor, esquema_pago, premium, etapa_actual, cobro_estado,
--                       proxima_accion, responsable, observaciones)
-- values ('NOMBRE COMPLETO', 'TRC', 'R2', 'S00000', '', '10-630/1-8K',
--         'VENDEDOR', 'CONTADO', false, 0, 'anticipo_pendiente',
--         'Cobrar anticipo para detonar V5', 'Anahí', '');

-- 3) EDITAR DATOS DEL CLIENTE (un update por campo — edita folio y valor)
-- update clientes set nombre        = 'Nombre Corregido'      where folio='KS-2026-0001';
-- update clientes set orden_venta   = 'S12345'                where folio='KS-2026-0001';
-- update clientes set factura_folio = '100211/370'            where folio='KS-2026-0001';
-- update clientes set sistema       = '12-640/1-10K'          where folio='KS-2026-0001';
-- update clientes set vendedor      = 'Oscar'                 where folio='KS-2026-0001';
-- update clientes set esquema_pago  = 'MEJORAVIT'             where folio='KS-2026-0001';
-- update clientes set premium       = true                    where folio='KS-2026-0001';  -- C&I Póliza Premium
-- update clientes set zona='MVA', region='R2'                 where folio='KS-2026-0001';

-- 4) CAMBIAR ETAPA (el trigger registra el evento, reinicia el contador
--    de días y marca la etapa como validada — igual que la app):
-- update clientes set etapa_actual = 2 where folio='KS-2026-0001';

-- 5) ESTADO DE COBRO:
-- update clientes set cobro_estado = 'al_corriente' where folio='KS-2026-0001';

-- 6) PRÓXIMA ACCIÓN y RESPONSABLE:
-- update clientes set proxima_accion='Agendar instalación con cuadrilla', responsable='Lesly'
--  where folio='KS-2026-0001';

-- 7) VALIDAR ETAPAS (quita el sello VALIDAR sin cambiar la etapa)
-- Un cliente:
-- update clientes set etapa_validada = true where folio='KS-2026-0001';
-- Toda una zona (cuando Lesly termine su barrido):
-- update clientes set etapa_validada = true where zona='TRC' and activo;

-- 8) ARCHIVAR / REACTIVAR (jamás delete)
-- update clientes set activo = false where folio='KS-2026-0001';  -- a histórico
-- update clientes set activo = true  where folio='KS-2026-0001';  -- de regreso

-- 9) HISTORIAL DE UN CLIENTE (eventos + quién hizo qué)
-- select e.created_at, e.tipo, e.etapa_origen, e.etapa_destino, e.descripcion, e.usuario
--   from eventos e join clientes c on c.id = e.cliente_id
--  where c.folio='KS-2026-0001' order by e.created_at desc;
-- select b.created_at, b.campo, b.valor_old, b.valor_new, b.usuario
--   from bitacora b join clientes c on c.id = b.registro and b.tabla='clientes'
--  where c.folio='KS-2026-0001' order by b.created_at desc;

-- 10) VERIFICACIÓN GENERAL (estos sí corren siempre)
select 'activos' as grupo, zona, count(*) as clientes
  from clientes where activo group by zona
union all
select 'históricos', zona, count(*) from clientes where not activo group by zona
order by grupo, zona;

select e.corto as etapa, count(*) as activos,
       count(*) filter (where v.semaforo='rojo')  as rojos,
       count(*) filter (where not v.etapa_validada) as sin_validar
  from v_journey v join etapas e on e.id = v.etapa_actual
 where v.activo
 group by e.corto, e.orden order by e.orden;
