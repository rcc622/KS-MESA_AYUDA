import { supabase } from './supabase';

// Llama a la Edge Function `/ia`. supabase.functions.invoke adjunta automáticamente
// el JWT del usuario en el header Authorization → la función respeta RLS.
//
// historial: [{ role: 'user'|'assistant', content: string }, ...]
// opciones.provider: 'claude' (default) | 'llama'
// Devuelve: { reply, usadas: string[], provider }
export async function chatIA(historial, { provider = 'claude' } = {}) {
  const { data, error } = await supabase.functions.invoke('ia', {
    body: { messages: historial, provider },
  });
  // invoke envuelve los errores HTTP; intenta sacar el mensaje real del cuerpo.
  if (error) {
    let detalle = error.message;
    try {
      const ctx = await error.context?.json?.();
      if (ctx?.error) detalle = ctx.error;
    } catch { /* deja el mensaje genérico */ }
    throw new Error(detalle);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
