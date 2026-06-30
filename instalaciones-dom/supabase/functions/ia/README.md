# Edge Function `ia` — Asistente IA (Llama + Qwen, en Groq)

Backend agnóstico que da vida a la sección **💬 Asistente** de la plataforma.
Vive en Supabase (no en Vercel) porque está pegado a los datos, hereda Auth/RLS y
guarda las llaves de IA como **secretos** (nunca en el navegador).

> Contexto y decisiones: `BASES/Roadmap_IA_y_Plataforma.md`.

## Qué hace
- Recibe el historial del chat desde el front (con el JWT del usuario).
- Según `provider` (`llama` por defecto, o `qwen`), llama a Groq con uno u otro modelo.
  *(Claude/Anthropic se quitó a propósito para no usar la cuenta personal de Claude.)*
- Usa **tool use** para consultar la base **en vivo** (solo lectura): `resumen_kpis`,
  `listar_proyectos`, `detalle_proyecto`, `bitacora_proyecto`.
- Como corre con el JWT del usuario, **todas las consultas respetan RLS**.

## Requisitos previos (una sola vez)
1. Instala el CLI de Supabase: https://supabase.com/docs/guides/cli
2. Liga el proyecto:
   ```bash
   cd instalaciones-dom
   supabase login
   supabase link --project-ref <TU_PROJECT_REF>
   ```

## 1) Pon los secretos (las LLAVES — nunca van al repo)
```bash
# ÚNICA llave necesaria: Groq (corre Llama Y Qwen). Saca una gratis en
# https://console.groq.com → API Keys
supabase secrets set GROQ_API_KEY=gsk_...

# Qwen NO necesita llave nueva: por defecto corre en GROQ (qwen/qwen3-32b) y reutiliza
# GROQ_API_KEY. Solo asegúrate de tener GROQ_API_KEY puesta (arriba) y redeplegar.
# (opcional) usar Qwen en otro proveedor (Together.ai, OpenRouter, DashScope):
#   supabase secrets set QWEN_API_KEY=...
#   supabase secrets set QWEN_BASE_URL=https://api.together.xyz/v1
#   supabase secrets set QWEN_MODEL=Qwen/Qwen2.5-72B-Instruct-Turbo
```
`SUPABASE_URL` y `SUPABASE_ANON_KEY` ya los inyecta Supabase; no los pongas tú.

## 2) Despliega la función
```bash
supabase functions deploy ia
```
Eso es todo: el front ya la llama vía `supabase.functions.invoke('ia', …)`.

## 3) Prueba rápida
Entra a la plataforma → **💬 Asistente** y pregunta *"¿cómo vamos en general?"*.
Debe responder con números reales (usa la herramienta `resumen_kpis`).

## Notas
- **CSP:** el front llama a `*.supabase.co`, que ya está permitido en `vercel.json`
  (`connect-src`). No hay que tocar nada.
- **Modelo Llama:** `llama-3.3-70b-versatile`. **Modelo Qwen:** `qwen/qwen3-32b`
  (ambos en Groq). Para cambiarlos, edita las constantes al inicio de `index.ts`.
- **Solo lectura.** La IA no escribe en la base en esta versión. Si pides crear o
  editar, te remite a la sección correspondiente de la plataforma.
- **Costos:** ambos motores corren en Groq (plan gratis con límite por minuto). El
  selector "Motor" en la cabecera del chat permite alternar entre Llama y Qwen para
  comparar cuál da mejores resultados.
