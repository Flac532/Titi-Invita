const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

console.log('🌱 Insertando datos de prueba en Titi Invita...');
console.log('===========================================');

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
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(demoPassword, saltRounds);
    
    console.log('📥 Insertando datos de prueba...');
    
    // Insertar usuarios demo
    await pool.query(`
      INSERT INTO usuarios (nombre, email, password_hash, rol, activo) 
      VALUES 
        ('Jorge Flores', 'jorge.flores@titi-app.com', $1, 'admin', true),
        ('Cliente Demo', 'cliente@ejemplo.com', $1, 'cliente', true),
        ('María González', 'maria.gonzalez@empresa.com', $1, 'cliente', true),
        ('Carlos Ruiz', 'carlos.ruiz@eventos.com', $1, 'cliente', true)
      ON CONFLICT (email) DO NOTHING;
    `, [passwordHash]);
    
    console.log('✅ Usuarios demo insertados');
    
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
        ($1, 'Boda de Ana y Luis', 'Boda en jardín con 150 invitados', '2024-06-15 18:00:00', 'Hacienda Los Álamos, CDMX', 'activo', $2),
        ($1, 'Conferencia Tech 2024', 'Conferencia anual de tecnología', '2024-08-22 09:00:00', 'Centro de Convenciones, GDL', 'activo', $2),
        ($3, 'Fiesta de 15 años Valentina', 'Quinceañera con tema de princesa', '2024-07-10 20:00:00', 'Salón de Fiestas Diamante', 'activo', $2),
        ($4, 'Reunión Corporativa Q3', 'Reunión de ventas del tercer trimestre', '2024-09-05 10:00:00', 'Oficinas Centrales, MTY', 'planificando', $2),
        ($5, 'Cena de Gala Benéfica', 'Evento de recaudación de fondos', '2024-10-18 19:30:00', 'Hotel Grand Luxe, PVR', 'activo', $2)
      ON CONFLICT DO NOTHING;
    `, [
      usuarios['jorge.flores@titi-app.com'],
      JSON.stringify({
        tema: 'clásico',
        colores: ['#4F46E5', '#10B981', '#F59E0B'],
        background: '#F9FAFB',
        gridSize: 50,
        zoom: 1
      }),
      usuarios['cliente@ejemplo.com'],
      usuarios['maria.gonzalez@empresa.com'],
      usuarios['carlos.ruiz@eventos.com']
    ]);
    
    console.log('✅ Eventos demo insertados');
    
    // Obtener IDs de eventos
    const eventosResult = await pool.query(`
      SELECT id, nombre FROM eventos ORDER BY id LIMIT 5
    `);
    
    // Insertar mesas demo para el primer evento
    if (eventosResult.rows.length > 0) {
      const primerEventoId = eventosResult.rows[0].id;
      
      // Mesas rectangulares
      await pool.query(`
        INSERT INTO mesas (id_evento, nombre, forma, sillas) 
        VALUES 
          ($1, 'Mesa Principal', 'rectangular', $2),
          ($1, 'Mesa 2', 'rectangular', $3),
          ($1, 'Mesa 3', 'circular', $4),
          ($1, 'Mesa 4', 'circular', $5),
          ($1, 'Mesa 5', 'cuadrada', $6)
        ON CONFLICT DO NOTHING;
      `, [
        primerEventoId,
        JSON.stringify([
          { id: 1, nombre: 'Silla 1', estado: 'asignado', id_invitado: 1 },
          { id: 2, nombre: 'Silla 2', estado: 'libre' },
          { id: 3, nombre: 'Silla 3', estado: 'confirmado', id_invitado: 3 },
          { id: 4, nombre: 'Silla 4', estado: 'libre' },
          { id: 5, nombre: 'Silla 5', estado: 'asignado', id_invitado: 5 },
          { id: 6, nombre: 'Silla 6', estado: 'libre' }
        ]),
        JSON.stringify(Array.from({length: 8}, (_, i) => ({ 
          id: i + 1, 
          nombre: `Silla ${i + 1}`, 
          estado: 'libre' 
        }))),
        JSON.stringify(Array.from({length: 10}, (_, i) => ({ 
          id: i + 1, 
          nombre: `Silla ${i + 1}`, 
          estado: i < 3 ? 'asignado' : 'libre',
          id_invitado: i < 3 ? i + 10 : null
        }))),
        JSON.stringify(Array.from({length: 6}, (_, i) => ({ 
          id: i + 1, 
          nombre: `Silla ${i + 1}`, 
          estado: 'libre' 
        }))),
        JSON.stringify(Array.from({length: 4}, (_, i) => ({ 
          id: i + 1, 
          nombre: `Silla ${i + 1}`, 
          estado: 'libre' 
        })))
      ]);
      
      console.log('✅ Mesas demo insertadas');
      
      // Insertar invitados demo
      await pool.query(`
        INSERT INTO invitados (id_evento, nombre, email, telefono, notas, id_mesa, silla_numero, estado) 
        VALUES 
          ($1, 'Ana García', 'ana.garcia@email.com', '5512345678', 'Novia', 1, 1, 'confirmado'),
          ($1, 'Luis Rodríguez', 'luis.rodriguez@email.com', '5512345679', 'Novio', 1, 3, 'confirmado'),
          ($1, 'María López', 'maria.lopez@email.com', '5512345680', 'Madrina', 3, 1, 'confirmado'),
          ($1, 'Carlos Martínez', 'carlos.martinez@email.com', '5512345681', 'Padrino', 3, 2, 'pendiente'),
          ($1, 'Sofía Hernández', 'sofia.hernandez@email.com', '5512345682', 'Testigo', 1, 5, 'asistira'),
          ($1, 'Miguel Torres', 'miguel.torres@email.com', '5512345683', NULL, NULL, NULL, 'pendiente'),
          ($1, 'Laura Díaz', 'laura.diaz@email.com', '5512345684', 'Prima de la novia', 3, 3, 'confirmado'),
          ($1, 'Jorge Vargas', 'jorge.vargas@email.com', '5512345685', NULL, NULL, NULL, 'no_asistira'),
          ($1, 'Patricia Cruz', 'patricia.cruz@email.com', '5512345686', 'Amiga', NULL, NULL, 'pendiente'),
          ($1, 'Roberto Morales', 'roberto.morales@email.com', '5512345687', 'Colega trabajo', NULL, NULL, 'asistira')
        ON CONFLICT DO NOTHING;
      `, [primerEventoId]);
      
      console.log('✅ Invitados demo insertados');
    }
    
    // Verificar datos insertados
    const usuariosCount = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    const eventosCount = await pool.query('SELECT COUNT(*) as total FROM eventos');
    const mesasCount = await pool.query('SELECT COUNT(*) as total FROM mesas');
    const invitadosCount = await pool.query('SELECT COUNT(*) as total FROM invitados');
    
    console.log('===========================================');
    console.log('📊 DATOS INSERTADOS:');
    console.log('===========================================');
    console.log(`👤 Usuarios: ${usuariosCount.rows[0].total}`);
    console.log(`🎪 Eventos: ${eventosCount.rows[0].total}`);
    console.log(`🪑 Mesas: ${mesasCount.rows[0].total}`);
    console.log(`👥 Invitados: ${invitadosCount.rows[0].total}`);
    console.log('===========================================');
    console.log('🔑 CREDENCIALES DE PRUEBA:');
    console.log('===========================================');
    console.log('👑 ADMIN:');
    console.log('   Email: jorge.flores@titi-app.com');
    console.log('   Contraseña: Titi-apps2026@!');
    console.log('');
    console.log('👤 CLIENTES:');
    console.log('   Email: cliente@ejemplo.com');
    console.log('   Contraseña: Titi-apps2026@!');
    console.log('');
    console.log('   Email: maria.gonzalez@empresa.com');
    console.log('   Contraseña: Titi-apps2026@!');
    console.log('');
    console.log('   Email: carlos.ruiz@eventos.com');
    console.log('   Contraseña: Titi-apps2026@!');
    console.log('===========================================');
    console.log('🚀 Siguiente paso: Ejecuta "npm run dev"');
    console.log('🌐 Accede en: http://localhost:3000');
    console.log('===========================================');
    
  } catch (error) {
    console.error('❌ Error insertando datos:');
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
    
    if (error.code === '23505') {
      console.log('ℹ️  Los datos demo ya existen. Esto es normal.');
    } else {
      console.error('🔧 Detalle:', error);
    }
    
  } finally {
    await pool.end();
    console.log('🔗 Conexión cerrada');
  }
}

if (require.main === module) {
  seedDatabase().catch(err => {
    console.error('💥 Error fatal:', err.message);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
