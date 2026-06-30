-- ============================================================
-- KENET Solar · Mesa de Control
-- Migración: integración Google Calendar
-- Correr en Supabase SQL Editor
-- ============================================================

-- En usuarios: almacena el refresh token de Google del instalador
-- Se guarda tras el flujo OAuth; permite crear eventos en su nombre
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

-- En proyectos: ID del evento creado en Google Calendar
-- Necesario para actualizarlo al reagendar y eliminarlo al cancelar
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS gcal_event_id TEXT;
