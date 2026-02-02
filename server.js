const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

// ============================================
// CONFIGURACIÓN
// ============================================
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'tu_super_secreto_jwt_titi_invita_2026@!';

console.log('🚀 INICIANDO TITI INVITA');
console.log('📅 Fecha:', new Date().toISOString());
console.log('🌍 Entorno:', process.env.NODE_ENV || 'development');
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

// Test de conexión al iniciar
pool.on('connect', () => {
  console.log('✅ Cliente PostgreSQL conectado');
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en PostgreSQL:', err);
});

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
const allowedOrigins = [
  'https://titi-invita-app-azhcw.ondigitalocean.app',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('⚠️  CORS bloqueado:', origin);
      callback(null, true); // Permitir de todas formas en desarrollo
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================
function verificarToken(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Token no proporcionado' 
    });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      error: 'Token inválido o expirado' 
    });
  }
}

function verificarAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Se requiere rol de administrador'
    });
  }
  next();
}

// ============================================
// RUTAS PÚBLICAS
// ============================================

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW() as hora, version() as version');
    
    res.json({
      status: 'healthy',
      app: 'Titi Invita',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        time: dbResult.rows[0].hora
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Test de estadísticas
app.get('/api/test', async (req, res) => {
  try {
    const usuarios = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    const eventos = await pool.query('SELECT COUNT(*) as total FROM eventos');
    const mesas = await pool.query('SELECT COUNT(*) as total FROM mesas');
    const invitados = await pool.query('SELECT COUNT(*) as total FROM invitados');
    
    res.json({
      success: true,
      message: '✅ Titi Invita API funcionando',
      database: {
        usuarios: parseInt(usuarios.rows[0].total),
        eventos: parseInt(eventos.rows[0].total),
        mesas: parseInt(mesas.rows[0].total),
        invitados: parseInt(invitados.rows[0].total)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ============================================
// AUTENTICACIÓN
// ============================================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email y contraseña requeridos' 
      });
    }
    
    // Buscar usuario
    const result = await pool.query(
      'SELECT id, nombre, email, password_hash, rol, activo, limite_eventos, avatar FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'Usuario no encontrado' 
      });
    }
    
    const usuario = result.rows[0];
    
    if (!usuario.activo) {
      return res.status(403).json({ 
        success: false,
        message: 'Cuenta desactivada. Contacta al administrador.' 
      });
    }
    
    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    
    if (!passwordValida) {
      return res.status(401).json({ 
        success: false,
        message: 'Contraseña incorrecta' 
      });
    }
    
    // Crear token JWT
    const tokenPayload = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      limite_eventos: usuario.limite_eventos
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({
      success: true,
      message: 'Login exitoso',
      token: token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        avatar: usuario.avatar || usuario.nombre.substring(0, 2).toUpperCase(),
        limite_eventos: usuario.limite_eventos
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor' 
    });
  }
});

// Verificar sesión
app.get('/api/auth/verify', verificarToken, async (req, res) => {
  try {
    res.json({
      success: true,
      usuario: req.usuario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cambiar contraseña (recuperación)
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email y nueva contraseña son requeridos'
      });
    }
    
    // Buscar usuario
    const result = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1 AND activo = true',
      [email.toLowerCase().trim()]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Hashear nueva contraseña
    const password_hash = await bcrypt.hash(newPassword, 10);
    
    // Actualizar contraseña
    await pool.query(
      'UPDATE usuarios SET password_hash = $1, fecha_actualizacion = CURRENT_TIMESTAMP WHERE email = $2',
      [password_hash, email.toLowerCase().trim()]
    );
    
    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
    
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ============================================
// GESTIÓN DE USUARIOS (Solo Admin)
// ============================================

// Obtener todos los usuarios
app.get('/api/usuarios', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, email, rol, activo, limite_eventos, avatar, 
             fecha_creacion, fecha_actualizacion,
             (SELECT COUNT(*) FROM eventos WHERE id_usuario = usuarios.id) as total_eventos
      FROM usuarios 
      ORDER BY id
    `);
    
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

// Crear nuevo usuario
app.post('/api/usuarios', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { nombre, email, password, rol, activo = true } = req.body;
    
    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, email, contraseña y rol son requeridos'
      });
    }
    
    if (!['admin', 'cliente', 'organizador'].includes(rol)) {
      return res.status(400).json({
        success: false,
        error: 'Rol inválido. Debe ser: admin, cliente u organizador'
      });
    }
    
    // Verificar si el email ya existe
    const existente = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    
    if (existente.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }
    
    // Hash de la contraseña
    const password_hash = await bcrypt.hash(password, 10);
    
    // Determinar límite de eventos según rol
    const limite_eventos = rol === 'cliente' ? 1 : null;
    
    // Generar avatar
    const avatar = nombre.substring(0, 2).toUpperCase();
    
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, activo, limite_eventos, avatar) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, nombre, email, rol, activo, limite_eventos, avatar, fecha_creacion`,
      [nombre, email.toLowerCase().trim(), password_hash, rol, activo, limite_eventos, avatar]
    );
    
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      usuario: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error creando usuario' 
    });
  }
});

// Actualizar usuario
app.put('/api/usuarios/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { nombre, email, rol, activo, password } = req.body;
    
    // Construir query dinámico
    let updates = [];
    let values = [];
    let paramCount = 1;
    
    if (nombre) {
      updates.push(`nombre = $${paramCount++}`);
      values.push(nombre);
    }
    
    if (email) {
      updates.push(`email = $${paramCount++}`);
      values.push(email.toLowerCase().trim());
    }
    
    if (rol) {
      if (!['admin', 'cliente', 'organizador'].includes(rol)) {
        return res.status(400).json({
          success: false,
          error: 'Rol inválido'
        });
      }
      updates.push(`rol = $${paramCount++}`);
      values.push(rol);
      
      // Actualizar límite de eventos según rol
      const limite = rol === 'cliente' ? 1 : null;
      updates.push(`limite_eventos = $${paramCount++}`);
      values.push(limite);
    }
    
    if (typeof activo !== 'undefined') {
      updates.push(`activo = $${paramCount++}`);
      values.push(activo);
    }
    
    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(password_hash);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay campos para actualizar'
      });
    }
    
    values.push(userId);
    
    const result = await pool.query(
      `UPDATE usuarios 
       SET ${updates.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING id, nombre, email, rol, activo, limite_eventos, avatar`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Usuario actualizado',
      usuario: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error actualizando usuario' 
    });
  }
});

// Eliminar usuario
app.delete('/api/usuarios/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // No permitir eliminar al usuario actual
    if (userId === req.usuario.id) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propia cuenta'
      });
    }
    
    const result = await pool.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING id, nombre, email',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Usuario eliminado',
      usuario: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error eliminando usuario' 
    });
  }
});

// ============================================
// GESTIÓN DE EVENTOS
// ============================================

// Obtener eventos del usuario actual
app.get('/api/eventos-usuario', verificarToken, async (req, res) => {
  try {
    const userId = req.usuario.id;
    
    const result = await pool.query(
      `SELECT e.*, 
              (SELECT COUNT(*) FROM mesas WHERE id_evento = e.id) as total_mesas,
              (SELECT COUNT(*) FROM invitados WHERE id_evento = e.id) as total_invitados
       FROM eventos e
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

// Obtener todos los eventos (Admin)
app.get('/api/eventos', verificarToken, async (req, res) => {
  try {
    let query;
    let params = [];
    
    if (req.usuario.rol === 'admin') {
      // Admin ve todos los eventos
      query = `
        SELECT e.*, u.nombre as usuario_nombre, u.rol as usuario_rol,
               (SELECT COUNT(*) FROM mesas WHERE id_evento = e.id) as total_mesas,
               (SELECT COUNT(*) FROM invitados WHERE id_evento = e.id) as total_invitados
        FROM eventos e 
        LEFT JOIN usuarios u ON e.id_usuario = u.id 
        ORDER BY e.fecha_creacion DESC
      `;
    } else {
      // Usuarios normales solo ven sus eventos
      query = `
        SELECT e.*, 
               (SELECT COUNT(*) FROM mesas WHERE id_evento = e.id) as total_mesas,
               (SELECT COUNT(*) FROM invitados WHERE id_evento = e.id) as total_invitados
        FROM eventos e
        WHERE id_usuario = $1 
        ORDER BY fecha_creacion DESC
      `;
      params = [req.usuario.id];
    }
    
    const result = await pool.query(query, params);
    
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

// Crear nuevo evento
app.post('/api/eventos', verificarToken, async (req, res) => {
  try {
    const userId = req.usuario.id;
    const { 
      nombre, 
      descripcion, 
      fecha_evento, 
      hora_evento,
      ubicacion, 
      estado = 'borrador',
      num_mesas = 0,
      sillas_por_mesa = 8,
      forma_mesa = 'rectangular',
      configuracion = {}
    } = req.body;
    
    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del evento es requerido'
      });
    }
    
    // Verificar límite de eventos para clientes
    if (req.usuario.limite_eventos === 1) {
      const eventosActivos = await pool.query(
        `SELECT COUNT(*) as total FROM eventos 
         WHERE id_usuario = $1 AND estado IN ('borrador', 'activo')`,
        [userId]
      );
      
      if (parseInt(eventosActivos.rows[0].total) >= 1) {
        return res.status(403).json({
          success: false,
          error: 'Has alcanzado el límite de eventos activos (1). Completa o cancela tu evento actual.'
        });
      }
    }
    
    const result = await pool.query(
      `INSERT INTO eventos 
       (id_usuario, nombre, descripcion, fecha_evento, hora_evento, ubicacion, estado, 
        num_mesas, sillas_por_mesa, forma_mesa, configuracion) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [
        userId,
        nombre,
        descripcion || null,
        fecha_evento || null,
        hora_evento || null,
        ubicacion || null,
        estado,
        num_mesas,
        sillas_por_mesa,
        forma_mesa,
        JSON.stringify(configuracion)
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Evento creado',
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
    let checkQuery = userRole === 'admin' 
      ? 'SELECT id FROM eventos WHERE id = $1'
      : 'SELECT id FROM eventos WHERE id = $1 AND id_usuario = $2';
    
    const checkParams = userRole === 'admin' ? [eventId] : [eventId, userId];
    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado o no autorizado'
      });
    }
    
    // Construir query dinámico
    const {
      nombre, descripcion, fecha_evento, hora_evento, ubicacion, estado,
      num_mesas, sillas_por_mesa, forma_mesa, configuracion
    } = req.body;
    
    let updates = [];
    let values = [];
    let paramCount = 1;
    
    if (nombre) {
      updates.push(`nombre = $${paramCount++}`);
      values.push(nombre);
    }
    if (descripcion !== undefined) {
      updates.push(`descripcion = $${paramCount++}`);
      values.push(descripcion);
    }
    if (fecha_evento !== undefined) {
      updates.push(`fecha_evento = $${paramCount++}`);
      values.push(fecha_evento);
    }
    if (hora_evento !== undefined) {
      updates.push(`hora_evento = $${paramCount++}`);
      values.push(hora_evento);
    }
    if (ubicacion !== undefined) {
      updates.push(`ubicacion = $${paramCount++}`);
      values.push(ubicacion);
    }
    if (estado) {
      updates.push(`estado = $${paramCount++}`);
      values.push(estado);
    }
    if (num_mesas !== undefined) {
      updates.push(`num_mesas = $${paramCount++}`);
      values.push(num_mesas);
    }
    if (sillas_por_mesa !== undefined) {
      updates.push(`sillas_por_mesa = $${paramCount++}`);
      values.push(sillas_por_mesa);
    }
    if (forma_mesa) {
      updates.push(`forma_mesa = $${paramCount++}`);
      values.push(forma_mesa);
    }
    if (configuracion) {
      updates.push(`configuracion = $${paramCount++}`);
      values.push(JSON.stringify(configuracion));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay campos para actualizar'
      });
    }
    
    values.push(eventId);
    
    const result = await pool.query(
      `UPDATE eventos 
       SET ${updates.join(', ')} 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
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

// Eliminar evento
app.delete('/api/eventos/:id', verificarToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.usuario.id;
    const userRole = req.usuario.rol;
    
    // Verificar permisos
    let checkQuery = userRole === 'admin' 
      ? 'SELECT id, nombre FROM eventos WHERE id = $1'
      : 'SELECT id, nombre FROM eventos WHERE id = $1 AND id_usuario = $2';
    
    const checkParams = userRole === 'admin' ? [eventId] : [eventId, userId];
    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado o no autorizado'
      });
    }
    
    const result = await pool.query(
      'DELETE FROM eventos WHERE id = $1 RETURNING *',
      [eventId]
    );
    
    res.json({
      success: true,
      message: 'Evento eliminado',
      evento: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error eliminando evento:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error eliminando evento' 
    });
  }
});

// ============================================
// GESTIÓN DE MESAS
// ============================================

// Obtener mesas de un evento
app.get('/api/eventos/:id/mesas', verificarToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.usuario.id;
    const userRole = req.usuario.rol;
    
    // Verificar permisos
    let checkQuery = userRole === 'admin' 
      ? 'SELECT id FROM eventos WHERE id = $1'
      : 'SELECT id FROM eventos WHERE id = $1 AND id_usuario = $2';
    
    const checkParams = userRole === 'admin' ? [eventId] : [eventId, userId];
    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado o no autorizado'
      });
    }
    
    const result = await pool.query(
      'SELECT * FROM mesas WHERE id_evento = $1 ORDER BY id',
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

// Guardar/actualizar mesas de un evento
app.post('/api/eventos/:id/mesas', verificarToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.usuario.id;
    const userRole = req.usuario.rol;
    const { mesas } = req.body;
    
    // Verificar permisos
    let checkQuery = userRole === 'admin' 
      ? 'SELECT id FROM eventos WHERE id = $1'
      : 'SELECT id FROM eventos WHERE id = $1 AND id_usuario = $2';
    
    const checkParams = userRole === 'admin' ? [eventId] : [eventId, userId];
    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado o no autorizado'
      });
    }
    
    if (!Array.isArray(mesas)) {
      return res.status(400).json({
        success: false,
        error: 'Se espera un array de mesas'
      });
    }
    
    // Eliminar mesas existentes del evento
    await pool.query('DELETE FROM mesas WHERE id_evento = $1', [eventId]);
    
    // Insertar nuevas mesas
    const mesasCreadas = [];
    for (const mesa of mesas) {
      const result = await pool.query(
        `INSERT INTO mesas (id_evento, nombre, forma, posicion_x, posicion_y, sillas) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [
          eventId,
          mesa.nombre || `Mesa ${mesa.id}`,
          mesa.forma || 'rectangular',
          mesa.posicion_x || 0,
          mesa.posicion_y || 0,
          JSON.stringify(mesa.sillas || [])
        ]
      );
      mesasCreadas.push(result.rows[0]);
    }
    
    res.json({
      success: true,
      message: 'Mesas guardadas',
      mesas: mesasCreadas,
      count: mesasCreadas.length
    });
    
  } catch (error) {
    console.error('Error guardando mesas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error guardando mesas' 
    });
  }
});

// ============================================
// GESTIÓN DE INVITADOS
// ============================================

// Obtener invitados de un evento
app.get('/api/eventos/:id/invitados', verificarToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.usuario.id;
    const userRole = req.usuario.rol;
    
    // Verificar permisos
    let checkQuery = userRole === 'admin' 
      ? 'SELECT id FROM eventos WHERE id = $1'
      : 'SELECT id FROM eventos WHERE id = $1 AND id_usuario = $2';
    
    const checkParams = userRole === 'admin' ? [eventId] : [eventId, userId];
    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado o no autorizado'
      });
    }
    
    const result = await pool.query(
      'SELECT * FROM invitados WHERE id_evento = $1 ORDER BY nombre',
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

// Crear invitado
app.post('/api/eventos/:id/invitados', verificarToken, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.usuario.id;
    const userRole = req.usuario.rol;
    const { nombre, email, telefono, id_mesa, silla_numero, estado, notas } = req.body;
    
    // Verificar permisos
    let checkQuery = userRole === 'admin' 
      ? 'SELECT id FROM eventos WHERE id = $1'
      : 'SELECT id FROM eventos WHERE id = $1 AND id_usuario = $2';
    
    const checkParams = userRole === 'admin' ? [eventId] : [eventId, userId];
    const checkResult = await pool.query(checkQuery, checkParams);
    
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

// Actualizar invitado
app.put('/api/eventos/:eventoId/invitados/:invitadoId', verificarToken, async (req, res) => {
  try {
    const eventoId = parseInt(req.params.eventoId);
    const invitadoId = parseInt(req.params.invitadoId);
    const userId = req.usuario.id;
    const userRole = req.usuario.rol;
    
    // Verificar permisos
    let checkQuery = userRole === 'admin' 
      ? 'SELECT id FROM eventos WHERE id = $1'
      : 'SELECT id FROM eventos WHERE id = $1 AND id_usuario = $2';
    
    const checkParams = userRole === 'admin' ? [eventoId] : [eventoId, userId];
    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado o no autorizado'
      });
    }
    
    const { nombre, email, telefono, id_mesa, silla_numero, estado, notas } = req.body;
    
    let updates = [];
    let values = [];
    let paramCount = 1;
    
    if (nombre) {
      updates.push(`nombre = $${paramCount++}`);
      values.push(nombre);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (telefono !== undefined) {
      updates.push(`telefono = $${paramCount++}`);
      values.push(telefono);
    }
    if (id_mesa !== undefined) {
      updates.push(`id_mesa = $${paramCount++}`);
      values.push(id_mesa);
    }
    if (silla_numero !== undefined) {
      updates.push(`silla_numero = $${paramCount++}`);
      values.push(silla_numero);
    }
    if (estado) {
      updates.push(`estado = $${paramCount++}`);
      values.push(estado);
      
      if (estado === 'confirmado') {
        updates.push(`fecha_confirmacion = CURRENT_TIMESTAMP`);
      }
    }
    if (notas !== undefined) {
      updates.push(`notas = $${paramCount++}`);
      values.push(notas);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay campos para actualizar'
      });
    }
    
    values.push(invitadoId, eventoId);
    
    const result = await pool.query(
      `UPDATE invitados 
       SET ${updates.join(', ')} 
       WHERE id = $${paramCount++} AND id_evento = $${paramCount} 
       RETURNING *`,
      values
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

// Eliminar invitado
app.delete('/api/eventos/:eventoId/invitados/:invitadoId', verificarToken, async (req, res) => {
  try {
    const eventoId = parseInt(req.params.eventoId);
    const invitadoId = parseInt(req.params.invitadoId);
    const userId = req.usuario.id;
    const userRole = req.usuario.rol;
    
    // Verificar permisos
    let checkQuery = userRole === 'admin' 
      ? 'SELECT id FROM eventos WHERE id = $1'
      : 'SELECT id FROM eventos WHERE id = $1 AND id_usuario = $2';
    
    const checkParams = userRole === 'admin' ? [eventoId] : [eventoId, userId];
    const checkResult = await pool.query(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evento no encontrado o no autorizado'
      });
    }
    
    const result = await pool.query(
      'DELETE FROM invitados WHERE id = $1 AND id_evento = $2 RETURNING *',
      [invitadoId, eventoId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invitado no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Invitado eliminado',
      invitado: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error eliminando invitado:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error eliminando invitado' 
    });
  }
});

// ============================================
// ESTADÍSTICAS
// ============================================

app.get('/api/estadisticas', verificarToken, async (req, res) => {
  try {
    let stats = {};
    
    if (req.usuario.rol === 'admin') {
      // Estadísticas globales para admin
      const usuarios = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE activo = true');
      const eventos = await pool.query('SELECT COUNT(*) as total FROM eventos');
      const eventosActivos = await pool.query("SELECT COUNT(*) as total FROM eventos WHERE estado = 'activo'");
      const invitados = await pool.query('SELECT COUNT(*) as total FROM invitados');
      
      stats = {
        total_usuarios: parseInt(usuarios.rows[0].total),
        total_eventos: parseInt(eventos.rows[0].total),
        eventos_activos: parseInt(eventosActivos.rows[0].total),
        total_invitados: parseInt(invitados.rows[0].total)
      };
    } else {
      // Estadísticas del usuario
      const userId = req.usuario.id;
      const eventos = await pool.query('SELECT COUNT(*) as total FROM eventos WHERE id_usuario = $1', [userId]);
      const eventosActivos = await pool.query("SELECT COUNT(*) as total FROM eventos WHERE id_usuario = $1 AND estado = 'activo'", [userId]);
      const invitados = await pool.query(
        'SELECT COUNT(*) as total FROM invitados WHERE id_evento IN (SELECT id FROM eventos WHERE id_usuario = $1)',
        [userId]
      );
      
      stats = {
        total_eventos: parseInt(eventos.rows[0].total),
        eventos_activos: parseInt(eventosActivos.rows[0].total),
        total_invitados: parseInt(invitados.rows[0].total)
      };
    }
    
    res.json({
      success: true,
      estadisticas: stats
    });
    
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error obteniendo estadísticas' 
    });
  }
});

// ============================================
// SERVIR ARCHIVOS ESTÁTICOS
// ============================================
app.use(express.static('public'));

// Ruta catch-all para SPA
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile('index.html', { root: 'public' });
  }
});

// ============================================
// MANEJO DE ERRORES
// ============================================
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
async function startServer() {
  try {
    // Test de conexión a la base de datos
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as hora, version() as version');
    client.release();
    
    console.log('✅ PostgreSQL conectado');
    console.log('   Hora del servidor:', result.rows[0].hora);
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n===========================================');
      console.log('🚀 SERVIDOR INICIADO EXITOSAMENTE');
      console.log('===========================================');
      console.log('🌐 URL: https://titi-invita-app-azhcw.ondigitalocean.app');
      console.log('🔌 Puerto:', PORT);
      console.log('📡 Health: /api/health');
      console.log('🔑 Login: POST /api/auth/login');
      console.log('');
      console.log('👤 Credenciales demo:');
      console.log('   Admin: jorge.flores@titi-app.com');
      console.log('   Cliente: cliente@ejemplo.com');
      console.log('   Organizador: organizador@ejemplo.com');
      console.log('   Contraseña: Titi-apps2026@!');
      console.log('===========================================\n');
    });
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('💥 ERROR NO CAPTURADO:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 PROMESA RECHAZADA:', reason);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM recibido, cerrando servidor...');
  await pool.end();
  process.exit(0);
});

// Iniciar
startServer();
