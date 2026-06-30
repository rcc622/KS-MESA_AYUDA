#!/bin/bash
set -euo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-.}"
ESTATUS="$ROOT/docs/ESTATUS.md"

# ── 1) Imprime el ÚLTIMO ESTATUS (siempre, en cualquier entorno) ──────────────
echo "════════════════════════════════════════════════════════════"
echo "📌  ÚLTIMO ESTATUS DEL PROYECTO  ·  docs/ESTATUS.md"
echo "════════════════════════════════════════════════════════════"
if [ -f "$ESTATUS" ]; then
  # Imprime desde el primer encabezado '## ' (la entrada más reciente) hasta
  # justo antes del siguiente '## '.
  awk '/^## /{c++} c==1{print} c==2{exit}' "$ESTATUS"
else
  echo "(No se encontró docs/ESTATUS.md)"
fi
echo "════════════════════════════════════════════════════════════"
echo "ℹ️  Protocolo (CLAUDE.md): al iniciar → informa este estatus al developer;"
echo "    antes de un milestone → respalda; al cerrar → respalda, escribe una"
echo "    entrada NUEVA en docs/ESTATUS.md y haz push."
echo ""

# ── 2) Instala dependencias del front (solo en Claude Code en la web) ─────────
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  APP="$ROOT/instalaciones-dom"
  if [ -f "$APP/package.json" ]; then
    echo "📦  Instalando dependencias del front (instalaciones-dom)…"
    if ( cd "$APP" && npm install --no-audit --no-fund ) >/tmp/ks-npm-install.log 2>&1; then
      echo "✅  Dependencias listas (npm install)."
    else
      echo "‼️  Falló npm install. Últimas líneas del log:"
      tail -20 /tmp/ks-npm-install.log || true
    fi
  fi
fi
