# 🛠️ Guía de Desarrollo y Pruebas — Mesa de Control · KENET Solar

> **Para qué sirve:** es nuestro **copiloto de desarrollo** — junto con la IA. Da retro de
> cómo vamos, cómo correr y **probar cada módulo**, y qué está **roto o pendiente**.
> Es un documento **vivo**: actualízalo conforme avances.
>
> Documentos hermanos: el **último estatus** cronológico está en `docs/ESTATUS.md`;
> el **protocolo de trabajo** (qué hacer al iniciar/cerrar sesión) en `CLAUDE.md`.

---

## 1. Cómo correr y desplegar

### Front (la app)
```bash
cd instalaciones-dom
npm install
npm run dev        # http://localhost:5173
npm run build      # verifica que compile antes de subir
```
`.env.local` (no se sube) necesita:
```
VITE_SUPABASE_URL=https://XXXX.supabase.co
VITE_SUPABASE_ANON_KEY=...
```
**Despliegue:** cada push a `main` redepliega en **Vercel** automáticamente.

### Backend de IA (Supabase Edge Function)
No se despliega con el front. Tras editar `instalaciones-dom/supabase/functions/ia/`:
```bash
supabase functions deploy ia
```
O desde el dashboard de Supabase → Edge Functions → `ia` → Editor. Las llaves van en
**Secrets** (`ANTHROPIC_API_KEY`, `GROQ_API_KEY`), nunca en el repo.
Detalle: `instalaciones-dom/supabase/functions/ia/README.md`.

---

## 2. Mapa de módulos y vistas

| Vista (archivo) | Qué hace | Quién la ve |
|---|---|---|
| `VistaPanel` | Mesa de Control: KPIs, despacho, respaldo general | admin/PM/coord |
| `VistaA_Agenda` | Alta de proyectos, filtros, SLA | admin/PM/coord |
| `VistaC_Detalle` | Editar, **agendar**, **reagendar**, bitácora, maps | admin/PM/coord |
| `VistaD_Reagendados` | Lista de reagendados | admin/PM/coord |
| `VistaE_Import` | Importar XLSX/CSV con plantilla | admin/PM |
| `VistaF_Reporte` | Instalador: mis instalaciones, reporte (fotos/firma/PDF) | instalador |
| `VistaArchivo` | Histórico de completadas (mes → semana) | todos |
| `VistaLog` | Log global de movimientos (bitácora de todos) | admin/PM/coord |
| `VistaI_Cortes` | Cortes de pago | admin/PM/coord |
| `VistaL_Cuadrillas` | Config de cuadrillas + reglas KPI | admin/PM/coord |
| `VistaG_Usuarios` | Gestión de usuarios | admin |
| `VistaAsistente` + `AsistenteFlotante` | Chat IA (datos reales) | todos |

Roles: `admin` · `pm_domestico` · `instalador` · `coordinador`. La matriz de qué vista
ve cada rol está en `vistasPorRol()` dentro de `instalaciones-dom/src/App.jsx`.

---

## 3. ✅ Checklist de pruebas (QA) por módulo

Marca lo que pruebes. Si algo falla, anótalo en **§4 Problemas conocidos**.

### Acceso y roles
- [ ] Login con cada rol (admin, PM, instalador) entra a la vista correcta.
- [ ] El instalador **solo** ve "Mis instalaciones", "Historial" y "Asistente".
- [ ] Cerrar sesión funciona y es visible en móvil.

### Mesa de Control (admin)
- [ ] Los KPIs cuadran con la cantidad real de proyectos.
- [ ] "Respaldo general" descarga el JSON (y sube a Storage si el bucket existe).
- [ ] Accesos rápidos navegan a la sección correcta.

### Agenda / Detalle
- [ ] Alta de proyecto nuevo guarda sin error (incluye link de Google Maps).
- [ ] "Agendar fecha" deja el estatus en **agendado** (no en progreso).
- [ ] "Reagendar" abre el modal (factor interno/externo + motivo) y aplica el SLA.
- [ ] La bitácora registra cada movimiento.

### Importación
- [ ] "Descargar plantilla (.xlsx)" baja el archivo correcto.
- [ ] Subir el archivo lleno muestra previsualización con válidas/errores.
- [ ] Importar crea/actualiza por **folio** (sin duplicar) y respeta ñ/acentos.

### Instalador (reporte)
- [ ] "Iniciar instalación" solo se habilita con fecha confirmada y día llegado.
- [ ] Captura de **fotos** reales funciona (varias).
- [ ] **Firma** del cliente funciona en táctil.
- [ ] Genera **PDF** y permite **compartir por WhatsApp**.
- [ ] Al enviar, la instalación pasa a **completada** y aparece en Historial.

### Asistente IA
- [ ] La **burbuja flotante** aparece en todas las pantallas (no en la vista Asistente).
- [ ] Con el motor que tenga llave, *"¿cómo vamos en general?"* responde números reales.
- [ ] Muestra "🔎 consultó: …" (señal de que usó datos reales, no inventó).
- [ ] Pedir crear/editar → responde que eso se hace en la sección (solo lectura).

### Móvil (iPhone)
- [ ] Ninguna pantalla tiene scroll horizontal (todo cabe).
- [ ] La burbuja del chat sube como hoja y no tapa el botón de enviar.

---

## 4. 🐞 Problemas conocidos / pendientes

> Formato: `[ESTADO] descripción — (quién/cómo)`. ESTADO: ABIERTO / EN PROGRESO / RESUELTO.

- [RESUELTO 2026-06-30] Motor **Claude** se quitó de la plataforma (para no gastar la
  cuenta personal de Claude). Hoy solo Llama y Qwen, ambos en Groq con una sola llave.
- [RESUELTO 2026-06-30] La vista completa del Asistente ya **recuerda el motor** elegido
  (localStorage), igual que la burbuja flotante.
- [NOTA] El build avisa que un chunk pesa >500 kB (xlsx/html2canvas). No rompe nada;
  a futuro se puede dividir con `import()` dinámico.
- [RESUELTO 2026-06-30] Los 2 errores **rules-of-hooks** de `VistaG_Usuarios.jsx` se
  arreglaron (el guard de "solo admins" ahora va después de los hooks). Quedan unos
  warnings menores (escapes/`catch` sin usar) en `VistaE_Import.jsx`/`VistaF_Reporte.jsx`,
  no críticos.
- [MANEJADO] Motor **Llama** puede dar 429 (Groq plan gratis: 12k tokens/min). La Edge
  Function ahora **reintenta 1 vez** y, si persiste, muestra mensaje claro ("espera ~30s
  o cambia a Claude"). Para uso pesado: poner llave de Claude o subir Groq a Dev Tier.
  *(Requiere redeplegar la función `ia` para tomar el cambio.)*

*(Cuando arregles algo, muévelo a RESUELTO con la fecha, no lo borres.)*

---

## 5. Cómo trabajar con la IA (Claude) en este repo

- **Al iniciar**, la IA debe leer `docs/ESTATUS.md` y darte el informe del último avance
  (está mandado en `CLAUDE.md`). Si no lo hace, pídeselo: *"dame el último estatus"*.
- **Carga contexto de negocio** con `BASES/` cuando la duda sea del "porqué".
- **Antes de un milestone**, la IA respalda en una rama `backup/main-<fecha>`.
- **Al cerrar**, la IA escribe la entrada nueva en `docs/ESTATUS.md` y hace push.
- La IA **no** debe quitar seguridad ni meter llaves al repo (ver `CLAUDE.md` §4).

---

## 6. Convenciones rápidas
- Español MX en todo lo visible. Bitácora **inmutable**. El dinero **se lee** (Odoo).
- Producción en **Vercel** (push a `main` redepliega). Backend IA en **Supabase**.
- Respaldo antes de cambios grandes. Llaves/credenciales **fuera del repo**.
