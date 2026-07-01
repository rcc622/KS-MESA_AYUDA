// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: /ia  ·  Asistente IA (Llama + Qwen, en Groq) con tool use
// ─────────────────────────────────────────────────────────────────────────────
// Por qué vive aquí (Supabase Edge Function) y no en Vercel:
//   • Está PEGADA a los datos → menos latencia y sin costo de egress.
//   • Hereda Auth/RLS: corre con el JWT del usuario que llama, así que las
//     consultas respetan Row-Level Security (un cliente jamás ve datos de otro).
//   • Las LLAVES de IA viven como SECRETOS aquí, nunca en el navegador.
//
// Proveedor AGNÓSTICO: el front manda `provider: 'llama' | 'qwen'`. Ambos corren en
// Groq (API compatible con OpenAI) con un solo runner. Se usan para comparar qué IA
// da mejores resultados. NOTA: el motor Claude/Anthropic se quitó a propósito para no
// gastar la cuenta personal de Claude (ver BASES/Roadmap_IA_y_Plataforma.md).
//
// Secretos requeridos (Supabase → Project Settings → Edge Functions → Secrets):
//   GROQ_API_KEY   (corre Llama Y Qwen; única llave necesaria)
//   QWEN_API_KEY / QWEN_BASE_URL / QWEN_MODEL  (opcionales: Qwen en otro proveedor)
// SUPABASE_URL y SUPABASE_ANON_KEY los inyecta Supabase automáticamente.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_ITERACIONES = 6; // tope del loop de tool use (anti-bucle infinito)

// ── Motores compatibles con OpenAI (Llama y Qwen) ────────────────────────────
// Llama vía Groq:
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const LLAMA_MODEL = 'llama-3.3-70b-versatile';
// Qwen: por defecto corre en GROQ (mismo proveedor que Llama) → reutiliza GROQ_API_KEY,
// no necesitas otra llave. El host y el modelo se pueden cambiar con secretos
// QWEN_BASE_URL / QWEN_MODEL sin tocar el código (ej. Together.ai u OpenRouter).
const QWEN_URL = (Deno.env.get('QWEN_BASE_URL') || 'https://api.groq.com/openai/v1') + '/chat/completions';
const QWEN_MODEL = Deno.env.get('QWEN_MODEL') || 'qwen/qwen3-32b'; // Qwen 3 32B en Groq

// ── HERRAMIENTAS (esquema neutral, se traduce a cada proveedor) ──────────────
// Todas son SOLO LECTURA en esta v1. Corren con el cliente Supabase del usuario,
// así que respetan RLS automáticamente.
const TOOLS = [
  {
    name: 'resumen_kpis',
    description: 'Devuelve un conteo general de proyectos por estatus (activos, por instalar, reagendados, completados, críticos >15 días, sin cuadrilla asignada). Úsalo para preguntas de panorama general como "cómo vamos" o "cuántas instalaciones hay".',
    schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'listar_proyectos',
    description: 'Lista proyectos con filtros opcionales. Devuelve folio, cliente, estatus, zona, fecha de agenda y días en etapa. Úsalo para "qué tengo pendiente", "proyectos en Monterrey", "instalaciones de esta semana", etc.',
    schema: {
      type: 'object',
      properties: {
        estatus: { type: 'string', description: 'Filtra por estatus exacto (ej. agendado, en_progreso, reagendado, completado, cancelado).' },
        zona: { type: 'string', description: 'Filtra por zona (MTY, SLT, TRC, MVA, SML).' },
        limite: { type: 'integer', description: 'Máximo de filas (por defecto 25, máximo 100).' },
      },
      required: [],
    },
  },
  {
    name: 'detalle_proyecto',
    description: 'Trae el detalle completo de UN proyecto por su folio, incluyendo cliente, equipo, fechas, cuadrilla y sus últimos movimientos de bitácora. Úsalo cuando el usuario menciona un folio o pide el estatus de un proyecto específico.',
    schema: {
      type: 'object',
      properties: { folio: { type: 'string', description: 'Folio del proyecto, ej. KS-2026-0001 o SEED-04.' } },
      required: ['folio'],
    },
  },
  {
    name: 'bitacora_proyecto',
    description: 'Devuelve los movimientos (bitácora) de un proyecto por folio, del más reciente al más antiguo. Úsalo para "qué ha pasado con", "resúmeme la bitácora de", historial de un proyecto.',
    schema: {
      type: 'object',
      properties: {
        folio: { type: 'string', description: 'Folio del proyecto.' },
        limite: { type: 'integer', description: 'Máximo de movimientos (por defecto 15).' },
      },
      required: ['folio'],
    },
  },
];

const SYSTEM_PROMPT = (hoy: string) => `Eres el Asistente de la Mesa de Control de KENET Solar (módulo Instalaciones Domésticas). Hoy es ${hoy}.

Tu trabajo es ayudar al equipo interno (admin, PM, coordinador, instalador) a consultar el estatus real de las instalaciones, resumir bitácoras y dar panorama general.

REGLAS:
- Responde SIEMPRE en español de México, claro y conciso. Eres operativo, no formal.
- NUNCA inventes datos. Si necesitas un dato (estatus, folios, conteos, bitácora), USA las herramientas para traerlo de la base real. Si una herramienta no devuelve nada, dilo con honestidad.
- Cuando cites proyectos, usa el folio y el nombre del cliente.
- Para fechas, interpreta en relación a hoy (${hoy}). "Esta semana", "hoy", "atrasados", etc.
- Sé breve: viñetas y números, no párrafos largos. El equipo lo lee desde el celular.
- Solo tienes acceso de LECTURA. Si te piden crear/editar/cancelar algo, explica que eso se hace en la sección correspondiente de la plataforma (Agenda, Detalle, etc.), tú aún no escribes datos.`;

// ── EJECUCIÓN DE HERRAMIENTAS (compartida entre proveedores) ─────────────────
async function ejecutarTool(supabase: any, nombre: string, input: any): Promise<any> {
  try {
    if (nombre === 'resumen_kpis') {
      const { data, error } = await supabase
        .from('proyectos')
        .select('estatus, dias_en_etapa, cuadrilla_id');
      if (error) throw error;
      const rows = data || [];
      const activos = rows.filter((p: any) => !['completado', 'cancelado'].includes(p.estatus));
      return {
        total: rows.length,
        activos: activos.length,
        por_instalar: rows.filter((p: any) => p.estatus === 'agendado').length,
        en_progreso: rows.filter((p: any) => p.estatus === 'en_progreso').length,
        reagendados: rows.filter((p: any) => p.estatus === 'reagendado').length,
        completados: rows.filter((p: any) => p.estatus === 'completado').length,
        cancelados: rows.filter((p: any) => p.estatus === 'cancelado').length,
        criticos_mas_15_dias: activos.filter((p: any) => (p.dias_en_etapa ?? 0) > 15).length,
        sin_cuadrilla: activos.filter((p: any) => !p.cuadrilla_id).length,
      };
    }

    if (nombre === 'listar_proyectos') {
      const limite = Math.min(Math.max(parseInt(input?.limite ?? 25, 10) || 25, 1), 100);
      let q = supabase
        .from('proyectos')
        .select('folio, cliente, estatus, zona, fecha_agenda, dias_en_etapa')
        .order('created_at', { ascending: false })
        .limit(limite);
      if (input?.estatus) q = q.eq('estatus', String(input.estatus));
      if (input?.zona) q = q.eq('zona', String(input.zona));
      const { data, error } = await q;
      if (error) throw error;
      return { cuenta: data?.length || 0, proyectos: data || [] };
    }

    if (nombre === 'detalle_proyecto') {
      const folio = String(input?.folio || '').trim();
      if (!folio) return { error: 'Falta el folio.' };
      const { data: proyecto, error } = await supabase
        .from('proyectos')
        .select('*, cuadrilla:cuadrillas(nombre, zona)')
        .eq('folio', folio)
        .maybeSingle();
      if (error) throw error;
      if (!proyecto) return { encontrado: false, mensaje: `No existe un proyecto con folio ${folio}.` };
      const { data: bitacora } = await supabase
        .from('bitacora')
        .select('tipo, descripcion, created_at')
        .eq('proyecto_id', proyecto.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return { encontrado: true, proyecto, ultimos_movimientos: bitacora || [] };
    }

    if (nombre === 'bitacora_proyecto') {
      const folio = String(input?.folio || '').trim();
      const limite = Math.min(Math.max(parseInt(input?.limite ?? 15, 10) || 15, 1), 50);
      if (!folio) return { error: 'Falta el folio.' };
      const { data: proyecto, error: e1 } = await supabase
        .from('proyectos').select('id, cliente').eq('folio', folio).maybeSingle();
      if (e1) throw e1;
      if (!proyecto) return { encontrado: false, mensaje: `No existe un proyecto con folio ${folio}.` };
      const { data, error } = await supabase
        .from('bitacora')
        .select('tipo, descripcion, created_at, usuario:usuarios(nombre)')
        .eq('proyecto_id', proyecto.id)
        .order('created_at', { ascending: false })
        .limit(limite);
      if (error) throw error;
      return { encontrado: true, cliente: proyecto.cliente, movimientos: data || [] };
    }

    return { error: `Herramienta desconocida: ${nombre}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// NOTA: el motor Claude (Anthropic) se quitó a propósito de la plataforma para no
// gastar/contaminar la cuenta personal de Claude mientras se testean IAs. Solo se usan
// motores en Groq (Llama y Qwen). Si en el futuro se quiere reactivar Claude, conviene
// hacerlo con una cuenta/llave de servicio dedicada (no personal). El historial en git
// conserva la implementación previa de `correrClaude`.

// ── PROVEEDORES compatibles con OpenAI (Llama/Groq y Qwen) ───────────────────
// Un solo runner sirve para cualquier API estilo OpenAI: solo cambian url, modelo y key.
async function correrOpenAICompat(
  supabase: any, historial: any[], system: string,
  apiKey: string, url: string, model: string, etiqueta: string,
) {
  const tools = TOOLS.map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.schema },
  }));
  const messages: any[] = [{ role: 'system', content: system }, ...historial.map(m => ({ role: m.role, content: m.content }))];
  const usadas: string[] = [];

  for (let i = 0; i < MAX_ITERACIONES; i++) {
    const cuerpo: any = { model, messages, tools, tool_choice: 'auto', temperature: 0.3 };
    // Solo Qwen (modelo de razonamiento en Groq) acepta reasoning_format; 'hidden' oculta
    // su cadena de pensamiento. OJO: Llama NO lo soporta y devuelve 400 si se le manda.
    if (url.includes('groq.com') && etiqueta === 'qwen') cuerpo.reasoning_format = 'hidden';
    const payload = JSON.stringify(cuerpo);
    const opts = { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' }, body: payload };
    let resp = await fetch(url, opts);
    // Límite por minuto (planes gratis): si topa, espera lo sugerido y reintenta UNA vez.
    if (resp.status === 429) {
      const ra = parseFloat(resp.headers.get('retry-after') || '0');
      await new Promise(r => setTimeout(r, Math.min((ra > 0 ? ra : 8), 12) * 1000));
      resp = await fetch(url, opts);
    }
    if (resp.status === 429) {
      throw new Error(`El motor ${etiqueta} llegó a su límite por minuto (plan gratis). Espera ~30 segundos y reintenta, o cambia de motor.`);
    }
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`${etiqueta} ${resp.status}: ${txt}`);
    }
    const data = await resp.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error(`${etiqueta}: respuesta vacía`);

    if (msg.tool_calls?.length) {
      messages.push(msg); // turno del asistente con los tool_calls
      for (const tc of msg.tool_calls) {
        usadas.push(tc.function.name);
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* args vacíos */ }
        const resultado = await ejecutarTool(supabase, tc.function.name, args);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(resultado) });
      }
      continue;
    }

    return { reply: (msg.content || '(sin respuesta)').trim(), usadas, provider: etiqueta };
  }
  return { reply: 'No pude completar la consulta (demasiados pasos).', usadas, provider: etiqueta };
}

// ── FASE 2: MAPEO INTELIGENTE DE COLUMNAS (importación) ──────────────────────
// Dado un Excel "sucio" (columnas arbitrarias) + filas de muestra, propone cómo
// mapear cada columna de origen a los campos del esquema KENET. NO escribe nada:
// solo devuelve el mapeo para que el humano lo revise antes de importar.
const CAMPOS_DESTINO = [
  'folio (OBLIGATORIO)', 'folio_odoo', 'cliente (OBLIGATORIO)', 'telefono', 'direccion',
  'zona (MTY/SLT/TRC/MVA)', 'fecha_agenda (YYYY-MM-DD)', 'paneles (entero)',
  'panel_potencia_w', 'panel_marca', 'inversor_tipo (inversor|microinversor)',
  'inversor_cantidad', 'inversor_capacidad_kw', 'inversor_marca', 'notas',
];

async function mapearColumnas(provider: string, columnas: string[], muestra: any[]) {
  const usarQwen = provider === 'qwen';
  const url = usarQwen ? QWEN_URL : GROQ_URL;
  const model = usarQwen ? QWEN_MODEL : LLAMA_MODEL;
  const key = (usarQwen ? Deno.env.get('QWEN_API_KEY') : null) || Deno.env.get('GROQ_API_KEY');
  if (!key) throw new Error('Falta GROQ_API_KEY en Supabase.');

  const sys = `Eres un asistente que mapea las columnas de un Excel arbitrario al esquema de importación de proyectos de KENET Solar. Campos DESTINO disponibles:\n- ${CAMPOS_DESTINO.join('\n- ')}\n\nDevuelve SOLO un objeto JSON con esta forma exacta:\n{"mapping": {"<columna_de_origen>": "<campo_destino_sin_paréntesis_o_null>"}, "notas": "una línea"}\nReglas: usa el nombre simple del campo destino (ej. "fecha_agenda", "inversor_tipo"). Si una columna de origen no corresponde a ningún campo, su valor es null. No inventes columnas que no estén en la lista de origen.`;
  const userMsg = `Columnas de origen: ${JSON.stringify(columnas)}\nFilas de muestra (para entender el contenido): ${JSON.stringify(muestra)}\nDevuelve el JSON de mapeo.`;

  // NOTA: no usamos response_format:'json_object' porque Groq lo valida en duro y
  // devuelve 400 (json_validate_failed) cuando el modelo no acierta el JSON perfecto.
  // En vez de eso pedimos JSON en el prompt y lo parseamos de forma tolerante.
  const cuerpo: any = {
    model,
    messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
    temperature: 0.1,
  };
  // Solo Qwen acepta reasoning_format (Llama devuelve 400 si se le manda).
  if (url.includes('groq.com') && usarQwen) cuerpo.reasoning_format = 'hidden';

  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  if (resp.status === 429) throw new Error('El motor de IA llegó a su límite por minuto. Espera ~30 segundos y reintenta.');
  if (!resp.ok) { const txt = await resp.text(); throw new Error(`IA ${resp.status}: ${txt}`); }
  const data = await resp.json();
  // Parseo tolerante: quita fences ```json y extrae el objeto { ... }.
  const raw = data.choices?.[0]?.message?.content || '{}';
  const limpio = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const ini = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  const jsonStr = (ini >= 0 && fin > ini) ? limpio.slice(ini, fin + 1) : limpio;
  let parsed: any = {};
  try { parsed = JSON.parse(jsonStr); } catch { parsed = {}; }
  return { mapping: parsed.mapping || {}, notas: parsed.notas || '', provider };
}

// ── HANDLER ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autenticado.' }), { status: 401, headers: { ...CORS, 'content-type': 'application/json' } });
    }

    // Cliente Supabase con el JWT del usuario → respeta RLS en cada consulta.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida.' }), { status: 401, headers: { ...CORS, 'content-type': 'application/json' } });
    }

    const body = await req.json();
    // Motores soportados: 'llama' y 'qwen' (ambos en Groq). 'llama' es el default.
    const provider = body?.provider === 'qwen' ? 'qwen' : 'llama';

    // ── Tarea: MAPEO INTELIGENTE DE COLUMNAS (Fase 2, import) ────────────────
    if (body?.tarea === 'mapear_columnas') {
      const columnas = Array.isArray(body?.columnas) ? body.columnas.map(String).slice(0, 80) : [];
      const muestra = Array.isArray(body?.muestra) ? body.muestra.slice(0, 5) : [];
      if (!columnas.length) {
        return new Response(JSON.stringify({ error: 'No se recibieron columnas de origen.' }), { status: 400, headers: { ...CORS, 'content-type': 'application/json' } });
      }
      const out = await mapearColumnas(provider, columnas, muestra);
      return new Response(JSON.stringify(out), { headers: { ...CORS, 'content-type': 'application/json' } });
    }

    const historial = Array.isArray(body?.messages) ? body.messages : [];
    // Sanea el historial: solo roles válidos y contenido string.
    const limpio = historial
      .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
      .slice(-12); // tope de contexto (menos historial = menos tokens/min, ayuda con el límite de Groq)
    if (!limpio.length) {
      return new Response(JSON.stringify({ error: 'Mensaje vacío.' }), { status: 400, headers: { ...CORS, 'content-type': 'application/json' } });
    }

    const hoy = new Date().toISOString().slice(0, 10);
    const system = SYSTEM_PROMPT(hoy);

    let salida;
    if (provider === 'qwen') {
      // Qwen corre en Groq por defecto → usa GROQ_API_KEY si no hay QWEN_API_KEY aparte.
      const key = Deno.env.get('QWEN_API_KEY') || Deno.env.get('GROQ_API_KEY');
      if (!key) throw new Error('Falta QWEN_API_KEY o GROQ_API_KEY en Supabase (para usar Qwen).');
      salida = await correrOpenAICompat(supabase, limpio, system, key, QWEN_URL, QWEN_MODEL, 'qwen');
    } else {
      const key = Deno.env.get('GROQ_API_KEY');
      if (!key) throw new Error('Falta el secreto GROQ_API_KEY en Supabase (para usar Llama).');
      salida = await correrOpenAICompat(supabase, limpio, system, key, GROQ_URL, LLAMA_MODEL, 'llama');
    }

    return new Response(JSON.stringify(salida), { headers: { ...CORS, 'content-type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...CORS, 'content-type': 'application/json' } });
  }
});
