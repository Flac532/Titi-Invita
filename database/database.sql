-- ============================================
-- Titi Invita - Sistema de Control de Mesas
-- Base de Datos PostgreSQL (CORREGIDO - SIN ERRORES $$)
-- ============================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('admin', 'cliente')),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de eventos
CREATE TABLE IF NOT EXISTS eventos (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_evento DATE,
    ubicacion VARCHAR(200),
    estado VARCHAR(20) DEFAULT 'activo',
    configuracion JSONB DEFAULT '{}',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de mesas
CREATE TABLE IF NOT EXISTS mesas (
    id SERIAL PRIMARY KEY,
    id_evento INTEGER REFERENCES eventos(id) ON DELETE CASCADE,
    nombre VARCHAR(100),
    forma VARCHAR(20),
    posicion_x INTEGER,
    posicion_y INTEGER,
    sillas JSONB NOT NULL DEFAULT '[]',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de invitados
CREATE TABLE IF NOT EXISTS invitados (
    id SERIAL PRIMARY KEY,
    id_evento INTEGER REFERENCES eventos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    telefono VARCHAR(20),
    id_mesa INTEGER,
    silla_numero INTEGER,  -- CORREGIDO: era id_silla
    estado VARCHAR(20) DEFAULT 'pendiente',
    fecha_invitacion TIMESTAMP,
    fecha_confirmacion TIMESTAMP,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES para mejor performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_eventos_usuario ON eventos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_mesas_evento ON mesas(id_evento);
CREATE INDEX IF NOT EXISTS idx_invitados_evento ON invitados(id_evento);
CREATE INDEX IF NOT EXISTS idx_invitados_email ON invitados(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo) WHERE activo = true;

-- ============================================
-- FUNCIÓN Y TRIGGER CORREGIDOS (SIN ERROR $$)
-- ============================================

-- Función para actualizar fecha_actualizacion (CORREGIDA)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS
$$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para usuarios (CORREGIDO)
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS INICIALES (USANDO bcrypt PARA LA CONTRASEÑA)
-- ============================================

-- NOTA: El hash es para la contraseña "Titi-apps2026@!"
-- Hash generado con: bcrypt.hash('Titi-apps2026@!', 10)

-- Insertar usuario admin inicial
INSERT INTO usuarios (nombre, email, password_hash, rol, activo) 
VALUES (
    'Jorge Flores', 
    'jorge.flores@titi-app.com', 
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 
    'admin', 
    true
) ON CONFLICT (email) DO NOTHING;

-- Insertar usuario cliente demo
INSERT INTO usuarios (nombre, email, password_hash, rol, activo) 
VALUES (
    'Cliente Demo', 
    'cliente@ejemplo.com', 
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 
    'cliente', 
    true
) ON CONFLICT (email) DO NOTHING;

-- Insertar más usuarios demo
INSERT INTO usuarios (nombre, email, password_hash, rol, activo) 
VALUES 
    ('María González', 'maria.gonzalez@empresa.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'cliente', true),
    ('Carlos Ruiz', 'carlos.ruiz@eventos.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'cliente', true),
    ('Ana Martínez', 'ana.m@correo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'cliente', false)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
DO
$$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM usuarios;
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Base de datos Titi Invita configurada';
    RAISE NOTICE '👤 Usuarios creados: %', user_count;
    RAISE NOTICE '🔑 Credenciales demo:';
    RAISE NOTICE '   - jorge.flores@titi-app.com';
    RAISE NOTICE '   - cliente@ejemplo.com';
    RAISE NOTICE '   - Contraseña: Titi-apps2026@!';
    RAISE NOTICE '========================================';
END
$$;
