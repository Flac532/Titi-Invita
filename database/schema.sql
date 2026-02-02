-- ============================================
-- Titi Invita - Sistema de Control de Mesas
-- Base de Datos PostgreSQL v2.0
-- ============================================

-- Eliminar tablas existentes si hay conflictos
DROP TABLE IF EXISTS invitados CASCADE;
DROP TABLE IF EXISTS mesas CASCADE;
DROP TABLE IF EXISTS eventos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ============================================
-- TABLA DE USUARIOS
-- ============================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('admin', 'cliente', 'organizador')) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    limite_eventos INTEGER DEFAULT NULL, -- NULL = ilimitado, 1 = un evento
    avatar VARCHAR(10),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA DE EVENTOS
-- ============================================
CREATE TABLE eventos (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_evento DATE,
    hora_evento TIME,
    ubicacion VARCHAR(200),
    estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'activo', 'completado', 'cancelado')),
    num_mesas INTEGER DEFAULT 0,
    sillas_por_mesa INTEGER DEFAULT 8,
    forma_mesa VARCHAR(20) DEFAULT 'rectangular',
    configuracion JSONB DEFAULT '{}',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA DE MESAS
-- ============================================
CREATE TABLE mesas (
    id SERIAL PRIMARY KEY,
    id_evento INTEGER REFERENCES eventos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    forma VARCHAR(20) DEFAULT 'rectangular' CHECK (forma IN ('rectangular', 'circular', 'cuadrada')),
    posicion_x INTEGER DEFAULT 0,
    posicion_y INTEGER DEFAULT 0,
    sillas JSONB NOT NULL DEFAULT '[]',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA DE INVITADOS
-- ============================================
CREATE TABLE invitados (
    id SERIAL PRIMARY KEY,
    id_evento INTEGER REFERENCES eventos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(20),
    id_mesa INTEGER REFERENCES mesas(id) ON DELETE SET NULL,
    silla_numero INTEGER,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'asignado', 'confirmado', 'rechazado')),
    fecha_invitacion TIMESTAMP,
    fecha_confirmacion TIMESTAMP,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES para mejor performance
-- ============================================
CREATE INDEX idx_eventos_usuario ON eventos(id_usuario);
CREATE INDEX idx_eventos_estado ON eventos(estado);
CREATE INDEX idx_mesas_evento ON mesas(id_evento);
CREATE INDEX idx_invitados_evento ON invitados(id_evento);
CREATE INDEX idx_invitados_email ON invitados(email);
CREATE INDEX idx_invitados_mesa ON invitados(id_mesa);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_activo ON usuarios(activo) WHERE activo = true;

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar fecha_actualizacion
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar timestamp
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eventos_updated_at
    BEFORE UPDATE ON eventos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Hash para la contraseña "Titi-apps2026@!"
-- Generado con bcrypt, salt rounds = 10

-- Usuario Admin
INSERT INTO usuarios (nombre, email, password_hash, rol, activo, limite_eventos, avatar) 
VALUES (
    'Jorge Flores', 
    'jorge.flores@titi-app.com', 
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 
    'admin', 
    true,
    NULL,
    'JF'
) ON CONFLICT (email) DO NOTHING;

-- Usuario Cliente (límite: 1 evento)
INSERT INTO usuarios (nombre, email, password_hash, rol, activo, limite_eventos, avatar) 
VALUES (
    'María González', 
    'cliente@ejemplo.com', 
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 
    'cliente', 
    true,
    1,
    'MG'
) ON CONFLICT (email) DO NOTHING;

-- Usuario Organizador (eventos ilimitados)
INSERT INTO usuarios (nombre, email, password_hash, rol, activo, limite_eventos, avatar) 
VALUES (
    'Carlos Organizador', 
    'organizador@ejemplo.com', 
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 
    'organizador', 
    true,
    NULL,
    'CO'
) ON CONFLICT (email) DO NOTHING;

-- Más usuarios de ejemplo
INSERT INTO usuarios (nombre, email, password_hash, rol, activo, limite_eventos, avatar) 
VALUES 
    ('Ana Martínez', 'ana.m@eventos.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'cliente', true, 1, 'AM'),
    ('Pedro López', 'pedro.l@empresa.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'organizador', true, NULL, 'PL'),
    ('Laura Sánchez', 'laura.s@email.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'cliente', false, 1, 'LS')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $$
DECLARE
    user_count INTEGER;
    admin_count INTEGER;
    cliente_count INTEGER;
    organizador_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM usuarios;
    SELECT COUNT(*) INTO admin_count FROM usuarios WHERE rol = 'admin';
    SELECT COUNT(*) INTO cliente_count FROM usuarios WHERE rol = 'cliente';
    SELECT COUNT(*) INTO organizador_count FROM usuarios WHERE rol = 'organizador';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Base de datos Titi Invita inicializada';
    RAISE NOTICE '👤 Total usuarios: %', user_count;
    RAISE NOTICE '   - Admins: %', admin_count;
    RAISE NOTICE '   - Clientes: %', cliente_count;
    RAISE NOTICE '   - Organizadores: %', organizador_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔑 Credenciales de prueba:';
    RAISE NOTICE '   Admin: jorge.flores@titi-app.com';
    RAISE NOTICE '   Cliente: cliente@ejemplo.com';
    RAISE NOTICE '   Organizador: organizador@ejemplo.com';
    RAISE NOTICE '   Contraseña para todos: Titi-apps2026@!';
    RAISE NOTICE '========================================';
END $$;
