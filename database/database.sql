-- ============================================
-- TITI INVITA - ESQUEMA DE BASE DE DATOS
-- Optimizado para Digital Ocean PostgreSQL
-- ============================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'cliente')),
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Función para actualizar fecha_actualizacion
CREATE OR REPLACE FUNCTION actualizar_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para usuarios
CREATE TRIGGER actualizar_fecha_usuario
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();

-- Tabla de eventos
CREATE TABLE IF NOT EXISTS eventos (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_evento TIMESTAMP,
    ubicacion VARCHAR(200),
    estado VARCHAR(50) DEFAULT 'activo',
    configuracion JSONB DEFAULT '{}',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para eventos
CREATE TRIGGER actualizar_fecha_evento
    BEFORE UPDATE ON eventos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();

-- Tabla de mesas
CREATE TABLE IF NOT EXISTS mesas (
    id SERIAL PRIMARY KEY,
    id_evento INTEGER REFERENCES eventos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    forma VARCHAR(50) NOT NULL,
    sillas JSONB DEFAULT '[]',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de invitados
CREATE TABLE IF NOT EXISTS invitados (
    id SERIAL PRIMARY KEY,
    id_evento INTEGER REFERENCES eventos(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefono VARCHAR(20),
    notas TEXT,
    id_mesa INTEGER REFERENCES mesas(id) ON DELETE SET NULL,
    silla_numero INTEGER,
    estado VARCHAR(50) DEFAULT 'pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_eventos_usuario ON eventos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_mesas_evento ON mesas(id_evento);
CREATE INDEX IF NOT EXISTS idx_invitados_evento ON invitados(id_evento);
CREATE INDEX IF NOT EXISTS idx_invitados_mesa ON invitados(id_mesa);

-- Índices adicionales para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_estado ON eventos(estado);
