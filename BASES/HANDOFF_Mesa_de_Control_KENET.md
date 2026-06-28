# HANDOFF — Proyecto "Mesa de Control" / Mesa de Ayuda · KENET Solar

> **Qué es este documento:** paquete de conocimiento y contexto para incorporar a un colaborador al proyecto **Mesa de Control** de KENET Solar. Está escrito para que lo proceses con tu propia cuenta de Claude: pégalo al inicio de un chat nuevo y dile *"Lee este contexto antes de ayudarme con el proyecto Mesa de Control de KENET"*.
>
> **Confidencialidad:** documento interno de KENET. Contiene estrategia operativa y financiera. No compartir fuera del equipo. Las credenciales de infraestructura (repo, Supabase, Vercel/Netlify, cuentas) NO van aquí; Randall las comparte por separado y de forma segura.
>
> Fecha de corte: junio 2026 · Responsable del proyecto: Randall (Director, Nueva Dirección Solar).

---

## 1. Resumen ejecutivo

KENET Solar instala sistemas solares (residencial y C&I) en el noreste de México. El crecimiento dejó la operación post-venta descoordinada: la información vive en Excel y WhatsApp, no hay trazabilidad ni acuerdos de nivel de servicio, el despacho de trabajo es informal y el cliente no tiene visibilidad de su proyecto.

**La iniciativa "Mesa de Control"** crea una *torre de control de vuelo* operativa: un controlador central (Customer Success) despacha y vigila todo el trabajo post-venta — trámites CFE, instalaciones, soporte y cobranza — con prioridades, SLAs/OLAs, candados y evidencia. Se complementa con un **portal del cliente** que da transparencia del avance y habilita el **cobro por hitos**.

La iniciativa también responde a la necesidad de reforzar **controles financieros y trazabilidad** tras hallazgos de control interno (tema sensible; detalles fuera de este documento). Por eso el dinero se **lee por API**, nunca se captura a mano.

---

## 2. Decisión de arquitectura — 2 capas permanentes

Decisión TO-BE (2026-06-11), pendiente de aprobación formal por Dirección:

1. **Capa financiera-contable = Odoo.** La opera otra empresa; hoy KENET solo hace el cuadre comercial. El dinero (pagos, CxC) se **LEE por API** hacia la capa operativa — nunca captura manual. Integración de pagos vía **TOKU** (entra jun-2026).
2. **Capa operativa = plataforma propia ("Mesa de Control").** Cubre todo el post-venta: mesa de despacho, customer journey, CMDB/catálogo de servicios y portal del cliente.

**Regla de oro de integración:** el dinero se lee, no se teclea. El folio es la llave entre capas (folio propio KS-2026-NNNN + OV de Odoo `S#####` como referencia financiera).

---

## 3. La dinámica en 3 niveles (corazón del diseño)

Un caso fluye así, y el estado regresa en vivo a todos los niveles:

```
   ADMIN  ───►  OPERATIVO  ───►  CLIENTE
 (despacha)     (ejecuta)        (ve y paga)
      ▲                              │
      └────── estado en vivo ────────┘
```

### Nivel 1 · ADMIN — "Gestor de Control de Vuelo"
Lo usa el **Coordinador Nacional de Mesa** (rol de Customer Success, ya hay persona lista).
- Tablero único nacional con filtro **R1 / R2**.
- KPIs en vivo: tickets abiertos, dentro de SLA, vencidos, por despachar.
- **Bandeja de despacho:** cada caso trae **área** (CFE / Soporte / Instalación), **prioridad P1–P4** y **reloj de SLA**. Un toque y el caso baja al equipo operativo correcto.

### Nivel 2 · OPERATIVO — áreas críticas
Trabajan desde el **celular en campo** (diseño mobile-first). Reglas comunes: **sin ticket no hay servicio**, **cierre obligatorio con evidencia**, cero variantes locales.
- **CFE / Gestoría:** cola de trámites (UVIE, UIIE, RMU, interconexión), timeline solicitud→inspección→aprobación, acción requerida, días-en-trámite, actas adjuntas. Reemplaza la coordinación informal por WhatsApp.
- **Soporte Técnico (Campo):** cola priorizada P1–P4 con reloj de SLA, flujo asignado→en camino→en sitio→resuelto, cierre con evidencia fotográfica. *(Es "Soporte Técnico (Campo)", NO "Help Desk" — ver §7.)*
- **Instalaciones:** agenda del día por cuadrilla, checklist de avance con % en tiempo real, evidencia por etapa, firma del cliente al cerrar.

### Nivel 3 · CLIENTE — Portal del proyecto
- Etapa actual y estado del proyecto siempre visibles.
- Avance del journey (de la venta a la operación).
- **Pagos por hitos** con candado (ver §4).
- Contacto directo con su coordinador. Sustituye los avisos informales por WhatsApp.

---

## 4. Customer Journey AS-IS (R1) y cobro por hitos

**9 etapas** (orden real validado): 1) MKT · 2) Venta · 3) Viabilidad / **Levantamiento** · 4) **Instalación** (PM) · 5) Trámite CFE · 6) Monitoreo / Puesta en marcha · 7) Atención al Cliente (CS) · 8) Mantenimiento y Soporte (10 años) · 9) Expansión / Up-Selling.

> Nota crítica: **la instalación va ANTES del trámite CFE.**

**Cobro por hitos del journey (candado pago ↔ avance):**
1. **Anticipo** al cierre de contrato → la firma V5 detona la obra.
2. **Enganche** al **terminar la instalación** (hito 5.1).
3. **Restante + 1ª mensualidad** al instalar el **medidor bidireccional** de CFE (hito 6.1).

**Candado real:** sin enganche no se ingresa la interconexión. Hoy el cliente avisa el medidor BD por WhatsApp (informal) — el portal lo sustituye.

Detalle: UVIE (etapa 5) y UIIE (etapa 6) vía grupos WhatsApp con Gestoría. Instalación DOM: Lizeth (MTY) / Gamaliel (SLT); C&I: Franklin. Las OLAs por etapa NO existen aún en el CJ → se definen en F0.

**Pack metodológico de Customer Journeys** (para replicar por región): `OneDrive\...\Buyer Journey\Knowledge\` (memory.md + 2 SKILLs: Excel y swimlane HTML). R1 (MTY+SLT) y R2 (TRC+MVA) ya armados.

---

## 5. Modelo de "Mesa de Ayuda" de Guillermo (PPT PROTEXO, preliminar)

Marco que la propuesta **absorbe** (discusión restante = solo el motor):
- **1 mesa lógica / 2 nodos:** R1 (MTY+SLT), R2 (TRC+MVA).
- **4 líneas de servicio:** (1) Implementación — disparador V5; (2) Post-implementación; (3) CS transversal; (4) Servicios complementarios (Farmer).
- **Hunter vs Farmer:** Hunter = ventas / cliente nuevo. Farmer = la Mesa, dueña de **todo** el ingreso post-venta.
- **SLAs:** P1 = 4 h · P2 = 8 h · P3 = 48 h · P4 = 5 días hábiles. Horario L–S 8–18. On-Call solo C&I Póliza Premium.
- **Roles:** Coordinador Nacional de Mesa · Dispatcher L1 / Técnico L2 / Ingeniería L3 por nodo.
- **Interfaces:** V5 CxC · V7 Contratos · PM Franklin (R1) / Lesly (R2).
- 12 procesos a desplegar en olas; arrancar por **catálogo + SLAs**.

**Choque abierto:** el PPT ancla **Odoo Helpdesk** como motor único, pero la decisión de motor sigue abierta ("validar con Roberto y Anahí").

**Gaps del PPT que la propuesta cubre:** portal cliente · cobro por cliente (candado pago→instalación) · vista journey con días-en-etapa · gestoría CFE explícita.

---

## 6. SLA vs OLA — convención obligatoria

- **OLA** (Operational Level Agreement) → compromisos **entre áreas internas** (Ventas↔Contratos, PM↔CFE, etc.).
- **SLA** → solo compromisos **cara al cliente externo** (primer contacto al lead, MTTR de tickets del cliente, SLA de pago).
- Jerarquía ITIL: UC → SLA → OLA. Ante duda: *"¿este compromiso es entre dos equipos internos o con el cliente?"*

---

## 7. Etiqueta canónica de Soporte

La función es **"Soporte Técnico (Campo)"**, NUNCA "Help Desk" ni "Service Desk". KENET no tiene un Help Desk como capa intermedia: los tickets L1 los toma Atención al Cliente; L2/L3 escalan directo a Soporte Técnico de campo.

---

## 8. Regiones, zonas y plantel funcional

**Regiones / nodos:** R1 = Monterrey (MTY) + Saltillo (SLT). R2 = Torreón (TRC) + Monclova (MVA).
**Zonas AURORA:** MTY · SLT · TRC · MVA · SML. *(Cuidado: en R2, MVA = Monclova, NO Monterrey.)*

**Roles funcionales clave (quién hace qué):**
- **Samuel Giacoman** — Director Comercial.
- **Franklin** — PM de proyectos grandes (FIDE, baterías, foráneos, MT/subestación).
- **Lizeth** — PM proyectos domésticos / residenciales (MTY).
- **Hugo** — levantamientos en campo (R1).
- **Christian González** — soporte técnico de campo (MTY).
- **Gamaliel** — soporte / instalación (SLT).
- **Anahí Ramírez** — líder de Cuentas por Cobrar (CxC).
- **Karime** — Atención al Cliente / trámites de medidor bidireccional.
- **Isaac** — gestión / ATC; tipificación de proyectos.
- **Areli** — Contratos (interfaz V7).
- **Guillermo** — contraparte de Randall en rediseño de procesos (Tesorería/CxC/Cobranza).
- **Dirección:** Jonathan, Anwar, Roberto (+ Randall).

**R2 (especificidades):**
- **Lesly Palacios** — PM + UVIEs/UIIEs (multifunción, TRC). Candidata a piloto.
- **Alondra** — Gestoría CFE + ATC.
- **Farid Castañón** — líder de Mantenimiento (TRC).
- **Iván Gallegos** — cubre ~14 actividades él solo en MVA (single point of failure operativo).
- Instalaciones **in-house** en TRC (a diferencia de MTY, tercerizado).

---

## 9. Plataformas y terminología

- **Odoo** — ERP / capa financiera-contable (operada por otra empresa). Módulo crítico: Cobranza / CxC.
- **TOKU** — aplicación de pagos sobre Odoo (entra jun-2026). *(En audios Randall a veces dice "TOCO" → es TOKU.)*
- **HubSpot** — CRM central; recibe leads de Web Form y de Aurora.
- **Aurora** — sistema regional de leads (integrado a HubSpot) **y** nomenclatura de zonas operativas (ambos usos coexisten).
- **SIRESI** — portal CFE de autogestión del trámite de medidor bidireccional.
- **FIDE** — programa de créditos para proyectos que requieren levantamiento con medidas exactas.
- **CMDB** — catálogo de servicios/activos de la mesa (a definir en F0).
- **UVIE / UIIE** — unidades de verificación de instalaciones eléctricas (trámite CFE).
- **V5 / V7** — interfaces del journey: V5 = CxC (detona obra), V7 = Contratos.
- **Folio:** KS-2026-NNNN (propio) + OV `S#####` (referencia Odoo).

---

## 10. Stack técnico y estado de desarrollo

- **Stack objetivo:** Supabase (Postgres + Auth + RLS) + Next.js + **Vercel** como hosting de producción. Vercel se eligió porque encaja nativo con Next.js (mismos creadores), despliega desde Git y da **preview deploys** (una URL por cada cambio) — ideal para el loop Claude Code ↔ gobierno. Costo ~$25–45 USD/mes. Volumen esperado: >500 clientes activos, >25 usuarios internos.
- **Hosting de demos:** **Netlify Drop** (arrastra-y-suelta) se usa SOLO para publicar prototipos estáticos rápidos (como el MVP). NO es el host de la app de producción — esa va en Vercel. *(Si la app se quedara 100% estática pegándole directo a Supabase, cualquiera de los dos serviría; en cuanto haya lado servidor en Next.js, Vercel es la opción clara.)*
- **Frontera de trabajo:** *Claude Code* = desarrollo de código (en proyecto aparte de Randall). *Cowork* = gobierno del proyecto (decisiones de negocio, catálogos/OLAs F0, business case, arranque del piloto, validaciones contra el CJ, reportes).
- **MVP construido (2026-06-11):** esquema Supabase (etapas del CJ, clientes con folio, eventos, bitácora por trigger, vista de journey con días/semáforo, RLS), seed con clientes reales (etapa inferida + flag para que el líder valide), app HTML única con login, journey con filtros/drawer/captura, tablero y bitácora. Deploy del MVP con **Netlify Drop** (Supabase free + arrastrar la carpeta, ~30 min) por ser un demo estático desechable.
- **Seguridad (nota):** las vistas Postgres deben crearse con `security_invoker=true` para que respeten RLS (omitirlo las hace bypassear RLS).
- **Repo / credenciales:** repo privado en GitHub + proyectos Supabase/Vercel/Netlify. **Randall comparte acceso e identificadores por separado** (no van en este documento).

---

## 11. Entregables de interfaz (trabajo de diseño, jun-2026)

Todos en `Z:\KENET SOLAR\1. NUEVA DIRECCION SOLAR - GOBIERNO\TO-BE\Mesa de Ayuda - Interfaz\` salvo lo indicado.

- **`Prototipo_HIFI_Mesa_de_Control_v1.html`** — prototipo hi-fi **mobile-first**, 5 pantallas + reflow desktop del admin:
  1. Admin — Gestor de Control de Vuelo
  2. CFE / Gestoría
  3. Soporte Técnico (Campo)
  4. Instalaciones
  5. Portal del Cliente
  (Se abre con doble clic en el navegador.)
- **`Demo_Mesa_de_Ayuda_KENET_v2.html`** — demo previo (7 vistas: Tablero GO R1 vs R2, Journey L1, Tickets L2-3, Despacho, Farmer L4, Captura con evidencia, Portal). Alineado al vocabulario/SLAs de Guillermo.
- **`Mesa_de_Control_Dinamica_v1.pptx`** — presentación para Dirección (13 slides), recorrido end-to-end de un caso cruzando los 3 niveles, con las pantallas reales embebidas.
- **Figma:** archivo `KENET Mesa de Ayuda — Levantamientos + Portal Cliente` (key `j1vL9hIzRYmpwQSsdyMMgP`) — pantalla de captura de Levantamiento (campo) + Portal Cliente. *Pendiente:* migrar las 4 pantallas restantes a Figma (se topó el límite del plan Starter de Figma MCP).
- **Business case:** `...\NUEVA DIRECCION - Trabajo entre Guillermo y Randall\Business_Case_Plataforma_Operativa_v1.docx` (problema, 2 capas, alternativas, fases, riesgos, decisión solicitada).
- **MVP:** `...\NUEVA DIRECCION - Trabajo entre Guillermo y Randall\MVP Mesa de Ayuda\` (schema.sql, seed.sql, index.html, guía de deploy).

---

## 12. Design system KENET (para mantener consistencia)

**Paleta:**
- Azul primario `#1F4E79` · Azul oscuro `#163A5C` / `#0F2A45` · Azul claro `#EAF2F9`
- Ámbar (acento/CTA) `#F5A623` · Ámbar oscuro (texto sobre ámbar) `#5C3D00`
- Verde `#2E9E5B` · Rojo `#D64545` · Morado `#6B4E9B`
- Gris texto `#1F2937` · Gris secundario `#6B7280` · Fondo `#F4F6F9` · Borde `#E2E8F0`

**Color por nivel:** Admin = azul · Operativo = ámbar · Cliente = verde.

**Chips de prioridad (SLA):** P1 rojo (4 h) · P2 ámbar (8 h) · P3 azul (48 h) · P4 gris (5 días).

**Patrones mobile-first:** una columna, targets táctiles grandes (≥44px), bottom nav fija, jerarquía tipográfica fuerte, color-coding de prioridad/SLA, disclosure progresivo, evidencia obligatoria en cierres. En desktop los mismos componentes se reorganizan en tablero multi-columna (Por despachar / En proceso / Resueltas).

---

## 13. Roadmap

- **F0 — Diseño de mesa + catálogos** (1–2 sem): catálogo de servicios + SLAs/OLAs firmados por área. *Regla acordada: no construir plataforma antes del diseño TO-BE de la mesa.*
- **F1 — Núcleo / tabla maestra** (2–3 sem).
- **F2 — Captura por líderes + piloto R2** (2 sem).
- **F3 — TOKU + BSC** (2 sem).
- **F4 — Portal cliente** (3–4 sem).

El catálogo de eventos R2 (`KENET_Captura_Eventos_R2.xlsx`, 6 value streams) es el **puente** hasta F2 y alimenta directo el modelo de datos (mismos nombres de campo → migración por import).

---

## 14. Pendientes y decisiones abiertas

1. **Aprobación de Dirección** del modelo de 2 capas (business case entregado).
2. **Motor de la mesa:** ¿Odoo Helpdesk vs plataforma propia? (decisión abierta; validar con Roberto y Anahí).
3. **Definir OLAs por etapa** del customer journey (no existen aún).
4. **Arranque del piloto en R2** con Lesly (criterio de éxito a 4 sem: >80% de captura en la plataforma, Excel congelado, <60 s por evento).
5. **Migrar el prototipo a Figma** (las 4 pantallas restantes; pendiente del cupo del plan Starter).
6. Flujo de cambio de contraseña inicial y endurecimiento del rol "consulta" en el MVP.

---

## 15. Cómo continuar (para el colaborador + su Claude)

1. **Carga este MD** como contexto al inicio del chat.
2. Si vas a trabajar la **interfaz**: abre `Prototipo_HIFI_Mesa_de_Control_v1.html` para ver el estándar visual y pídele a Claude que respete el design system de §12 y los flujos de §3–§4.
3. Si vas a trabajar el **código/MVP**: pídele a Randall el acceso al repo y a Supabase/Vercel (no están aquí por seguridad).
4. **Convenciones que no se rompen:** OLA vs SLA (§6) · "Soporte Técnico (Campo)" (§7) · instalación antes de CFE y cobro por hitos (§4) · el dinero se lee por API, no se teclea (§2) · producción en Vercel, Netlify Drop solo para demos (§10).
5. **Decisiones de negocio** (catálogos, OLAs, motor, business case a Dirección): las gobierna Randall — escalar con opciones preparadas, no asumir.

---

*Documento generado como handoff de proyecto. Para dudas de negocio, Randall es la fuente de verdad.*
