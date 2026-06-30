-- Agrega campos de vendedor y correo del cliente a proyectos
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS vendedor TEXT;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS correo_cliente TEXT;
