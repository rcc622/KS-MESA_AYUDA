import { supabase } from './supabase';

// Sube un archivo a Google Drive vía la función drive-upload (OAuth, sin llave JSON).
// dataUrl: "data:<mime>;base64,…" → se manda solo el base64. Best-effort: nunca rompe.
// subcarpeta (opcional): p. ej. el folio del proyecto, para agrupar evidencias.
export async function subirEvidenciaDrive(name, dataUrl, subcarpeta) {
  try {
    const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl || '');
    if (!m) return null;
    const { data, error } = await supabase.functions.invoke('drive-upload', {
      body: { name, mimeType: m[1], dataB64: m[2], subcarpeta },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  } catch (e) {
    console.warn('[drive] no subido:', e?.message || e);
    return null;
  }
}
