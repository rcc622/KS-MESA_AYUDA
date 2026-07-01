# 📋 Pendientes — Mesa de Control · KENET Solar

> Tablero vivo de pendientes. **Léelo al iniciar** (junto con `docs/ESTATUS.md`).
> Cuando termines algo, muévelo a "✅ Hecho" con la fecha (no lo borres).
> Actualizado: 2026-07-01.

---

## 👷 Pendientes de PABLO — todas las integraciones de API

**Acceso:** Pablo ya tiene **Google Cloud** (vía `ventasmty2@kenetsolar.com`). **Falta
invitarlo a Supabase** (Organización → Team → Members) para poder poner secretos y
desplegar Edge Functions. Sin eso no puede desplegar `gcal-auth`/`notificar`/`drive-upload`.

### 1. 🔥 API TOKU — PRIORIDAD
Integrar la API de **TOKU** para automatizar el estatus de cobro y los montos reales
(hoy el módulo de Cobranza usa flags manuales + conteos). Requiere credenciales y doc de
la API de TOKU. Es la pieza grande que vuelve "real" a Cobranza (junto con Odoo).

### 2. Terminar correos de notificación (vía GMAIL)
Resend quedó **bloqueado** porque el DNS de `kenetsolar.com` está en Wix (no soporta MX
en subdominios). **El código ya soporta el proveedor `gmail`.** Pasos:
- Google Cloud: agregar el scope `gmail.send` a la pantalla de consentimiento OAuth.
- **Redeploy `gcal-auth`** (ya trae el scope en el código).
- **Reconectar Google** con la cuenta que enviará (ej. `automatizaciones@kenetsolar.com`).
- Secretos: `NOTIFY_PROVIDER=gmail`, `NOTIFY_GMAIL_EMAIL`, `NOTIFY_FROM`, `COBRANZA_EMAILS`.
- **Redeploy `notificar`.**
- Detalle: `instalaciones-dom/supabase/functions/notificar/README.md`.

### 3. API de Google Drive (evidencias · Opción A)
Subir evidencias a Drive sin llave JSON (OAuth). Código listo. Pasos:
- Habilitar **Google Drive API** + scope `drive.file` en el consent.
- **Redeploy `gcal-auth`**, **deploy `drive-upload`**.
- Reconectar Google + secreto `DRIVE_OWNER_EMAIL` (opcional `DRIVE_FOLDER_ID`).
- Detalle: `instalaciones-dom/supabase/functions/drive-upload/README.md`.

### 4. Resto de integraciones de API
Google Calendar (ya operativo) y lo que surja quedan bajo su responsabilidad.

### 5. Subir carpetas de conocimiento de procesos al repo
De Drive → repo, en **`BASES/Procesos/`**:
- **Words (.docx) → Markdown con `markitdown`** (`Tools/markitdown/`). Legibles, versionables
  y cargables como contexto para la IA.
- **Diagramas de flujo (.svg) → subir tal cual** (GitHub los renderiza; no pasan por markitdown).

---

## 🧑‍💼 Pendientes de RANDALL

1. **Documentar el proceso de cobro** (para modelar bien Cobranza).
2. **Establecer criterios de morosos (1 · 2 · 3)** → pasárselos a Claude para construir esa
   sección del módulo de Cobranza (hoy es un marcador).
3. **Probar funcionalidades del módulo de Cobranza** (KPIs, agenda confirmada, marcar cobrado).
4. **Probar el linkeo de data en tiempo real** (avisos, cancelaciones, actualización de agenda,
   reflejo entre módulos, etc.).
5. **Seguimiento a los pendientes de Pablo.**
6. (Rápido) Correr `sql/migracion_cfe_tipos.sql` si aún no se ha corrido (tipos CFE nuevos).

---

## ✅ Hecho (referencia)
- Módulo de Cobranza (KPI efectividad, agenda confirmada, hitos por cobrar) — 2026-07-01.
- Correos a Cobranza (Resend) probados a correo propio — 2026-07-01.
- Import inteligente, filtros/borrado, CFE con flujo instalación→CFE — 2026-06/07.
