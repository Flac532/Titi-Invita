-- ============================================
-- Titi Invita - Sistema de Control de Mesas
-- Base de Datos PostgreSQL v3.0
-- ============================================

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
    rol VARCHAR(20) CHECK (rol IN ('admin', 'cliente', 'organizador', 'colaborador')) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    limite_eventos INTEGER DEFAULT NULL,
    avatar VARCHAR(10),
    evento_id INTEGER DEFAULT NULL,          -- Solo para colaboradores: evento asignado
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA DE EVENTOS
-- ============================================
CREATE TABLE eventos (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    organizador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_evento DATE,
    hora_evento TIME,
    ubicacion VARCHAR(200),
    estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'pendiente', 'activo', 'completado', 'finalizado', 'cancelado')),
    motivo_rechazo TEXT,
    num_mesas INTEGER DEFAULT 8,
    sillas_por_mesa INTEGER DEFAULT 8,
    forma_mesa VARCHAR(20) DEFAULT 'rectangular',
    configuracion JSONB DEFAULT '{}',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FK para evento_id de colaboradores (ahora que eventos existe)
ALTER TABLE usuarios ADD CONSTRAINT fk_usuario_evento 
    FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE SET NULL;

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
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'sin-asignar', 'asignado', 'confirmado', 'rechazado')),
    fecha_invitacion TIMESTAMP,
    fecha_confirmacion TIMESTAMP,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_eventos_usuario ON eventos(id_usuario);
CREATE INDEX idx_eventos_organizador ON eventos(organizador_id);
CREATE INDEX idx_eventos_estado ON eventos(estado);
CREATE INDEX idx_mesas_evento ON mesas(id_evento);
CREATE INDEX idx_invitados_evento ON invitados(id_evento);
CREATE INDEX idx_invitados_mesa ON invitados(id_mesa);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_evento ON usuarios(evento_id);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eventos_updated_at
    BEFORE UPDATE ON eventos FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS INICIALES
-- ============================================
-- Contraseña: Titi-apps2026@!
INSERT INTO usuarios (nombre, email, password_hash, rol, activo, limite_eventos, avatar) VALUES
    ('Jorge Flores', 'jorge.flores@titi-app.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'admin', true, NULL, 'JF'),
    ('María González', 'cliente@ejemplo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'cliente', true, 1, 'MG'),
    ('Carlos Organizador', 'organizador@ejemplo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'organizador', true, NULL, 'CO')
ON CONFLICT (email) DO NOTHING;
