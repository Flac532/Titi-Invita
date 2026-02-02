// Script de inicialización de base de datos para Digital Ocean
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔄 Inicializando base de datos Titi Invita...');
console.log('===========================================');
console.log('📊 Información de conexión:');
console.log('  Host:', process.env.DB_HOST || 'No configurado');
console.log('  Puerto:', process.env.DB_PORT || '25060');
console.log('  Database:', process.env.DB_NAME || 'No configurado');
console.log('  Usuario:', process.env.DB_USER || 'No configurado');
console.log('===========================================');

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
    console.log('🔗 Conectando a PostgreSQL...');
    
    // Testear conexión
    const testResult = await pool.query('SELECT version() as version');
    console.log('✅ Conectado a:', testResult.rows[0].version);
    
    // 1. Leer archivo database.sql
    const schemaPath = path.join(__dirname, '..', 'database', 'database.sql');
    console.log('📖 Buscando esquema en:', schemaPath);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`❌ Archivo no encontrado: ${schemaPath}`);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log('📄 Tamaño del archivo:', (schemaSQL.length / 1024).toFixed(2), 'KB');
    
    // 2. Separar las sentencias SQL
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`🔧 Ejecutando ${statements.length} sentencias SQL...`);
    
    // 3. Ejecutar cada sentencia
    for (let i = 0; i < statements.length; i++) {
      try {
        console.log(`  [${i + 1}/${statements.length}] Ejecutando...`);
        await pool.query(statements[i] + ';');
      } catch (error) {
        // Si es error de "ya existe", continuar
        if (error.code === '42P07' || error.message.includes('already exists')) {
          console.log(`  [${i + 1}] ℹ️  La tabla ya existe, continuando...`);
          continue;
        }
        throw error;
      }
    }
    
    console.log('✅ Esquema creado exitosamente');
    
    // 4. Verificar tablas creadas
    console.log('🔍 Verificando tablas...');
    const result = await pool.query(`
      SELECT table_name, 
             (SELECT count(*) FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = tables.table_name) as column_count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tablas creadas:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name} (${row.column_count} columnas)`);
    });
    
    console.log('===========================================');
    console.log('🎉 Base de datos inicializada correctamente!');
    console.log('===========================================');
    console.log('📝 Pasos siguientes:');
    console.log('   1. Ejecuta: npm run db:seed (para datos demo)');
    console.log('   2. Ejecuta: npm run dev (para iniciar el servidor)');
    console.log('   3. Visita: http://localhost:3000');
    console.log('===========================================');
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:');
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
    
    if (error.code === '28000' || error.message.includes('authentication')) {
      console.log('\n💡 Error de autenticación. Verifica:');
      console.log('   1. Las credenciales en el archivo .env');
      console.log('   2. Que la base de datos en Digital Ocean esté activa');
      console.log('   3. Que el usuario tenga permisos');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Error de conexión. Verifica:');
      console.log('   1. El host de la base de datos');
      console.log('   2. Tu conexión a internet');
      console.log('   3. El firewall y puertos');
    } else if (error.code === '42P07' || error.message.includes('already exists')) {
      console.log('\nℹ️  Las tablas ya existen. Esto es normal en despliegues posteriores.');
      console.log('ℹ️  Si necesitas reiniciar, usa: npm run db:reset');
    } else {
      console.error('\n🔧 Detalle completo:', error);
    }
    
    throw error;
    
  } finally {
    await pool.end();
    console.log('🔗 Conexión cerrada');
  }
}

// Ejecutar inicialización
if (require.main === module) {
  initDatabase().catch(err => {
    console.error('💥 Error fatal:', err.message);
    process.exit(1);
  });
}

module.exports = { initDatabase };
