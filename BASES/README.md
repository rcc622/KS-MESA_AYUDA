# BASES — Documentos base del proyecto (fuente de verdad)

Esta carpeta reúne los **documentos de contexto y diseño** del proyecto
**Mesa de Control / Mesa de Ayuda · KENET Solar**. Son la *fuente de verdad* de
negocio: explican el porqué, la arquitectura, la dinámica operativa y la terminología.

**Para qué sirven:**
- Onboarding de cualquier persona nueva al proyecto (ej. Pablo).
- Cargar como **contexto a Claude** al inicio de un chat (pega el documento y di
  *"lee este contexto antes de ayudarme con el proyecto Mesa de Control de KENET"*).
- Resolver dudas de negocio sin reinventar reglas: si algo no está aquí, se pregunta
  a Randall (no se asume).

> ⚠️ **Confidencial — interno KENET.** Contienen estrategia operativa y financiera.
> No se incluyen credenciales (repo/Supabase/Vercel); esas se comparten por separado.

---

## Contenido

### 1. `HANDOFF_Mesa_de_Control_KENET.md`
**El documento maestro.** Paquete de conocimiento para incorporar a alguien al proyecto.
Incluye: resumen ejecutivo, decisión de arquitectura de **2 capas** (Odoo financiero
leído por API + plataforma propia operativa), la **dinámica en 3 niveles**
(Admin despacha · Operativo ejecuta · Cliente ve y paga), el **customer journey de
9 etapas** y el **cobro por hitos**, convención **OLA vs SLA**, regiones/zonas y
plantel, stack técnico (Supabase + Next.js + **Vercel**), design system, roadmap
F0–F4 y pendientes/decisiones abiertas.
→ **Empezar por aquí.**

### 2. `ArqBase_TTSystem_v2_19jun.md`
**Arquitectura del Trouble Ticket System (TTS).** Especificación de la herramienta
de gestión de casos: módulos en capas, **modelo del ticket** y reglas de apertura,
**queues y enrutamiento** (línea de servicio × región), **ciclo de vida / estados**,
**bitácora append-only** (un solo log por ticket) y **clasificación de causa raíz**
en 3 niveles. Referencia de diseño: sistemas probados tipo Clarify.

### 3. `Mesa_de_Control_Dinamica_v1.md`
**Presentación a Dirección (13 slides).** Cuenta la dinámica operativa en 3 niveles
y el recorrido **end-to-end de un caso** cruzando Admin → Operativo → Cliente, con
las 5 pantallas (Admin/Gestor de Control de Vuelo, Soporte Técnico de Campo,
CFE/Gestoría, Instalaciones, Portal del Cliente), el contraste **HOY vs CON Mesa de
Control** y la **decisión solicitada** (aprobar arranque F0, piloto R2, motor).

---

## Documentos relacionados (en otras carpetas)

- `docs/RETRO_v2_Instalaciones_Domesticas_EJECUTABLE.md` — **última retro del módulo
  de Instalaciones Domésticas** (cortes de pago 2 esquemas, cuadrillas configurables,
  vueltas, import multi-fuente). Es el *delta* ejecutable sobre el prompt V2.

---

## Convención

Esta carpeta crece con material de referencia. Los PPT/Word/PDF de origen se
convierten a Markdown (con `markitdown`, ver `Tools/markitdown/`) y se agregan aquí
para que queden versionados y legibles en git.
