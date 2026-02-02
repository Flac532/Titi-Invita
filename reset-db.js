const { Pool } = require('pg');
require('dotenv').config();

console.log('🔄 Reiniciando base de datos Titi Invita...');
console.log('⚠️  ADVERTENCIA: Esto eliminará todos los datos!');

// Preguntar confirmación
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('¿Estás seguro? Escribe "SI" para continuar: ', async (answer) => {
  if (answer.toUpperCase() !== 'SI') {
    console.log('❌ Operación cancelada.');
    readline.close();
    process.exit(0);
  }

  const poolConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 25060,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  };

  const pool = new Pool(poolConfig);
  
  try {
    console.log('🗑️  Eliminando tablas...');
    
    // Eliminar tablas en orden correcto (debido a foreign keys)
    await pool.query(`
      DROP TABLE IF EXISTS invitados CASCADE;
      DROP TABLE IF EXISTS mesas CASCADE;
      DROP TABLE IF EXISTS eventos CASCADE;
      DROP TABLE IF EXISTS usuarios CASCADE;
    `);
    
    console.log('✅ Tablas eliminadas');
    
    console.log('\n🔧 Ahora ejecuta: npm run db:init');
    console.log('🌱 Luego: npm run db:seed');
    console.log('🚀 Finalmente: npm run dev');
    
  } catch (error) {
    console.error('❌ Error reiniciando base de datos:', error.message);
  } finally {
    await pool.end();
    readline.close();
  }
});
