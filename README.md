# Mesa de Control · KENET Solar — Módulo Instalaciones Domésticas

Plataforma operativa para gestionar el post-venta de instalaciones solares de KENET:
agenda y despacho de instalaciones, cuadrillas, reportes de campo del instalador,
cortes de pago, bitácora antifraude y tablero de control. Web app **mobile-first**.

> El proyecto **vivo** está en la rama **`main`**, dentro de la carpeta
> **`instalaciones-dom/`**. Otras ramas (`claude/pensive-hawking…`, `prueba`, etc.)
> son versiones viejas del MVP — ignóralas.

---

## 📁 Estructura del repo (main)

```
.
├─ instalaciones-dom/     ← LA APP (Vite + React + Supabase). Aquí vive todo el código.
├─ BASES/                 ← Documentos fuente de verdad del proyecto (contexto de negocio)
├─ Tools/                 ← Guías de herramientas de apoyo (opcionales, por dev)
├─ docs/                  ← Retro/handoff ejecutable del módulo
└─ README.md              ← este archivo
```

---

## 🚀 La app — `instalaciones-dom/`

**Stack:** Vite + React 19 + Supabase (Postgres + Auth + Storage). PDF con jsPDF.
**Hosting:** Vercel (produción) · **Root Directory** del proyecto en Vercel = `instalaciones-dom`.

### Correr en local
```bash
cd instalaciones-dom
npm install
npm run dev        # http://localhost:5173
```
Crea un `.env.local` (no se sube al repo) con:
```
VITE_SUPABASE_URL=https://XXXX.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...   # o el anon key
```

### Estructura de `instalaciones-dom/src`
```
App.jsx                 ← layout, auth, ruteo por vista, módulos y roles
components/             ← Sidebar, Icon (SVG), Modal, badges, FirmaCanvas
views/
  VistaPanel.jsx        ← Mesa de Control (tablero admin: KPIs, despacho, respaldo)
  VistaA_Agenda.jsx     ← Agenda e instalaciones (alta, filtros, SLA)
  VistaC_Detalle.jsx    ← Detalle del proyecto (editar, agendar, reagendar, bitácora)
  VistaD_Reagendados.jsx← Reagendados
  VistaE_Import.jsx     ← Importar proyectos (CSV/XLSX)
  VistaF_Reporte.jsx    ← Instalador: mis instalaciones + reporte (checklist, fotos, firma, PDF)
  VistaI_Cortes.jsx     ← Cortes de pago
  VistaL_Cuadrillas.jsx ← Configuración de cuadrillas + reglas KPI
  VistaArchivo.jsx      ← Histórico de completadas (mes → semana)
  VistaLog.jsx          ← Log global de movimientos (bitácora de todos los proyectos)
lib/
  supabase.js           ← cliente Supabase
  api.js                ← todas las consultas (proyectos, cuadrillas, bitácora, storage…)
```

### Roles y módulos
- **Roles** (`usuarios.rol`): `admin` · `pm_domestico` · `instalador` · `coordinador`.
- **Switcher de módulos** (sidebar): *Mesa de Control* e *Instalaciones Domésticas* activos;
  *CFE/Gestoría, Soporte, Portal Cliente* marcados "Pronto".
- El **instalador** solo ve su módulo de campo (*Mis instalaciones* + *Historial*).

---

## 🗄️ Base de datos (Supabase)

Corre en **Supabase → SQL Editor**, en este orden:

1. `instalaciones-dom/sql/schema.sql` — esquema base (tablas + RLS).
2. `instalaciones-dom/sql/migracion_completa.sql` — agrega todas las columnas que la app
   espera (equipo, reagende, responsable, maps_url). **Idempotente** — córrela siempre que
   algo dé "columna no encontrada".
3. `instalaciones-dom/sql/usuarios_roster.sql` — alta declarativa de usuarios + logins.
4. (opcional) `instalaciones-dom/sql/seed_pruebas.sql` — datos de prueba variados.

**Storage:** crea 2 buckets privados y sus policies:
- `evidencias` — fotos y PDF de reportes del instalador.
- `respaldos` — respaldo general (JSON) que exporta el admin.

> Las credenciales (URL/keys de Supabase, Vercel, etc.) **no van en el repo** — se
> comparten por separado.

---

## 📚 BASES/ y Tools/

- **`BASES/`** — documentos de contexto/diseño (HANDOFF maestro, arquitectura del Trouble
  Ticket System, presentación de la dinámica). Cárgalos como contexto al inicio de un chat
  con Claude. Ver `BASES/README.md`.
- **`Tools/`** — guías de herramientas opcionales que cada quien instala en su entorno
  (ponytail/caveman para tokens, markitdown para convertir docs a Markdown).

---

## 🔒 Convenciones

- Todo en **español MX**. Catálogos cerrados (zona, estatus, roles).
- La **bitácora es inmutable** (append-only) — es el log antifraude.
- El **dinero se lee, no se teclea** (Odoo es la fuente financiera; aquí solo se lee).
- Producción en **Vercel**; cada push a `main` redepliega.
- Antes de un cambio grande se crea una rama `backup/main-<fecha>` como checkpoint.
