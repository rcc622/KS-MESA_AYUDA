# CLAUDE.md — Protocolo de trabajo (léelo SIEMPRE al iniciar)

> Este archivo lo lee Claude Code automáticamente al abrir una sesión en este repo.
> Es el **contrato de trabajo** para cualquier IA (la de Randall, la de Pablo, etc.).
> Si eres una IA trabajando aquí: **sigue este protocolo sin excepción.**

---

## 0. Qué es este proyecto (30 segundos)

**Mesa de Control · KENET Solar** — plataforma operativa del post-venta de instalaciones
solares. La app viva está en **`instalaciones-dom/`** (Vite + React 19 + Supabase),
desplegada en **Vercel**. Contexto de negocio en **`BASES/`** (empieza por
`BASES/HANDOFF_Mesa_de_Control_KENET.md`). Roadmap de IA en
`BASES/Roadmap_IA_y_Plataforma.md`.

---

## 1. 🟢 AL INICIAR SESIÓN (obligatorio)

1. **Lee `docs/ESTATUS.md`** (la entrada de hasta arriba = lo último que se hizo).
2. **Da un informe breve al developer** antes de empezar: en 3-5 bullets, dile
   *qué se movió en la última sesión, qué quedó pendiente y qué conviene probar*.
   Así Pablo (o quien sea) retoma sin perderse.
3. Si vas a tocar algo de un módulo, revisa también `docs/GUIA_DEV.md` (mapa de
   módulos, checklist de pruebas y problemas conocidos).

## 2. 🔵 ANTES DE UN MILESTONE / CAMBIO IMPORTANTE (obligatorio)

- **Crea una rama de respaldo** antes de empezar:
  `git branch backup/main-AAAA-MM-DD` y púshala.
  (Si ya existe una con esa fecha, agrégale un sufijo: `backup/main-AAAA-MM-DD-tema`.)
- Un "milestone" = cualquier cambio que toque varias pantallas, el backend, el
  esquema de datos, o que sea difícil de revertir. Ante la duda, respalda.

## 3. 🟣 AL CERRAR SESIÓN / TERMINAR UN AVANCE IMPORTANTE (obligatorio)

1. **Respalda** (si no lo hiciste ya en el paso 2).
2. **Agrega una entrada NUEVA hasta arriba de `docs/ESTATUS.md`** con el formato de
   ese archivo: fecha, autor (developer + IA), un párrafo sencillo y bullets de los
   movimientos, qué quedó pendiente y cómo probarlo. **Lenguaje simple**, que Pablo lo
   lea en 1 minuto.
3. Si descubriste algo roto, anótalo en la sección **"Problemas conocidos"** de
   `docs/GUIA_DEV.md`.
4. **Commit + push** de todo (código + ESTATUS + guía).

## 4. 🔴 REGLAS QUE NO SE ROMPEN

- **Seguridad (preservar SIEMPRE):** políticas RLS, los `requireRol(...)` en
  `instalaciones-dom/src/lib/api.js`, los headers/CSP de `instalaciones-dom/vercel.json`,
  la sanitización anti-fórmulas del import y los límites de tamaño/filas. **Nunca**
  los quites ni los debilites al editar.
- **Llaves y secretos NUNCA en el repo.** Las API keys (Anthropic, Groq, Supabase)
  viven como secretos en Supabase/Vercel. Si ves una llave en un commit, deténte y avisa.
- **Español MX** en todo lo visible. La **bitácora es inmutable** (append-only).
  El **dinero se lee, no se teclea** (Odoo es la fuente financiera).
- **Branch de desarrollo:** trabaja en la rama que te indiquen; **no** pushees a `main`
  sin permiso explícito del developer.
- **Convención de IA:** el backend de IA vive en **Supabase Edge Functions**
  (`instalaciones-dom/supabase/functions/`), es **agnóstico** (Claude + Llama) y las
  llaves van como secretos. No metas llaves de IA en el front.

## 5. 📌 Mapa rápido de archivos clave

| Necesitas… | Ve a… |
|---|---|
| Último estatus / qué se hizo | `docs/ESTATUS.md` |
| Cómo correr/probar, qué está roto | `docs/GUIA_DEV.md` |
| Contexto de negocio | `BASES/` (HANDOFF primero) |
| Plan de IA / escalabilidad | `BASES/Roadmap_IA_y_Plataforma.md` |
| Estructura general del repo | `README.md` |
| Código de la app | `instalaciones-dom/src/` |
| Backend de IA | `instalaciones-dom/supabase/functions/ia/` |

---

*Resumen en una línea: **al iniciar → lee y reporta el último estatus; antes de un
milestone → respalda; al cerrar → respalda, escribe el estatus y haz push.***
