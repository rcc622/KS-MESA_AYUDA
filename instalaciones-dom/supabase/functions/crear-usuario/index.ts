// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: /crear-usuario
// Da de alta una cuenta de acceso (Supabase Auth) + su perfil (tabla `usuarios`)
// en un solo paso, para que un admin no tenga que entrar manualmente a
// Supabase → Authentication → Users → Add user.
//
// POST /crear-usuario
// Body: { nombre, email, password, rol, zona }
//
// Flujo:
//   1. Verifica que quien llama tiene sesión válida y rol admin.
//   2. Crea la cuenta en Supabase Auth (auth.admin.createUser), ya confirmada.
//   3. Crea el perfil en `usuarios` con ese mismo correo.
//   4. Si falla el paso 3, borra la cuenta de Auth creada en el paso 2
//      (para no dejar una cuenta huérfana sin perfil).
//
// Secretos requeridos:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (inyectados automáticamente)
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

const ROLES_VALIDOS = ['admin', 'pm_domestico', 'coordinador', 'instalador'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResp({ error: 'Método no permitido.' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResp({ error: 'No autenticado.' }, 401);

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) return jsonResp({ error: 'Sesión inválida.' }, 401);

  const { data: solicitante } = await supabaseAdmin
    .from('usuarios')
    .select('rol')
    .eq('email', user.email)
    .maybeSingle();

  if (!solicitante || solicitante.rol !== 'admin') {
    return jsonResp({ error: 'Solo administradores pueden crear usuarios.' }, 403);
  }

  const body = await req.json();
  const { nombre, email, password, rol, zona } = body;

  if (!nombre || !email || !password || !rol) {
    return jsonResp({ error: 'Faltan nombre, email, password o rol.' }, 400);
  }
  if (password.length < 8) {
    return jsonResp({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400);
  }
  if (!ROLES_VALIDOS.includes(rol)) {
    return jsonResp({ error: 'Rol no válido.' }, 400);
  }

  // 1. Crear la cuenta en Supabase Auth, ya confirmada (no requiere verificar email)
  const { data: nuevoAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !nuevoAuthUser?.user) {
    return jsonResp({ error: createError?.message || 'No se pudo crear la cuenta de acceso.' }, 400);
  }

  // 2. Crear el perfil en `usuarios`
  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from('usuarios')
    .insert({ nombre, email, rol, zona: zona || null, activo: true })
    .select()
    .single();

  if (perfilError) {
    // Rollback: no dejar una cuenta de Auth huérfana sin perfil
    await supabaseAdmin.auth.admin.deleteUser(nuevoAuthUser.user.id);
    return jsonResp({ error: `Cuenta creada pero falló el perfil (se revirtió): ${perfilError.message}` }, 400);
  }

  return jsonResp({ ok: true, usuario: perfil });
});
