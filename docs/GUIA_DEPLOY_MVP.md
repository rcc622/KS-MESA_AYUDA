# Guía de Deploy — MVP Mesa de Ayuda (Piloto R2)

**Tiempo total: ~30 minutos. Costo: $0 (free tiers).**

Contenido de esta carpeta:

| Archivo | Qué es |
|---|---|
| `01_schema.sql` | Estructura de la base: etapas (CJ v9), clientes, eventos, bitácora automática, RLS |
| `02_seed.sql` | 430 clientes reales de R2 (126 activos + 304 histórico) extraídos de PENDIENTE INSTALACIONES.xlsx |
| `index.html` | La app completa (login + journey + tablero GO + bitácora) |
| `GUIA_DEPLOY_MVP.md` | Esta guía |

---

## Paso 1 — Crear proyecto en Supabase (10 min)

1. Ir a https://supabase.com → **Start your project** → crear cuenta (con tu Google o GitHub).
2. **New project**:
   - Organization: la tuya
   - Name: `kenet-mesa-ayuda`
   - Database password: genera una y **guárdala en tu gestor de contraseñas**
   - Region: `East US (North Virginia)` (la más cercana a MX)
   - Plan: **Free**
3. Esperar ~2 min a que el proyecto aprovisione.

## Paso 2 — Crear la base de datos (5 min)

1. En el menú izquierdo: **SQL Editor** → **New query**.
2. Abrir `01_schema.sql` (con Bloc de notas), copiar TODO, pegar y **Run**. Debe decir `Success. No rows returned`.
3. Nueva query: copiar TODO `02_seed.sql`, pegar y **Run**. Debe insertar 430 filas.
4. Verificar: menú **Table Editor** → tabla `clientes` → deben verse los clientes reales.

## Paso 3 — Configurar el acceso (5 min)

1. Menú **Authentication** → **Sign In / Up** → dejar habilitado **Email** (magic link viene activo por default).
2. **IMPORTANTE — cerrar el registro público:** Authentication → Sign In / Up → **desactivar "Allow new users to sign up"**. Así solo entran usuarios que TÚ crees.
3. Crear los usuarios del piloto: Authentication → **Users** → **Add user** → **Create new user**:
   - Tu correo
   - El de Lesly
   - Controlador CS y líderes R2 (5-8 máx)
   - En cada uno: marca **Auto Confirm User**

## Paso 4 — Conectar la app (3 min)

1. En Supabase: **Settings → API Keys**. Copiar:
   - **Project URL** (ej. `https://abcdefgh.supabase.co`)
   - **anon public** key
2. Abrir `index.html` con Bloc de notas. En las primeras líneas pegar ambos valores:
   ```js
   const SUPABASE_URL = "https://abcdefgh.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ...";
   ```
3. Guardar.

> La anon key es pública por diseño — la seguridad real la pone RLS (solo usuarios autenticados leen/escriben) + registro cerrado.

## Paso 5 — Publicar la app (5 min)

Opción más simple — **Netlify Drop**:

1. Ir a https://app.netlify.com/drop (crear cuenta gratis si pide).
2. Arrastrar el archivo `index.html` (o la carpeta) a la zona de drop.
3. Te da una URL tipo `https://random-name.netlify.app`. En **Site settings → Change site name** ponle: `kenet-mesa-r2`.
4. **Volver a Supabase**: Authentication → **URL Configuration** → en **Site URL** pegar `https://kenet-mesa-r2.netlify.app` y agregarla también en **Redirect URLs**. (Sin esto, la liga del correo de login no regresa a la app.)

## Paso 6 — Probar (2 min)

1. Abrir la URL → escribir tu correo → **Enviarme liga de acceso**.
2. Abrir el correo (revisar spam la primera vez) → clic en la liga → entras a la app.
3. Checklist de prueba:
   - [ ] Se ven los 126 clientes activos R2
   - [ ] Filtro TRC / MVA funciona
   - [ ] Clic en un cliente → cambiar etapa → Guardar → el contador de días se reinicia
   - [ ] Pestaña Bitácora → aparece tu cambio con tu correo
   - [ ] Pestaña Tablero GO → conteos por etapa

---

## Arranque del piloto con Lesly (semana 1)

1. **Sesión de 30 min con Lesly:** mostrarle la app, su primera tarea = validar etapas (filtro "Solo por validar"). Cada cliente que valida deja de mostrar el sello VALIDAR.
2. **Regla del piloto:** todo cambio de etapa se registra AQUÍ, ya no en el Excel. El Excel queda congelado como respaldo (solo lectura).
3. **Comité semanal:** se corre sobre la pestaña Tablero GO, no sobre Excel.

## Criterio de éxito (4 semanas)

| Métrica | Meta |
|---|---|
| Eventos capturados en plataforma (vs Excel/WhatsApp) | >80% |
| PENDIENTE INSTALACIONES.xlsx | Congelado, sin ediciones nuevas |
| Tiempo de captura por evento | <60 segundos |
| Comité semanal sobre el Tablero GO | 4 de 4 semanas |

Si pasa → F3 (Toku API + tickets + BSC feed + migrar a Next.js).
Si no pasa → diagnóstico con los datos de la bitácora (qué área no capturó y por qué).

## Problemas comunes

| Síntoma | Causa / Fix |
|---|---|
| La liga del correo no abre la app | Falta la URL de Netlify en Supabase → Authentication → URL Configuration |
| "Error: signups not allowed" | Correcto — el usuario no existe. Créalo en Authentication → Users |
| No carga datos tras login | Las credenciales en index.html mal pegadas (URL o anon key) |
| Cambié algo en index.html | Re-arrastrar a Netlify Drop (Deploys → drag & drop) — 10 segundos |

## Qué NO hace este MVP (a propósito)

Tickets P1-P4, Farmer, portal cliente, lectura Toku, feed al BSC, roles por área. Todo eso es F3+ — el MVP testea UNA cosa: ¿el equipo captura el journey en plataforma en vez de Excel/WhatsApp?
