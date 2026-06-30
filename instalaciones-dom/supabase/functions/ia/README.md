# Edge Function `ia` — Asistente IA (Claude + Llama)

Backend agnóstico que da vida a la sección **💬 Asistente** de la plataforma.
Vive en Supabase (no en Vercel) porque está pegado a los datos, hereda Auth/RLS y
guarda las llaves de IA como **secretos** (nunca en el navegador).

> Contexto y decisiones: `BASES/Roadmap_IA_y_Plataforma.md`.

## Qué hace
- Recibe el historial del chat desde el front (con el JWT del usuario).
- Según `provider` (`claude` por defecto, o `llama`), llama a Anthropic o a Groq.
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
# Para usar Claude (recomendado para lo difícil):
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Para usar Llama vía Groq (opcional, rápido y barato). Saca una llave gratis en
# https://console.groq.com → API Keys
supabase secrets set GROQ_API_KEY=gsk_...
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
- **Modelo Claude:** `claude-opus-4-8`. **Modelo Llama:** `llama-3.3-70b-versatile`
  (Groq). Para cambiarlos, edita las constantes al inicio de `index.ts`.
- **Solo lectura.** La IA no escribe en la base en esta versión. Si pides crear o
  editar, te remite a la sección correspondiente de la plataforma.
- **Costos:** cada respuesta consume tokens del proveedor elegido. Claude es más
  preciso; Llama (Groq) es más barato para preguntas simples. El selector "Motor"
  en la cabecera del chat permite alternar.
