import { supabase } from './supabase';

const GCAL_AUTH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gcal-auth`;
const GCAL_EVENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gcal-event`;

// Abre el flujo OAuth de Google en una ventana nueva.
// El instalador autoriza y la ventana se cierra mostrando la página de éxito.
export async function conectarGoogleCalendar(userId) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const resp = await fetch(`${GCAL_AUTH_URL}?action=url&user_id=${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await resp.json();
  if (!json.url) throw new Error(json.error || 'No se pudo obtener la URL de autorización.');

  // Abre la autorización de Google en una ventana pequeña
  return window.open(json.url, 'google-oauth', 'width=500,height=650,left=200,top=100');
}

// Llama a la Edge Function gcal-event para crear, actualizar o eliminar
// el evento de Google Calendar del responsable de la cuadrilla.
// accion: 'crear' | 'actualizar' | 'eliminar'
// Falla silenciosamente con un log: el agendamiento en la plataforma
// no debe bloquearse si falla el Calendar.
export async function sincronizarEventoCalendar(proyectoId, accion) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const resp = await fetch(GCAL_EVENT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ proyecto_id: proyectoId, accion }),
    });

    const json = await resp.json();

    if (!resp.ok) {
      console.warn('[gcal] Error HTTP:', json.error);
      return { ok: false, error: json.error };
    }

    if (!json.ok) {
      // Casos no-bloqueantes: sin cuadrilla, sin responsable, sin token
      console.info('[gcal]', json.motivo || json.error);
    }

    return json;
  } catch (e) {
    // Nunca bloquear el flujo principal por un fallo de Calendar
    console.warn('[gcal] Excepción al sincronizar evento:', e?.message);
    return { ok: false, error: e?.message };
  }
}
