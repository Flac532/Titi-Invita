const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🌱 Insertando datos de prueba...');

const poolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 25060,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
};

async function seedDatabase() {
  const pool = new Pool(poolConfig);
  
  try {
    console.log('✅ Conectado a la base de datos');
    
    // Leer archivo seed
    const seedPath = path.join(__dirname, '..', 'database', 'database_seed.sql');
    console.log('📖 Leyendo:', seedPath);
    
    if (!fs.existsSync(seedPath)) {
      console.log('ℹ️  Archivo seed no encontrado, saltando...');
      return;
    }
    
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    
    // Ejecutar seed
    console.log('📥 Insertando datos de prueba...');
    await pool.query(seedSQL);
    console.log('✅ Datos de prueba insertados');
    
    // Verificar
    const usuarios = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    const eventos = await pool.query('SELECT COUNT(*) as total FROM eventos');
    
    console.log('===========================================');
    console.log('📊 DATOS INSERTADOS:');
    console.log('===========================================');
    console.log(`👤 Usuarios: ${usuarios.rows[0].total}`);
    console.log(`🎪 Eventos: ${eventos.rows[0].total}`);
    console.log('===========================================');
    console.log('🔑 Credenciales demo:');
    console.log('   Admin: jorge.flores@titi-app.com / Titi-apps2026@!');
    console.log('   Cliente: cliente@ejemplo.com / Titi-apps2026@!');
    console.log('===========================================');
    
  } catch (error) {
    console.error('❌ Error insertando datos:');
    console.error('Mensaje:', error.message);
    
    if (error.code === '23505') {
      console.log('ℹ️  Los datos demo ya existen. Esto es normal.');
    }
    
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase().catch(err => {
    console.error('💥 Error:', err);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
