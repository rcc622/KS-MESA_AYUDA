# 👋 Bienvenido al proyecto (para devs — ej. Pablo)

> Nota corta para arrancar sin fricción y trabajar **en conjunto** con Randall.
> El objetivo: que ni tú ni él pierdan el hilo de lo que hizo el otro.

## En 30 segundos
**Mesa de Control · KENET Solar.** La app viva está en `instalaciones-dom/`
(Vite + React + Supabase), desplegada en Vercel. Contexto de negocio en `BASES/`.

## Al SENTARTE a trabajar (haz esto siempre)
1. **Abre `docs/ESTATUS.md`** → la entrada de hasta arriba es *lo último que se hizo*.
   (Si usas Claude Code, tu IA ya te lo lee y te da un informe solo — está en `CLAUDE.md`.)
2. Si vas a tocar un módulo, échale un ojo a `docs/GUIA_DEV.md` (cómo correr, cómo probar,
   qué está roto).

## Las 3 reglas que hacen que esto funcione
1. **Antes de un cambio grande** (varias pantallas, backend, esquema): crea una rama de
   respaldo → `git branch backup/main-AAAA-MM-DD` y púshala.
2. **Al terminar tu avance:** agrega una **entrada nueva hasta arriba de `docs/ESTATUS.md`**
   (fecha · autor · qué moviste · qué quedó pendiente · cómo probarlo — lenguaje simple),
   y haz **commit + push**. Así Randall lo ve al iniciar su sesión.
3. **No rompas:** seguridad (RLS, `requireRol` en `api.js`, headers/CSP en `vercel.json`,
   sanitización del import). Las **llaves/secretos NUNCA van al repo** (viven en
   Supabase/Vercel). Todo lo visible en **español MX**.

## Ramas
- **No pushees a `main` sin acordarlo con Randall.** Trabaja en tu rama y coordinen el merge.

## Backend de IA (por si lo tocas)
- Vive en `instalaciones-dom/supabase/functions/ia/`. Hoy usa **Llama y Qwen en Groq**
  (una sola `GROQ_API_KEY`). **Claude está desactivado** a propósito (no gastar la cuenta
  personal). Tras editarlo hay que **redeplegar**: `supabase functions deploy ia`.

## Mapa rápido
| Necesitas… | Ve a… |
|---|---|
| Qué se hizo / último estatus | `docs/ESTATUS.md` |
| Cómo correr/probar, qué está roto | `docs/GUIA_DEV.md` |
| Protocolo completo (para la IA) | `CLAUDE.md` |
| Contexto de negocio | `BASES/` (HANDOFF primero) |
| Plan de IA y fases | `BASES/Roadmap_IA_y_Plataforma.md` |

*Resumen: **llega → lee el último estatus; antes de algo grande → respalda; al cerrar →
escribe el estatus y haz push.** Eso es todo. Bienvenido. 🚀*
