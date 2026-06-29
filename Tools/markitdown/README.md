# markitdown — convertir documentos a Markdown

**Repo:** https://github.com/microsoft/markitdown · **Licencia:** MIT

Herramienta de Microsoft (Python) que convierte archivos de oficina y documentos a
**Markdown**: PDF, Word `.docx`, PowerPoint `.pptx`, Excel `.xlsx`, HTML, CSV, imágenes,
etc. La usamos para pasar PPT/Word/PDF a `.md` y versionarlos en `BASES/`, de modo que
queden legibles y diffables en git y todo el equipo los tenga con un `git pull`.

> **Nota:** Pablo y el resto del equipo **no necesitan instalar markitdown** para
> *leer* los documentos — esos ya quedan como `.md` en `BASES/`. markitdown solo lo
> usa quien **convierte** archivos nuevos.

---

## Instalación

Requiere **Python 3.10+**.

```bash
# Paquete principal + extras de conversión (PDF/Office/imágenes)
pip install 'markitdown[all]'

# Si el extra [all] no jala todas las libs de Office, instálalas explícitas:
pip install python-docx python-pptx openpyxl pdfminer.six
```

### Posible problema (entornos Debian/Ubuntu)
Si al correr `markitdown` ves `ModuleNotFoundError: No module named '_cffi_backend'`
o un panic de `cryptography`, instala/actualiza por pip para que tomen precedencia
sobre las del sistema:

```bash
pip install --upgrade cffi cryptography
```

*(El warning `Couldn't find ffmpeg` solo afecta audio/video; para documentos no aplica.)*

---

## Uso

```bash
# A stdout
markitdown documento.pptx

# A un archivo .md
markitdown documento.pptx -o documento.md

# Varios de golpe (bash)
for f in *.pptx; do markitdown "$f" -o "${f%.pptx}.md"; done
```

| Formato de entrada | Soportado |
|---|---|
| PDF | ✅ |
| Word `.docx` | ✅ |
| PowerPoint `.pptx` | ✅ |
| Excel `.xlsx` | ✅ |
| HTML / CSV / JSON | ✅ |
| Imágenes (texto/EXIF) | ⚠️ básico (descripción rica requiere un LLM opcional) |
| Audio / video | ⚠️ requiere `ffmpeg` |

---

## Flujo en este proyecto

1. El documento origen (PPT/Word/PDF) se convierte a `.md` con markitdown.
2. El `.md` resultante se revisa y se agrega a `BASES/`.
3. Commit + push → el equipo lo obtiene con `git pull`.
