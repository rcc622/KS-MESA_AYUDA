# Cobranza — Política de morosidad y reparto de responsabilidades

> Fuente: junta con Cobranza y Anahí (jul-2026) + política de pagos KENET.
> Sirve como base para: el **módulo de Cobranza** (clasificación de morosos) y para
> proyectar cómo cambian las responsabilidades **con TOKU**.

---

## 1. Política de pagos y morosidad (criterios oficiales)

- **Ventana de pago:** prórroga del **día 1 al 15** de cada mes para pagar la mensualidad.
- **Moroso 1:** a partir del **día 11** (1er mes de incumplimiento) → se aplica **pena
  convencional de $500 MXN** y se clasifica como **Moroso 1** (del día 11 al último día del mes).
- **Moroso 2:** si no se salda dentro del mes vigente y **cambia de mes** (2do mes de
  incumplimiento) → **Moroso 2**.
- **Moroso 3:** si sigue sin saldar al **3er mes** de incumplimiento → **Moroso 3**.
- **Cobranza judicial:** a partir del **inicio del 4to mes** de atraso, el caso se **turna a
  cobranza judicial**.

> Para que el módulo clasifique morosos necesita los **datos de pago** (fecha de vencimiento,
> mensualidad pagada/no, montos). Esos **se leen de Odoo / TOKU** (no se teclean). Hasta tener
> TOKU, la sección de morosos queda como marcador; con TOKU se enciende automática.

---

## 2. Reparto de responsabilidades HOY (manual)

(Según la matriz de la junta — tareas × responsable.)

| Tarea | Responsable(s) | Qué hace hoy (manual) |
|---|---|---|
| **Estados de cuenta (EdC)** | Anahí / Jenny | Arman y envían los estados de cuenta a mano. |
| **Morosos 1** (día 11–fin de mes) | Irene | Identifica, aplica la pena de $500, contacta al cliente. |
| **Morosos 2** (2do mes) | Cobranza | Escala el seguimiento / procede según protocolo. |
| **Morosos 3** (3er mes) | Irene | Seguimiento intensivo antes de judicial. |
| **Cobranza judicial** (4to mes) | Legal / turnado | Se traslada el caso a cobranza judicial. |
| **Facturación fiscal** | Irene | Emite facturas manualmente. |

*(Nombres/acciones exactas se afinan con Randall; algunos campos de la tabla original no se
leyeron completos.)*

---

## 3. Cómo quedarían las responsabilidades CON TOKU al 100%

**Idea central:** TOKU (pagos sobre Odoo) automatiza el **cobro, los recordatorios, la
conciliación y la clasificación**. El equipo de Cobranza deja de ser **ejecutor operativo**
del día a día y pasa a **supervisar excepciones y casos difíciles**.

### Qué se automatiza
- **Cobro:** TOKU realiza el cargo / genera el link de pago recurrente. Se elimina el
  "perseguir el pago" manual.
- **Recordatorios de pago:** automáticos (correo / **WhatsApp** con plantillas) antes y
  durante el vencimiento. Ya no se mandan uno por uno.
- **Estados de cuenta (EdC):** se generan y envían solos desde TOKU/Odoo.
- **Clasificación de morosos (1·2·3):** automática, por fechas y estatus de pago. La
  **pena de $500** se aplica sola al día 11.
- **Cobranza judicial:** el caso se **marca automáticamente** al iniciar el 4to mes; el equipo
  solo actúa sobre los pocos casos escalados.
- **Facturación fiscal:** automática si se integra la facturación (queda validar, no emitir).

### Quién se descarga (menos trabajo día a día)
- **Anahí / Jenny:** dejan de **armar EdC** a mano → rol de **supervisión** y atención a
  cuentas clave.
- **Irene:** deja el **rastreo manual de morosos** y la **facturación repetitiva** → pasa a
  **gestión de excepciones** (pagos fallidos, disputas) y casos judiciales.

### A qué se dedica el equipo (valor agregado)
- **Excepciones:** pagos que fallan, disputas, aclaraciones, clientes difíciles.
- **Cobranza judicial:** los pocos casos que sí escalan.
- **Relación con clientes clave** y negociación de convenios.
- **Análisis del KPI de efectividad de cobranza** (mejorar la estrategia, no ejecutar tareas).

### Resultado (neto)
- **Menos horas** en tareas repetitivas (EdC, recordatorios, clasificación, facturación).
- Cobranza se vuelve **por excepción**: el sistema hace el 90% y las personas atienden el 10%
  que requiere criterio humano.
- Se puede **crecer la cartera sin crecer el equipo** en la misma proporción.

> **Nota:** este reparto post-TOKU es una **proyección** basada en cómo funciona la
> automatización de pagos + el proceso descrito. El detalle final depende de las capacidades
> de TOKU que se configuren y de lo que Odoo exponga por API.

---

## 4. Contrato de datos para TOKU (para la integración de Pablo)

El **módulo de Cobranza ya está listo** para mostrar morosos; solo necesita que la
integración de TOKU/Odoo **actualice estos campos en `proyectos`** (migración
`sql/migracion_cobranza.sql`). La clasificación en la UI se hace sola a partir de `meses_atraso`.

| Campo (`proyectos`) | Tipo | Qué pone TOKU/Odoo |
|---|---|---|
| `meses_atraso` | int | Nº de mensualidades vencidas sin pagar (0=al corriente). **Rige la clasificación:** 1→M1, 2→M2, 3→M3, 4+→judicial. |
| `saldo_vencido` | numeric | Monto vencido total. |
| `pena_convencional` | numeric | Pena acumulada ($500 desde el día 11 del 1er mes). |
| `proxima_fecha_pago` | date | Próximo vencimiento. |
| `cobranza_actualizada_en` | timestamptz | Cuándo TOKU actualizó (auditoría). |
| (existentes) `instalado_cobrado`, `medidor_pagado`, `anticipo_pagado` | bool | Hitos de cobro (enganche / restante / anticipo). |

**Flujo esperado:** TOKU/Odoo → (webhook o job) → escribe estos campos por proyecto
(match por `folio_odoo` = OV de Odoo `S#####`, que es la llave financiera). El front lee y
clasifica. Ningún monto se teclea en la plataforma.
