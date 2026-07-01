# 📌 Último Estatus — Bitácora de desarrollo

## 2026-07-01 (cont. 3) · Randall + Claude · Evidencias a Google Drive (Opción A · OAuth) + correos Cobranza + flujo CFE

Tres cosas en esta sesión: (1) los correos a **Cobranza** en 3 hitos (Resend, agnóstico),
(2) las instalaciones terminadas **se reflejan solas en CFE** (bandeja "por iniciar"), y
(3) **Google Drive Opción A**: subir evidencias a Drive **sin llave JSON** (esa la bloquea
una política de la organización) reutilizando el **OAuth de Calendar** de Pablo + scope
`drive.file`.

**Qué se movió:**
- `supabase/functions/notificar/`: correo a Cobranza (instalacion_terminada / cfe_iniciado
  / medidor_instalado). Secretos: RESEND_API_KEY, COBRANZA_EMAILS, NOTIFY_FROM.
- `VistaCFE`: bandeja "🔨 Instalaciones terminadas · por iniciar CFE" + botón iniciar.
- `supabase/functions/gcal-auth`: **SCOPES ahora incluye `drive.file`** (además de Calendar).
- `supabase/functions/drive-upload/`: sube archivos a Drive con el token OAuth de la cuenta
  dueña (`DRIVE_OWNER_EMAIL`) a la carpeta "Evidencias KENET Solar". `lib/drive.js` +
  cableado en `VistaF_Reporte` (best-effort, junto al respaldo en Supabase Storage).

**⚠️ Coordinación con Pablo (importante):**
- Modifiqué `gcal-auth` (agregué el scope de Drive). **Las conexiones de Calendar
  existentes SIGUEN funcionando** (sus tokens no cambian). Solo la cuenta que sea **dueña
  del Drive** debe **RE-conectar** su Google para que su token incluya Drive.

**Pendiente para activar Drive (Randall):**
1. Google Cloud: habilitar **Google Drive API** + agregar scope `drive.file` a la pantalla
   de consentimiento OAuth.
2. Redesplegar `gcal-auth` y desplegar `drive-upload`.
3. Reconectar Google con la cuenta dueña + secreto `DRIVE_OWNER_EMAIL` (y opcional
   `DRIVE_FOLDER_ID`). Detalle en `supabase/functions/drive-upload/README.md`.

**Pendiente correos:** desplegar `notificar` + secretos Resend (README de esa función).

---


## 2026-07-01 (cont. 2) · Randall + Claude · Filtros estilo Excel + búsqueda + borrado admin en Agenda

En la vista de Agenda se agregaron **filtros por columna estilo Excel** (ordenar A→Z/Z→A,
buscar valor, checkboxes) en Cliente/Zona/Cuadrilla/Estatus, **barra de búsqueda** por
cliente/folio, y **selección de filas con borrado para admin** (limpieza de datos en fase
de pruebas). También se afinó el import: separa folio compuesto (MY→KENET, S→Odoo), los
solo-S quedan pendientes (no se importan), ignora totales/vacías, y auto-mapea columnas.

**Qué se movió:**
- `components/FiltroColumna.jsx` (nuevo): dropdown de filtro por columna reutilizable.
- `lib/useTablaFiltrable.jsx` (nuevo): hook que da búsqueda + filtros + orden a cualquier
  tabla. Aplicado en **Agenda** y **Gestión de Usuarios** (rol/zona/estatus). Las demás
  vistas usan tarjetas (no tablas), así que no aplica el filtro por columna.
- `VistaA_Agenda.jsx`: filtros por columna, orden, checkboxes de fila, toggle "Ver todos"
  (admin) y botón "🗑️ Eliminar de la base" (bulk, solo admin).
- `api.js`: `eliminarProyectos(ids)` con `requireRol('admin')` (borra en cascada bitácora
  y trámites CFE). La RLS de `proyectos_delete` ya permite borrar a admin.
- Import: alias determinista, separación de folios, filas pendientes, columnas
  Folio KENET/Folio Odoo en el preview.

**Cómo probar (admin):** Agenda → marca filas → "🗑️ Eliminar de la base" (pide confirmación).
Filtros: toca el ▾ en un encabezado. **Ojo:** el borrado es real y no se puede deshacer.

---


> **Cómo se usa esta bitácora** (protocolo en `CLAUDE.md`):
> - **Al iniciar sesión:** lee la entrada de hasta arriba y dale un informe breve al developer.
> - **Al cerrar un avance/milestone:** agrega una entrada NUEVA **hasta arriba** (lo más
>   reciente primero), con el formato de abajo. Lenguaje simple, que se lea en 1 minuto.
>
> Formato de cada entrada: **fecha · autor (developer + IA) · título**, un párrafo,
> bullets de movimientos, qué quedó pendiente y cómo probarlo.

---

## 2026-07-01 (cont.) · Randall + Claude · Endurecimiento Fase 2 (mapeo IA robusto) + reconciliación con Pablo

Retomamos Fase 2/3 para testeo. Se reconcilió el trabajo de Randall (IA, Fase 2/3) con el
de Pablo (Google Calendar, usuarios) en `main` sin perder nada. Endurecí el "Formatear con
IA" del import para que no falle si el modelo invierte la dirección del mapeo.

**Qué se movió:**
- `VistaE_Import.jsx`: el mapeo de IA ahora **normaliza a origen→destino** aunque el modelo
  lo devuelva invertido (campo→columna); si no mapea nada, error claro. Simulación OK.
- Se verificó que `bitacora.tipo` no tiene CHECK → el tipo `'cfe'` (alerta a Cobranza) es válido.
- Nota de onboarding para devs nuevos (`docs/ONBOARDING.md`).

**Pendiente / a probar (Randall):**
- Fase 2: subir un Excel con columnas raras → 🪄 Formatear con IA → revisar mapeo → importar.
- Fase 3 CFE: crear trámite tipo medidor bidireccional → "Medidor llegó → avisar a Cobranza".
- Reportar lo que falle para afinar en caliente.

---

## 2026-06-30 (noche, cont. 3) · Pablo + Claude · ✅ Orden por fecha en vista del instalador + formato evento Calendar

Dos mejoras en esta sesión: la vista de instalaciones del instalador ahora ordena por fecha más próxima por defecto, y el evento de Google Calendar se ajustó para que su descripción coincida con el formato del mensaje de WhatsApp.

**Qué se movió:**
- `VistaF_Reporte.jsx`: lista de proyectos ordenada por `fecha_agenda` ascendente de forma predeterminada (más cercano primero). Proyectos sin fecha siempre al final. Botón toggle "📅 ↑ Más cercano / ↓ Más lejano" junto a "↺ Actualizar" para invertir el orden.
- `supabase/functions/gcal-event/index.ts`: se eliminaron `Folio KENET`, `OV Odoo` y `Zona` de la descripción del evento. Se ajustaron los saltos de línea para que quede igual que el mensaje de WhatsApp (Correo → línea en blanco → Vendedor → línea en blanco → Nota).

**Pendiente:**
- Redesplegar la Edge Function `gcal-event` en Supabase dashboard (pegar el `index.ts` actualizado en Functions → gcal-event → Deploy).
- Despliegue en Vercel se dispara automáticamente con el push.

**Cómo probar:**
- Vista instalador ("Mis instalaciones"): el proyecto con la fecha más cercana debe aparecer hasta arriba. El botón de orden alterna entre ascendente y descendente.
- Crear un evento de Calendar en un proyecto con todos los campos llenos y verificar que la descripción no incluye Folio KENET, OV Odoo ni Zona.

---

## 2026-06-30 (noche, cont. 2) · Pablo + Claude · ✅ Crear usuarios desde la plataforma (sin Supabase Auth manual)

Antes, dar de alta un usuario nuevo requería dos pasos: crear el perfil en "Gestión de Usuarios" y luego entrar manualmente a Supabase → Authentication → Users → Add user con el mismo correo. Ahora todo se hace desde un solo formulario en la plataforma.

**Qué se construyó:**
- Edge Function nueva `crear-usuario` (solo admins): crea la cuenta de acceso en Supabase Auth (`auth.admin.createUser`, ya confirmada) y el perfil en `usuarios` en un solo paso. Si falla el perfil, revierte la cuenta de Auth para no dejar cuentas huérfanas.
- `lib/api.js`: nueva `crearUsuarioConCuenta()` que llama a la función.
- `VistaG_Usuarios.jsx`: el modal "+ Nuevo usuario" ahora pide **contraseña temporal** (con botón "Generar"). Se quitaron los avisos de "ve a Supabase manualmente".

**Estado:** Edge Function ya desplegada por Pablo. Código en `main` (push hecho). No requiere migración SQL ni secretos nuevos (reutiliza `SUPABASE_SERVICE_ROLE_KEY`, ya inyectada automáticamente).

**Cómo probar:** Gestión de Usuarios → "+ Nuevo usuario" → llena nombre, correo, contraseña (o dale "Generar"), rol y zona → Crear usuario. Debe aparecer en la tabla y el usuario debe poder iniciar sesión de inmediato con esa contraseña.

---

## 2026-06-30 (noche, cont.) · Pablo + Claude · ✅ UX: estado "Calendar conectado" visible

Antes, el botón "📅 Conectar Google Calendar" en "Mis instalaciones" se mostraba siempre, aunque el instalador ya hubiera conectado su cuenta — confuso. Ahora el botón cambia a un badge **"✅ Calendar conectado"** cuando el usuario ya tiene su `google_refresh_token` guardado, y al terminar el flujo OAuth se detecta el cierre del popup y se refresca el estado solo (sin recargar la página).

**Qué se construyó:**
- `App.jsx`: el objeto `usuarioActual` ahora incluye `google_refresh_token`; se agregó `refrescarUsuarioActual()` (re-fetch del usuario) pasada como prop a las vistas.
- `lib/gcal.js`: `conectarGoogleCalendar()` ahora devuelve la referencia de la ventana del popup de OAuth.
- `VistaF_Reporte.jsx`: detecta `usuarioActual?.google_refresh_token` → muestra badge verde "Calendar conectado" en vez del botón; si no está conectado, el botón muestra "⏳ Conectando…" mientras se autoriza y se actualiza solo al cerrar el popup.

**Estado:** build y lint OK, push hecho a `main`.

**Cómo probar:** entra como instalador con cuenta ya conectada (ej. Pablo) → debe verse el badge verde, no el botón. Con un instalador sin conectar, dale clic, autoriza en la ventana de Google, ciérrala (o se cierra sola) → el badge debe aparecer sin recargar la página.

---

## 2026-06-30 (noche) · Pablo + Claude · ✅ Campos Vendedor/Correo cliente + formato de evento en Calendar

Se mejoró el evento de Google Calendar para que tenga el mismo formato que ya se usa en WhatsApp (paneles, inversor, ubicación, etc.) y se agregaron dos campos nuevos al proyecto: **Vendedor** y **Correo del cliente**.

**Qué se construyó:**
- `sql/migracion_vendedor_correo.sql`: columnas nuevas `vendedor` y `correo_cliente` en `proyectos`. **Ya corrida en producción.**
- `VistaA_Agenda.jsx`: el modal "+ Agendar instalación" ahora tiene el campo **Vendedor** (arriba de Cliente) y **Correo del cliente** (debajo de Cliente).
- `VistaC_Detalle.jsx`: mismos dos campos en "Editar proyecto", y se muestran en la tarjeta de información del proyecto.
- Edge Function `gcal-event`: el `select` ahora trae vendedor, correo_cliente y los detalles de panel/inversor; la descripción del evento de Calendar quedó con el mismo formato que WhatsApp (Nombre, Dirección, Ubicación, Paneles, Inversor, Correo, Folio, OV Odoo, Zona, Vendedor, Nota). **Ya desplegado en Supabase.**

**Estado:** migración y deploy ya corridos por Pablo. Código en `main` (push hecho).

**Cómo probar:**
- "+ Agendar instalación" → llena vendedor, cliente, correo, paneles e inversor, agenda fecha y cuadrilla con responsable conectado a Google Calendar.
- Revisa el evento creado en Google Calendar — debe traer el formato completo tipo WhatsApp.
- Edita un proyecto existente desde Detalle y confirma que vendedor/correo se guardan y aparecen en el info-grid.

---

## 2026-06-30 · Pablo + Claude · ✅ Integración Google Calendar para instaladores

Se construyó e integró el flujo completo de Google Calendar OAuth. Cuando un PM o admin agenda una instalación con cuadrilla asignada, el evento aparece automáticamente en el Google Calendar del responsable de esa cuadrilla, sin que el instalador tenga que entrar a la plataforma.

**Qué se construyó:**
- `sql/migracion_gcal.sql`: dos columnas nuevas — `google_refresh_token` en `usuarios` y `gcal_event_id` en `proyectos`.
- Edge Function `gcal-auth`: maneja el flujo OAuth 2.0 con Google. El instalador conecta su cuenta una sola vez desde "Mis instalaciones" → botón 📅 Conectar Google Calendar.
- Edge Function `gcal-event`: crea, actualiza o elimina el evento en Google Calendar del responsable de la cuadrilla usando el refresh_token almacenado.
- `src/lib/gcal.js`: helpers del front para llamar a las Edge Functions.
- `VistaC_Detalle`: dispara sincronización al agendar, reagendar, cambiar cuadrilla y cancelar proyecto.
- `VistaA_Agenda`: dispara sincronización al crear proyecto nuevo con fecha y cuadrilla desde el modal "+ Agendar instalación".

**Estado:** probado y funcionando en producción. El refresh_token de Pablo ya está guardado y los eventos se crean correctamente.

**Pendiente / para Randall:**
- Cada instalador real debe conectar su Google Calendar una sola vez (botón 📅 en "Mis instalaciones").
- Agregar los emails de los instaladores como "test users" en Google Cloud Console (mientras la app esté en modo Testing).
- Respaldo previo: `backup/main-2026-06-30-gcal`.

---

## 2026-07-01 · Randall + Claude · ✅ Fase 2 y Fase 3 ACTIVADAS

Randall corrió los 2 pasos: **redeploy de la función `ia`** (Fase 2) y
**`sql/migracion_cfe.sql`** (Fase 3). Ambas fases quedan **en vivo y funcionando**.

- ✅ **Import inteligente:** el botón 🪄 "Formatear con IA" ya responde (Llama/Qwen).
- ✅ **Módulo CFE / Gestoría:** la tabla `cfe_tramites` existe; ya se pueden crear y
  gestionar trámites, y la alerta de medidor bidireccional → Cobranza opera.

**Pendiente / próximos:** testear ambas con datos reales; afinar prompt de mapeo si hace
falta; **Fase 4** (chat del cliente + Portal). Roadmap negocio: integración **TOKU** para
el cobro cuando salta la alerta de Cobranza.

---

## 2026-07-01 (AFK) · Randall (AFK) + Claude · Fase 2 (import inteligente) + Fase 3 (módulo CFE)

Randall dejó AFK mode: construí **Fase 2 e Fase 3** para que las revise. También se
reordenó el roadmap: el chat del cliente pasó a **Fase 4** y la nueva **Fase 3 = módulo
CFE**. Todo compila (build OK) y lint sin errores. Respaldo previo:
`backup/main-2026-06-30-fase2-3`.

**Qué se construyó:**
- **Fase 2 · Importación inteligente:** botón **🪄 "Formatear con IA"** en el import.
  Para Excels con columnas arbitrarias, la IA (Llama/Qwen) propone el mapeo al esquema
  KENET y el humano lo revisa antes de importar. Backend `ia`: nueva tarea
  `mapear_columnas` (responde JSON). Front: `lib/ia.js` `mapearColumnasIA` + flujo en
  `VistaE_Import.jsx`.
- **Fase 3 · Módulo CFE / Gestoría:** nueva tabla `cfe_tramites` (`sql/migracion_cfe.sql`,
  con RLS), API (`getTramitesCFE`/`crearTramiteCFE`/`actualizarTramiteCFE`), vista
  `VistaCFE.jsx` (KPIs, alta, cambio de estado, filtros). El switcher de módulos ya
  habilita **CFE / Gestoría**. Al marcar **"medidor bidireccional llegó"** se dispara la
  **alerta a Cobranza** (bandera `cobranza_alertada` + bitácora "ya se puede cobrar").
- Docs: roadmap reordenado (Fase 3 CFE, Fase 4 cliente) en README y BASES; guía de devs
  con QA de ambas fases.

**⚠️ Para activarlas (Randall, mañana):**
1. **Fase 2:** **redeplegar la función `ia`** (trae la tarea `mapear_columnas`). Te
   mandé/está el `index.ts` actualizado; o desde compu: `supabase functions deploy ia`.
2. **Fase 3:** correr **`sql/migracion_cfe.sql`** en Supabase (crea la tabla + RLS).
   Mientras no se corra, el módulo CFE muestra un aviso de "falta la tabla".

**Cómo probar (después de los 2 pasos):**
- Import: sube un Excel con columnas raras → 🪄 Formatear con IA → revisa el mapeo → importa.
- CFE: switcher → CFE/Gestoría → "+ Nuevo trámite" (tipo medidor bidireccional) →
  "Medidor llegó → avisar a Cobranza" → verifica el KPI y la bitácora del proyecto.

---

## 2026-06-30 (cierre) · Randall + Claude · ✅ Asistente IA en vivo (Llama + Qwen)

Cierre del día. La función `ia` **ya está desplegada y funcionando** con los dos motores
en Groq: **Llama** y **Qwen** (Claude quedó fuera para no usar la cuenta personal). El
asistente lee datos reales y la burbuja flotante está en todas las pantallas.

**Cómo quedó (todo en `main`, verificado):**
- Asistente con datos reales (tool use de solo lectura) + burbuja flotante global.
- 2 motores comparables en el selector: **Llama** y **Qwen** (una sola `GROQ_API_KEY`).
- Manejo amable de rate limit (Groq plan gratis: 12k tokens/min).
- Protocolo de trabajo (`CLAUDE.md`), bitácora (este archivo), guía de devs
  (`docs/GUIA_DEV.md`) y **SessionStart hook** (imprime el estatus al iniciar).
- Respaldos del día: `backup/main-2026-06-30` y `backup/main-2026-06-30-qwen`.

**Qué falta / próximos pasos:**
- **Testear Llama vs Qwen** en uso real y decidir cuál conviene para cada cosa.
- **Fase 2:** importación inteligente ("Formatear con IA" para Excels sucios).
- **Fase 3:** chat del cliente + Portal Cliente con login y RLS estricto.
- Opcional/cimiento móvil: convertir el front en **PWA**; a futuro app nativa (Capacitor).
- Roadmap negocio: alerta **CFE → Cobranza** (medidor bidireccional) + API **TOKU**.
- Menor: rotar `GROQ_API_KEY` si quedó expuesta en capturas; warnings de lint no críticos.
- El reporte del instalador tiene áreas de mejora (Randall las irá marcando al testear).

---

## 2026-06-30 (noche) · Randall + Claude · Quitamos Claude de la plataforma + fix de hooks

Por decisión de Randall (no gastar/contaminar su cuenta personal de Claude), **sacamos
el motor Claude** del asistente. Ahora solo se testean **Llama y Qwen, ambos en Groq**
(una sola llave `GROQ_API_KEY`). También arreglamos 2 errores de lint.

**Qué se movió:**
- Backend `ia`: eliminado el motor Claude (función `correrClaude`, constante y rama del
  handler). Default = `llama`; soporta `llama` y `qwen`. README/CLAUDE.md actualizados.
- Front: el selector de motor ahora solo muestra **Llama** y **Qwen** (vista completa
  y burbuja). El default ya no es Claude; ambas superficies recuerdan el motor.
- Fix: 2 errores **rules-of-hooks** en `VistaG_Usuarios.jsx` (el guard de admin se movió
  después de los hooks).

**Pendiente / cómo probar:**
- **Redeplegar `ia`** para que tome estos cambios (sin Claude). Solo se necesita
  `GROQ_API_KEY` (ya está puesta).
- Probar: burbuja 💬 → alternar **Llama** vs **Qwen** con la misma pregunta y comparar.
- Validado local: `npm run build` OK y `npm run lint` ya sin los 2 errores de hooks.

---

## 2026-06-30 (tarde) · Randall + Claude · 3er motor Qwen + recuperación de la burbuja flotante

Agregamos **Qwen** como tercer motor del asistente (para comparar Llama vs Qwen vs Claude)
y **recuperamos la burbuja flotante**, que un reset del entorno había revertido antes de
commitearse en la sesión anterior (la vista completa del Asistente sí estaba bien).

**Qué se movió:**
- Backend `ia`: el runner compatible con OpenAI ahora es genérico (`correrOpenAICompat`)
  y sirve para **Llama (Groq)** y **Qwen**. Qwen por defecto usa Together.ai; el host y
  el modelo se cambian con secretos `QWEN_BASE_URL` / `QWEN_MODEL` (sin tocar código).
- Front: opción **Qwen** en el selector de motor (vista completa y burbuja).
- **Burbuja flotante** (`AsistenteFlotante.jsx`) recreada y montada global en `App.jsx`;
  CSS `.ia-fab`/`.ia-pop` re-agregado. Esta vez **verificado en git**.
- Hook SessionStart quedó **síncrono** (decisión de Randall).

**Pendiente / cómo probar:**
- **Qwen NO necesita llave nueva**: corre en Groq (`qwen/qwen3-32b`) y reutiliza
  `GROQ_API_KEY`. Solo **redeplegar `ia`**.
- También falta `ANTHROPIC_API_KEY` (Claude) — opcional.
- Probar: burbuja 💬 → selector **Qwen** → *"¿cómo vamos en general?"*. Comparar con Llama.
- ⚠️ La función `ia` **debe redeplegarse** para tomar Qwen y el manejo de rate limit
  (si se desplegó pegando código en el dashboard, volver a pegar el `index.ts` actualizado).

---

## 2026-06-30 · Randall + Claude · IA Fase 1: Asistente con datos reales + burbuja flotante

Arrancamos la Fase 1 del roadmap de IA: la plataforma ya tiene un **asistente que
consulta los datos reales** (no inventa) y una **burbuja de chat flotante** en todas las
pantallas. El cerebro vive en una **Supabase Edge Function agnóstica** (Claude o Llama).

**Qué se movió:**
- Nuevo backend `instalaciones-dom/supabase/functions/ia/` — proxy agnóstico Claude
  (`claude-opus-4-8`) + Llama (Groq). Tool use de **solo lectura** sobre la base
  (KPIs, lista de proyectos, detalle, bitácora). Corre con el JWT del usuario → respeta RLS.
- Front: vista completa **💬 Asistente** (`VistaAsistente.jsx`) + **burbuja flotante**
  (`AsistenteFlotante.jsx`) montada global en `App.jsx`. Selector de motor Claude/Llama.
- Docs: `BASES/Roadmap_IA_y_Plataforma.md` (plan completo) + secciones en READMEs.
- Se creó la guía de devs y este archivo de estatus + `CLAUDE.md` (protocolo).

**Estado / cómo probar:**
- La función `ia` **ya está desplegada** en Supabase (proyecto `KenetSolar-I&OPS`).
- Secreto puesto: **`GROQ_API_KEY`** ✅. **Falta `ANTHROPIC_API_KEY`** (para usar Claude).
- Para probar: abre la app → burbuja 💬 → pon el motor en **"Llama"** → pregunta
  *"¿cómo vamos en general?"*. Debe responder con números reales.

**Pendiente:**
- Poner `ANTHROPIC_API_KEY` en Supabase Secrets para habilitar el motor Claude.
- (Randall) Rotar la llave de Groq si quedó expuesta en capturas.
- Siguiente: **Fase 2** (importación inteligente "Formatear con IA") o pulir el chat.

---

<!-- Pega las entradas nuevas ARRIBA de esta línea. No borres las anteriores. -->
