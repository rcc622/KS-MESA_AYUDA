# 📌 Último Estatus — Bitácora de desarrollo

> **Cómo se usa esta bitácora** (protocolo en `CLAUDE.md`):
> - **Al iniciar sesión:** lee la entrada de hasta arriba y dale un informe breve al developer.
> - **Al cerrar un avance/milestone:** agrega una entrada NUEVA **hasta arriba** (lo más
>   reciente primero), con el formato de abajo. Lenguaje simple, que se lea en 1 minuto.
>
> Formato de cada entrada: **fecha · autor (developer + IA) · título**, un párrafo,
> bullets de movimientos, qué quedó pendiente y cómo probarlo.

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
