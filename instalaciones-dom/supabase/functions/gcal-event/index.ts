// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: /gcal-event
// Crea, actualiza o elimina un evento en Google Calendar del responsable
// de la cuadrilla asignada al proyecto.
//
// POST /gcal-event
// Body: { proyecto_id: string, accion: 'crear' | 'actualizar' | 'eliminar' }
//
// Flujo:
//   1. Verifica que el usuario que llama tiene rol admin o pm_domestico.
//   2. Obtiene el proyecto con su cuadrilla y el responsable de la cuadrilla.
//   3. Verifica que el responsable tenga google_refresh_token guardado.
//   4. Obtiene un access_token fresco usando el refresh_token.
//   5. Llama a la API de Google Calendar para crear/actualizar/eliminar el evento.
//   6. Guarda el gcal_event_id en proyectos (para poder actualizarlo/eliminarlo después).
//
// Secretos requeridos:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (inyectados automáticamente)
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

// Obtiene un access_token fresco usando el refresh_token almacenado
async function getAccessToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Error al refrescar token de Google: ${txt}`);
  }

  const data = await resp.json();
  if (!data.access_token) throw new Error('Google no devolvió access_token.');
  return data.access_token;
}

// Construye el cuerpo del evento para la API de Google Calendar
function buildEventBody(proyecto: any) {
  const fecha = proyecto.fecha_agenda;
  const titulo = `Instalación solar · ${proyecto.cliente}`;

  const panelDetalle = [
    proyecto.paneles ? `${proyecto.paneles} PANELES` : null,
    proyecto.panel_potencia_w ? `${proyecto.panel_potencia_w} W` : null,
    proyecto.panel_marca || null,
  ].filter(Boolean).join(' / ');

  const inversorDetalle = [
    proyecto.inversor_cantidad ? `${proyecto.inversor_cantidad}` : null,
    proyecto.inversor_marca || null,
    proyecto.inversor_capacidad_kw ? `${proyecto.inversor_capacidad_kw} kW` : null,
  ].filter(Boolean).join(' ');

  const descripcion = [
    `Nombre del cliente: ${proyecto.cliente}`,
    proyecto.direccion ? `Dirección: ${proyecto.direccion}` : null,
    proyecto.maps_url ? `Ubicación: ${proyecto.maps_url}` : null,
    panelDetalle ? `Paneles: ${panelDetalle}` : null,
    inversorDetalle ? `Inversor: ${inversorDetalle}` : null,
    proyecto.correo_cliente ? `Correo: ${proyecto.correo_cliente}` : null,
    '',
    proyecto.vendedor ? `Vendedor: ${proyecto.vendedor}` : null,
    '',
    proyecto.notas ? `Nota: ${proyecto.notas}` : null,
  ].filter(s => s !== null).join('\n');

  return {
    summary: titulo,
    description: descripcion,
    location: proyecto.direccion || undefined,
    start: { date: fecha },  // evento de día completo
    end: { date: fecha },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },   // alerta 1 hora antes
        { method: 'email', minutes: 1440 }, // email 1 día antes
      ],
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResp({ error: 'Método no permitido.' }, 405);

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return jsonResp({ error: 'Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en los secretos.' }, 500);
  }

  // Verificar autenticación del usuario que llama
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResp({ error: 'No autenticado.' }, 401);

  // Cliente con JWT del usuario (para verificar rol)
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // Cliente con service role (para leer refresh_token y escribir gcal_event_id)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Verificar que el usuario tiene sesión válida
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) return jsonResp({ error: 'Sesión inválida.' }, 401);

  // Verificar rol: solo admin y pm_domestico pueden crear/modificar eventos
  const { data: usuarioActual } = await supabaseAdmin
    .from('usuarios')
    .select('rol')
    .eq('email', user.email)
    .maybeSingle();

  if (!usuarioActual || !['admin', 'pm_domestico'].includes(usuarioActual.rol)) {
    return jsonResp({ error: 'No tienes permiso para esta acción.' }, 403);
  }

  const body = await req.json();
  const { proyecto_id, accion } = body;

  if (!proyecto_id || !['crear', 'actualizar', 'eliminar'].includes(accion)) {
    return jsonResp({ error: 'Faltan proyecto_id o accion válida (crear|actualizar|eliminar).' }, 400);
  }

  // Obtener el proyecto con cuadrilla y responsable
  const { data: proyecto, error: proyectoError } = await supabaseAdmin
    .from('proyectos')
    .select(`
      id, folio, folio_odoo, vendedor, cliente, correo_cliente, direccion, maps_url, zona,
      fecha_agenda, paneles, kw, notas, gcal_event_id,
      panel_potencia_w, panel_marca, inversor_tipo, inversor_cantidad, inversor_capacidad_kw, inversor_marca,
      cuadrilla:cuadrillas(
        id, nombre,
        responsable:usuarios!cuadrillas_responsable_id_fkey(id, nombre, email, google_refresh_token)
      )
    `)
    .eq('id', proyecto_id)
    .single();

  if (proyectoError || !proyecto) {
    return jsonResp({ error: 'Proyecto no encontrado.' }, 404);
  }

  // Verificar que tenga cuadrilla y responsable asignados
  const cuadrilla = proyecto.cuadrilla as any;
  const responsable = cuadrilla?.responsable;

  if (!cuadrilla) {
    return jsonResp({ ok: false, motivo: 'El proyecto no tiene cuadrilla asignada. No se creó evento.' });
  }

  if (!responsable) {
    return jsonResp({ ok: false, motivo: 'La cuadrilla no tiene responsable asignado. No se creó evento.' });
  }

  if (!responsable.google_refresh_token) {
    return jsonResp({
      ok: false,
      motivo: `El responsable ${responsable.nombre} aún no ha conectado su Google Calendar. Pídele que lo conecte desde su perfil en la plataforma.`,
    });
  }

  // Verificar que haya fecha de instalación (necesaria para crear el evento)
  if (accion !== 'eliminar' && !proyecto.fecha_agenda) {
    return jsonResp({ ok: false, motivo: 'El proyecto no tiene fecha de instalación agendada.' });
  }

  try {
    const accessToken = await getAccessToken(responsable.google_refresh_token);
    const calendarApiBase = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    };

    let gcalEventId = proyecto.gcal_event_id;

    // ── CREAR ────────────────────────────────────────────────────────────────
    if (accion === 'crear') {
      const eventBody = buildEventBody(proyecto);
      const resp = await fetch(calendarApiBase, {
        method: 'POST',
        headers,
        body: JSON.stringify(eventBody),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Google Calendar API error al crear: ${txt}`);
      }

      const created = await resp.json();
      gcalEventId = created.id;

      // Guardar el event ID para futuras actualizaciones/eliminaciones
      await supabaseAdmin
        .from('proyectos')
        .update({ gcal_event_id: gcalEventId })
        .eq('id', proyecto_id);

      return jsonResp({ ok: true, accion: 'creado', gcal_event_id: gcalEventId, responsable: responsable.nombre });
    }

    // ── ACTUALIZAR ───────────────────────────────────────────────────────────
    if (accion === 'actualizar') {
      if (!gcalEventId) {
        // Si no hay evento previo (ej. la cuadrilla no estaba conectada antes), crear uno nuevo
        const eventBody = buildEventBody(proyecto);
        const resp = await fetch(calendarApiBase, {
          method: 'POST',
          headers,
          body: JSON.stringify(eventBody),
        });

        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`Google Calendar API error al crear (desde actualizar): ${txt}`);
        }

        const created = await resp.json();
        gcalEventId = created.id;

        await supabaseAdmin
          .from('proyectos')
          .update({ gcal_event_id: gcalEventId })
          .eq('id', proyecto_id);

        return jsonResp({ ok: true, accion: 'creado', gcal_event_id: gcalEventId, responsable: responsable.nombre });
      }

      const eventBody = buildEventBody(proyecto);
      const resp = await fetch(`${calendarApiBase}/${gcalEventId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(eventBody),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        // Si el evento ya no existe en Google, crear uno nuevo
        if (resp.status === 404) {
          const respCreate = await fetch(calendarApiBase, {
            method: 'POST',
            headers,
            body: JSON.stringify(eventBody),
          });
          const created = await respCreate.json();
          gcalEventId = created.id;
          await supabaseAdmin.from('proyectos').update({ gcal_event_id: gcalEventId }).eq('id', proyecto_id);
          return jsonResp({ ok: true, accion: 'recreado', gcal_event_id: gcalEventId, responsable: responsable.nombre });
        }
        throw new Error(`Google Calendar API error al actualizar: ${txt}`);
      }

      return jsonResp({ ok: true, accion: 'actualizado', gcal_event_id: gcalEventId, responsable: responsable.nombre });
    }

    // ── ELIMINAR ─────────────────────────────────────────────────────────────
    if (accion === 'eliminar') {
      if (!gcalEventId) {
        return jsonResp({ ok: true, motivo: 'No había evento en Google Calendar para eliminar.' });
      }

      const resp = await fetch(`${calendarApiBase}/${gcalEventId}`, {
        method: 'DELETE',
        headers,
      });

      // 404 = ya no existe, lo tratamos como éxito
      if (!resp.ok && resp.status !== 404) {
        const txt = await resp.text();
        throw new Error(`Google Calendar API error al eliminar: ${txt}`);
      }

      // Limpiar el event ID del proyecto
      await supabaseAdmin
        .from('proyectos')
        .update({ gcal_event_id: null })
        .eq('id', proyecto_id);

      return jsonResp({ ok: true, accion: 'eliminado', responsable: responsable.nombre });
    }

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResp({ error: msg }, 500);
  }

  return jsonResp({ error: 'Acción no reconocida.' }, 400);
});
