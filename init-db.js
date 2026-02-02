const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('📄 Inicializando base de datos Titi Invita...');

const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 25060,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { 
    rejectUnauthorized: false 
  }
};

async function initDatabase() {
  const pool = new Pool(poolConfig);
  
  try {
    console.log('🔗 Conectando a PostgreSQL...');
    
    // Leer el archivo schema.sql
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    
    let schemaSQL;
    if (fs.existsSync(schemaPath)) {
      console.log('📖 Leyendo schema.sql...');
      schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    } else {
      console.log('⚠️ schema.sql no encontrado, usando schema embebido...');
      // Schema embebido como fallback
      schemaSQL = `
-- ============================================
-- Titi Invita - Sistema de Control de Mesas
-- ============================================

-- Eliminar tablas existentes
DROP TABLE IF EXISTS invitados CASCADE;
DROP TABLE IF EXISTS mesas CASCADE;
DROP TABLE IF EXISTS eventos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Tabla de usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('admin', 'cliente', 'organizador')) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    limite_eventos INTEGER DEFAULT NULL,
    avatar VARCHAR(10),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de eventos
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

-- Tabla de mesas
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

-- Tabla de invitados
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

-- Índices
CREATE INDEX idx_eventos_usuario ON eventos(id_usuario);
CREATE INDEX idx_eventos_estado ON eventos(estado);
CREATE INDEX idx_mesas_evento ON mesas(id_evento);
CREATE INDEX idx_invitados_evento ON invitados(id_evento);
CREATE INDEX idx_invitados_email ON invitados(email);
CREATE INDEX idx_invitados_mesa ON invitados(id_mesa);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eventos_updated_at
    BEFORE UPDATE ON eventos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Usuarios iniciales
INSERT INTO usuarios (nombre, email, password_hash, rol, activo, limite_eventos, avatar) 
VALUES 
    ('Jorge Flores', 'jorge.flores@titi-app.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'admin', true, NULL, 'JF'),
    ('María González', 'cliente@ejemplo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'cliente', true, 1, 'MG'),
    ('Carlos Organizador', 'organizador@ejemplo.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'organizador', true, NULL, 'CO'),
    ('Ana Martínez', 'ana.m@eventos.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'cliente', false, 1, 'AM'),
    ('Pedro López', 'pedro.l@empresa.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'organizador', true, NULL, 'PL'),
    ('Laura Sánchez', 'laura.s@email.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 'cliente', false, 1, 'LS')
ON CONFLICT (email) DO NOTHING;
`;
    }
    
    console.log('🔧 Ejecutando sentencias SQL...');
    await pool.query(schemaSQL);
    
    console.log('✅ Esquema creado exitosamente');
    
    // Verificar tablas creadas
    const tablesResult = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Tablas creadas:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Verificar usuarios
    const usersResult = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    console.log(`👤 Usuarios: ${usersResult.rows[0].total}`);
    
    console.log('🎉 Base de datos lista!');
    
  } catch (error) {
    if (error.code === '42P07') {
      console.log('ℹ️  Las tablas ya existen.');
    } else {
      console.error('❌ Error:', error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initDatabase().catch(err => {
    console.error('💥 Error fatal:', err);
    process.exit(1);
  });
}

module.exports = { initDatabase };
