// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: /gcal-auth
// Maneja el flujo OAuth 2.0 con Google Calendar en dos pasos:
//
//   GET  /gcal-auth?action=url&user_id=<uuid>
//        → Devuelve la URL de autorización de Google para redirigir al instalador.
//
//   GET  /gcal-auth?code=<codigo>&state=<user_id>
//        → Callback que recibe Google tras la autorización. Intercambia el código
//          por refresh_token y lo guarda en usuarios.google_refresh_token.
//
// Secretos requeridos (Supabase → Edge Functions → Secrets):
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (inyectados automáticamente)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Calendar (eventos) + Drive completo (para subir a carpetas compartidas de empresa) +
// Gmail (envío de correos automáticos a Cobranza). Al agregar scopes, la cuenta que use
// esas funciones debe RE-conectar su Google (los tokens viejos no traen los permisos nuevos).
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/gmail.send';
const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/gcal-auth`;

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

function htmlResp(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: { ...CORS, 'content-type': 'text/html; charset=utf-8' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = new URL(req.url);
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    return jsonResp({ error: 'Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en los secretos de Supabase.' }, 500);
  }

  // ── Paso 1: generar URL de autorización ──────────────────────────────────
  // El front llama: /gcal-auth?action=url&user_id=<uuid>
  const action = url.searchParams.get('action');
  if (action === 'url') {
    const userId = url.searchParams.get('user_id');
    if (!userId) return jsonResp({ error: 'Falta user_id.' }, 400);

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent'); // fuerza que Google devuelva refresh_token
    authUrl.searchParams.set('state', userId);      // lo recuperamos en el callback

    return jsonResp({ url: authUrl.toString() });
  }

  // ── Paso 2: callback de Google ────────────────────────────────────────────
  // Google redirige aquí con ?code=...&state=<user_id>
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // es el user_id
  const error = url.searchParams.get('error');

  if (error) {
    return htmlResp(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>❌ No se pudo conectar Google Calendar</h2>
        <p>El instalador canceló la autorización o ocurrió un error: <strong>${error}</strong></p>
        <p>Puedes cerrar esta ventana.</p>
      </body></html>
    `);
  }

  if (!code || !state) {
    return jsonResp({ error: 'Parámetros inválidos en el callback.' }, 400);
  }

  // Intercambiar el código por tokens
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResp.ok) {
    const txt = await tokenResp.text();
    return htmlResp(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>❌ Error al obtener el token de Google</h2>
        <p>${txt}</p>
        <p>Puedes cerrar esta ventana e intentar de nuevo.</p>
      </body></html>
    `, 500);
  }

  const tokens = await tokenResp.json();
  const refreshToken = tokens.refresh_token;

  if (!refreshToken) {
    return htmlResp(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>⚠️ Google no devolvió un refresh token</h2>
        <p>Esto pasa si la cuenta ya había autorizado la app antes. Pide al instalador que
           revoque el acceso en <a href="https://myaccount.google.com/permissions">su cuenta de Google</a>
           y vuelva a conectar.</p>
        <p>Puedes cerrar esta ventana.</p>
      </body></html>
    `);
  }

  // Guardar el refresh_token en la tabla usuarios usando service role (escritura directa)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error: dbError } = await supabase
    .from('usuarios')
    .update({ google_refresh_token: refreshToken })
    .eq('id', state);

  if (dbError) {
    return htmlResp(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>❌ Error al guardar la conexión</h2>
        <p>${dbError.message}</p>
        <p>Contacta al administrador.</p>
      </body></html>
    `, 500);
  }

  // Éxito — el instalador puede cerrar esta ventana
  return htmlResp(`
    <html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#f0fdf4">
      <div style="font-size:48px;margin-bottom:16px">✅</div>
      <h2 style="color:#15803d">¡Google Calendar conectado!</h2>
      <p style="color:#374151">Ya recibirás tus instalaciones directamente en tu Google Calendar.</p>
      <p style="color:#6b7280;font-size:14px">Puedes cerrar esta ventana.</p>
    </body></html>
  `);
});
