// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: /drive-upload  ·  Sube evidencias a Google Drive vía OAuth
// ─────────────────────────────────────────────────────────────────────────────
// OPCIÓN A del plan de Drive: NO usa llave JSON de service account (bloqueada por
// política de la organización). Reutiliza el OAuth de Google que ya tiene la app
// (el mismo de Calendar) con el scope drive.file, y sube los archivos con el
// access_token del usuario dueño de la carpeta.
//
// ¿A qué Drive sube? Al de la cuenta indicada en el secreto DRIVE_OWNER_EMAIL
// (centralizado, recomendado). Si no está, usa el Drive del usuario que llama.
// Esa cuenta debe haber CONECTADO su Google (con el scope de Drive ya agregado).
//
// POST /drive-upload  Body: { name, mimeType, dataB64, subcarpeta? }
//
// Secretos: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (ya existen para Calendar).
//   Opcionales: DRIVE_OWNER_EMAIL (cuenta dueña del Drive) · DRIVE_FOLDER_ID
//   (si ya tienes una carpeta; si no, la función crea "Evidencias KENET Solar").
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const CARPETA_RAIZ = 'Evidencias KENET Solar';
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });

async function getAccessToken(refreshToken: string): Promise<string> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!resp.ok) throw new Error(`Error al refrescar token de Google: ${await resp.text()}`);
  const data = await resp.json();
  if (!data.access_token) throw new Error('Google no devolvió access_token.');
  return data.access_token;
}

// Devuelve el ID de una carpeta (la crea si no existe). folderPadre es opcional.
async function asegurarCarpeta(token: string, nombre: string, padre?: string): Promise<string> {
  const filtroPadre = padre ? ` and '${padre}' in parents` : '';
  const q = encodeURIComponent(`name='${nombre.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false${filtroPadre}`);
  const buscar = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (buscar.ok) {
    const data = await buscar.json();
    if (data.files?.length) return data.files[0].id;
  }
  const meta: any = { name: nombre, mimeType: 'application/vnd.google-apps.folder' };
  if (padre) meta.parents = [padre];
  const crear = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(meta),
  });
  if (!crear.ok) throw new Error(`No se pudo crear la carpeta en Drive: ${await crear.text()}`);
  return (await crear.json()).id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return j({ error: 'Método no permitido.' }, 405);

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) return j({ error: 'Faltan GOOGLE_CLIENT_ID/SECRET en los secretos.' }, 500);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return j({ error: 'No autenticado.' }, 401);

  const supaUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const supaAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: { user }, error: authError } = await supaUser.auth.getUser();
  if (authError || !user) return j({ error: 'Sesión inválida.' }, 401);

  try {
    const body = await req.json();
    const { name, mimeType, dataB64, subcarpeta } = body || {};
    if (!name || !dataB64) return j({ error: 'Faltan name o dataB64.' }, 400);

    // ¿De quién es el Drive? DRIVE_OWNER_EMAIL (centralizado) o el usuario que llama.
    const ownerEmail = Deno.env.get('DRIVE_OWNER_EMAIL') || user.email;
    const { data: dueno } = await supaAdmin.from('usuarios').select('nombre, google_refresh_token').eq('email', ownerEmail).maybeSingle();
    if (!dueno?.google_refresh_token) {
      return j({ ok: false, motivo: `La cuenta ${ownerEmail} no ha conectado Google (con permiso de Drive). Conéctala desde la plataforma.` });
    }

    const token = await getAccessToken(dueno.google_refresh_token);

    // Carpeta raíz (secreto DRIVE_FOLDER_ID o se busca/crea) + subcarpeta opcional (ej. folio).
    let carpeta = Deno.env.get('DRIVE_FOLDER_ID') || await asegurarCarpeta(token, CARPETA_RAIZ);
    if (subcarpeta) carpeta = await asegurarCarpeta(token, String(subcarpeta), carpeta);

    // Subida multipart (metadata + contenido en base64).
    const boundary = 'kenetsolarboundary';
    const metadata = JSON.stringify({ name, parents: [carpeta] });
    const cuerpo =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType || 'application/octet-stream'}\r\nContent-Transfer-Encoding: base64\r\n\r\n${dataB64}\r\n` +
      `--${boundary}--`;

    const subir = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'content-type': `multipart/related; boundary=${boundary}` },
      body: cuerpo,
    });
    if (!subir.ok) throw new Error(`Drive API: ${await subir.text()}`);
    const archivo = await subir.json();
    return j({ ok: true, id: archivo.id, link: archivo.webViewLink });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
