-- Archivo CORREGIDO: database_seed.sql

-- ============================================
-- DATOS DE PRUEBA PARA TITI INVITA (CORREGIDO)
-- ============================================

-- Insertar mesas para el primer evento (CORREGIDO)
INSERT INTO mesas (id_evento, nombre, forma, sillas) 
VALUES 
-- Mesas para evento 1 (Boda)
(1, 'Mesa Principal', 'rectangular', '[{"id":1,"estado":"confirmado","nombre":"Ana López"},{"id":2,"estado":"confirmado","nombre":"Carlos Ruiz"}]') ON CONFLICT DO NOTHING;

INSERT INTO mesas (id_evento, nombre, forma, sillas) 
VALUES 
(1, 'Mesa Familiar', 'circular', '[{"id":1,"estado":"asignado","nombre":"María González"},{"id":2,"estado":"sin-asignar","nombre":""}]') ON CONFLICT DO NOTHING;

INSERT INTO mesas (id_evento, nombre, forma, sillas) 
VALUES 
(1, 'Mesa Amigos', 'rectangular', '[{"id":1,"estado":"asignado","nombre":"Pedro Hernández"},{"id":2,"estado":"pendiente","nombre":"Laura Martínez"}]') ON CONFLICT DO NOTHING;

-- Insertar invitados (CORREGIDO: usar silla_numero en lugar de id_silla)
INSERT INTO invitados (id_evento, nombre, email, telefono, id_mesa, silla_numero, estado) 
VALUES 
-- Invitados para evento 1
(1, 'Ana López', 'ana@email.com', '555-0101', 1, 1, 'confirmado') ON CONFLICT DO NOTHING;

INSERT INTO invitados (id_evento, nombre, email, telefono, id_mesa, silla_numero, estado) 
VALUES 
(1, 'Carlos Ruiz', 'carlos@email.com', '555-0102', 1, 2, 'confirmado') ON CONFLICT DO NOTHING;

INSERT INTO invitados (id_evento, nombre, email, telefono, id_mesa, silla_numero, estado) 
VALUES 
(1, 'María González', 'maria@email.com', '555-0103', 2, 1, 'asignado') ON CONFLICT DO NOTHING;
