import { supabase } from './supabase';

// Avisa a Cobranza por correo en un hito clave. Es BEST-EFFORT: nunca bloquea ni
// rompe el flujo principal (si el correo falla o no está configurado, solo se registra).
// evento: 'instalacion_terminada' | 'cfe_iniciado' | 'medidor_instalado'
export async function notificarCobranza(evento, proyecto) {
  try {
    const { data, error } = await supabase.functions.invoke('notificar', {
      body: {
        evento,
        proyecto: {
          folio: proyecto?.folio ?? null,
          folio_odoo: proyecto?.folio_odoo ?? null,
          cliente: proyecto?.cliente ?? null,
          zona: proyecto?.zona ?? null,
        },
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  } catch (e) {
    console.warn('[notificarCobranza] no enviado:', e?.message || e);
    return null;
  }
}
