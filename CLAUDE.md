# CLAUDE.md — Mesa de Ayuda KENET Solar

## Qué es este proyecto

Plataforma operativa post-venta de KENET Solar (instaladora solar mexicana, ~60 empleados, 4 ciudades). Reemplaza Excels frágiles por un sistema único donde cada líder captura el avance de cada cliente. Hoy: MVP en piloto con Región 2 (TRC=Torreón, MVA=Monclova). Responsable: Randall (Director / Gobierno Operativo "GO"). Mantenimiento: Randall + Claude Code.

**Arquitectura de 2 capas (decisión firme, no cambiar):**
- Capa financiera = Odoo (lo opera un tercero; contabilidad/facturación). La plataforma NUNCA captura dinero a mano — lo leerá por API (Toku primero, Odoo después).
- Capa operativa = ESTE proyecto (journey, mesa de ayuda, futuro portal cliente).

## Stack

- **MVP actual:** `index.html` único (vanilla JS + Supabase JS v2 por CDN) + Supabase (Postgres, Auth magic link, RLS) + Netlify Drop. $0/mes.
- **Destino (F3+, solo si el piloto pasa):** Next.js + Supabase + Vercel. No migrar antes de validar el piloto.

## Modelo de datos (sql/01_schema.sql)

- `etapas` — catálogo CERRADO de 6 etapas. Solo se modifica por SQL (= control de cambios del GO). Nunca exponer su edición en la UI.
  - **Mapeo a Customer Journey v9** (para migrar datos del piloto a F3 sin perder histórico): `0 Contrato·V5 = E2 VENTA (cierre)` · `1 Viabilidad = E3 VIABILIDAD` · `2 Instalación = E4 INSTALACIÓN` · `3 Trámite CFE = E5 TRÁMITE CFE` · `4 Monitoreo = E6 MONITOREO` · `5 Entrega·CS = E7 ATENCIÓN AL CLIENTE`. Las 38 sub-actividades v9 NO se modelan en el piloto (granularidad de F3; el motor F3 ya existe en `C:\Users\rcc_6\dev\torre-kenet`).
- `clientes` — folio generado `KS-2026-NNNN`; `orden_venta` (formato S#####) es la futura FK con Odoo; `etapa_validada=false` marca filas importadas del Excel que el equipo debe validar; `activo=false` = histórico/archivado (nunca borrar filas).
- `eventos` — transiciones de etapa y notas. El trigger las crea automático al cambiar `etapa_actual`.
- `bitacora` — audit log por trigger (usuario = email del JWT). Intocable: es el control antifraude y la defensa contra "se me desapareció".
- `v_journey` — vista con `dias_en_etapa` y `semaforo` calculados. La UI SIEMPRE lee de aquí, nunca calcula días en el cliente.

## Reglas de negocio (del Customer Journey AS-IS v9 — NO inventar otras)

1. Etapas línea 1: Contrato·V5 → Viabilidad (levantamiento) → Instalación → Trámite CFE → Puesta en marcha/Monitoreo → Entrega a CS. La instalación va ANTES del trámite CFE (orden real de KENET).
2. Cobro por hitos: **anticipo** al cierre (dispara V5 = arranque de obra) → **enganche** al TERMINAR instalación → **restante/1ª mensualidad** cuando CFE instala el medidor bidireccional.
3. Candados: sin anticipo no arranca obra (V5); sin enganche pagado NO se ingresa interconexión a CFE.
4. Días en etapa = timestamps de transición, jamás capturados a mano.
5. OLAs actuales son PLACEHOLDER — se firman en F0 con dirección. Viven en `etapas.ola_dias`.

## Modelo organizacional (PPT "Modelo de Mesa de Ayuda" PROTEXO/Guillermo, jun-2026)

- 1 mesa lógica, 2 nodos (R1 = MTY+SLT, R2 = TRC+MVA). Cero variantes locales de proceso.
- 4 líneas de servicio: 1 Implementación (este MVP), 2 Post-implementación (tickets), 3 Customer Success, 4 Servicios complementarios "Farmer" (ingreso recurrente).
- SLAs tickets (F3): P1 4h, P2 8h, P3 48h, P4 5 días hábiles. Horario L-S 8:00-18:00. On-Call solo C&I Póliza Premium.
- Reglas no negociables: sin ticket no hay servicio · prioridad determina SLA · ningún cierre sin evidencia · Hunter (ventas, cliente nuevo) / Farmer (mesa, todo el ingreso post-venta).

## Roadmap

- **Ahora (piloto, 4 semanas):** >80%% de eventos capturados en plataforma; Excel PENDIENTE INSTALACIONES congelado; <60 seg por captura; comité semanal sobre el Tablero GO.
- **F3 (post-piloto):** tickets P1-P4 con SLA countdown, vista Farmer, Toku API (cobro automático), feed al BSC, roles por área en RLS, migración Next.js.
- **F4:** portal del cliente (avance, docs, pago Toku, citas, aviso "CFE puso mi medidor").

## Convenciones

- Todo en español MX (UI, comentarios, commits).
- Catálogos cerrados: ningún campo crítico de texto libre en la UI.
- Toda mutación debe quedar en `bitacora` (los triggers lo hacen — no los esquives con service_role desde el cliente).
- La anon key es pública por diseño; la seguridad es RLS + registro de usuarios cerrado (Auth → signups deshabilitados).
- Datos reales de clientes: NO subir `02_seed.sql` a repos públicos. Repo privado siempre.

## Gotchas conocidos

- La carpeta original vive en un drive de red (Z:) cuyo sync TRUNCÓ archivos >20KB dos veces. Para desarrollo: clona/copia este repo a disco local (ej. C:\dev\kenet-mesa) y trabaja ahí. Verifica que index.html termine en </html> tras cada edición masiva.
- `02_seed.sql`: etapas inferidas por heurística desde Excel — el sello VALIDAR en la UI existe a propósito; no lo quites hasta que el equipo valide todo.
- Emojis en UI se ven como cuadros en Linux headless (sin fuente emoji); en Windows/móvil se ven bien.

## Referencias (carpeta padre "MVP Mesa de Ayuda" y proyecto)

- `docs/GUIA_DEPLOY_MVP.md` — deploy actual paso a paso.
- Demos conceptuales (carpeta "NUEVA DIRECCION - Trabajo entre Guillermo y Randall"): `Demo_Mesa_de_Ayuda_KENET_v2.html` (referencia visual de F3/F4: tickets, Farmer, portal) y `Business_Case_Plataforma_Operativa_v1.docx`.
- Fuente de datos del seed: `Reportes AS-IS/TRC y MVA/PENDIENTE INSTALACIONES.xlsx`.
- Customer Journey completo: `Buyer Journey/Customer Journey Region 1 - MTY y SLT/Customer_Journey AS-IS_Kenet_Solar_v9.xlsx`.
