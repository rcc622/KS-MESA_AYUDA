# Retro v2 → Ejecutable — Módulo Instalaciones Domésticas
## Plataforma Mesa de Control · KENET Solar

> **Cómo usar:** pega este documento **después** del prompt V2 en Claude Code y di:
> *"Lee el prompt V2 + esta retro v2 y construye el módulo. Donde haya conflicto, manda la retro v2 (es más nueva). Prepáralo para subir a git."*
>
> Este documento solo contiene los **cambios sobre V2**. Todo lo que no se menciona aquí queda igual que en V2.

---

## 0. Cambios de esta ronda

| # | Tema | Cambio | Estado |
|---|---|---|---|
| 1 | Cortes de pago | 2 esquemas (externa / interna) con consecuencia económica por KPI | 🟡 Rediseño |
| 2 | Cuadrillas | Nueva entidad configurable por PM (tipo, zona, reglas, vueltas) | 🟢 Nuevo |
| 3 | Vueltas | Aclarado: dinero extra, solo externas, condicionado a config | 🟢 Aclarado |
| 4 | Import de datos | Multi-fuente: CSV/XLSX ahora · Sheets fase 2 · Odoo fase 3 | 🟢 Nuevo |
| 5 | Flujo del proyecto | Sin cambios (validado por el GO) | 🟢 OK |

---

## 1. Cortes de pago — rediseño (2 esquemas)

KENET maneja **dos esquemas de pago** para los equipos de instalación. Ambos tienen metas/KPIs; el incumplimiento tiene **consecuencia económica**, pero distinta según el esquema:

| Esquema | Quién | Consecuencia si NO cumple KPI |
|---|---|---|
| **Externa** | Cuadrillas contratistas | **Descuento directo al pago semanal** |
| **Interna** | Cuadrillas empleadas | **Afecta su KPI** (que puede ligarse a bonos $ — lógica aún no definida) |

**Regla de diseño:** no hardcodear ningún esquema. El esquema, los KPIs, las metas y la consecuencia se **configuran por cuadrilla** (ver §3). El corte de pago **lee la configuración de la cuadrilla** y aplica lo que corresponda.

**Para esta ejecución:**
- **Externa:** el corte calcula el pago base + vueltas − descuentos por KPI incumplido.
- **Interna:** el corte **registra** el cumplimiento de KPI por cuadrilla. El **cálculo del bono $ NO se construye** (no definido aún). Se deja la estructura lista y se marca como pregunta abierta (#10).

---

## 2. Vueltas — aclaración y alcance

**Qué es:** renglones de dinero extra (viáticos/traslados a zonas extendidas: Marín, Hidalgo, Montemorelos) que se suman al corte de un instalador. **No es la bitácora.** La bitácora es el log de auditoría del proyecto; las vueltas son dinero del corte.

**Alcance (confirmado y por confirmar):**
- Solo aplican a cuadrillas **externas**.
- Registro de que **sí se pagan:** Monterrey y Saltillo.
- **Monclova** (externa): no se sabe si se pagan extras → el PM **no activa** `aplica_vueltas` hasta definirlo.
- Por eso `aplica_vueltas` es un **switch configurable por cuadrilla** (§3), no una regla fija por zona.

---

## 3. Cuadrillas configurables por PM (modelo nuevo)

Cada PM de cada región configura sus equipos de instalación y las reglas que aplican a cada uno. Esto reemplaza el supuesto de "un instalador suelto por proyecto".

**Concepto clave para normalizar:** **todo equipo de ejecución es una cuadrilla**, sea interna o externa, de 1 o N personas. Un instalador externo individual = una cuadrilla de 1 miembro. Así el corte de pago siempre es **por cuadrilla**.

### 3.1 Tabla: `cuadrillas` (NUEVA)

```sql
id              uuid PK
nombre          text
tipo            text   -- 'externa' | 'interna'
zona            text   -- MTY, SLT, TRC, MVA
pm_id           uuid FK → usuarios          -- el PM que la administra
aplica_vueltas  bool DEFAULT false          -- switch configurable (true: externas MTY/SLT)
esquema_pago    text   -- 'por_instalacion' | 'por_panel' | 'salario_bono' | 'otro'
activa          bool DEFAULT true
created_at      timestamptz
```

### 3.2 Tabla: `reglas_cuadrilla` (NUEVA)

KPIs, metas y consecuencia económica que el PM define por cuadrilla.

```sql
id              uuid PK
cuadrilla_id    uuid FK → cuadrillas
kpi             text     -- ej. 'instalaciones_a_tiempo', 'reportes_completos', 'sin_correcciones'
meta            numeric  -- target del KPI
consecuencia    text     -- 'descuento_pago' (externa) | 'afecta_kpi_bono' (interna)
valor           numeric  -- monto $ o % del descuento (externa) · peso del KPI en bono (interna)
activa          bool DEFAULT true
created_at      timestamptz
```

> **Lógica de consecuencia:**
> - `descuento_pago` (externa): si la cuadrilla no llega a `meta`, el corte resta `valor` (monto o %) del pago semanal.
> - `afecta_kpi_bono` (interna): el corte **registra** cumplido/no cumplido. El cálculo del bono $ es **fase futura** (pregunta #10). No construir ahora.

---

## 4. Import de datos — multi-fuente

Dar **opción de fuente** en vez de amarrarse a un solo formato. Misma lógica de upsert por `folio_odoo` para todas.

| Fase | Fuente | Estado en esta ejecución |
|---|---|---|
| **1** | CSV | **Construir ahora** (sin credenciales externas) |
| **1** | XLSX | **Construir ahora** (sin credenciales externas) |
| **2** | Google Sheets (API) | Dejar adaptador listo (stub). Buen primer auto-import; requiere OAuth → fase aparte |
| **3** | Odoo (API) | Dejar adaptador listo (stub). Ideal, pero la dinámica en Odoo no está definida todavía |

**Patrón:** una interfaz `ImportAdapter` con un método común (`parse → normaliza → upsert por folio_odoo → bitácora 'import'`). Implementaciones: `CsvAdapter`, `XlsxAdapter` (ahora); `GoogleSheetsAdapter`, `OdooAdapter` (stubs para fase 2/3).

**Por qué Sheets/Odoo no entran al primer commit:** requieren credenciales/API keys que **no deben subirse a git**. Se construyen cuando se definan las conexiones y se manejen los secretos por `.env`.

---

## 5. Qué son las "preguntas abiertas" (aclaración)

Son **decisiones pendientes** que faltan resolver con el equipo. **No son features a construir.** En el documento están marcadas:
- 🔴 **bloquean** una decisión de diseño (hay que resolverlas antes o durante el build; mientras tanto, placeholder).
- 🟡 **detalle** ajustable en una segunda iteración.

Construye todo lo que no dependa de ellas y deja placeholder donde sí.

---

## 6. Delta al modelo de datos (para Code)

**Tablas nuevas:** `cuadrillas`, `reglas_cuadrilla` (§3).

**`proyectos`**
```sql
+ cuadrilla_id   uuid FK → cuadrillas   -- la cuadrilla que ejecuta (nullable hasta asignación)
```
> `instalador_id` se conserva para el reporte mobile (la persona que llena el reporte). `cuadrilla_id` es la unidad de pago/configuración.

**`cortes_pago`** (ajuste vs V2)
```sql
cuadrilla_id    uuid FK → cuadrillas   -- el corte es por cuadrilla (no por instalador individual)
esquema         text                   -- copiado de la cuadrilla al cerrar: 'externa' | 'interna'
descuentos      numeric(10,2) DEFAULT 0 -- suma de descuentos por KPI incumplido (externa)
-- total final = base + vueltas − descuentos
```
> Un instalador externo individual se modela como cuadrilla de 1 miembro; así `cortes_pago` siempre apunta a `cuadrilla_id`.

**`vueltas`** (sin cambios de esquema)
- Solo se permiten capturar si la cuadrilla del corte tiene `aplica_vueltas = true`.

---

## 7. Vistas afectadas

- **Vista I — Cortes de pago:** ahora distingue esquema **externa** (muestra base + vueltas − descuentos por KPI) vs **interna** (muestra cumplimiento de KPI; sin cálculo de bono por ahora).
- **Vista E — Importación:** agregar **selector de fuente** (CSV / XLSX activos; Sheets / Odoo deshabilitados con etiqueta "próximamente").
- **Vista L — Configuración de cuadrillas (NUEVA, rol: pm_domestico):** el PM crea/edita sus cuadrillas, define tipo, zona, `aplica_vueltas` y sus `reglas_cuadrilla` (KPI, meta, consecuencia, valor).

---

## 8. Preguntas abiertas nuevas

Se agregan a las 7 del prompt V2.

| # | Pregunta | Impacto | Estado |
|---|---|---|---|
| 8 | ¿Torreón es la única zona con cuadrillas **internas**? ¿Cómo queda el mapa zona ↔ tipo de cuadrilla? | 🟡 Config inicial de cuadrillas | Abierto |
| 9 | ¿En **Monclova** (externa) se pagan vueltas? | 🟡 Switch `aplica_vueltas` de esa cuadrilla | Abierto |
| 10 | Esquema de **bonos para cuadrillas internas**: ¿cómo se calcula el $ a partir del KPI? | 🔴 Bloquea el cálculo de bono interno (por ahora solo se registra) | Abierto |
| 11 | **KPIs y metas exactos** por cuadrilla y su consecuencia (externa: monto/% de descuento) | 🟡 Llena `reglas_cuadrilla` | Abierto |
| 12 | Sync con **Odoo para estado de pago** (anticipo/cobrado/liquidado): ¿webhook o polling? ¿cada cuánto? | 🟡 Define cómo se escriben `instalado_cobrado/liquidado` y `anticipo_pagado` | Abierto |

---

## 9. Orden de ejecución para Code + git

### Construir ahora (MVP de este commit)
1. Esquema completo en Supabase: tablas de V2 + `cuadrillas` + `reglas_cuadrilla` + deltas de §6. **RLS activo** en todas.
2. Import **CSV y XLSX** con upsert por `folio_odoo` (interfaz `ImportAdapter` + 2 implementaciones).
3. Flujo del proyecto completo (PMD-P1 / PMD-P2), igual que V2 (validado).
4. Vistas críticas: A (agendar/SLA), C (detalle + bitácora), D (reagendados), E (import con selector), F (reporte mobile), I (cortes con 2 esquemas), L (config cuadrillas).
5. Corte de pago con esquema externa (base + vueltas − descuentos) y registro de KPI interna.

### Dejar como stub / fase 2-3
- `GoogleSheetsAdapter` y `OdooAdapter` (estructura lista, sin credenciales).
- Cálculo de bono interno (espera pregunta #10).
- Sync Odoo de estado de pago (espera pregunta #12).
- Vistas no críticas: B, G, H, J, K.

### Git (guía, ejecútala tú en tu entorno)
- `.gitignore` debe incluir: `node_modules/`, `.next/`, `.env*`, cualquier archivo de credenciales (Supabase service key, futuras keys de Sheets/Odoo). **Nunca subir secretos.**
- Variables sensibles (URL y keys de Supabase) por `.env.local`, fuera del repo. En el repo solo `.env.example` con nombres de variables vacíos.
- Commits sugeridos por capa: `schema + RLS` → `import csv/xlsx` → `flujo proyecto` → `cortes + cuadrillas` → `vistas`.
- Estructura sugerida: `/app` (rutas Next), `/lib` (supabase client, import adapters), `/components`, `/sql` (migraciones).

---

## 10. Lo que NO cambió (sigue de V2)

Regla de oro Odoo (dinero/materiales se leen, no se capturan) · folio_odoo como llave · agenda 100% manual · bitácora inmutable separada de la agenda · catálogo de estatus simplificado · protocolos de cancelación post-levantamiento y fork de incompleta · semáforo SLA 18 días · roles base · alcance fuera del módulo.
