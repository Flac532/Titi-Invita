const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

console.log('🌱 Insertando datos de prueba en Titi Invita...');

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
    
    // Hash para contraseña demo
    const demoPassword = 'Titi-apps2026@!';
    const passwordHash = await bcrypt.hash(demoPassword, 10);
    
    console.log('📥 Insertando datos de prueba...');
    
    // Insertar usuarios adicionales
    await pool.query(`
      INSERT INTO usuarios (nombre, email, password_hash, rol, activo) 
      VALUES 
        ('María González', 'maria.gonzalez@empresa.com', $1, 'cliente', true),
        ('Carlos Ruiz', 'carlos.ruiz@eventos.com', $1, 'cliente', true)
      ON CONFLICT (email) DO NOTHING;
    `, [passwordHash]);
    
    // Obtener IDs de usuarios
    const usuariosResult = await pool.query(`
      SELECT id, email FROM usuarios WHERE email IN (
        'jorge.flores@titi-app.com', 
        'cliente@ejemplo.com',
        'maria.gonzalez@empresa.com',
        'carlos.ruiz@eventos.com'
      )
    `);
    
    const usuarios = {};
    usuariosResult.rows.forEach(u => {
      usuarios[u.email] = u.id;
    });
    
    // Insertar eventos demo
    await pool.query(`
      INSERT INTO eventos (id_usuario, nombre, descripcion, fecha_evento, ubicacion, estado, configuracion) 
      VALUES 
        ($1, 'Boda de Ana y Luis', 'Boda en jardín con 150 invitados', '2024-06-15', 'Hacienda Los Álamos, CDMX', 'activo', $2),
        ($3, 'Conferencia Tech 2024', 'Conferencia anual de tecnología', '2024-08-22', 'Centro de Convenciones, GDL', 'activo', $2),
        ($4, 'Fiesta de 15 años Valentina', 'Quinceañera con tema de princesa', '2024-07-10', 'Salón de Fiestas Diamante', 'activo', $2),
        ($5, 'Reunión Corporativa Q3', 'Reunión de ventas del tercer trimestre', '2024-09-05', 'Oficinas Centrales, MTY', 'planificando', $2)
      ON CONFLICT DO NOTHING;
    `, [
      usuarios['jorge.flores@titi-app.com'],
      JSON.stringify({ tema: 'clásico', colores: ['#4F46E5', '#10B981'] }),
      usuarios['cliente@ejemplo.com'],
      usuarios['maria.gonzalez@empresa.com'],
      usuarios['carlos.ruiz@eventos.com']
    ]);
    
    // Obtener IDs de eventos
    const eventosResult = await pool.query('SELECT id FROM eventos ORDER BY id LIMIT 4');
    
    // Insertar mesas demo para el primer evento
    if (eventosResult.rows.length > 0) {
      const primerEventoId = eventosResult.rows[0].id;
      
      // Mesas
      await pool.query(`
        INSERT INTO mesas (id_evento, nombre, forma, sillas) 
        VALUES 
          ($1, 'Mesa Principal', 'rectangular', $2),
          ($1, 'Mesa 2', 'rectangular', $3),
          ($1, 'Mesa 3', 'circular', $4),
          ($1, 'Mesa 4', 'circular', $5)
        ON CONFLICT DO NOTHING;
      `, [
        primerEventoId,
        JSON.stringify([
          { id: 1, nombre: 'Ana López', estado: 'confirmado' },
          { id: 2, nombre: 'Carlos Ruiz', estado: 'confirmado' },
          { id: 3, nombre: '', estado: 'sin-asignar' },
          { id: 4, nombre: '', estado: 'sin-asignar' }
        ]),
        JSON.stringify(Array.from({length: 8}, (_, i) => ({ 
          id: i + 1, 
          nombre: '', 
          estado: 'sin-asignar' 
        }))),
        JSON.stringify(Array.from({length: 10}, (_, i) => ({ 
          id: i + 1, 
          nombre: '', 
          estado: 'sin-asignar'
        }))),
        JSON.stringify(Array.from({length: 6}, (_, i) => ({ 
          id: i + 1, 
          nombre: '', 
          estado: 'sin-asignar' 
        })))
      ]);
      
      // Insertar invitados demo
      await pool.query(`
        INSERT INTO invitados (id_evento, nombre, email, telefono, notas, id_mesa, silla_numero, estado) 
        VALUES 
          ($1, 'Ana López', 'ana.lopez@email.com', '5512345678', 'Novia', 1, 1, 'confirmado'),
          ($1, 'Carlos Ruiz', 'carlos.ruiz@email.com', '5512345679', 'Novio', 1, 2, 'confirmado'),
          ($1, 'María González', 'maria.gonzalez@email.com', '5512345680', 'Madrina', NULL, NULL, 'pendiente'),
          ($1, 'Pedro Hernández', 'pedro.hernandez@email.com', '5512345681', 'Padrino', NULL, NULL, 'pendiente')
        ON CONFLICT DO NOTHING;
      `, [primerEventoId]);
    }
    
    // Verificar datos
    const usuariosCount = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    const eventosCount = await pool.query('SELECT COUNT(*) as total FROM eventos');
    const mesasCount = await pool.query('SELECT COUNT(*) as total FROM mesas');
    const invitadosCount = await pool.query('SELECT COUNT(*) as total FROM invitados');
    
    console.log('📊 DATOS INSERTADOS:');
    console.log(`👤 Usuarios: ${usuariosCount.rows[0].total}`);
    console.log(`🎪 Eventos: ${eventosCount.rows[0].total}`);
    console.log(`🪑 Mesas: ${mesasCount.rows[0].total}`);
    console.log(`👥 Invitados: ${invitadosCount.rows[0].total}`);
    
    console.log('🔑 CREDENCIALES DE PRUEBA:');
    console.log('   Email: jorge.flores@titi-app.com');
    console.log('   Contraseña: Titi-apps2026@!');
    
  } catch (error) {
    if (error.code === '23505') {
      console.log('ℹ️  Los datos demo ya existen.');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase().catch(err => {
    console.error('💥 Error fatal:', err);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
