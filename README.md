# Mesa de Ayuda KENET Solar — MVP Piloto R2

Plataforma operativa post-venta. Un solo `index.html` + Supabase. Ver `CLAUDE.md` para contexto completo y `docs/GUIA_DEPLOY_MVP.md` para deploy (~30 min, $0).

## Correr

1. Supabase: ejecutar `sql/01_schema.sql` y luego `sql/02_seed.sql` en SQL Editor.
2. Pegar SUPABASE_URL y ANON_KEY en las primeras lineas de `index.html`.
3. Subir `index.html` a Netlify Drop (o cualquier hosting estatico).

## Estructura

- `index.html` — app completa (login, journey R2, tablero GO, bitacora)
- `sql/01_schema.sql` — esquema + RLS + triggers de auditoria
- `sql/02_seed.sql` — 430 clientes reales R2 (126 activos) ⚠ datos sensibles, repo privado
- `docs/GUIA_DEPLOY_MVP.md` — guia de deploy paso a paso
