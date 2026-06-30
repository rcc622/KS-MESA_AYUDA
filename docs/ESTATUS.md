# 📌 Último Estatus — Bitácora de desarrollo

> **Cómo se usa esta bitácora** (protocolo en `CLAUDE.md`):
> - **Al iniciar sesión:** lee la entrada de hasta arriba y dale un informe breve al developer.
> - **Al cerrar un avance/milestone:** agrega una entrada NUEVA **hasta arriba** (lo más
>   reciente primero), con el formato de abajo. Lenguaje simple, que se lea en 1 minuto.
>
> Formato de cada entrada: **fecha · autor (developer + IA) · título**, un párrafo,
> bullets de movimientos, qué quedó pendiente y cómo probarlo.

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
