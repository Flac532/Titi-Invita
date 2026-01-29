const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar PostgreSQL pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// ===== MIDDLEWARE DE AUTENTICACIÓN =====
const autenticarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.usuario = usuario;
    next();
  });
};

const esAdmin = (req, res, next) => {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores' });
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
      app: 'Titi Invita API v1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message
    });
  }
});

app.get('/api/test', (req, res) => {
  res.json({
    message: '🚀 Titi Invita API está funcionando!',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    endpoints: [
      '/api/auth/login',
      '/api/usuarios',
      '/api/eventos',
      '/api/health'
    ]
  });
});

// ===== RUTAS DE AUTENTICACIÓN =====
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }
    
    // Buscar usuario
    const result = await pool.query(
      'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const usuario = result.rows[0];
    
    // Verificar contraseña (para demo, usar hash de bcrypt)
    // En producción, esto funcionaría con bcrypt.compare
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    
    // Para DEMO: permitir contraseña demo sin hash
    const esDemo = password === 'Titi-apps2026@!';
    
    if (!passwordValida && !esDemo) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Verificar si está activo
    if (!usuario.activo) {
      return res.status(403).json({ error: 'Usuario inactivo' });
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
      { expiresIn: '24h' }
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
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ mensaje: 'Logout exitoso' });
});

// ===== RUTAS DE USUARIOS (Admin only) =====
app.get('/api/usuarios', autenticarToken, esAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, activo, fecha_creacion FROM usuarios ORDER BY fecha_creacion DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/usuarios', autenticarToken, esAdmin, async (req, res) => {
  try {
    const { nombre, email, password, rol, activo = true } = req.body;
    
    // Validaciones
    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    
    // Verificar si el email ya existe
    const existeEmail = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );
    
    if (existeEmail.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    // Hash de la contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Insertar nuevo usuario
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, activo) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, nombre, email, rol, activo, fecha_creacion`,
      [nombre, email, passwordHash, rol, activo]
    );
    
    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: result.rows[0]
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/usuarios/:id', autenticarToken, esAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, activo } = req.body;
    
    const result = await pool.query(
      `UPDATE usuarios 
       SET nombre = $1, email = $2, rol = $3, activo = $4, fecha_actualizacion = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING id, nombre, email, rol, activo`,
      [nombre, email, rol, activo, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({
      mensaje: 'Usuario actualizado',
      usuario: result.rows[0]
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/usuarios/:id', autenticarToken, esAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // No permitir eliminarse a sí mismo
    if (parseInt(id) === req.usuario.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    
    const result = await pool.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ mensaje: 'Usuario eliminado' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== RUTAS DE EVENTOS =====
app.get('/api/eventos', autenticarToken, async (req, res) => {
  try {
    let query = `
      SELECT e.*, u.nombre as nombre_usuario 
      FROM eventos e 
      JOIN usuarios u ON e.id_usuario = u.id
    `;
    
    let params = [];
    
    // Si no es admin, solo mostrar sus eventos
    if (req.usuario.rol !== 'admin') {
      query += ' WHERE e.id_usuario = $1';
      params.push(req.usuario.id);
    }
    
    query += ' ORDER BY e.fecha_creacion DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/eventos/:id', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT e.*, u.nombre as nombre_usuario 
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
      return res.status(403).json({ error: 'No tienes permisos para ver este evento' });
    }
    
    res.json(evento);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/eventos', autenticarToken, async (req, res) => {
  try {
    const { nombre, descripcion, fecha_evento, ubicacion, configuracion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre del evento es obligatorio' });
    }
    
    const result = await pool.query(
      `INSERT INTO eventos (id_usuario, nombre, descripcion, fecha_evento, ubicacion, estado, configuracion) 
       VALUES ($1, $2, $3, $4, $5, 'activo', $6) 
       RETURNING *`,
      [req.usuario.id, nombre, descripcion || '', fecha_evento || null, ubicacion || '', configuracion || {}]
    );
    
    res.status(201).json({
      mensaje: 'Evento creado',
      evento: result.rows[0]
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/eventos/:id', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, fecha_evento, ubicacion, estado, configuracion } = req.body;
    
    // Verificar que el evento existe y pertenece al usuario
    const eventoExistente = await pool.query(
      'SELECT id_usuario FROM eventos WHERE id = $1',
      [id]
    );
    
    if (eventoExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    // Verificar permisos
    if (req.usuario.rol !== 'admin' && eventoExistente.rows[0].id_usuario !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permisos para editar este evento' });
    }
    
    const result = await pool.query(
      `UPDATE eventos 
       SET nombre = $1, descripcion = $2, fecha_evento = $3, ubicacion = $4, estado = $5, configuracion = $6 
       WHERE id = $7 
       RETURNING *`,
      [nombre, descripcion, fecha_evento, ubicacion, estado, configuracion, id]
    );
    
    res.json({
      mensaje: 'Evento actualizado',
      evento: result.rows[0]
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/eventos/:id', autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el evento existe y pertenece al usuario
    const eventoExistente = await pool.query(
      'SELECT id_usuario FROM eventos WHERE id = $1',
      [id]
    );
    
    if (eventoExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    // Verificar permisos
    if (req.usuario.rol !== 'admin' && eventoExistente.rows[0].id_usuario !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este evento' });
    }
    
    await pool.query('DELETE FROM eventos WHERE id = $1', [id]);
    
    res.json({ mensaje: 'Evento eliminado' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== RUTAS DE MESAS =====
app.get('/api/eventos/:id/mesas', autenticarToken, async (req, res) => {
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
      return res.status(403).json({ error: 'No tienes permisos para ver las mesas de este evento' });
    }
    
    const result = await pool.query(
      'SELECT * FROM mesas WHERE id_evento = $1 ORDER BY id',
      [id]
    );
    
    res.json(result.rows);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      return res.status(403).json({ error: 'No tienes permisos para agregar mesas a este evento' });
    }
    
    const result = await pool.query(
      `INSERT INTO mesas (id_evento, nombre, forma, sillas) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [id, nombre, forma, JSON.stringify(sillas)]
    );
    
    res.status(201).json({
      mensaje: 'Mesa creada',
      mesa: result.rows[0]
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      return res.status(403).json({ error: 'No tienes permisos para ver los invitados de este evento' });
    }
    
    const result = await pool.query(
      'SELECT * FROM invitados WHERE id_evento = $1 ORDER BY nombre',
      [id]
    );
    
    res.json(result.rows);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SERVIR FRONTEND =====
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// ===== MANEJO DE ERRORES =====
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, () => {
  console.log(`🚀 Servidor Titi Invita corriendo en puerto ${PORT}`);
  console.log(`📡 Entorno: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`👤 Demo admin: jorge.flores@titi-app.com`);
  console.log(`🔒 JWT Secret: ${process.env.JWT_SECRET ? '✓ Configurado' : '✗ No configurado'}`);
});
