# PREGUNTAS_NEGOCIO.md — Buzón de reglas pendientes

> Protocolo (CLAUDE.md): si una regla de negocio NO está en `CONTEXTO_NEGOCIO.md`, no se inventa.
> Se anota aquí, se continúa con lo que SÍ está definido (o se marca TODO), y GO (Randall)
> responde actualizando `CONTEXTO_NEGOCIO.md`. Formato: cada pregunta tiene contexto,
> qué se hizo provisionalmente, y qué falta confirmar.

---

## Abiertas — Módulo Instalaciones (prototipo "KENET Desktop")

El prototipo designado por dirección como la UI buena introduce conceptos que **extienden o rozan**
reglas firmes del `CONTEXTO_NEGOCIO.md`. Se implementaron fieles al prototipo pero quedan marcados
como **PENDIENTE DE VALIDAR**. Ninguno bloquea el piloto.

### P1 — CLT (Coeficiente de Lead Time) vs modelo OLA del journey
- **Contexto:** el prototipo mide cada instalación con **CLT = LT actual / LT máximo** (umbrales
  <1.0 verde, 1.0–1.19 ámbar, ≥1.2 rojo). El journey canónico mide **días en etapa vs OLA**
  (`etapas.ola_dias`, ya en `v_journey`). Son dos métricas distintas para el mismo trabajo.
- **Provisional:** se modeló `instalaciones.dias_max` (LT máximo) y se calcula CLT en `v_instalaciones`.
  `dias_max` default = **40** (es PLACEHOLDER, igual que los OLAs — el prototipo usa 40 en todo).
- **Falta confirmar:** ¿el CLT es métrica oficial del Módulo Instalaciones o se reemplaza por el
  OLA de la etapa 2? Si es oficial, ¿cuál es el LT máximo real por tipo de proyecto
  (Doméstico / C&I / Baterías)? ¿Desde qué hito arranca el LT (firma V5, agenda confirmada, otro)?

### P2 — Sub-etapas de ejecución (10) vs etapas del journey (6)
- **Contexto:** el prototipo usa un pipeline de **10 sub-etapas** (Ficha técnica → … → Completado)
  que es más granular que las 6 etapas del journey, y solapa con Viabilidad/Ingeniería.
- **Provisional:** se creó el catálogo cerrado `instalacion_etapas` (10) como detalle **dentro** de
  la etapa 2 "Instalación" del journey. La etapa del journey (`clientes.etapa_actual`) y la sub-etapa
  de instalación (`instalaciones.etapa_inst`) son campos independientes.
- **Falta confirmar:** ¿son las 10 sub-etapas el desglose oficial de la etapa "Instalación"?
  ¿Cómo se sincroniza pasar a "Completado" (sub-etapa 10) con avanzar la etapa del journey a
  "Trámite CFE" (etapa 3) y el candado del enganche?

### P3 — "Liberar pago" al instalador (PMD-P2) vs arquitectura de 2 capas
- **Contexto:** el prototipo tiene un botón **"Liberar pago"** que se habilita cuando la Validación
  PM (4 ítems) está completa. Pero la decisión firme #1 dice que **la plataforma NUNCA captura
  dinero a mano** (la capa financiera es Odoo; el cobro se leerá de Toku/Odoo por API).
- **Provisional:** se modeló `reportes_instalacion.pago_liberado` como **hito operativo auditado**
  (queda en `bitacora` con el email del usuario), NO como movimiento de dinero. El candado del
  prototipo (no liberar sin los 4 ítems de validación) se respeta en la UI.
- **Falta confirmar:** ¿la liberación de pago al instalador/cuadrilla vive en esta plataforma
  (como autorización operativa que luego ejecuta Odoo) o NO debe estar aquí? Si vive aquí,
  ¿qué la dispara y quién la autoriza (rol)?

### P4 — Reportes PMD-P2: definición del "checklist 6 puntos"
- **Contexto:** el prototipo muestra el checklist del reporte como texto ("6/6 ✓", "4/6") sin
  desglosar los 6 puntos.
- **Provisional:** se guardó como texto libre (`reportes_instalacion.checklist_6`).
- **Falta confirmar:** ¿cuáles son los 6 puntos exactos? (para volverlos un checklist estructurado).

### P5 — Tipos de proyecto
- **Contexto:** el prototipo usa tipos: Doméstico, C&I Local, C&I Foráneo, FIDE C&I, Baterías C&I.
- **Provisional:** `instalaciones.tipo` es texto libre con esos valores.
- **Falta confirmar:** ¿es ese el catálogo cerrado oficial de tipos? Si sí, se vuelve `check (...)`.

---

## Resueltas
(ninguna aún)
