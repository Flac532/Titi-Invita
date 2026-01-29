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
  connectionTimeoutMillis: 30000
};

async function initDatabase() {
  const pool = new Pool(poolConfig);
  let client;
  
  try {
    client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL en Digital Ocean');
    
    // 1. Leer archivo database.sql (está en ../database/)
    const schemaPath = path.join(__dirname, '..', 'database', 'database.sql');
    console.log('📖 Leyendo:', schemaPath);
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // 2. Ejecutar esquema
    console.log('🗄️  Ejecutando esquema de base de datos...');
    await client.query(schemaSQL);
    console.log('✅ Esquema creado exitosamente');
    
    // 3. Leer archivo database_seed.sql
    const seedPath = path.join(__dirname, '..', 'database', 'database_seed.sql');
    console.log('📖 Leyendo:', seedPath);
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    
    // 4. Ejecutar datos de prueba
    console.log('📥 Insertando datos de prueba...');
    await client.query(seedSQL);
    console.log('✅ Datos de prueba insertados');
    
    // 5. Verificar datos
    console.log('🔍 Verificando datos insertados...');
    const usuarios = await client.query('SELECT COUNT(*) as total FROM usuarios');
    const eventos = await client.query('SELECT COUNT(*) as total FROM eventos');
    const mesas = await client.query('SELECT COUNT(*) as total FROM mesas');
    const invitados = await client.query('SELECT COUNT(*) as total FROM invitados');
    
    console.log('===========================================');
    console.log('📊 RESUMEN DE DATOS INICIALIZADOS:');
    console.log('===========================================');
    console.log(`👤 Usuarios: ${usuarios.rows[0].total}`);
    console.log(`🎪 Eventos: ${eventos.rows[0].total}`);
    console.log(`🪑 Mesas: ${mesas.rows[0].total}`);
    console.log(`👥 Invitados: ${invitados.rows[0].total}`);
    console.log('===========================================');
    console.log('🎉 Base de datos lista para producción!');
    console.log('===========================================');
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:');
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    console.error('Detalle:', error.detail);
    
    // Si es error de "tabla ya existe", es normal
    if (error.code === '42P07') { // duplicate_table
      console.log('ℹ️  Las tablas ya existen. Continuando...');
    } else if (error.code === '23505') { // unique_violation
      console.log('ℹ️  Datos duplicados. Los datos ya existen.');
    } else {
      throw error; // Relanzar error si no es uno de los esperados
    }
    
  } finally {
    if (client) {
      client.release();
      console.log('🔗 Conexión liberada');
    }
    await pool.end();
    console.log('===========================================');
  }
}

// Ejecutar inicialización
initDatabase().catch(err => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});
