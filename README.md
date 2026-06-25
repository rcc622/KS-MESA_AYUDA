# Mesa de Ayuda KENET Solar — MVP Piloto R2

Plataforma operativa post-venta. Un solo `index.html` + Supabase. Ver `CLAUDE.md` para contexto completo y `docs/GUIA_DEPLOY_MVP.md` para deploy (~30 min, $0).

## Correr

1. Supabase (SQL Editor, en orden): `sql/01_schema.sql` → `sql/04_perfiles.sql` → `sql/06_instalaciones.sql`.
   - Datos demo del Módulo Instalaciones: `sql/07_seed_instalaciones.sql` (⚠ reinicia datos — solo en base de demo/piloto vacía).
   - `sql/02_seed.sql` (430 clientes reales) NO se usa: los datos del piloto son dummies; se siembra con el 07.
2. Editar y ejecutar `sql/03_usuarios.sql` (usuarios operativos: email+contraseña por SQL).
3. SUPABASE_URL y ANON_KEY ya están pegados en `index.html` (publishable key).
4. Netlify conectado al repo: auto-deploy en cada push a la rama de producción. Solo publica `index.html` (ver `netlify.toml`).

## App — pestañas

- **🛠 Journey R2** — pipeline de clientes por etapa (6), días vs OLA, cobro por hitos, detalle/captura.
- **🔧 Instalaciones** — Módulo Instalaciones (detalle de la etapa 2 "Instalación"): Pipeline con CLT, Agenda por instalador, PMD-P2 (reportes + validación PM + candado de liberación de pago), Métricas.
- **🎛 Tablero GO** — KPIs consolidados por etapa.
- **📜 Bitácora** — audit log antifraude (quién cambió qué).

## Estructura

- `index.html` — app completa (login, journey R2, instalaciones, tablero GO, bitácora)
- `netlify.toml` — publica solo `index.html` (no expone sql/ ni docs/)
- `sql/01_schema.sql` — esquema journey + RLS + triggers de auditoría + vista `v_journey`
- `sql/02_seed.sql` — 430 clientes reales R2 ⚠ datos sensibles (no se usa en este piloto dummy)
- `sql/03_usuarios.sql` — roster plano de EMPLEADOS (crear, password, rol, zona, baja)
- `sql/04_perfiles.sql` — tabla profiles + trigger automático (correr antes que 03)
- `sql/05_clientes.sql` — roster plano de CLIENTES (buscar, editar, etapa, cobro, archivar)
- `sql/06_instalaciones.sql` — Módulo Instalaciones: instaladores, sub-etapas, instalaciones, reportes PMD-P2, vista `v_instalaciones`, RLS, auditoría
- `sql/07_seed_instalaciones.sql` — datos DEMO del módulo (ficticios, del prototipo)
- `docs/CONTEXTO_NEGOCIO.md` — knowledge pack de negocio (fuente de verdad)
- `docs/PREGUNTAS_NEGOCIO.md` — buzón de reglas pendientes de validar (CLT, sub-etapas, liberación de pago)
- `docs/GUIA_DEPLOY_MVP.md` — guía de deploy paso a paso
- `Módulo Instalaciones KENET Solar/` — prototipo de diseño original (referencia, no se publica)
