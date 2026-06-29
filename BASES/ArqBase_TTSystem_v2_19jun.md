## Slide 1

Arquitectura del Trouble Ticket System

Especificaciones y Recomendaciones para la herramienta propia (a desarrollar) — según mejores prácticas.

Referencia de diseño: sistemas probados de gestión de casos como Clarify (case + queues + dispatch + contratos/SLA).

## Slide 2

Proyecto I&OPS · KENET Solar

TTS · componentes

Qué módulos debe tener la herramienta

Arquitectura modular en capas: acceso, núcleo, datos, servicios e integración.

Acceso / Presentación

Portal del cliente

Consola del agente

App de campo (móvil)

Núcleo de aplicación

Gestión de Tickets (caso + folio + estados)

Queues y motor de enrutamiento

Workflow y reglas de negocio

SLA y motor de escalación

Conocimiento y datos

Base de Conocimiento

Activos / CMDB (instalaciones)

Cuentas y contactos

Historial y bitácora (auditoría)

Servicios

Motor de notificaciones (multicanal)

Reportería, dashboards y KPIs / CSI

Integración

API / Webhooks

ERP · Comercial · Despacho a campo

Modular y propio: cada capa se puede construir y evolucionar por separado

## Slide 3

Proyecto I&OPS · KENET Solar

TTS · interacción

Cómo interactúan los módulos

El dato del ticket fluye por el sistema y dispara comunicación en cada paso.

Canal de entrada

Tickets (crea folio)

Queue + enrutamiento

Asignación (nivel)

SLA + workflow

Resolución

Cierre + CSAT

Servicios y datos que intervienen

Activos / CMDB

Al crear el ticket se liga la instalación o equipo del cliente.

Notificaciones

Acuse con folio al abrir y aviso en cada cambio de estado.

SLA / escalación

El reloj corre por prioridad; alerta y escala si está en riesgo.

API / integración

Sincroniza clientes, activos y órdenes con ERP, comercial y campo.

El ticket es el hilo conductor: todos los módulos giran alrededor de él

## Slide 4

Proyecto I&OPS · KENET Solar

TTS · modelo del ticket

El ticket y sus reglas de apertura

Campos mínimos del ticket

Folio   (automático)

Solicitante / cuenta  *

Canal de entrada  *

Tipo: incidente o solicitud  *

Línea de servicio  *

Categoría / subcategoría  *

Región (R1 / R2)  *

Descripción del caso  *

Prioridad (P1–P4)  *

Activo / instalación   (si aplica)

Adjuntos / evidencia   (si aplica)

*  Obligatorio para poder abrir el ticket

Reglas de negocio al abrir

Sin categoría y prioridad no se abre el ticket.
Folio único automático; el ticket es la fuente de verdad.
El SLA se fija por prioridad y arranca al abrir.
Enrutamiento automático al queue: línea × región.
Acuse automático al solicitante con folio y SLA.
Los duplicados se vinculan al ticket original.
Todo ticket nace con un dueño asignable.

Capturar bien al abrir es lo que hace el ticket medible, enrutable y con dueño

## Slide 5

Proyecto I&OPS · KENET Solar

TTS · queues

Queues y enrutamiento

Cada ticket se enruta a un queue por línea de servicio × región; la prioridad lo ordena.

Implementación

Post-Implementación

Customer Success / Compl.

R1 · MTY+SLT

Queue R1 · Implementación

Ordenado por prioridad P1→P4

Queue R1 · Post-Implementación

Ordenado por prioridad P1→P4

Queue R1 · Customer

Ordenado por prioridad P1→P4

R2 · TRC+MVA

Queue R2 · Implementación

Ordenado por prioridad P1→P4

Queue R2 · Post-Implementación

Ordenado por prioridad P1→P4

Queue R2 · Customer

Ordenado por prioridad P1→P4

Niveles y escalación

L1 (Dispatcher) → L2 (campo) → L3 (ingeniería).
Queue de triage / sin asignar, revisado por el Coordinador.
Reasignación entre regiones por respaldo cruzado.

Reglas del queue

La prioridad ordena el queue: P1 se atiende primero.
Cada ticket conserva su SLA al moverse de queue.
Un dueño por ticket; nada queda sin responsable.

Los queues convierten la entrada en trabajo ordenado, priorizado y con dueño

## Slide 6

Proyecto I&OPS · KENET Solar

TTS · ciclo de vida

Ciclo de vida del ticket (estados)

Estados claros y transiciones controladas — el corazón del sistema.

Abierto

Nuevo

Asignado

En proceso

En espera

Resuelto

Cerrado ✓

espera de refacción / cliente

Se abre un nuevo reporte (si el cliente no quedó conforme o reporta de nuevo) – y si es en la misma semana, se tomará como REINCIDENCIA

Transición con regla

Cada cambio de estado deja sello de tiempo y responsable.

“En espera” pausa el SLA

Solo por causas externas justificadas (refacción, cliente).

No cierra sin conformidad

“Resuelto” ≠ “Cerrado”: el cliente confirma para cerrar.

Estados controlados = trazabilidad total y cero tickets “perdidos”

## Slide 7

Proyecto I&OPS · KENET Solar

TTS · bitácora

Bitácora del caso — un solo log por ticket

Cómo funciona la bitácora

Un solo hilo por ticket: todo el historial vive en el mismo LOG.
Append-only: no se edita ni borra; se corrige con otra entrada.
Cada entrada lleva autor, fecha-hora y tipo.
Mezcla eventos automáticos del sistema con notas del responsable.
“Aceptado”: evento registrado entre Asignado y En proceso (el dueño toma el ticket).
Nota obligatoria al pasar a “En espera” y al cerrar.
Dos visibilidades: nota interna (equipo) vs actualización al cliente.

Ejemplo del LOG (compacto)

SISTEMA  09:02 · Abierto · TKT-1042 · P2
SISTEMA  09:15 · Asignado a J. Pérez (R1)
INTERNA  09:18 · J. Pérez · Aceptado (toma el ticket)
INTERNA  09:35 · Diagnóstico: inversor sin señal
CLIENTE  09:40 · “Visita el martes 10:00”
SISTEMA  11:20 · En espera (refacción) · SLA en pausa
INTERNA  14:05 · Refacción recibida · reanuda SLA
CLIENTE  16:40 · “Equipo operando; anexo evidencia”
SISTEMA  16:45 · Resuelto · espera conformidad
CLIENTE  17:30 · Cliente conforme → Cerrado ✓
SISTEMA automático  ·  INTERNA equipo  ·  CLIENTE visible al cliente

Un solo log por ticket: cada quien acepta, comenta y deja rastro — con autor y hora

## Slide 8

Proyecto I&OPS · KENET Solar

TTS · causa raíz

Clasificación de causa raíz (3 niveles)

Los 3 niveles

Nivel 1 · Origen / responsabilidad
KENET · Cliente · Proveedor/fabricante · Externo · No atribuible
Nivel 2 · Componente o ámbito
Inversor · Panel/módulo · Estructura · Cableado · Techo/obra · Monitoreo · Red CFE
Nivel 3 · Modo de falla / detalle
Dañado · Mal configurado · Defecto de fábrica · Desgaste · Daño externo…
Catálogo controlado, no texto libre → comparable y medible.
Se captura al resolver; obligatoria para cerrar.

Ejemplos

Nivel 1  ›  Nivel 2  ›  Nivel 3
Cliente  ›  Techo  ›  Impermeabilización dañada
KENET  ›  Inversor  ›  Equipo dañado
KENET  ›  Instalación  ›  Conexión DC floja
Proveedor  ›  Panel / módulo  ›  Defecto de fábrica
Externo  ›  Red CFE  ›  Variación de voltaje
Cliente  ›  Uso  ›  Sombra nueva sobre paneles

Clasificar la causa alimenta el % de incidentes con causa raíz documentada y la mejora continua (CSI)