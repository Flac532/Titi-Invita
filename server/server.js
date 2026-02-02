const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

// ============================================
// CONFIGURACIÓN PARA DIGITAL OCEAN
// ============================================
const PORT = process.env.PORT || 8080;

console.log('🚀 INICIANDO TITI INVITA EN DIGITAL OCEAN');
console.log('📅 Fecha:', new Date().toISOString());
console.log('🌍 Entorno:', process.env.NODE_ENV);
console.log('🔌 Puerto:', PORT);

// Configuración PostgreSQL para Digital Ocean
const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 25060,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const pool = new Pool(poolConfig);

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS para Digital Ocean
const allowedOrigins = [
  'https://titi-invita-app-azhcw.ondigitalocean.app',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://localhost:5500'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('⚠️  CORS bloqueado:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================
// FUNCIONES AUXILIARES
// ============================================
async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as hora, version() as version');
    client.release();
    
    console.log('✅ PostgreSQL conectado');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    return false;
  }
}

// Middleware de autenticación
function verificarToken(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Token no proporcionado' 
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_super_secreto_jwt_titi_invita_2026@!');
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      error: 'Token inválido o expirado' 
    });
  }
}

// ============================================
// RUTAS PÚBLICAS
// ============================================

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW() as hora');
    
    res.json({
      status: 'healthy',
      app: 'Titi Invita',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});

// Test endpoint
app.get('/api/test', async (req, res) => {
  try {
    const usuarios = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    const eventos = await pool.query('SELECT COUNT(*) as total FROM eventos');
    const mesas = await pool.query('SELECT COUNT(*) as total FROM mesas');
    const invitados = await pool.query('SELECT COUNT(*) as total FROM invitados');
    
    res.json({
      message: '✅ Titi Invita API funcionando',
      database: {
        usuarios: parseInt(usuarios.rows[0].total),
        eventos: parseInt(eventos.rows[0].total),
        mesas: parseInt(mesas.rows[0].total),
        invitados: parseInt(invitados.rows[0].total)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email y contraseña requeridos' 
      });
    }
    
    // Buscar usuario
    const result = await pool.query(
      'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenciales inválidas' 
      });
    }
    
    const usuario = result.rows[0];
    
    if (!usuario.activo) {
      return res.status(403).json({ 
        success: false,
        error: 'Cuenta desactivada' 
      });
    }
    
    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    
    // Password demo para desarrollo
    const demoPassword = 'Titi-apps2026@!';
    const isDemoPassword = password === demoPassword;
    
    if (!passwordValida && !isDemoPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenciales inválidas' 
      });
    }
    
    // Crear token
    const tokenPayload = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    };
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'tu_super_secreto_jwt_titi_invita_2026@!',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Login exitoso',
      token: token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        avatar: usuario.nombre.substring(0, 2).toUpperCase()
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

// ============================================
// RUTAS PROTEGIDAS (requieren token)
// ============================================

// Obtener eventos del usuario
app.get('/api/eventos-usuario', verificarToken, async (req, res) => {
  try {
    const userId = req.usuario.id;
    
    const result = await pool.query(
      `SELECT * FROM eventos 
       WHERE id_usuario = $1 
       ORDER BY fecha_creacion DESC`,
      [userId]
    );
    
    res.json({
      success: true,
      eventos: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error obteniendo eventos:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo eventos' 
    });
  }
});

// Obtener todos los eventos (para admin)
app.get('/api/eventos', verificarToken, async (req, res) => {
  try {
    // Solo admin puede ver todos los eventos
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'No autorizado' 
      });
    }
    
    const result = await pool.query(`
      SELECT e.*, u.nombre as usuario_nombre 
      FROM eventos e 
      LEFT JOIN usuarios u ON e.id_usuario = u.id 
      ORDER BY e.fecha_creacion DESC
    `);
    
    res.json({
      success: true,
      eventos: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error obteniendo eventos:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo eventos' 
    });
  }
});

// Obtener evento específico
app.get('/api/eventos/:id', verificarToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.usuario.id;
    const userRole = req.usuario.rol;
    
    let query;
    let params;
    
    if (userRole === 'admin') {
      // Admin puede ver cualquier evento
      query = `SELECT e.*, u.nombre as usuario_nombre 
               FROM eventos e 
               LEFT JOIN usuarios u ON e.id_usuario = u.id 
               WHERE e.id = $1`;
      params = [eventId];
    } else {
      // Usuario normal solo sus eventos
      query = `SELECT * FROM eventos WHERE id = $1 AND id_usuario = $2`;
      params = [eventId, userId];
    }
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Evento no encontrado' 
      });
    }
    
    res.json({
      success: true,
      evento: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error obteniendo evento:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo evento' 
    });
  }
});

// Crear nuevo evento
app.post('/api/eventos', verificarToken, async (req, res) => {
  try {
    const userId = req.usuario.id;
    const { nombre, descripcion, fecha_evento, ubicacion, estado } = req.body;
    
    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del evento es requerido'
      });
    }
    
    const result = await pool.query(
      `INSERT INTO eventos 
       (id_usuario, nombre, descripcion, fecha_evento, ubicacion, estado, configuracion) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        userId, 
        nombre, 
        descripcion || '', 
        fecha_evento || null, 
        ubicacion || '', 
        estado || 'activo',
        '{}'
      ]
    );
    
    // Crear mesas por defecto para el nuevo evento
    const eventoId = result.rows[0].id;
    
    // Crear 8 mesas rectangulares por defecto
    for (let i = 1; i <= 8; i++) {
      await pool.query(
        `INSERT INTO mesas (id_evento, nombre, forma, sillas) 
         VALUES ($1, $2, $3, $4)`,
        [
          eventoId,
          `Mesa ${i}`,
          'rectangular',
          JSON.stringify(Array.from({length: 8}, (_, j) => ({
            id: j + 1,
            estado: 'sin-asignar',
            nombre: ''
          })))
        ]
      );
    }
    
    res.status(201).json({
      success: true,
      message: 'Evento creado exitosamente',
      evento: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creando evento:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error creando evento' 
    });
  }
});

// Actualizar evento
app.put('/api/eventos/:id', verificarToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.usuario.id;
    const userRole = req.usuario.rol;
    
    // Verificar permisos
    let checkQuery;
    if (userRole === 'admin') {
      checkQuery = `SELECT id FROM eventos WHERE id = $1`;
    } else {
      checkQuery = `SELECT id FROM eventos WHERE id = $1 AND id_usuario = $2`;
    }
    
    const checkResult = await pool.query(
      checkQuery, 
      userRole === 'admin' ? [eventId] : [eventId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Evento no encontrado o no autorizado'
      });
    }
    
    const { nombre, descripcion, fecha_evento, ubicacion, estado, configuracion } = req.body;
    
    const result = await pool.query(
      `UPDATE eventos 
       SET nombre = COALESCE($3, nombre),
           descripcion = COALESCE($4, descripcion),
           fecha_evento = COALESCE($5, fecha_evento),
           ubicacion = COALESCE($6, ubicacion),
           estado = COALESCE($7, estado),
           configuracion = COALESCE($8, configuracion),
           fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id = $1 
       RETURNING *`,
      [
        eventId,
        userId,
        nombre,
        descripcion,
        fecha_evento,
        ubicacion,
        estado,
        configuracion
      ]
    );
    
    res.json({
      success: true,
      message: 'Evento actualizado',
      evento: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error actualizando evento:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error actualizando evento' 
    });
  }
});

// Obtener mesas de un evento
app.get('/api/eventos/:id/mesas', verificarToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.usuario.id;
    const userRole = req.usuario.rol;
    
    // Verificar permisos
    let checkQuery;
    if (userRole === 'admin') {
      checkQuery = `SELECT id FROM eventos WHERE id = $1`;
    } else {
      checkQuery = `SELECT id FROM eventos WHERE id = $1 AND id_usuario = $2`;
    }
    
    const checkResult = await pool.query(
      checkQuery, 
      userRole === 'admin' ? [eventId] : [eventId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Evento no encontrado o no autorizado'
      });
    }
    
    const result = await pool.query(
      `SELECT * FROM mesas WHERE id_evento = $1 ORDER BY id`,
      [eventId]
    );
    
    res.json({
      success: true,
      mesas: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error obteniendo mesas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo mesas' 
    });
  }
});

// Actualizar mesas de un evento
app.put('/api/eventos/:id/mesas', verificarToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.usuario.id;
    const userRole = req.usuario.rol;
    const { mesas } = req.body; // Array de mesas
    
    // Verificar permisos
    let checkQuery;
    if (userRole === 'admin') {
      checkQuery = `SELECT id FROM eventos WHERE id = $1`;
    } else {
      checkQuery = `SELECT id FROM eventos WHERE id = $1 AND id_usuario = $2`;
    }
    
    const checkResult = await pool.query(
      checkQuery, 
      userRole === 'admin' ? [eventId] : [eventId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Evento no encontrado o no autorizado'
      });
    }
    
    // Eliminar mesas existentes
    await pool.query('DELETE FROM mesas WHERE id_evento = $1', [eventId]);
    
    // Insertar nuevas mesas
    for (const mesa of mesas) {
      await pool.query(
        `INSERT INTO mesas (id_evento, nombre, forma, posicion_x, posicion_y, sillas) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          eventId,
          mesa.nombre,
          mesa.forma,
          mesa.posicion_x || 0,
          mesa.posicion_y || 0,
          JSON.stringify(mesa.sillas || [])
        ]
      );
    }
    
    res.json({
      success: true,
      message: 'Mesas actualizadas',
      count: mesas.length
    });
    
  } catch (error) {
    console.error('Error actualizando mesas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error actualizando mesas' 
    });
  }
});

// Obtener invitados de un evento
app.get('/api/eventos/:id/invitados', verificarToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.usuario.id;
    const userRole = req.usuario.rol;
    
    // Verificar permisos
    let checkQuery;
    if (userRole === 'admin') {
      checkQuery = `SELECT id FROM eventos WHERE id = $1`;
    } else {
      checkQuery = `SELECT id FROM eventos WHERE id = $1 AND id_usuario = $2`;
    }
    
    const checkResult = await pool.query(
      checkQuery, 
      userRole === 'admin' ? [eventId] : [eventId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Evento no encontrado o no autorizado'
      });
    }
    
    const result = await pool.query(
      `SELECT * FROM invitados WHERE id_evento = $1 ORDER BY nombre`,
      [eventId]
    );
    
    res.json({
      success: true,
      invitados: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error obteniendo invitados:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo invitados' 
    });
  }
});

// Crear o actualizar invitado
app.post('/api/eventos/:id/invitados', verificarToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.usuario.id;
    const userRole = req.usuario.rol;
    const { nombre, email, telefono, id_mesa, silla_numero, estado, notas } = req.body;
    
    // Verificar permisos
    let checkQuery;
    if (userRole === 'admin') {
      checkQuery = `SELECT id FROM eventos WHERE id = $1`;
    } else {
      checkQuery = `SELECT id FROM eventos WHERE id = $1 AND id_usuario = $2`;
    }
    
    const checkResult = await pool.query(
      checkQuery, 
      userRole === 'admin' ? [eventId] : [eventId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Evento no encontrado o no autorizado'
      });
    }
    
    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del invitado es requerido'
      });
    }
    
    const result = await pool.query(
      `INSERT INTO invitados 
       (id_evento, nombre, email, telefono, id_mesa, silla_numero, estado, notas) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        eventId,
        nombre,
        email || null,
        telefono || null,
        id_mesa || null,
        silla_numero || null,
        estado || 'pendiente',
        notas || null
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Invitado creado',
      invitado: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creando invitado:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error creando invitado' 
    });
  }
});

// Actualizar invitado específico
app.put('/api/eventos/:eventoId/invitados/:invitadoId', verificarToken, async (req, res) => {
  try {
    const eventoId = parseInt(req.params.eventoId);
    const invitadoId = parseInt(req.params.invitadoId);
    const userId = req.usuario.id;
    const userRole = req.usuario.rol;
    
    // Verificar permisos
    let checkQuery;
    if (userRole === 'admin') {
      checkQuery = `SELECT id FROM eventos WHERE id = $1`;
    } else {
      checkQuery = `SELECT id FROM eventos WHERE id = $1 AND id_usuario = $2`;
    }
    
    const checkResult = await pool.query(
      checkQuery, 
      userRole === 'admin' ? [eventoId] : [eventoId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Evento no encontrado o no autorizado'
      });
    }
    
    const { nombre, email, telefono, id_mesa, silla_numero, estado, notas } = req.body;
    
    const result = await pool.query(
      `UPDATE invitados 
       SET nombre = COALESCE($3, nombre),
           email = COALESCE($4, email),
           telefono = COALESCE($5, telefono),
           id_mesa = COALESCE($6, id_mesa),
           silla_numero = COALESCE($7, silla_numero),
           estado = COALESCE($8, estado),
           notas = COALESCE($9, notas),
           fecha_confirmacion = CASE 
             WHEN $8 = 'confirmado' AND estado != 'confirmado' THEN CURRENT_TIMESTAMP 
             ELSE fecha_confirmacion 
           END
       WHERE id = $1 AND id_evento = $2 
       RETURNING *`,
      [
        invitadoId, 
        eventoId, 
        nombre, 
        email, 
        telefono, 
        id_mesa, 
        silla_numero, 
        estado, 
        notas
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Invitado no encontrado' 
      });
    }
    
    res.json({
      success: true,
      message: 'Invitado actualizado',
      invitado: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error actualizando invitado:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error actualizando invitado' 
    });
  }
});

// Obtener todos los usuarios (solo admin)
app.get('/api/usuarios', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'No autorizado' 
      });
    }
    
    const result = await pool.query(
      'SELECT id, nombre, email, rol, activo, fecha_creacion FROM usuarios ORDER BY id'
    );
    
    res.json({
      success: true,
      usuarios: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo usuarios' 
    });
  }
});

// Ruta protegida de prueba
app.get('/api/protegido', verificarToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Acceso autorizado',
      usuario: req.usuario,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Error interno' 
    });
  }
});

// ============================================
// SERVIR ARCHIVOS ESTÁTICOS
// ============================================
app.use(express.static('public'));

// Ruta para el frontend
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
async function startServer() {
  console.log('\n🔧 Iniciando servidor...');
  
  // Probar conexión a la base de datos
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    console.log('⚠️  ADVERTENCIA: No se pudo conectar a la base de datos');
    console.log('💡 La aplicación funcionará en modo limitado');
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log('\n===========================================');
    console.log('🚀 SERVIDOR INICIADO EXITOSAMENTE');
    console.log('===========================================');
    console.log('🌐 URL pública: https://titi-invita-app-azhcw.ondigitalocean.app');
    console.log('🔌 Puerto interno:', PORT);
    console.log('📡 Health check: /api/health');
    console.log('🔑 Login endpoint: POST /api/auth/login');
    console.log('👤 Credenciales demo:');
    console.log('   Email: jorge.flores@titi-app.com');
    console.log('   Password: Titi-apps2026@!');
    console.log('===========================================');
  });
}

// Manejo de errores
process.on('uncaughtException', (error) => {
  console.error('💥 ERROR NO CAPTURADO:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 PROMESA RECHAZADA:', reason);
});

// Iniciar servidor
startServer();
