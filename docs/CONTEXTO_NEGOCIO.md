# CONTEXTO_NEGOCIO.md — Knowledge Pack del proyecto Mesa de Ayuda

> **Para Claude Code:** este documento es la fuente de verdad del NEGOCIO. `CLAUDE.md` define cómo trabajar el código; este archivo define QUÉ debe hacer la plataforma para cada área y POR QUÉ. Si una feature requiere una regla de negocio que no está aquí, NO la inventes: pide que se agregue aquí primero (lo mantiene Randall desde Cowork).

---

## 1. Objetivo del proyecto

Una sola plataforma operativa post-venta donde TODAS las áreas (levantamientos, instalaciones, gestoría CFE, customer success, cobranza, soporte) ven y capturan el avance de cada cliente. Mata 4 dolores: (1) Excels con criterios que cambian con cada rotación, (2) "ya se me desapareció" / "yo no le sé al Excel", (3) comunicación reactiva entre áreas (un cliente se atora y nadie se entera), (4) cero visibilidad de dirección sobre el estado real.

**Principio rector:** el conocimiento vive en el sistema, no en las personas. Catálogos cerrados + auditoría total + días calculados por timestamps.

## 2. Modelo organizacional (PPT "Modelo de Mesa de Ayuda", PROTEXO/Guillermo, jun-2026)

- **1 mesa lógica, 2 nodos:** R1 (MTY+SLT) y R2 (TRC+MVA). Un solo proceso, un solo catálogo, un solo set de SLAs/KPIs, una sola herramienta (esta). El "dos" es solo geografía. Cero variantes locales.
- **Niveles:** L1 Agente/Dispatcher (recibe, clasifica, prioriza, despacha, cierra; resuelve FCR), L2 Técnico de campo por nodo, L3 Ingeniería/especialistas central.
- **Roles centrales:** Dueño de proceso = GO (Randall, rector NO operador). Coordinador Nacional de Mesa (administra la herramienta, consolida KPIs, garantiza homologación).
- **4 líneas de servicio:**
  1. **Implementación** — coordinación de obra (el MVP actual cubre esta línea).
  2. **Post-implementación** — tickets de falla, garantías, soporte (F3).
  3. **Customer Success** — transversal, cualquier requerimiento en cualquier etapa (F3).
  4. **Servicios complementarios "Farmer"** — mantenimientos, pólizas O&M, ampliaciones, impermeabilización, mini splits, monitoreo premium. Ingreso recurrente (F3).
- **Hunter/Farmer:** Ventas (Hunter) = solo cliente nuevo hasta el cierre. La Mesa (Farmer) = dueña de TODO el ingreso post-venta, sin rebote a Comercial.
- **Reglas no negociables:** sin ticket no hay servicio · la prioridad determina el SLA y corre desde la apertura · ningún cierre sin evidencia · todo cambio de proceso pasa por gestión de cambios central (= SQL del GO).
- **Flujo estándar de servicio (8 pasos, idéntico en ambos nodos):** Recepción → Registro/ticket → Clasificación y prioridad → Asignación L1·L2·L3 → Despacho a campo → Resolución → Cierre con evidencia → Mejora continua (CSI).
- **SLAs de tickets (F3):** P1 4h (C&I sin generación), P2 8h (residencial caído / C&I degradado), P3 48h (falla menor, dudas), P4 5 días hábiles (programados). Horario L-S 8:00–18:00. On-Call SOLO clientes C&I con Póliza Premium.
- **Anti-"el que grita más fuerte":** el despacho se ordena por prioridad → SLA/OLA vencido → antigüedad. Nunca por presión.

## 3. Journey y reglas de cobro (Customer Journey AS-IS v9 — fuente operativa real)

Etapas de la plataforma (línea 1) = etapas 2(cierre)→7 del CJ v9:

| # | Etapa plataforma | Subactividades clave del CJ | Responsable real |
|---|---|---|---|
| 0 | Contrato·V5 | Firma, expediente (contrato+INE+recibo CFE+comprobante = V7), apertura CxC, cobro de anticipo. FIDE/Mejoravit si aplica | Ventas → Contratos (Areli) → CxC |
| 1 | Viabilidad | Levantamiento con drone/checklist (Survey Form), BoM, validación de ingeniería | Levantamientos, Diseño & Ingeniería |
| 2 | Instalación | Diseño ejecutivo (DU), agenda con cliente (confirmación), logística materiales (Eléctrica Kenet), ejecución DOM (cuadrillas) o C&I (PM directo), commissioning | PM. DOM: Lizeth (MTY)/Gamaliel. C&I: Franklin (R1) / Lesly es PM R2 |
| 3 | Trámite CFE | Confirmar fin de instalación → **cobro de enganche** → ingresar solicitud de interconexión, UVIE si aplica, seguimiento semanal | PM / CxC / Gestoría CFE |
| 4 | Monitoreo | CFE instala medidor bidireccional → **cobro del restante/1ª mensualidad** → UIIE si aplica → activación de plataforma de monitoreo | Gestoría / CxC / Atención al Cliente |
| 5 | Entrega·CS | Bienvenida, programa de referidos, seguimiento de garantía | Atención al Cliente |

**Cobro por hitos (NUNCA capturar dinero a mano — leerlo de Toku/Odoo por API en F3):**
- **Anticipo** al cierre → dispara **V5** = arranque de obra. Sin anticipo NO arranca nada.
- **Enganche** al TERMINAR instalación. **Candado: sin enganche pagado NO se ingresa interconexión a CFE.**
- **Restante / 1ª mensualidad** cuando CFE instala el medidor bidireccional.
- Hoy el cliente avisa "ya pusieron mi medidor" por WhatsApp → el portal (F4) formaliza ese aviso y dispara cobro + activación.

**Post-journey (CJ etapas 8-9 = líneas 2 y 4):** mantenimiento preventivo 1-2/año por 10 años, tickets de soporte (Atención revisa monitoreo y intenta resolver a distancia = FCR antes de mandar técnico), upselling anual (ampliación, baterías, extensión de garantía).

## 4. Qué necesita cada ÁREA de la plataforma (spec por usuario)

| Área | Captura | Consulta | Candados que respeta/dispara | Fase |
|---|---|---|---|---|
| **Ventas (Hunter)** | Nada (su mundo es CRM/HubSpot pre-venta) | Avance de SUS clientes (solo lectura) | Entrega expediente V7 completo; sin V7 no hay folio | F3 (rol consulta) |
| **Contratos (Areli)** | Alta de cliente nuevo + expediente V7 | Expedientes | V7 completo habilita el alta | F3 (MVP: alta vía 05_clientes.sql) |
| **CxC / Cobranza (Anahí)** | Estado de cobro por hito (MVP manual; F3 = Toku automático) | Clientes con hito vencido | Dispara V5 (anticipo) · bloquea CFE (enganche) · cobra restante (medidor BD) | MVP ✓ |
| **Levantamientos** | Levantamiento agendado/realizado/reporte subido | Su cola por zona | OLA de Viabilidad | MVP ✓ (vía cambio de etapa) |
| **Instalaciones / PM** | Cuadrilla asignada, inicio, término CON EVIDENCIA, retrabajos | Su agenda por zona, clientes bloqueados por pago | No instalar sin V5; al terminar avisa a CxC (enganche) | MVP ✓ |
| **Gestoría CFE** | Folio ingresado, oficio, verificación, medidor instalado, UVIE/UIIE | Su cola, clientes con enganche pagado (los únicos que puede ingresar) | NO ingresar sin enganche pagado | MVP ✓ |
| **Atención al Cliente / CS** | Activación monitoreo, bienvenida, referidos; F3: tickets L1 + FCR | TODO (es la ventana única del cliente) | — | MVP parcial, F3 completo |
| **Soporte / Mtto (L2)** | F3: tickets (llegada, diagnóstico, resolución CON EVIDENCIA) | Su cola de tickets por prioridad/SLA | Cierre solo con evidencia | F3 |
| **Farmer / Serv. complementarios** | F3: pipeline Detectado→Ofertado→Agendado→Entregado | Clientes activados sin póliza, renovaciones por vencer | — | F3 |
| **GO (Randall)** | Catálogos/OLAs (solo SQL), usuarios (03_usuarios.sql) | Tablero consolidado, benchmarking R1 vs R2, bitácora completa | Dueño de gestión de cambios | MVP ✓ |
| **Coordinador Nacional** | Despacho/prioridades | KPIs ambos nodos | Orden de despacho anti-grita-más-fuerte | F3 |
| **Cliente final** | F4: subir docs, confirmar citas, avisar medidor BD, abrir solicitud (→ticket), pagar (Toku) | Su avance, su estado de cuenta | — | F4 |

## 5. KPIs que la plataforma debe poder producir (homologados, comparables R1 vs R2)

- **Operativos:** % cumplimiento SLA por prioridad, tiempo medio de resolución (TMR), FCR, backlog, tasa de reapertura, tickets por técnico, CSAT, % incidentes con causa raíz (RCA), **días en etapa vs OLA por etapa del journey** (ya en v_journey).
- **Financieros (Farmer):** tasa de attach de servicios complementarios, % renovación de pólizas O&M, ingreso recurrente generado por la Mesa, mantenimientos vendidos/agendados.
- Destino final: alimentar automáticamente el BSC semanal de Kenet (hoy se arma con Google Apps Scripts manuales — la plataforma los reemplaza gradualmente en F3).

## 6. Roadmap y gates

- **PILOTO (ahora, 4 semanas, R2):** gate = >80% de eventos capturados en plataforma, Excel PENDIENTE INSTALACIONES congelado, <60 seg por captura, comité semanal sobre el Tablero GO 4/4 semanas. Lesly valida las 126 etapas inferidas (sello VALIDAR).
- **F0 (paralelo al piloto):** firmar catálogos y OLAs reales con dirección/Guillermo. Los OLAs actuales (3/5/10/15/7/7) son PLACEHOLDER.
- **F3 (si el piloto pasa):** tickets P1-P4 con countdown de SLA, vista despacho, vista Farmer, Toku API (cobro_estado automático), feed al BSC, roles por área en RLS (profiles.role/zone ya existen — aplicar policies), expansión a R1, migración a Next.js si el single-file queda corto.
- **F4:** portal del cliente (auth separada de la interna, magic link o OTP; ver fila "Cliente final" arriba).

## 7. Decisiones de arquitectura tomadas (NO reabrir sin Randall)

1. **2 capas permanentes:** Odoo = financiero-contable (lo opera un tercero; hoy solo cuadre comercial). Esta plataforma = operativo. Se integran por API, jamás se duplican. El estado de cobro se LEERÁ de Toku/Odoo; la captura manual de cobro_estado es transitoria del MVP.
2. **Identificador:** folio propio `KS-2026-NNNN` + `orden_venta` (S#####) como referencia/futura FK con Odoo.
3. **Catálogos solo por SQL** = gestión de cambios del GO. La UI jamás los edita.
4. **Nunca borrar:** clientes se archivan (`activo=false`), usuarios se bloquean (`banned_until`). La bitácora es intocable (control antifraude — contexto sensible: hubo fraude interno en 2026; la trazabilidad es requisito de dirección, no nice-to-have).
5. **Vistas con `security_invoker=true`** siempre (las vistas Postgres bypassean RLS sin eso).

## 8. Glosario Kenet

**V5** = hito de arranque de obra (se dispara al cobrar anticipo) · **V7** = expediente completo del cliente (contrato, INE, recibo CFE, comprobante) · **OLA** = compromiso interno entre áreas (días por etapa); **SLA** = compromiso cara al cliente (tickets) — en Kenet NO se usan como sinónimos · **BD** = medidor bidireccional · **UVIE/UIIE** = trámites CFE adicionales para proyectos con subestación/media tensión · **FIDE / Mejoravit** = esquemas de financiamiento (FIDE empresarial, Mejoravit Infonavit) · **DOM / C&I** = residencial / comercial-industrial · **Zonas:** MTY, SLT (Saltillo), TRC (Torreón), MVA (Monclova); R1 = MTY+SLT, R2 = TRC+MVA · **Hunter/Farmer** = ventas cliente nuevo / mesa dueña del ingreso post-venta · **GO** = Gobierno Operativo (Randall) · **BSC** = Balanced Scorecard semanal de Kenet · **Toku** = pasarela de cobro recurrente · **FCR** = resolución en primer contacto.

## 9. Referencias fuente (fuera del repo, carpeta del proyecto en Z:)

- `Buyer Journey/Customer Journey Region 1 - MTY y SLT/Customer_Journey AS-IS_Kenet_Solar_v9.xlsx` — CJ completo con 38 subactividades, procesos y KPIs por etapa.
- PPT "Modelo de Mesa de Ayuda" (PROTEXO/Guillermo, 03-jun-2026) — modelo organizacional completo.
- `Demo_Mesa_de_Ayuda_KENET_v2.html` — **spec visual de F3/F4**: así deben verse tickets, despacho, Farmer kanban, tablero GO con benchmarking y portal del cliente. Úsala como referencia de UX al construir esas fases.
- `Business_Case_Plataforma_Operativa_v1.docx` — caso de negocio presentado a dirección.
- `Reportes AS-IS/TRC y MVA/` — los 3 Excel originales de R2 (fuente del seed).
