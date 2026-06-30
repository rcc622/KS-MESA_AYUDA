import { useState, useEffect, useCallback } from 'react';
import { getTodosUsuarios, crearUsuarioConCuenta, actualizarUsuarioPerfil, mensajeError } from '../lib/api';
import Modal from '../components/Modal';

const ROLES = [
  { value: 'admin',        label: 'Administrador' },
  { value: 'pm_domestico', label: 'PM Doméstico' },
  { value: 'coordinador',  label: 'Coordinador' },
  { value: 'instalador',   label: 'Instalador' },
];
const ZONAS = ['MTY', 'SLT', 'TRC', 'MVA'];

const ROL_BADGE = {
  admin:        { bg: '#EDE9FE', color: '#6B4E9B' },
  pm_domestico: { bg: '#EAF2F9', color: '#1F4E79' },
  coordinador:  { bg: '#FFF8EC', color: '#F5A623' },
  instalador:   { bg: '#F0FBF4', color: '#2E9E5B' },
};

const FORM_VACIO = { nombre: '', email: '', password: '', rol: 'pm_domestico', zona: 'MTY', activo: true };

// Genera una contraseña temporal legible (el usuario puede cambiarla después)
function generarPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

export default function VistaG_Usuarios({ usuarioActual }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(null); // usuario a editar
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      setUsuarios(await getTodosUsuarios());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Protección: solo admins. Va DESPUÉS de los hooks para no romper las reglas
  // de React (los hooks deben llamarse siempre en el mismo orden).
  if (usuarioActual?.rol !== 'admin') {
    return (
      <div className="page-body">
        <div className="empty-state">
          <div className="es-icon">🔒</div>
          <p>Acceso restringido. Solo administradores pueden gestionar usuarios.</p>
        </div>
      </div>
    );
  }

  const abrirEditar = (u) => {
    setForm({ nombre: u.nombre, email: u.email, rol: u.rol, zona: u.zona || 'MTY', activo: u.activo });
    setModalEditar(u);
  };

  const handleCrear = async () => {
    if (!form.nombre || !form.email || !form.password) return;
    setGuardando(true);
    try {
      await crearUsuarioConCuenta(form);
      setModalCrear(false);
      setForm(FORM_VACIO);
      cargar();
    } catch (e) { alert(mensajeError(e)); }
    finally { setGuardando(false); }
  };

  const handleEditar = async () => {
    setGuardando(true);
    try {
      await actualizarUsuarioPerfil(modalEditar.id, {
        nombre: form.nombre,
        rol:    form.rol,
        zona:   form.zona || null,
        activo: form.activo,
      });
      setModalEditar(null);
      cargar();
    } catch (e) { alert(mensajeError(e)); }
    finally { setGuardando(false); }
  };

  const handleToggleActivo = async (u) => {
    try {
      await actualizarUsuarioPerfil(u.id, { activo: !u.activo });
      cargar();
    } catch (e) { alert(mensajeError(e)); }
  };

  const activos   = usuarios.filter(u => u.activo).length;
  const inactivos = usuarios.filter(u => !u.activo).length;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>👤 Gestión de Usuarios</h2>
          <div className="sub">Perfiles, roles y permisos de acceso · Solo administradores</div>
        </div>
        <button className="btn btn-ambar" onClick={() => { setForm(FORM_VACIO); setModalCrear(true); }}>
          + Nuevo usuario
        </button>
      </div>

      <div className="page-body">
        <div className="stats-row">
          <div className="stat-card"><div className="stat-val">{usuarios.length}</div><div className="stat-label">Total usuarios</div></div>
          <div className="stat-card verde"><div className="stat-val">{activos}</div><div className="stat-label">Activos</div></div>
          <div className="stat-card rojo"><div className="stat-val">{inactivos}</div><div className="stat-label">Inactivos</div></div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="es-icon">⏳</div><p>Cargando…</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Zona</th>
                  <th>Estatus</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-gray" style={{ padding: 32 }}>Sin usuarios registrados</td></tr>
                )}
                {usuarios.map(u => {
                  const rb = ROL_BADGE[u.rol] || { bg: '#F3F4F6', color: '#374151' };
                  const esTuPerfil = u.email === usuarioActual?.email;
                  return (
                    <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.5 }}>
                      <td>
                        <div className="fw-600">{u.nombre}</div>
                        {esTuPerfil && <div className="text-xs" style={{ color: 'var(--ambar)' }}>Tu cuenta</div>}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--gris-secundario)' }}>{u.email}</td>
                      <td>
                        <span className="badge" style={{ background: rb.bg, color: rb.color }}>
                          {ROLES.find(r => r.value === u.rol)?.label || u.rol}
                        </span>
                      </td>
                      <td>
                        {u.zona
                          ? <span className="badge badge-zona">{u.zona}</span>
                          : <span className="text-gray" style={{ fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        <label className="toggle" title={u.activo ? 'Desactivar' : 'Activar'}>
                          <input
                            type="checkbox"
                            checked={u.activo}
                            onChange={() => handleToggleActivo(u)}
                            disabled={esTuPerfil}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => abrirEditar(u)}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Modal: crear usuario */}
      <Modal
        open={modalCrear}
        onClose={() => setModalCrear(false)}
        title="Nuevo perfil de usuario"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalCrear(false)}>Cancelar</button>
            <button className="btn btn-ambar" onClick={handleCrear} disabled={!form.nombre || !form.email || !form.password || guardando}>
              {guardando ? 'Creando…' : 'Crear usuario'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Nombre completo</label>
          <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Juan Pérez" required />
        </div>
        <div className="form-group">
          <label>Correo electrónico</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@kenetsolar.com" required />
        </div>
        <div className="form-group">
          <label>Contraseña temporal</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm(f => ({ ...f, password: generarPassword() }))}>
              Generar
            </button>
          </div>
          {form.password && (
            <div className="text-xs" style={{ color: 'var(--gris-secundario)', marginTop: 4 }}>
              Cópiala y compártesela al usuario — no se vuelve a mostrar después de crear la cuenta.
            </div>
          )}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Rol</label>
            <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Zona</label>
            <select value={form.zona} onChange={e => setForm(f => ({ ...f, zona: e.target.value }))}>
              <option value="">Sin zona</option>
              {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Modal: editar usuario */}
      <Modal
        open={!!modalEditar}
        onClose={() => setModalEditar(null)}
        title={`Editar: ${modalEditar?.nombre}`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModalEditar(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleEditar} disabled={!form.nombre || guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Nombre completo</label>
          <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
        </div>
        <div className="form-group">
          <label>Correo <span className="text-gray text-xs">(no editable aquí)</span></label>
          <input value={form.email} disabled style={{ opacity: 0.5 }} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Rol</label>
            <select
              value={form.rol}
              onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
              disabled={modalEditar?.email === usuarioActual?.email}
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Zona</label>
            <select value={form.zona} onChange={e => setForm(f => ({ ...f, zona: e.target.value }))}>
              <option value="">Sin zona</option>
              {ZONAS.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        </div>
        {modalEditar?.email === usuarioActual?.email && (
          <div style={{ fontSize: 11, color: '#92400E', background: '#FEF3C7', padding: '6px 10px', borderRadius: 6 }}>
            ⚠️ No puedes cambiar tu propio rol ni desactivar tu propia cuenta.
          </div>
        )}
      </Modal>
    </>
  );
}
