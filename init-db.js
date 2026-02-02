const { Pool } = require('pg');
require('dotenv').config();

console.log('🔄 Inicializando base de datos Titi Invita...');

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
    
    // Leer y ejecutar el esquema SQL
    const schemaSQL = `
-- ============================================
-- Titi Invita - Sistema de Control de Mesas
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
    silla_numero INTEGER,
    estado VARCHAR(20) DEFAULT 'pendiente',
    fecha_invitacion TIMESTAMP,
    fecha_confirmacion TIMESTAMP,
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_eventos_usuario ON eventos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_mesas_evento ON mesas(id_evento);
CREATE INDEX IF NOT EXISTS idx_invitados_evento ON invitados(id_evento);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Datos iniciales
INSERT INTO usuarios (nombre, email, password_hash, rol, activo) 
VALUES (
    'Jorge Flores', 
    'jorge.flores@titi-app.com', 
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 
    'admin', 
    true
) ON CONFLICT (email) DO NOTHING;

INSERT INTO usuarios (nombre, email, password_hash, rol, activo) 
VALUES (
    'Cliente Demo', 
    'cliente@ejemplo.com', 
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.FM7cQwZHQz.6M.Bm/6.7Tj7Htl4.JC', 
    'cliente', 
    true
) ON CONFLICT (email) DO NOTHING;
`;
    
    console.log('🔧 Ejecutando sentencias SQL...');
    await pool.query(schemaSQL);
    
    console.log('✅ Esquema creado exitosamente');
    
    // Verificar tablas
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    
    console.log('📋 Tablas creadas:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('🎉 Base de datos lista!');
    
  } catch (error) {
    if (error.code === '42P07') {
      console.log('ℹ️  Las tablas ya existen. Continuando...');
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
