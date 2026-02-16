// migrate.js - Script de migración de base de datos
// Ejecutar: node migrate.js

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrar() {
  console.log('🚀 Iniciando migración de base de datos...');
  console.log('');

  const client = await pool.connect();

  try {
    // Iniciar transacción
    await client.query('BEGIN');
    console.log('✅ Transacción iniciada');

    // 1. Agregar columna estado a eventos
    console.log('📝 Agregando columna "estado" a eventos...');
    await client.query(`
      ALTER TABLE eventos 
      ADD COLUMN IF NOT EXISTS estado VARCHAR(20)
    `);
    console.log('✅ Columna "estado" agregada');

    // 2. Actualizar eventos existentes
    console.log('📝 Actualizando eventos existentes...');
    const updateEstado = await client.query(`
      UPDATE eventos 
      SET estado = 'activo' 
      WHERE estado IS NULL
    `);
    console.log(`✅ ${updateEstado.rowCount} eventos actualizados con estado "activo"`);

    // 3. Agregar columna evento_id a usuarios
    console.log('📝 Agregando columna "evento_id" a usuarios...');
    await client.query(`
      ALTER TABLE usuarios 
      ADD COLUMN IF NOT EXISTS evento_id INTEGER
    `);
    console.log('✅ Columna "evento_id" agregada');

    // 4. Agregar columna organizador_id a eventos
    console.log('📝 Agregando columna "organizador_id" a eventos...');
    await client.query(`
      ALTER TABLE eventos 
      ADD COLUMN IF NOT EXISTS organizador_id INTEGER
    `);
    console.log('✅ Columna "organizador_id" agregada');

    // 5. Actualizar organizador_id con id_usuario
    console.log('📝 Actualizando organizador_id en eventos...');
    const updateOrg = await client.query(`
      UPDATE eventos 
      SET organizador_id = id_usuario 
      WHERE organizador_id IS NULL
    `);
    console.log(`✅ ${updateOrg.rowCount} eventos actualizados con organizador_id`);

    // 6. Crear índices
    console.log('📝 Creando índices...');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_eventos_estado 
      ON eventos(estado)
    `);
    console.log('✅ Índice idx_eventos_estado creado');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_eventos_organizador 
      ON eventos(organizador_id)
    `);
    console.log('✅ Índice idx_eventos_organizador creado');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_eventos_fecha 
      ON eventos(fecha_evento)
    `);
    console.log('✅ Índice idx_eventos_fecha creado');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usuarios_evento 
      ON usuarios(evento_id)
    `);
    console.log('✅ Índice idx_usuarios_evento creado');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_usuarios_rol 
      ON usuarios(rol)
    `);
    console.log('✅ Índice idx_usuarios_rol creado');

    // Confirmar transacción
    await client.query('COMMIT');
    console.log('');
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('');

    // Verificar cambios
    console.log('🔍 Verificando cambios...');
    const verificarEventos = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'eventos' 
      AND column_name IN ('estado', 'organizador_id')
      ORDER BY column_name
    `);
    
    const verificarUsuarios = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      AND column_name = 'evento_id'
    `);

    console.log('');
    console.log('📊 Columnas en tabla eventos:');
    verificarEventos.rows.forEach(row => {
      console.log(`   ✓ ${row.column_name}`);
    });

    console.log('');
    console.log('📊 Columnas en tabla usuarios:');
    verificarUsuarios.rows.forEach(row => {
      console.log(`   ✓ ${row.column_name}`);
    });

    console.log('');
    console.log('🎉 ¡Todo listo! La base de datos está actualizada.');
    console.log('');
    console.log('Ahora puedes:');
    console.log('1. Reiniciar tu aplicación');
    console.log('2. Probar los nuevos endpoints');
    console.log('3. Ir a /admin-solicitudes.html');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('');
    console.error('❌ ERROR EN LA MIGRACIÓN:');
    console.error('');
    console.error('Mensaje:', error.message);
    console.error('');
    console.error('La base de datos NO fue modificada (rollback ejecutado).');
    console.error('');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar migración
migrar();
