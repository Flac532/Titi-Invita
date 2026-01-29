// Script de inicialización de base de datos para Digital Ocean
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🔄 Inicializando base de datos Titi Invita para Digital Ocean...');
console.log('===========================================');
console.log('DB Host:', process.env.DB_HOST || 'No configurado');
console.log('DB Name:', process.env.DB_NAME || 'No configurado');

// Configuración para Digital Ocean
const poolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 25060,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { 
    rejectUnauthorized: false 
  },
  connectionTimeoutMillis: 10000,
  max: 5
};

async function initDatabase() {
  const pool = new Pool(poolConfig);
  
  try {
    console.log('✅ Conectado a PostgreSQL en Digital Ocean');
    
    // 1. Leer archivo database.sql
    const schemaPath = path.join(__dirname, '..', 'database', 'database.sql');
    console.log('📖 Leyendo:', schemaPath);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Archivo no encontrado: ${schemaPath}`);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // 2. Ejecutar esquema
    console.log('🗄️  Ejecutando esquema de base de datos...');
    await pool.query(schemaSQL);
    console.log('✅ Esquema creado exitosamente');
    
    // 3. Verificar tablas creadas
    console.log('🔍 Verificando tablas...');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tablas creadas:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('===========================================');
    console.log('🎉 Base de datos inicializada correctamente!');
    console.log('===========================================');
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:');
    console.error('Mensaje:', error.message);
    
    // Si es error de "tabla ya existe", es normal
    if (error.code === '42P07' || error.message.includes('already exists')) {
      console.log('ℹ️  Las tablas ya existen. Esto es normal en despliegues posteriores.');
      console.log('ℹ️  Si necesitas reiniciar, usa: npm run db:reset');
    } else {
      console.error('Detalle completo:', error);
      throw error;
    }
    
  } finally {
    await pool.end();
    console.log('🔗 Conexión cerrada');
    console.log('===========================================');
  }
}

// Ejecutar inicialización
if (require.main === module) {
  initDatabase().catch(err => {
    console.error('💥 Error fatal:', err);
    process.exit(1);
  });
}

module.exports = { initDatabase };
