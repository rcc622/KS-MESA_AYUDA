# Tools — Utilidades recomendadas para el equipo

Esta carpeta **no contiene código**: es una guía de herramientas externas que el
equipo (Randall, Pablo, etc.) puede instalar **en su propio entorno de Claude Code**
para trabajar mejor en el proyecto Mesa de Control / Mesa de Ayuda KENET.

> **Por qué solo un README y no el código:** estas herramientas son plugins/skills
> de Claude Code que se instalan por persona en su máquina, no librerías del proyecto.
> Meter su código al repo lo ensuciaría y quedaría desactualizado. Cada quien las
> instala desde su fuente oficial siguiendo esta guía.

---

## 1. ponytail — optimizador de tokens (recomendado)

**Repo:** https://github.com/DietrichGebert/ponytail · **Licencia:** MIT

**Qué hace:** guía al agente de IA a escribir el **mínimo código necesario** (filosofía
"lazy senior dev": el mejor código es el que no escribes). Aplica una escalera de
decisión — reusar lo existente, usar stdlib/plataforma, evitar sobre-ingeniería —
antes de generar código nuevo.

**Beneficio reportado (benchmarks del proyecto):** ~54% menos código generado,
~20% menos costo, ~27% más rápido, manteniendo validaciones de seguridad.

**Instalación (Claude Code):**
```
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
```
*(Para Cursor / Windsurf / Cline / Copilot, ver el README del repo: se copian los
archivos de reglas correspondientes.)*

**Comandos principales:**
| Comando | Función |
|---|---|
| `/ponytail [lite\|full\|ultra\|off]` | Ajusta la intensidad |
| `/ponytail-review` | Revisa el diff buscando sobre-ingeniería |
| `/ponytail-audit` | Analiza todo el repo |
| `/ponytail-debt` | Registra optimizaciones diferidas |
| `/ponytail-gain` | Muestra métricas de impacto |
| `/ponytail-help` | Referencia de comandos |

---

## 2. caveman — compresor de salida (alternativa)

**Repo:** https://github.com/juliusbrussee/caveman · **Licencia:** MIT

**Qué hace:** comprime la **salida/respuestas** del agente quitando relleno y dejando
solo lo esencial, sin perder precisión técnica (código, comandos y errores quedan
intactos). Lema: *"why use many token when few token do trick."*

**Diferencia clave vs ponytail:**
- **ponytail** reduce el **código que se escribe** (entrada al repo).
- **caveman** reduce los **tokens de respuesta** del agente (estilo de comunicación).
- Son complementarios; aquí caveman se lista como **opción alternativa** de ahorro.

**Beneficio reportado:** ~65–75% menos tokens de salida.

**Instalación (requiere Node ≥ 18):**

macOS / Linux / WSL / Git Bash:
```bash
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash
```
Windows PowerShell:
```powershell
irm https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.ps1 | iex
```

**Comandos principales:**
| Comando | Función |
|---|---|
| `/caveman [lite\|full\|ultra\|wenyan]` | Activa/ajusta la compresión de salida |
| `/caveman-commit` | Genera mensajes de commit comprimidos |
| `/caveman-review` | Comentarios de PR comprimidos |
| `/caveman-stats` | Seguimiento de uso de tokens |
| `/caveman-compress` | Comprime archivos de memoria |

---

## Nota de seguridad

Antes de correr los instaladores `curl ... | bash` / `irm ... | iex`, revisa el
script en el repo oficial. Son herramientas MIT de terceros; instálalas bajo tu
propio criterio. Ninguna requiere credenciales del proyecto KENET.
