const { Pool } = require('pg');
require('dotenv').config();

console.log('🧪 Probando conexión a la base de datos...');

const poolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 25060,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
};

async function testConnection() {
  const pool = new Pool(poolConfig);
  
  try {
    console.log('🔗 Intentando conectar...');
    
    // Test 1: Conexión básica
    const result1 = await pool.query('SELECT NOW() as hora_servidor');
    console.log('✅ Conexión exitosa');
    console.log('   Hora del servidor:', result1.rows[0].hora_servidor);
    
    // Test 2: Versión de PostgreSQL
    const result2 = await pool.query('SELECT version()');
    console.log('✅ Versión de PostgreSQL:', result2.rows[0].version.split(',')[0]);
    
    // Test 3: Verificar tablas
    const result3 = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (result3.rows.length === 0) {
      console.log('📭 No hay tablas en la base de datos');
      console.log('💡 Ejecuta: npm run db:init');
    } else {
      console.log(`✅ Tablas encontradas: ${result3.rows.length}`);
      result3.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.table_name}`);
      });
    }
    
    // Test 4: Contar registros
    console.log('\n📊 Conteo de registros:');
    
    const tables = ['usuarios', 'eventos', 'mesas', 'invitados'];
    for (const table of tables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as total FROM ${table}`);
        console.log(`   ${table}: ${countResult.rows[0].total} registros`);
      } catch (err) {
        console.log(`   ${table}: No existe`);
      }
    }
    
    console.log('\n🎉 Prueba completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error de conexión:');
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
    
    console.log('\n💡 Solución de problemas:');
    console.log('   1. Verifica las variables en el archivo .env');
    console.log('   2. Asegúrate que la DB en Digital Ocean esté activa');
    console.log('   3. Revisa el firewall y la red');
    console.log('   4. Prueba la conexión desde pgAdmin o psql');
    
  } finally {
    await pool.end();
    console.log('\n🔗 Conexión cerrada');
  }
}

if (require.main === module) {
  testConnection().catch(err => {
    console.error('💥 Error fatal:', err);
    process.exit(1);
  });
}

module.exports = { testConnection };
