# Edge Function `notificar` — Avisos por correo a Cobranza

Manda correos automáticos al equipo de **Cobranza** en los 3 hitos clave del proyecto.
**Agnóstico** al proveedor (como el backend de IA): hoy usa **Resend**; se puede migrar a
Gmail/Workspace después sin tocar el front.

## Los 3 hitos
| Evento | Cuándo | Acción para Cobranza |
|---|---|---|
| `instalacion_terminada` | El instalador cierra el reporte | Cobrar **enganche** (hito 5.1) |
| `cfe_iniciado` | Se inicia el trámite en CFE | Seguimiento |
| `medidor_instalado` | Se marca "medidor bidireccional llegó" | **Restante + 1ª mensualidad** (hito 6.1) |

## Configuración (una sola vez)
1. Crea una cuenta en **https://resend.com** → **API Keys** → copia la llave (`re_…`).
2. Pon los secretos en Supabase (Edge Functions → Secrets):
   ```bash
   supabase secrets set RESEND_API_KEY=re_...
   supabase secrets set COBRANZA_EMAILS="cobranza@kenetsolar.com,anahi@kenetsolar.com"
   supabase secrets set NOTIFY_FROM="KENET Mesa de Control <notificaciones@kenetsolar.com>"
   ```
   - `COBRANZA_EMAILS`: uno o varios correos separados por coma.
   - `NOTIFY_FROM`: remitente. **Para pruebas** puedes usar `KENET <onboarding@resend.dev>`
     (funciona sin verificar dominio). Para producción, **verifica tu dominio** en Resend
     y usa `notificaciones@kenetsolar.com` (recomendado: remitente dedicado para que
     Cobranza los identifique y filtre rápido, sin arriesgar el dominio de correos humanos).
3. Despliega:
   ```bash
   supabase functions deploy notificar
   ```

## Migrar a Gmail/Workspace a futuro
El código ya está preparado (`NOTIFY_PROVIDER`). Cuando se quiera migrar, se implementa el
proveedor `gmail` en `index.ts` y se cambia `supabase secrets set NOTIFY_PROVIDER=gmail`
(+ las credenciales de Gmail). El front no cambia.

## Notas
- Es **best-effort**: si el correo falla o no está configurado, **no rompe** el flujo
  (el instalador cierra su reporte normal, el trámite se crea, etc.); solo no se envía el aviso.
- Requiere sesión válida (JWT) para invocarse.
