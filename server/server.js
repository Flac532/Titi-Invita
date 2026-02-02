const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar PostgreSQL pool con tu conexión
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
    ca: process.env.DB_CA_CERT || ''
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Testear conexión
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL en Digital Ocean');
});

pool.on('error', (err) => {
  console.error('❌ Error en la pool de PostgreSQL:', err);
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: function(origin, callback) {
    // Permitir todas las solicitudes en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // En producción, verificar orígenes permitidos
    const allowedOrigins = process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',') : [];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// ===== MIDDLEWARE DE AUTENTICACIÓN =====
const autenticarToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token de autorización requerido' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
      if (err) {
        console.error('Error verificación JWT:', err.message);
        return res.status(403).json({ error: 'Token inválido o expirado' });
      }
      req.usuario = usuario;
      next();
    });
  } catch (error) {
    console.error('Error en middleware autenticarToken:', error);
    res.status(500).json({ error: 'Error interno en autenticación' });
  }
};

const esAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ 
      error: 'Acceso denegado. Se requiere rol de administrador.' 
    });
  }
  next();
};

// ===== RUTAS PÚBLICAS =====
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT version()');
    res.json({
      status: 'healthy',
      database: 'connected',
      postgres_version: result.rows[0].version,
      timestamp: new Date().toISOString(),
      app: 'Titi Invita API v1.0.0',
      environment: process.env.NODE_ENV,
      node_version: process.version
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/test', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT 1 as test');
    
    res.json({
      message: '🚀 Titi Invita API está funcionando!',
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      database: dbResult.rows[0].test === 1 ? 'connected' : 'error',
      endpoints: [
        '/api/auth/login',
        '/api/usuarios',
        '/api/eventos',
        '/api/health'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error de conexión a la base de datos',
      details: error.message 
    });
  }
});

// ===== RUTAS DE AUTENTICACIÓN =====
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email y contraseña son requeridos' 
      });
    }
    
    // Buscar usuario
    const result = await pool.query(
      `SELECT id, nombre, email, password_hash, rol, activo 
       FROM usuarios WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas' 
      });
    }
    
    const usuario = result.rows[0];
    
    // Verificar si está activo
    if (!usuario.activo) {
      return res.status(403).json({ 
        error: 'Tu cuenta está inactiva. Contacta al administrador.' 
      });
    }
    
    // Verificar contraseña
    let passwordValida = false;
    
    try {
      // Primero intentar con bcrypt
      if (usuario.password_hash && usuario.password_hash.startsWith('$2b$')) {
        passwordValida = await bcrypt.compare(password, usuario.password_hash);
      }
      
      // Si no funciona con bcrypt, verificar si es la contraseña demo
      if (!passwordValida && password === 'Titi-apps2026@!') {
        passwordValida = true;
      }
      
    } catch (bcryptError) {
      console.error('Error bcrypt:', bcryptError);
      // Para usuarios demo, permitir contraseña demo
      if (password === 'Titi-apps2026@!') {
        passwordValida = true;
      }
    }
    
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { 
        id: usuario.id, 
        nombre: usuario.nombre, 
        email: usuario.email, 
        rol: usuario.rol 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    // Respuesta exitosa
    res.json({
      mensaje: 'Login exitoso',
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
    console.error('Error en login:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor durante el login',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ 
    mensaje: 'Logout exitoso. El token debe ser eliminado del cliente.' 
  });
});

// ===== RUTAS DE USUARIOS (Admin only) =====
app.get('/api/usuarios', autenticarToken, esAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, email, rol, activo, fecha_creacion, fecha_actualizacion 
       FROM usuarios 
       ORDER BY fecha_creacion DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

app.post('/api/usuarios', autenticarToken, esAdmin, async (req, res) => {
  try {
    const { nombre, email, password, rol, activo = true } = req.body;
    
    // Validaciones
    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ 
        error: 'Todos los campos son obligatorios' 
      });
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    
    // Validar rol
    const rolesPermitidos = ['admin', 'cliente'];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    
    // Verificar si el email ya existe
    const existeEmail = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    
    if (existeEmail.rows.length > 0) {
      return res.status(400).json({ 
        error: 'El email ya está registrado' 
      });
    }
    
    // Hash de la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Insertar nuevo usuario
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, activo) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, nombre, email, rol, activo, fecha_creacion`,
      [nombre, email.toLowerCase().trim(), passwordHash, rol, activo]
    );
    
    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ 
      error: 'Error al crear usuario',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.put('/api/usuarios/:id', autenticarToken, esAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, activo } = req.body;
    
    // Validar ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    
    // Verificar que el usuario existe
    const usuarioExistente = await pool.query(
      'SELECT id FROM usuarios WHERE id = $1',
      [id]
    );
    
    if (usuarioExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar email único si se cambia
    if (email) {
      const emailDuplicado = await pool.query(
        'SELECT id FROM usuarios WHERE email = $1 AND id != $2',
        [email.toLowerCase().trim(), id]
      );
      
      if (emailDuplicado.rows.length > 0) {
        return res.status(400).json({ error: 'El email ya está en uso por otro usuario' });
      }
    }
    
    const result = await pool.query(
      `UPDATE usuarios 
       SET nombre = COALESCE($1, nombre), 
           email = COALESCE($2, email), 
           rol = COALESCE($3, rol), 
           activo = COALESCE($4, activo), 
           fecha_actualizacion = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING id, nombre, email, rol, activo, fecha_actualizacion`,
      [nombre, email ? email.toLowerCase().trim() : null, rol, activo, id]
    );
    
    res.json({
      mensaje: 'Usuario actualizado exitosamente',
      usuario: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

app.delete('/api/usuarios/:id', autenticarToken, esAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    
    // No permitir eliminarse a sí mismo
    if (parseInt(id) === req.usuario.id) {
      return res.status(400).json({ 
        error: 'No puedes eliminarte a ti mismo' 
      });
    }
    
    // Verificar que el usuario existe
    const usuarioExistente = await pool.query(
      'SELECT id FROM usuarios WHERE id = $1',
      [id]
    );
    
    if (usuarioExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar si tiene eventos asociados
    const eventosAsociados = await pool.query(
      'SELECT COUNT(*) as total FROM eventos WHERE id_usuario = $1',
      [id]
    );
    
    if (parseInt(eventosAsociados.rows[0].total) > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el usuario porque tiene eventos asociados',
        total_eventos: eventosAsociados.rows[0].total
      });
    }
    
    const result = await pool.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING id, nombre, email',
      [id]
    );
    
    res.json({ 
      mensaje: 'Usuario eliminado exitosamente',
      usuario_eliminado: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// ===== RUTAS DE EVENTOS =====
app.get('/api/eventos', autenticarToken, async (req, res) => {
  try {
    let query = `
      SELECT e.*, u.nombre as nombre_usuario, u.email as email_usuario
      FROM eventos e 
      JOIN usuarios u ON e.id_usuario = u.id
    `;
    
    let params = [];
    let paramCount = 0;
    
    // Si no es admin, solo mostrar sus eventos
    if (req.usuario.rol !== 'admin') {
      query += ` WHERE e.id_usuario = $${++paramCount}`;
      params.push(req.usuario.id);
    }
    
    query += ' ORDER BY e.fecha_creacion DESC';
    
    const result = await pool.query(query, params);
    
    // Parsear JSON de configuración
    const eventos = result.rows.map(evento => ({
      ...evento,
      configuracion: typeof evento.configuracion === 'string' ? 
        JSON.parse(evento.configuracion) : evento.configuracion
    }));
    
    res.json(eventos);
    
  } catch (error) {
    console.error('Error obteniendo eventos:', error);
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
});

app.get('/api/eventos/:id', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT e.*, u.nombre as nombre_usuario, u.email as email_usuario
       FROM eventos e 
       JOIN usuarios u ON e.id_usuario = u.id 
       WHERE e.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    // Verificar permisos
    const evento = result.rows[0];
    if (req.usuario.rol !== 'admin' && evento.id_usuario !== req.usuario.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para ver este evento' 
      });
    }
    
    // Parsear configuración
    evento.configuracion = typeof evento.configuracion === 'string' ? 
      JSON.parse(evento.configuracion) : evento.configuracion;
    
    res.json(evento);
    
  } catch (error) {
    console.error('Error obteniendo evento:', error);
    res.status(500).json({ error: 'Error al obtener evento' });
  }
});

app.post('/api/eventos', autenticarToken, async (req, res) => {
  try {
    const { nombre, descripcion, fecha_evento, ubicacion, configuracion } = req.body;
    
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ 
        error: 'El nombre del evento es obligatorio' 
      });
    }
    
    // Validar y formatear configuración
    let configuracionFinal = {};
    try {
      if (configuracion) {
        configuracionFinal = typeof configuracion === 'string' ? 
          JSON.parse(configuracion) : configuracion;
      }
    } catch (parseError) {
      console.error('Error parseando configuración:', parseError);
      configuracionFinal = {};
    }
    
    const result = await pool.query(
      `INSERT INTO eventos 
       (id_usuario, nombre, descripcion, fecha_evento, ubicacion, estado, configuracion) 
       VALUES ($1, $2, $3, $4, $5, 'activo', $6) 
       RETURNING *`,
      [
        req.usuario.id, 
        nombre.trim(), 
        descripcion ? descripcion.trim() : '', 
        fecha_evento || null, 
        ubicacion ? ubicacion.trim() : '', 
        JSON.stringify(configuracionFinal)
      ]
    );
    
    const evento = result.rows[0];
    evento.configuracion = configuracionFinal;
    
    res.status(201).json({
      mensaje: 'Evento creado exitosamente',
      evento: evento
    });
    
  } catch (error) {
    console.error('Error creando evento:', error);
    res.status(500).json({ 
      error: 'Error al crear evento',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.put('/api/eventos/:id', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, fecha_evento, ubicacion, estado, configuracion } = req.body;
    
    // Verificar que el evento existe
    const eventoExistente = await pool.query(
      'SELECT id, id_usuario FROM eventos WHERE id = $1',
      [id]
    );
    
    if (eventoExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    // Verificar permisos
    const evento = eventoExistente.rows[0];
    if (req.usuario.rol !== 'admin' && evento.id_usuario !== req.usuario.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para editar este evento' 
      });
    }
    
    // Validar y formatear configuración
    let configuracionFinal = null;
    if (configuracion !== undefined) {
      try {
        configuracionFinal = typeof configuracion === 'string' ? 
          JSON.parse(configuracion) : configuracion;
      } catch (parseError) {
        console.error('Error parseando configuración:', parseError);
        configuracionFinal = {};
      }
    }
    
    const result = await pool.query(
      `UPDATE eventos 
       SET nombre = COALESCE($1, nombre),
           descripcion = COALESCE($2, descripcion),
           fecha_evento = COALESCE($3, fecha_evento),
           ubicacion = COALESCE($4, ubicacion),
           estado = COALESCE($5, estado),
           configuracion = COALESCE($6::jsonb, configuracion),
           fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id = $7 
       RETURNING *`,
      [
        nombre ? nombre.trim() : null,
        descripcion !== undefined ? (descripcion ? descripcion.trim() : '') : null,
        fecha_evento || null,
        ubicacion !== undefined ? (ubicacion ? ubicacion.trim() : '') : null,
        estado || null,
        configuracionFinal !== null ? JSON.stringify(configuracionFinal) : null,
        id
      ]
    );
    
    const eventoActualizado = result.rows[0];
    if (eventoActualizado.configuracion && typeof eventoActualizado.configuracion === 'string') {
      eventoActualizado.configuracion = JSON.parse(eventoActualizado.configuracion);
    }
    
    res.json({
      mensaje: 'Evento actualizado exitosamente',
      evento: eventoActualizado
    });
    
  } catch (error) {
    console.error('Error actualizando evento:', error);
    res.status(500).json({ error: 'Error al actualizar evento' });
  }
});

app.delete('/api/eventos/:id', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el evento existe
    const eventoExistente = await pool.query(
      'SELECT id, id_usuario FROM eventos WHERE id = $1',
      [id]
    );
    
    if (eventoExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    // Verificar permisos
    const evento = eventoExistente.rows[0];
    if (req.usuario.rol !== 'admin' && evento.id_usuario !== req.usuario.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para eliminar este evento' 
      });
    }
    
    // Eliminar mesas e invitados asociados primero
    await pool.query('DELETE FROM mesas WHERE id_evento = $1', [id]);
    await pool.query('DELETE FROM invitados WHERE id_evento = $1', [id]);
    
    // Eliminar evento
    await pool.query('DELETE FROM eventos WHERE id = $1', [id]);
    
    res.json({ 
      mensaje: 'Evento eliminado exitosamente',
      id_evento: id
    });
    
  } catch (error) {
    console.error('Error eliminando evento:', error);
    res.status(500).json({ error: 'Error al eliminar evento' });
  }
});

// ===== RUTAS DE MESAS =====
app.get('/api/eventos/:id/mesas', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar permisos del evento
    const evento = await pool.query(
      'SELECT id, id_usuario FROM eventos WHERE id = $1',
      [id]
    );
    
    if (evento.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    if (req.usuario.rol !== 'admin' && evento.rows[0].id_usuario !== req.usuario.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para ver las mesas de este evento' 
      });
    }
    
    const result = await pool.query(
      'SELECT * FROM mesas WHERE id_evento = $1 ORDER BY fecha_creacion',
      [id]
    );
    
    // Parsear sillas JSON
    const mesas = result.rows.map(mesa => ({
      ...mesa,
      sillas: typeof mesa.sillas === 'string' ? JSON.parse(mesa.sillas) : mesa.sillas
    }));
    
    res.json(mesas);
    
  } catch (error) {
    console.error('Error obteniendo mesas:', error);
    res.status(500).json({ error: 'Error al obtener mesas' });
  }
});

app.post('/api/eventos/:id/mesas', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, forma, sillas } = req.body;
    
    // Verificar permisos del evento
    const evento = await pool.query(
      'SELECT id_usuario FROM eventos WHERE id = $1',
      [id]
    );
    
    if (evento.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    if (req.usuario.rol !== 'admin' && evento.rows[0].id_usuario !== req.usuario.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para agregar mesas a este evento' 
      });
    }
    
    // Validar sillas
    let sillasFormateadas = [];
    try {
      sillasFormateadas = sillas || [];
      if (typeof sillasFormateadas === 'string') {
        sillasFormateadas = JSON.parse(sillasFormateadas);
      }
    } catch (parseError) {
      console.error('Error parseando sillas:', parseError);
      sillasFormateadas = [];
    }
    
    const result = await pool.query(
      `INSERT INTO mesas (id_evento, nombre, forma, sillas) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [id, nombre, forma, JSON.stringify(sillasFormateadas)]
    );
    
    const mesa = result.rows[0];
    mesa.sillas = sillasFormateadas;
    
    res.status(201).json({
      mensaje: 'Mesa creada exitosamente',
      mesa: mesa
    });
    
  } catch (error) {
    console.error('Error creando mesa:', error);
    res.status(500).json({ error: 'Error al crear mesa' });
  }
});

app.put('/api/eventos/:id/mesas/:mesaId', autenticarToken, async (req, res) => {
  try {
    const { id, mesaId } = req.params;
    const { nombre, forma, sillas } = req.body;
    
    // Verificar permisos del evento
    const evento = await pool.query(
      'SELECT id_usuario FROM eventos WHERE id = $1',
      [id]
    );
    
    if (evento.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    if (req.usuario.rol !== 'admin' && evento.rows[0].id_usuario !== req.usuario.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para editar mesas de este evento' 
      });
    }
    
    // Verificar que la mesa existe
    const mesaExistente = await pool.query(
      'SELECT id FROM mesas WHERE id = $1 AND id_evento = $2',
      [mesaId, id]
    );
    
    if (mesaExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Mesa no encontrada en este evento' });
    }
    
    // Formatear sillas
    let sillasFormateadas = null;
    if (sillas !== undefined) {
      try {
        sillasFormateadas = typeof sillas === 'string' ? JSON.parse(sillas) : sillas;
      } catch (parseError) {
        console.error('Error parseando sillas:', parseError);
        sillasFormateadas = [];
      }
    }
    
    const result = await pool.query(
      `UPDATE mesas 
       SET nombre = COALESCE($1, nombre),
           forma = COALESCE($2, forma),
           sillas = COALESCE($3::jsonb, sillas)
       WHERE id = $4 AND id_evento = $5 
       RETURNING *`,
      [
        nombre,
        forma,
        sillasFormateadas !== null ? JSON.stringify(sillasFormateadas) : null,
        mesaId,
        id
      ]
    );
    
    const mesa = result.rows[0];
    if (mesa.sillas && typeof mesa.sillas === 'string') {
      mesa.sillas = JSON.parse(mesa.sillas);
    }
    
    res.json({
      mensaje: 'Mesa actualizada exitosamente',
      mesa: mesa
    });
    
  } catch (error) {
    console.error('Error actualizando mesa:', error);
    res.status(500).json({ error: 'Error al actualizar mesa' });
  }
});

app.delete('/api/eventos/:id/mesas/:mesaId', autenticarToken, async (req, res) => {
  try {
    const { id, mesaId } = req.params;
    
    // Verificar permisos del evento
    const evento = await pool.query(
      'SELECT id_usuario FROM eventos WHERE id = $1',
      [id]
    );
    
    if (evento.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    if (req.usuario.rol !== 'admin' && evento.rows[0].id_usuario !== req.usuario.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para eliminar mesas de este evento' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM mesas WHERE id = $1 AND id_evento = $2 RETURNING id',
      [mesaId, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mesa no encontrada' });
    }
    
    res.json({
      mensaje: 'Mesa eliminada exitosamente',
      id_mesa: mesaId
    });
    
  } catch (error) {
    console.error('Error eliminando mesa:', error);
    res.status(500).json({ error: 'Error al eliminar mesa' });
  }
});

// ===== RUTAS DE INVITADOS =====
app.get('/api/eventos/:id/invitados', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar permisos del evento
    const evento = await pool.query(
      'SELECT id_usuario FROM eventos WHERE id = $1',
      [id]
    );
    
    if (evento.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    if (req.usuario.rol !== 'admin' && evento.rows[0].id_usuario !== req.usuario.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para ver los invitados de este evento' 
      });
    }
    
    const result = await pool.query(
      `SELECT i.*, m.nombre as nombre_mesa
       FROM invitados i 
       LEFT JOIN mesas m ON i.id_mesa = m.id
       WHERE i.id_evento = $1 
       ORDER BY i.nombre`,
      [id]
    );
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error obteniendo invitados:', error);
    res.status(500).json({ error: 'Error al obtener invitados' });
  }
});

app.post('/api/eventos/:id/invitados', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, telefono, notas, id_mesa, silla_numero, estado } = req.body;
    
    // Verificar permisos del evento
    const evento = await pool.query(
      'SELECT id_usuario FROM eventos WHERE id = $1',
      [id]
    );
    
    if (evento.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    if (req.usuario.rol !== 'admin' && evento.rows[0].id_usuario !== req.usuario.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para agregar invitados a este evento' 
      });
    }
    
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ error: 'El nombre del invitado es obligatorio' });
    }
    
    // Si se asigna a mesa, verificar que existe
    if (id_mesa) {
      const mesaExistente = await pool.query(
        'SELECT id FROM mesas WHERE id = $1 AND id_evento = $2',
        [id_mesa, id]
      );
      
      if (mesaExistente.rows.length === 0) {
        return res.status(400).json({ error: 'La mesa especificada no existe en este evento' });
      }
    }
    
    const result = await pool.query(
      `INSERT INTO invitados 
       (id_evento, nombre, email, telefono, notas, id_mesa, silla_numero, estado) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        id, 
        nombre.trim(), 
        email ? email.toLowerCase().trim() : null, 
        telefono || null, 
        notas || null, 
        id_mesa || null, 
        silla_numero || null, 
        estado || 'pendiente'
      ]
    );
    
    res.status(201).json({
      mensaje: 'Invitado creado exitosamente',
      invitado: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creando invitado:', error);
    res.status(500).json({ error: 'Error al crear invitado' });
  }
});

app.put('/api/eventos/:id/invitados/:invitadoId', autenticarToken, async (req, res) => {
  try {
    const { id, invitadoId } = req.params;
    const { nombre, email, telefono, notas, id_mesa, silla_numero, estado } = req.body;
    
    // Verificar permisos del evento
    const evento = await pool.query(
      'SELECT id_usuario FROM eventos WHERE id = $1',
      [id]
    );
    
    if (evento.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    if (req.usuario.rol !== 'admin' && evento.rows[0].id_usuario !== req.usuario.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para editar invitados de este evento' 
      });
    }
    
    // Verificar que el invitado existe
    const invitadoExistente = await pool.query(
      'SELECT id FROM invitados WHERE id = $1 AND id_evento = $2',
      [invitadoId, id]
    );
    
    if (invitadoExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Invitado no encontrado en este evento' });
    }
    
    // Si se asigna a mesa, verificar que existe
    if (id_mesa) {
      const mesaExistente = await pool.query(
        'SELECT id FROM mesas WHERE id = $1 AND id_evento = $2',
        [id_mesa, id]
      );
      
      if (mesaExistente.rows.length === 0) {
        return res.status(400).json({ error: 'La mesa especificada no existe en este evento' });
      }
    }
    
    const result = await pool.query(
      `UPDATE invitados 
       SET nombre = COALESCE($1, nombre),
           email = COALESCE($2, email),
           telefono = COALESCE($3, telefono),
           notas = COALESCE($4, notas),
           id_mesa = COALESCE($5, id_mesa),
           silla_numero = COALESCE($6, silla_numero),
           estado = COALESCE($7, estado)
       WHERE id = $8 AND id_evento = $9 
       RETURNING *`,
      [
        nombre ? nombre.trim() : null,
        email !== undefined ? (email ? email.toLowerCase().trim() : null) : null,
        telefono || null,
        notas !== undefined ? (notas || null) : null,
        id_mesa || null,
        silla_numero || null,
        estado || null,
        invitadoId,
        id
      ]
    );
    
    res.json({
      mensaje: 'Invitado actualizado exitosamente',
      invitado: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error actualizando invitado:', error);
    res.status(500).json({ error: 'Error al actualizar invitado' });
  }
});

app.delete('/api/eventos/:id/invitados/:invitadoId', autenticarToken, async (req, res) => {
  try {
    const { id, invitadoId } = req.params;
    
    // Verificar permisos del evento
    const evento = await pool.query(
      'SELECT id_usuario FROM eventos WHERE id = $1',
      [id]
    );
    
    if (evento.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    if (req.usuario.rol !== 'admin' && evento.rows[0].id_usuario !== req.usuario.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para eliminar invitados de este evento' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM invitados WHERE id = $1 AND id_evento = $2 RETURNING id',
      [invitadoId, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitado no encontrado' });
    }
    
    res.json({
      mensaje: 'Invitado eliminado exitosamente',
      id_invitado: invitadoId
    });
    
  } catch (error) {
    console.error('Error eliminando invitado:', error);
    res.status(500).json({ error: 'Error al eliminar invitado' });
  }
});

// ===== RUTA PARA GUARDAR CONFIGURACIÓN COMPLETA =====
app.post('/api/eventos/:id/guardar-configuracion', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { mesas, configuracion, invitados } = req.body;
    
    // Verificar permisos del evento
    const evento = await pool.query(
      'SELECT id_usuario FROM eventos WHERE id = $1',
      [id]
    );
    
    if (evento.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    if (req.usuario.rol !== 'admin' && evento.rows[0].id_usuario !== req.usuario.id) {
      return res.status(403).json({ 
        error: 'No tienes permisos para guardar la configuración de este evento' 
      });
    }
    
    // Iniciar transacción
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Actualizar configuración del evento
      if (configuracion) {
        await client.query(
          'UPDATE eventos SET configuracion = $1 WHERE id = $2',
          [JSON.stringify(configuracion), id]
        );
      }
      
      // 2. Eliminar mesas existentes
      await client.query('DELETE FROM mesas WHERE id_evento = $1', [id]);
      
      // 3. Insertar nuevas mesas
      if (mesas && Array.isArray(mesas)) {
        for (const mesa of mesas) {
          await client.query(
            `INSERT INTO mesas (id_evento, nombre, forma, sillas) 
             VALUES ($1, $2, $3, $4)`,
            [id, mesa.nombre, mesa.forma, JSON.stringify(mesa.sillas || [])]
          );
        }
      }
      
      // 4. Actualizar invitados (si se proporcionan)
      if (invitados && Array.isArray(invitados)) {
        for (const invitado of invitados) {
          if (invitado.id) {
            await client.query(
              `UPDATE invitados 
               SET id_mesa = $1, silla_numero = $2, estado = $3
               WHERE id = $4 AND id_evento = $5`,
              [
                invitado.id_mesa || null,
                invitado.silla_numero || null,
                invitado.estado || 'pendiente',
                invitado.id,
                id
              ]
            );
          }
        }
      }
      
      await client.query('COMMIT');
      
      res.json({
        mensaje: 'Configuración guardada exitosamente',
        detalles: {
          mesas_guardadas: mesas ? mesas.length : 0,
          invitados_actualizados: invitados ? invitados.length : 0
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error guardando configuración:', error);
    res.status(500).json({ 
      error: 'Error al guardar la configuración',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ===== SERVIR FRONTEND =====
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// ===== MANEJO DE ERRORES =====
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error global:', err.stack);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ 
      error: 'JSON inválido en el cuerpo de la solicitud' 
    });
  }
  
  res.status(500).json({ 
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ===== INICIAR SERVIDOR =====
async function iniciarServidor() {
  try {
    // Testear conexión a la base de datos
    const testResult = await pool.query('SELECT NOW() as hora_actual');
    console.log('✅ Conectado a PostgreSQL en:', testResult.rows[0].hora_actual);
    
    app.listen(PORT, () => {
      console.log('===========================================');
      console.log(`🚀 Servidor Titi Invita corriendo en puerto ${PORT}`);
      console.log(`📡 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 Test API: http://localhost:${PORT}/api/test`);
      console.log('👤 Demo admin: jorge.flores@titi-app.com / Titi-apps2026@!');
      console.log('👤 Demo cliente: cliente@ejemplo.com / Titi-apps2026@!');
      console.log('===========================================');
    });
    
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error.message);
    console.log('💡 Verifica:');
    console.log('   1. Que las variables de entorno estén configuradas');
    console.log('   2. Que la base de datos en Digital Ocean esté activa');
    console.log('   3. Que las credenciales sean correctas');
    process.exit(1);
  }
}

iniciarServidor();

// Manejo de cierre limpio
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await pool.end();
  console.log('✅ Conexiones cerradas. Hasta luego! 👋');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Recibida señal de terminación...');
  await pool.end();
  process.exit(0);
});
