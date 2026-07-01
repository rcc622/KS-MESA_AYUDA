// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: /notificar  ·  Avisos por correo a Cobranza en hitos clave
// ─────────────────────────────────────────────────────────────────────────────
// AGNÓSTICO al proveedor (como el backend de IA): hoy usa Resend; mañana se puede
// cambiar a Gmail/Workspace sin reescribir el front — solo cambia NOTIFY_PROVIDER.
// Recomendación: dejar SIEMPRE los correos automáticos del sistema en un servicio
// dedicado (Resend) con un remitente propio (ej. notificaciones@kenetsolar…) para
// no arriesgar la reputación del dominio de los correos humanos y para que Cobranza
// los identifique/filtre rápido.
//
// Secretos (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY   — llave de Resend (https://resend.com → API Keys)
//   COBRANZA_EMAILS  — correos destino, separados por coma (ej. cobranza@kenet…, anahi@…)
//   NOTIFY_FROM      — remitente (ej. "KENET Mesa de Control <notificaciones@kenetsolar.com>")
//                      Para pruebas puedes usar "KENET <onboarding@resend.dev>".
//   NOTIFY_PROVIDER  — 'resend' (default). 'gmail' se implementará si se migra.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Los 3 hitos que le importan a Cobranza (ver BASES/HANDOFF — cobro por hitos).
const EVENTOS: Record<string, { emoji: string; titulo: string; accion: string }> = {
  instalacion_terminada: { emoji: '🔨', titulo: 'Instalación terminada', accion: 'Ya se puede cobrar el ENGANCHE (hito 5.1).' },
  cfe_iniciado:          { emoji: '📋', titulo: 'Trámite CFE iniciado', accion: 'El trámite ante CFE ha comenzado.' },
  medidor_instalado:     { emoji: '🔌', titulo: 'Medidor bidireccional instalado — CFE concluido', accion: 'Ya se puede cobrar el RESTANTE + 1ª mensualidad (hito 6.1).' },
};

const esc = (s: string) => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));

// Base64 de una cadena UTF-8 (robusto en Deno, sin unescape).
const b64utf8 = (str: string) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};

// access_token fresco a partir del refresh_token de Google (mismo patrón que Calendar/Drive).
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

// Envía el correo vía la API de Gmail con el OAuth de una cuenta de Workspace.
async function enviarGmail(supaAdmin: any, to: string[], from: string, subject: string, html: string) {
  const fromEmail = Deno.env.get('NOTIFY_GMAIL_EMAIL') || Deno.env.get('DRIVE_OWNER_EMAIL');
  if (!fromEmail) throw new Error('Falta el secreto NOTIFY_GMAIL_EMAIL (cuenta de Workspace que envía).');
  const { data: cuenta } = await supaAdmin.from('usuarios').select('google_refresh_token').eq('email', fromEmail).maybeSingle();
  if (!cuenta?.google_refresh_token) throw new Error(`La cuenta ${fromEmail} no ha conectado Google con permiso de Gmail. Reconéctala desde la plataforma.`);
  const token = await getAccessToken(cuenta.google_refresh_token);

  const subjectEnc = `=?UTF-8?B?${b64utf8(subject)}?=`;  // encoded-word para acentos/emojis
  const raw = [
    `To: ${to.join(', ')}`,
    `From: ${from}`,
    `Subject: ${subjectEnc}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ].join('\r\n');
  const rawUrl = b64utf8(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ raw: rawUrl }),
  });
  if (!resp.ok) throw new Error(`Gmail API ${resp.status}: ${await resp.text()}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'content-type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No autenticado.' }, 401);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Sesión inválida.' }, 401);

    const body = await req.json();
    const ev = EVENTOS[body?.evento];
    if (!ev) return json({ error: 'Evento no reconocido.' }, 400);
    const p = body?.proyecto || {};

    const to = (Deno.env.get('COBRANZA_EMAILS') || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!to.length) throw new Error('Falta el secreto COBRANZA_EMAILS (correos de Cobranza).');
    const from = Deno.env.get('NOTIFY_FROM') || 'KENET Mesa de Control <onboarding@resend.dev>';
    const hoy = new Date().toISOString().slice(0, 10);

    const subject = `${ev.emoji} ${ev.titulo} — ${p.cliente || 'Cliente'} (${p.folio || 's/folio'})`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1F2937">
        <div style="background:#1F4E79;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">
          <div style="font-size:18px;font-weight:700">${ev.emoji} ${esc(ev.titulo)}</div>
          <div style="font-size:12px;opacity:.85">KENET Solar · Mesa de Control · ${hoy}</div>
        </div>
        <div style="border:1px solid #E2E8F0;border-top:none;padding:18px 20px;border-radius:0 0 10px 10px">
          <table style="font-size:14px;width:100%">
            <tr><td style="color:#6B7280;padding:3px 0">Cliente</td><td style="font-weight:600">${esc(p.cliente || '—')}</td></tr>
            <tr><td style="color:#6B7280;padding:3px 0">Folio KENET</td><td style="font-weight:600">${esc(p.folio || '—')}</td></tr>
            ${p.folio_odoo ? `<tr><td style="color:#6B7280;padding:3px 0">OV Odoo</td><td>${esc(p.folio_odoo)}</td></tr>` : ''}
            ${p.zona ? `<tr><td style="color:#6B7280;padding:3px 0">Zona</td><td>${esc(p.zona)}</td></tr>` : ''}
          </table>
          <div style="margin-top:14px;background:#FFF8EC;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;font-size:14px;color:#92400E">
            <strong>Acción para Cobranza:</strong> ${esc(ev.accion)}
          </div>
          <div style="margin-top:14px;font-size:11px;color:#9CA3AF">Aviso automático de la Mesa de Control. No responder a este correo.</div>
        </div>
      </div>`;

    const provider = Deno.env.get('NOTIFY_PROVIDER') || 'resend';
    if (provider === 'gmail') {
      // Envía vía la API de Gmail con el OAuth de una cuenta de Workspace (misma
      // infraestructura que Calendar/Drive). Ideal cuando el dominio no se puede
      // verificar en Resend (ej. DNS en Wix).
      const supaAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      await enviarGmail(supaAdmin, to, from, subject, html);
    } else if (provider === 'resend') {
      const key = Deno.env.get('RESEND_API_KEY');
      if (!key) throw new Error('Falta el secreto RESEND_API_KEY en Supabase.');
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (!r.ok) { const t = await r.text(); throw new Error(`Resend ${r.status}: ${t}`); }
    } else {
      throw new Error(`Proveedor de correo '${provider}' no soportado (usa 'resend' o 'gmail').`);
    }

    return json({ ok: true, enviados: to.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
