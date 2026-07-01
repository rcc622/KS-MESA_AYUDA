# Roadmap IA y Plataforma — Mesa de Control · KENET Solar

> **Qué es este documento:** el plan de acción acordado (jun-2026) para volver la
> plataforma **inteligente con IA** y dejarla lista para crecer a **PWA** y, a futuro,
> **app móvil nativa**. Es la hoja de ruta técnica: explica *qué se construye*, *en qué
> orden* y, sobre todo, *las decisiones de arquitectura que no se rompen* para no
> cerrarnos puertas más adelante.
>
> Fuente de verdad de negocio: `HANDOFF_Mesa_de_Control_KENET.md`. Este documento es el
> *delta* de IA + escalabilidad sobre lo ya construido en `instalaciones-dom/`.

---

## 0. Principio rector (lee esto primero)

**Separar el cerebro de la cara.** El *cerebro* (datos + lógica + IA) vive en el
**backend / Supabase**; la *cara* (React) solo dibuja y consume. Esa separación es lo que
hace posible — sin reescribir — que mañana la misma plataforma corra como **web, PWA y
app nativa**, y que podamos cambiar de proveedor de IA con una sola línea.

Tres reglas que se derivan de eso y **no se rompen**:

1. **Las llaves de IA nunca tocan el navegador.** La app es un SPA estático (y mañana una
   app nativa, que se puede decompilar): si la llave de Anthropic/Groq estuviera en el
   cliente, cualquiera la roba. Toda llamada a IA pasa por una **función de servidor** que
   guarda la llave como **secreto**.
2. **La lógica de negocio vive en `lib/api.js` y en el backend, no enterrada en los
   componentes.** Así la app nativa reusa la misma capa de datos.
3. **Supabase es la única fuente de verdad** (datos + Auth + Storage). Web, PWA y nativo
   apuntan todos ahí.

---

## 1. Dónde vive el backend de IA — **Supabase Edge Functions** (no Vercel Functions)

**Decisión:** el proxy de IA se construye como **Supabase Edge Function**. Vercel se queda
solo con lo que hace excelente: **servir el front**.

**Por qué (costo + escalabilidad):**
- La IA necesita **leer la base** en cada consulta (estatus, resúmenes, bitácora). La Edge
  Function vive *pegada* a los datos → menos latencia y **sin costo de egress** (la
  transferencia Vercel↔Supabase es justo lo que se encarece a escala).
- **Hereda Auth y RLS nativamente.** La función corre con el JWT del usuario, así que el
  scoping (que un cliente **jamás** vea datos de otro) lo impone la propia base. Crítico
  para la Fase 3 (chat del cliente).
- El plan de Supabase ya incluye cientos de miles de invocaciones de Edge Functions →
  para el volumen actual, prácticamente gratis.

**Regla simple:** *lógica que toca datos → Supabase. Servir la interfaz → Vercel.*
La llave de IA vive como secreto en Supabase, junto a la función que la usa.

> Excepción menor: una función que **no** tocara la base (proxy tonto) daría igual en
> Vercel. Pero todo lo de IA que tenemos en mente sí toca datos.

---

## 2. Proveedor de IA — agnóstico, estrategia híbrida (Claude + Llama)

El backend se construye **agnóstico al modelo**: por dentro puede llamar a **Claude** o a
**Llama** cambiando una línea. No es "escoge uno y rézale" — se prueban ambos con datos
reales y se decide con números.

| Proveedor | Modelo | Cómo se hospeda | Para qué |
|-----------|--------|-----------------|----------|
| **Anthropic (Claude)** | `claude-opus-4-8` | API de Anthropic | El "cerebro" difícil: *tool use* (decidir qué consultar), mapeo de datos sucios en español, razonamiento de reglas. Más confiable, se equivoca menos. |
| **Llama (open source)** | Llama 70B+ | **Hospedado** (Groq / Together / Fireworks) — **NO servidor propio con GPU** | Lo masivo y barato: chat casual, resúmenes cortos, clasificación. Groq es muy barato y rápido. |

**Estrategia híbrida:** Llama para alto volumen / tareas simples; Claude para lo difícil
y lo que no puede fallar. Como el backend es agnóstico, se mide y se ajusta.

> **Sobre Llama auto-hospedado:** rentar tu propia GPU 24/7 es caro y de mantenimiento —
> **descartado** para esta etapa. "Open source" no significa "gratis y fácil"; el camino
> barato para *intentar* Llama es vía un proveedor que lo corra por nosotros (Groq).

---

## 3. Fases de construcción (orden acordado)

| Fase | Qué se construye | Audiencia | Riesgo | Reusa |
|------|------------------|-----------|--------|-------|
| **0** | Backend agnóstico (Supabase Edge Function + secretos) | — | Bajo | cimiento de todo |
| **1** | **Chat interno "Asistente"** con acceso a datos reales (estatus, resúmenes, bitácora) vía *tool use* | Equipo (admin/PM/coordinador/instalador) | Bajo ✅ | Fase 0 |
| **2** | **Importación inteligente** — botón "Formatear con IA" para Excels sucios (mapea columnas arbitrarias al esquema; el humano revisa antes de importar) | PM | Bajo | Fase 0 |
| **3** | **Módulo CFE / Gestoría** — trámites ante CFE (UVIE, UIIE, RMU, interconexión, **medidor bidireccional**); al marcar que llegó el medidor → **alerta a Cobranza** ("ya se puede cobrar", hito 6.1). | Gestoría / PM / Coord | Medio | esquema + RLS |
| **3.5** 🔥 | **Módulo de Cobranza** — objetivo central del proyecto: subir la **efectividad de cobranza**. KPI principal = % de hitos cobrados. Agenda confirmada (hoy/próximos), enganche por cobrar (instalación terminada), restante+mensualidad (medidor instalado), morosos 1·2·3. **Correos automáticos a Cobranza** en los 3 hitos (Resend). | Cobranza / Admin | Medio | CFE + hitos |
| **4** | **Chat del cliente** + **Portal Cliente** con login y *scoping* estricto por RLS (el cliente solo ve su proyecto) | Cliente | Medio — requiere cuidado | Fase 0 + RLS |

> **🔥 PRIORITARIO — Integración API TOKU:** automatiza el estatus de cobro y los montos
> reales (hoy Cobranza usa flags/conteos; TOKU + Odoo lo vuelven real). Es la siguiente
> pieza grande tras el módulo de Cobranza.

> **Nota de motores (jun-2026):** para testear IAs sin gastar la cuenta personal de
> Claude, hoy el asistente usa **Llama y Qwen en Groq** (una sola llave). Claude queda
> reservado para reactivarse con cuenta de servicio dedicada.

**Notas clave de cada fase:**
- **El chat sin *tool use* alucina.** Para responder estatus *reales*, la IA llama
  herramientas tipo `consultarProyectos(...)` que traen el dato verdadero de Supabase.
- **Chat interno vs chat del cliente son dos productos.** El interno informa a gente que
  *ya* tiene acceso (riesgo bajo); el del cliente es la puerta de entrada de alguien
  *externo* → un error de scoping es una fuga de datos. Por eso el del cliente va al final
  y se apoya en RLS de Supabase.
- **La IA propone, el humano confirma.** En el import inteligente, la IA sugiere el mapeo;
  nada se escribe a la base sin visto bueno.

---

## 4. Camino a móvil — PWA hoy, app nativa mañana

**Sí se puede, y la arquitectura ya va hacia allá** (gracias al principio rector §0).

- **PWA — paso chico.** Se agrega un `manifest` + *service worker* (plugin de Vite). La
  app queda **instalable** en la pantalla de inicio, con soporte offline básico y push.
  No se reescribe nada. Se puede hacer ya como cimiento móvil.
- **App nativa (Android/iPhone) — vía Capacitor (recomendado).** Envuelve la app React
  actual en un contenedor nativo → tiendas (App Store / Play Store), cámara, firma y push
  nativos. **Reusa el código existente.** (Alternativa pesada: React Native — solo si algún
  día se quiere pulido extremo.)
- Como ya usamos **cámara y firma** en el reporte del instalador, Capacitor las da en
  versión nativa sin reescribir la lógica.

**Lo que se cuida desde ahora** (y ya casi todo se cumple): lógica en `api.js`/backend ·
IA y llaves server-side · Supabase como única fuente de verdad. Misma arquitectura sirve
para web, PWA y nativo.

---

## 5. Conexión con el roadmap de negocio (HANDOFF §13)

Esta hoja de IA habilita piezas del journey y de la mesa:
- **CFE → Cobranza:** cuando se marca que llegó el **medidor bidireccional** (hito 6.1),
  la IA redacta y enruta la alerta a Cobranza ("ya se puede cobrar"), y razona reglas
  (garantía vigente, monto correcto) antes de disparar a la **API de TOKU**.
- **Comunicación inter-departamental:** el chat interno reduce la coordinación informal por
  WhatsApp (objetivo central del HANDOFF).
- **Portal del Cliente (F4):** el chat del cliente (Fase 3) es el corazón de ese portal.

---

## 6. Checklist de arranque (Fase 0 + 1)

1. Crear **rama de respaldo** `backup/main-<fecha>` (checkpoint antes del milestone).
2. Crear la **Supabase Edge Function** agnóstica (`/ia`), con secretos
   `ANTHROPIC_API_KEY` y/o `GROQ_API_KEY` (en Supabase, **nunca** en el repo).
3. Definir las **herramientas de datos** (tool use) que la IA puede llamar, todas
   respetando RLS.
4. Front: sección **"💬 Asistente"** en el sidebar (chat interno).
5. (Opcional, recomendado) convertir el front en **PWA** de una vez.

> Las credenciales (llaves de Anthropic/Groq/Supabase) las pega Randall como secretos en
> Supabase/Vercel — **no van en el repo**.
