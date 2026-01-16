-- ============================================
-- DATOS DE PRUEBA PARA TITI INVITA
-- ============================================

-- Limpiar datos demo existentes (opcional, comenta si no quieres borrar)
-- DELETE FROM invitados;
-- DELETE FROM mesas;
-- DELETE FROM eventos;

-- Insertar eventos de prueba
INSERT INTO eventos (id_usuario, nombre, descripcion, fecha_evento, ubicacion, estado, configuracion) 
VALUES 
-- Evento 1: Boda
(2, 'Boda de Ana y Carlos', 'Celebración en jardín botánico', '2024-06-15', 'Jardín Botánico', 'activo', '{"mesas": 8, "sillasPorMesa": 8, "formaMesa": "rectangular"}'),
-- Evento 2: Conferencia
(2, 'Conferencia Tech 2024', 'Conferencia anual de tecnología', '2024-07-20', 'Centro de Convenciones', 'activo', '{"mesas": 12, "sillasPorMesa": 6, "formaMesa": "circular"}'),
-- Evento 3: Fiesta
(3, 'Fiesta de Graduación', 'Celebración de graduación universitaria', '2024-08-10', 'Salón de Eventos', 'activo', '{"mesas": 6, "sillasPorMesa": 10, "formaMesa": "rectangular"}'),
-- Evento 4: Corporativo
(4, 'Reunión Corporativa Q3', 'Reunión trimestral de la empresa', '2024-09-05', 'Oficinas Centrales', 'activo', '{"mesas": 4, "sillasPorMesa": 8, "formaMesa": "cuadrada"}')
ON CONFLICT DO NOTHING;

-- Insertar mesas para el primer evento
INSERT INTO mesas (id_evento, nombre, forma, sillas) 
VALUES 
-- Mesas para evento 1 (Boda)
(1, 'Mesa Principal', 'rectangular', '[{"id":1,"estado":"confirmado","nombre":"Ana López"},{"id":2,"estado":"confirmado","nombre":"Carlos Ruiz"}]'),
(1, 'Mesa Familiar', 'circular', '[{"id":1,"estado":"asignado","nombre":"María González"},{"id":2,"estado":"sin-asignar","nombre":""}]'),
(1, 'Mesa Amigos', 'rectangular', '[{"id":1,"estado":"asignado","nombre":"Pedro Hernández"},{"id":2,"estado":"pendiente","nombre":"Laura Martínez"}]'),
-- Mesas para evento 2 (Conferencia)
(2, 'Mesa Ponentes', 'circular', '[{"id":1,"estado":"confirmado","nombre":"Dr. Sánchez"},{"id":2,"estado":"confirmado","nombre":"Dra. López"}]'),
(2, 'Mesa Invitados', 'circular', '[{"id":1,"estado":"asignado","nombre":"Ing. Gómez"},{"id":2,"estado":"asignado","nombre":"Lic. Ramírez"}]')
ON CONFLICT DO NOTHING;

-- Insertar invitados
INSERT INTO invitados (id_evento, nombre, email, telefono, id_mesa, id_silla, estado) 
VALUES 
-- Invitados para evento 1
(1, 'Ana López', 'ana@email.com', '555-0101', 1, 1, 'confirmado'),
(1, 'Carlos Ruiz', 'carlos@email.com', '555-0102', 1, 2, 'confirmado'),
(1, 'María González', 'maria@email.com', '555-0103', 2, 1, 'asignado'),
(1, 'Pedro Hernández', 'pedro@email.com', '555-0104', 3, 1, 'asignado'),
(1, 'Laura Martínez', 'laura@email.com', '555-0105', 3, 2, 'pendiente'),
-- Invitados para evento 2
(2, 'Dr. Sánchez', 'sanchezd@tech.com', '555-0201', 4, 1, 'confirmado'),
(2, 'Dra. López', 'lopezm@tech.com', '555-0202', 4, 2, 'confirmado'),
(2, 'Ing. Gómez', 'gomeza@empresa.com', '555-0203', 5, 1, 'asignado'),
(2, 'Lic. Ramírez', 'ramirezl@corp.com', '555-0204', 5, 2, 'asignado'),
-- Más invitados sin asignar
(1, 'Roberto Castro', 'roberto@email.com', '555-0106', NULL, NULL, 'pendiente'),
(1, 'Sofía Mendoza', 'sofia@email.com', '555-0107', NULL, NULL, 'pendiente'),
(2, 'David Ortega', 'david@tech.com', '555-0205', NULL, NULL, 'pendiente')
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICACIÓN DE DATOS INSERTADOS
-- ============================================
DO $$
DECLARE
    user_count INTEGER;
    event_count INTEGER;
    mesa_count INTEGER;
    guest_count INTEGER;
BEGIN
    -- Contar registros
    SELECT COUNT(*) INTO user_count FROM usuarios;
    SELECT COUNT(*) INTO event_count FROM eventos;
    SELECT COUNT(*) INTO mesa_count FROM mesas;
    SELECT COUNT(*) INTO guest_count FROM invitados;
    
    RAISE NOTICE '=========================================';
    RAISE NOTICE '📊 DATOS DE PRUEBA INSERTADOS:';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '👤 Usuarios: %', user_count;
    RAISE NOTICE '🎪 Eventos: %', event_count;
    RAISE NOTICE '🪑 Mesas: %', mesa_count;
    RAISE NOTICE '👥 Invitados: %', guest_count;
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✅ Seed completado exitosamente!';
    RAISE NOTICE '=========================================';
END $$;