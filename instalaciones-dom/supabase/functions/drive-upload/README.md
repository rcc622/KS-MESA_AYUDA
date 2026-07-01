# Edge Function `drive-upload` — Evidencias a Google Drive (Opción A · OAuth)

Sube las fotos + PDF del reporte del instalador a **Google Drive** **sin llave JSON**
de service account (esa está bloqueada por política de la organización). Reutiliza el
**OAuth de Google que ya usa Calendar**, con el permiso `drive.file`.

> Las evidencias **también** se respaldan en Supabase Storage (eso ya funciona). Drive
> es una copia adicional para que el equipo las navegue en carpetas.

## Cómo funciona
1. La app manda cada archivo (base64) a esta función.
2. La función usa el `google_refresh_token` de la **cuenta dueña del Drive** para obtener
   un access_token y subir el archivo a la carpeta **"Evidencias KENET Solar"** (o a la
   que indiques), en una subcarpeta por folio.

## Configuración (una vez)
1. **Agregar el permiso de Drive al OAuth** (ya hecho en el código: `gcal-auth` ahora pide
   `calendar.events` + `drive.file`). **Redespliega `gcal-auth`.**
2. **En Google Cloud Console:** APIs & Services → Library → habilita **Google Drive API**.
   Y en la pantalla de consentimiento OAuth, agrega el scope `.../auth/drive.file`.
3. **Reconectar Google** con la cuenta que será dueña del Drive (⚠️ los tokens viejos solo
   tenían Calendar; hay que reconectar para que incluyan Drive). Puede ser la cuenta de
   KENET o la del admin. Se conecta desde la plataforma (mismo botón de "Conectar Google").
4. **Secretos** (Supabase → Edge Functions → Secrets):
   - `DRIVE_OWNER_EMAIL` = correo de la cuenta dueña del Drive (centraliza todas las
     evidencias ahí). Si no lo pones, cada quien sube a **su** Drive.
   - `DRIVE_FOLDER_ID` *(opcional)* = ID de una carpeta ya creada. Si no, la función crea
     "Evidencias KENET Solar" sola.
5. **Desplegar:** `supabase functions deploy drive-upload` (y `gcal-auth`).

## Notas
- **Permiso mínimo:** `drive.file` solo deja a la app tocar los archivos/carpetas que ella
  misma crea. No ve el resto del Drive del usuario. Es la opción segura.
- **Best-effort:** si Drive falla o no está configurado, el reporte se envía normal y las
  evidencias igual quedan en Supabase Storage. No rompe nada.
- **Tamaño:** cada foto se sube en una llamada. Fotos muy pesadas podrían topar límites de
  la función; si pasa, se puede comprimir la imagen antes de subir (mejora futura).
