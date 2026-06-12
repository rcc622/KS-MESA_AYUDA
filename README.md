# Mesa de Ayuda KENET Solar — MVP Piloto R2

Plataforma operativa post-venta. Un solo `index.html` + Supabase. Ver `CLAUDE.md` para contexto completo y `docs/GUIA_DEPLOY_MVP.md` para deploy (~30 min, $0).

## Correr

1. Supabase: ejecutar `sql/01_schema.sql`, luego `sql/02_seed.sql` en SQL Editor.
2. Editar y ejecutar `sql/03_usuarios.sql` (usuarios operativos: email+contraseña por SQL).
3. Pegar SUPABASE_URL y ANON_KEY en las primeras lineas de `index.html` (ya hecho en este repo).
4. Netlify conectado al repo GitHub: auto-deploy en cada push a `main`.

## Estructura

- `index.html` — app completa (login, journey R2, tablero GO, bitacora)
- `sql/01_schema.sql` — esquema + RLS + triggers de auditoria
- `sql/02_seed.sql` — 430 clientes reales R2 (126 activos) ⚠ datos sensibles, repo privado
- `sql/03_usuarios.sql` — roster plano de EMPLEADOS (crear, password, rol, zona, baja)
- `sql/04_perfiles.sql` — tabla profiles + trigger automatico (correr antes que 03)
- `sql/05_clientes.sql` — roster plano de CLIENTES (buscar, editar, etapa, cobro, archivar)
- `docs/GUIA_DEPLOY_MVP.md` — guia de deploy paso a paso
