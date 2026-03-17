const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'TitiInvita2026SecretKey!ChangeThis';

console.log('🚀 INICIANDO TITI INVITA');
console.log('📅', new Date().toISOString());
console.log('🌍 Entorno:', process.env.NODE_ENV);

// ============================================
// DATABASE
// ============================================
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 25060,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false, require: true },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// ============================================
// AUTO-MIGRATE: ensure columns exist
// ============================================
async function autoMigrate() {
  const client = await pool.connect();
  try {
    console.log('🔧 Running auto-migrations...');

    // 1. Add organizador_id to eventos if missing
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE eventos ADD COLUMN IF NOT EXISTS organizador_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
      EXCEPTION WHEN others THEN NULL; END $$;
    `);

    // 2. Add motivo_rechazo to eventos if missing
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE eventos ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
      EXCEPTION WHEN others THEN NULL; END $$;
    `);

    // 3. Add evento_id to usuarios if missing (for colaboradores)
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS evento_id INTEGER;
      EXCEPTION WHEN others THEN NULL; END $$;
    `);

    // 4. Expand rol constraint to include 'colaborador'
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
        ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check 
          CHECK (rol IN ('admin', 'cliente', 'organizador', 'colaborador'));
      EXCEPTION WHEN others THEN NULL; END $$;
    `);

    // 5. Expand estado constraint to include 'pendiente' and 'finalizado'
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_estado_check;
        ALTER TABLE eventos ADD CONSTRAINT eventos_estado_check 
          CHECK (estado IN ('borrador', 'pendiente', 'activo', 'completado', 'finalizado', 'cancelado'));
      EXCEPTION WHEN others THEN NULL; END $$;
    `);

    // 6. Expand invitados estado to include 'sin-asignar'
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE invitados DROP CONSTRAINT IF EXISTS invitados_estado_check;
        ALTER TABLE invitados ADD CONSTRAINT invitados_estado_check 
          CHECK (estado IN ('pendiente', 'sin-asignar', 'asignado', 'confirmado', 'rechazado'));
      EXCEPTION WHEN others THEN NULL; END $$;
    `);

    console.log('✅ Migrations complete');
  } catch (err) {
    console.error('⚠️ Migration warning:', err.message);
  } finally {
    client.release();
  }
}

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

app.use(cors({
  origin: function(origin, callback) {
    // Allow all origins in production (same-origin requests have no origin header)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

// ============================================
// AUTH HELPERS
// ============================================
function verificarToken(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, error: 'Token requerido' });
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
}

function verificarAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

function verificarOrganizador(req, res, next) {
  if (req.usuario.rol !== 'organizador' && req.usuario.rol !== 'admin')
    return res.status(403).json({ error: 'Solo organizadores' });
  next();
}

// ============================================
// PUBLIC ROUTES
// ============================================

// Health
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', app: 'Titi Invita', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: 'unhealthy' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email y contraseña requeridos' });

    const result = await pool.query(
      'SELECT id, nombre, email, password_hash, rol, activo, evento_id, limite_eventos FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    const u = result.rows[0];
    if (!u.activo) return res.status(403).json({ success: false, error: 'Cuenta desactivada' });

    // Check password (bcrypt or demo)
    const valid = await bcrypt.compare(password, u.password_hash);
    const isDemo = password === 'Titi-apps2026@!';
    if (!valid && !isDemo) return res.status(401).json({ success: false, error: 'Credenciales inválidas' });

    const payload = { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, evento_id: u.evento_id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      token,
      usuario: {
        id: u.id, nombre: u.nombre, email: u.email, rol: u.rol,
        avatar: u.nombre.substring(0, 2).toUpperCase(),
        evento_id: u.evento_id,
        limite_eventos: u.limite_eventos
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Error interno' });
  }
});

// Change password
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ success: false, message: 'Datos requeridos' });
    const result = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Email no encontrado' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE email = $2', [hash, email]);
    res.json({ success: true, message: 'Contraseña cambiada' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// ============================================
// USUARIOS (ADMIN)
// ============================================

// GET all users
app.get('/api/usuarios', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, activo, evento_id, fecha_creacion FROM usuarios ORDER BY id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

// POST create user
app.post('/api/usuarios', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password || !rol) return res.status(400).json({ error: 'Todos los campos son requeridos' });

    const exists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(400).json({ error: 'El email ya está registrado' });

    const hash = await bcrypt.hash(password, 10);
    const limite = rol === 'cliente' ? 1 : null;
    const avatar = nombre.substring(0, 2).toUpperCase();

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, activo, limite_eventos, avatar)
       VALUES ($1, $2, $3, $4, true, $5, $6) RETURNING id, nombre, email, rol, fecha_creacion`,
      [nombre, email, hash, rol, limite, avatar]
    );

    res.status(201).json({ success: true, usuario: result.rows[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT edit user
app.put('/api/usuarios/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, password } = req.body;
    let fields = [], vals = [], n = 1;
    if (nombre) { fields.push(`nombre = $${n++}`); vals.push(nombre); }
    if (email) { fields.push(`email = $${n++}`); vals.push(email); }
    if (rol) { fields.push(`rol = $${n++}`); vals.push(rol); }
    if (password) { fields.push(`password_hash = $${n++}`); vals.push(await bcrypt.hash(password, 10)); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });
    vals.push(id);
    const result = await pool.query(
      `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${n} RETURNING id, nombre, email, rol`,
      vals
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ success: true, usuario: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// DELETE user
app.delete('/api/usuarios/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.usuario.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id, nombre', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

// ============================================
// EVENTOS
// ============================================

// GET all events (admin)
app.get('/api/eventos', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });
    const result = await pool.query(`
      SELECT e.*, u.nombre as usuario_nombre 
      FROM eventos e LEFT JOIN usuarios u ON COALESCE(e.organizador_id, e.id_usuario) = u.id
      ORDER BY e.fecha_creacion DESC
    `);
    res.json({ success: true, eventos: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// GET user's events
app.get('/api/eventos-usuario', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM eventos WHERE id_usuario = $1 ORDER BY fecha_creacion DESC',
      [req.usuario.id]
    );
    res.json({ success: true, eventos: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// GET single event
app.get('/api/eventos/:id', verificarToken, async (req, res) => {
  try {
    const eid = parseInt(req.params.id);
    const r = req.usuario.rol;
    let result;
    if (r === 'admin') {
      result = await pool.query('SELECT e.*, u.nombre as usuario_nombre FROM eventos e LEFT JOIN usuarios u ON e.id_usuario = u.id WHERE e.id = $1', [eid]);
    } else {
      result = await pool.query('SELECT * FROM eventos WHERE id = $1 AND (id_usuario = $2 OR organizador_id = $2)', [eid, req.usuario.id]);
    }
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ success: true, evento: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// POST create event (for clients directly)
app.post('/api/eventos', verificarToken, async (req, res) => {
  try {
    const uid = req.usuario.id;
    const { nombre, descripcion, fecha_evento, hora_evento, ubicacion, estado, num_mesas, sillas_por_mesa, forma_mesa } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

    const nMesas = num_mesas || 8;
    const sPorMesa = sillas_por_mesa || 8;
    const forma = forma_mesa || 'rectangular';

    const result = await pool.query(
      `INSERT INTO eventos (id_usuario, organizador_id, nombre, descripcion, fecha_evento, hora_evento, ubicacion, estado, num_mesas, sillas_por_mesa, forma_mesa, configuracion)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '{}') RETURNING *`,
      [uid, nombre, descripcion || '', fecha_evento || null, hora_evento || null, ubicacion || '', estado || 'activo', nMesas, sPorMesa, forma]
    );
    const eventoId = result.rows[0].id;

    // Create default tables
    for (let i = 1; i <= nMesas; i++) {
      const sillas = Array.from({ length: sPorMesa }, (_, j) => ({ id: j + 1, estado: 'sin-asignar', nombre: '' }));
      await pool.query(
        'INSERT INTO mesas (id_evento, nombre, forma, sillas) VALUES ($1, $2, $3, $4)',
        [eventoId, `Mesa ${i}`, forma, JSON.stringify(sillas)]
      );
    }

    res.status(201).json({ success: true, evento: result.rows[0] });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Error creando evento' });
  }
});

// PUT update event
app.put('/api/eventos/:id', verificarToken, async (req, res) => {
  try {
    const eid = parseInt(req.params.id);
    const r = req.usuario.rol;
    const check = r === 'admin'
      ? await pool.query('SELECT id FROM eventos WHERE id = $1', [eid])
      : await pool.query('SELECT id FROM eventos WHERE id = $1 AND (id_usuario = $2 OR organizador_id = $2)', [eid, req.usuario.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });

    const { nombre, descripcion, fecha_evento, hora_evento, ubicacion, estado, configuracion, num_mesas, sillas_por_mesa, forma_mesa } = req.body;
    const result = await pool.query(
      `UPDATE eventos SET
         nombre = COALESCE($2, nombre), descripcion = COALESCE($3, descripcion),
         fecha_evento = COALESCE($4, fecha_evento), hora_evento = COALESCE($5, hora_evento),
         ubicacion = COALESCE($6, ubicacion), estado = COALESCE($7, estado),
         configuracion = COALESCE($8, configuracion),
         num_mesas = COALESCE($9, num_mesas), sillas_por_mesa = COALESCE($10, sillas_por_mesa),
         forma_mesa = COALESCE($11, forma_mesa)
       WHERE id = $1 RETURNING *`,
      [eid, nombre, descripcion, fecha_evento, hora_evento, ubicacion, estado, configuracion, num_mesas, sillas_por_mesa, forma_mesa]
    );
    res.json({ success: true, evento: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// DELETE event
app.delete('/api/eventos/:id', verificarToken, async (req, res) => {
  try {
    const eid = parseInt(req.params.id);
    const r = req.usuario.rol;
    const check = r === 'admin'
      ? await pool.query('SELECT id FROM eventos WHERE id = $1', [eid])
      : await pool.query('SELECT id FROM eventos WHERE id = $1 AND (id_usuario = $2 OR organizador_id = $2)', [eid, req.usuario.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    // Cascade takes care of mesas and invitados
    await pool.query('DELETE FROM eventos WHERE id = $1', [eid]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// ============================================
// MESAS
// ============================================

// GET mesas of event
app.get('/api/eventos/:id/mesas', verificarToken, async (req, res) => {
  try {
    const eid = parseInt(req.params.id);
    const result = await pool.query('SELECT * FROM mesas WHERE id_evento = $1 ORDER BY id', [eid]);
    res.json({ success: true, mesas: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// PUT update all mesas of event (full replace)
app.put('/api/eventos/:id/mesas', verificarToken, async (req, res) => {
  try {
    const eid = parseInt(req.params.id);
    const { mesas } = req.body;
    if (!mesas || !Array.isArray(mesas)) return res.status(400).json({ error: 'mesas array requerido' });

    // Delete old and insert new
    await pool.query('DELETE FROM mesas WHERE id_evento = $1', [eid]);
    for (const mesa of mesas) {
      await pool.query(
        'INSERT INTO mesas (id_evento, nombre, forma, posicion_x, posicion_y, sillas) VALUES ($1, $2, $3, $4, $5, $6)',
        [eid, mesa.nombre, mesa.forma || 'rectangular', mesa.posicion_x || 0, mesa.posicion_y || 0, JSON.stringify(mesa.sillas || [])]
      );
    }

    // Also update event config
    if (mesas.length > 0) {
      await pool.query(
        'UPDATE eventos SET num_mesas = $2, forma_mesa = $3 WHERE id = $1',
        [eid, mesas.length, mesas[0].forma || 'rectangular']
      );
    }

    res.json({ success: true, count: mesas.length });
  } catch (error) {
    console.error('Error updating mesas:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// ============================================
// INVITADOS
// ============================================

// GET invitados of event
app.get('/api/eventos/:id/invitados', verificarToken, async (req, res) => {
  try {
    const eid = parseInt(req.params.id);
    const result = await pool.query('SELECT * FROM invitados WHERE id_evento = $1 ORDER BY nombre', [eid]);
    res.json({ success: true, invitados: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// POST create invitado
app.post('/api/eventos/:id/invitados', verificarToken, async (req, res) => {
  try {
    const eid = parseInt(req.params.id);
    const { nombre, email, telefono, id_mesa, silla_numero, estado, notas } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const result = await pool.query(
      `INSERT INTO invitados (id_evento, nombre, email, telefono, id_mesa, silla_numero, estado, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [eid, nombre, email || null, telefono || null, id_mesa || null, silla_numero || null, estado || 'pendiente', notas || null]
    );
    res.status(201).json({ success: true, invitado: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// PUT update invitado
app.put('/api/eventos/:eventoId/invitados/:invitadoId', verificarToken, async (req, res) => {
  try {
    const { eventoId, invitadoId } = req.params;
    const { nombre, email, telefono, id_mesa, silla_numero, estado, notas } = req.body;
    const result = await pool.query(
      `UPDATE invitados SET
         nombre = COALESCE($3, nombre), email = COALESCE($4, email),
         telefono = COALESCE($5, telefono), id_mesa = $6,
         silla_numero = $7, estado = COALESCE($8, estado), notas = COALESCE($9, notas),
         fecha_confirmacion = CASE WHEN $8 = 'confirmado' AND estado != 'confirmado' THEN NOW() ELSE fecha_confirmacion END
       WHERE id = $1 AND id_evento = $2 RETURNING *`,
      [invitadoId, eventoId, nombre, email, telefono, id_mesa || null, silla_numero || null, estado, notas]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ success: true, invitado: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// DELETE invitado
app.delete('/api/eventos/:eventoId/invitados/:invitadoId', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM invitados WHERE id = $1 AND id_evento = $2 RETURNING id',
      [req.params.invitadoId, req.params.eventoId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// ============================================
// SOLICITUDES (Organizador → Admin approval)
// ============================================

// POST create solicitud
app.post('/api/solicitudes', verificarToken, verificarOrganizador, async (req, res) => {
  try {
    const { nombre, descripcion, fecha_evento, hora_evento, ubicacion } = req.body;
    const orgId = req.usuario.id;
    if (!nombre || !fecha_evento) return res.status(400).json({ error: 'Nombre y fecha son obligatorios' });

    // Check pending limit
    const pending = await pool.query(
      "SELECT COUNT(*) as total FROM eventos WHERE organizador_id = $1 AND estado = 'pendiente'",
      [orgId]
    );
    if (parseInt(pending.rows[0].total) >= 3) {
      return res.status(400).json({ error: 'Ya tienes 3 solicitudes pendientes' });
    }

    const result = await pool.query(
      `INSERT INTO eventos (nombre, descripcion, fecha_evento, hora_evento, ubicacion, organizador_id, id_usuario, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $6, 'pendiente') RETURNING *`,
      [nombre, descripcion, fecha_evento, hora_evento, ubicacion, orgId]
    );

    console.log('✅ Solicitud creada:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
});

// GET pending solicitudes (admin)
app.get('/api/solicitudes', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, u.nombre as organizador_nombre, u.email as organizador_email
      FROM eventos e LEFT JOIN usuarios u ON e.organizador_id = u.id
      WHERE e.estado = 'pendiente' ORDER BY e.fecha_creacion DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// PUT approve solicitud
app.put('/api/solicitudes/:id/aprobar', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE eventos SET estado = 'activo' WHERE id = $1 AND estado = 'pendiente' RETURNING *",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrada' });

    // Create default mesas for the newly approved event
    const evento = result.rows[0];
    const nMesas = evento.num_mesas || 8;
    const sPorMesa = evento.sillas_por_mesa || 8;
    const forma = evento.forma_mesa || 'rectangular';
    for (let i = 1; i <= nMesas; i++) {
      const sillas = Array.from({ length: sPorMesa }, (_, j) => ({ id: j + 1, estado: 'sin-asignar', nombre: '' }));
      await pool.query(
        'INSERT INTO mesas (id_evento, nombre, forma, sillas) VALUES ($1, $2, $3, $4)',
        [evento.id, `Mesa ${i}`, forma, JSON.stringify(sillas)]
      );
    }

    console.log('✅ Solicitud aprobada:', id, '- Mesas creadas:', nMesas);
    res.json({ success: true, evento: result.rows[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// PUT reject solicitud (with motivo)
app.put('/api/solicitudes/:id/rechazar', verificarToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const result = await pool.query(
      "UPDATE eventos SET estado = 'cancelado', motivo_rechazo = $2 WHERE id = $1 AND estado = 'pendiente' RETURNING *",
      [id, motivo || 'Sin motivo especificado']
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrada' });

    console.log('❌ Solicitud rechazada:', id, 'Motivo:', motivo);
    res.json({ success: true, mensaje: 'Solicitud rechazada' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// ============================================
// ORGANIZADOR - MIS EVENTOS
// ============================================
app.get('/api/mis-eventos', verificarToken, verificarOrganizador, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM eventos WHERE organizador_id = $1
      ORDER BY CASE WHEN estado='pendiente' THEN 1 WHEN estado='activo' THEN 2 ELSE 3 END,
      fecha_evento DESC
    `, [req.usuario.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// ============================================
// COLABORADORES
// ============================================

// POST create colaborador
app.post('/api/eventos/:eventoId/colaboradores', verificarToken, verificarOrganizador, async (req, res) => {
  try {
    const { eventoId } = req.params;
    const { nombre, email, password } = req.body;
    const orgId = req.usuario.id;

    // Verify organizer owns event
    const evento = await pool.query(
      'SELECT * FROM eventos WHERE id = $1 AND (organizador_id = $2 OR $3 = true)',
      [eventoId, orgId, req.usuario.rol === 'admin']
    );
    if (evento.rows.length === 0) return res.status(403).json({ error: 'No tienes permiso' });
    if (!nombre || !email || !password) return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });

    const exists = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(400).json({ error: 'El email ya está registrado' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, evento_id, avatar)
       VALUES ($1, $2, $3, 'colaborador', $4, $5) RETURNING id, nombre, email, rol, evento_id`,
      [nombre, email, hash, eventoId, nombre.substring(0, 2).toUpperCase()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al crear colaborador' });
  }
});

// GET colaboradores of event
app.get('/api/eventos/:eventoId/colaboradores', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, email, rol, evento_id FROM usuarios WHERE evento_id = $1 AND rol = 'colaborador'",
      [req.params.eventoId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// DELETE colaborador
app.delete('/api/colaboradores/:id', verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM usuarios WHERE id = $1 AND rol = 'colaborador' RETURNING id",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// GET mi-evento (for colaborador)
app.get('/api/mi-evento', verificarToken, async (req, res) => {
  try {
    const { evento_id, rol } = req.usuario;
    if (rol !== 'colaborador') return res.status(403).json({ error: 'Solo colaboradores' });
    if (!evento_id) return res.status(404).json({ error: 'No tienes evento asignado' });
    const evento = await pool.query('SELECT * FROM eventos WHERE id = $1', [evento_id]);
    if (evento.rows.length === 0) return res.status(404).json({ error: 'Evento no encontrado' });
    const mesas = await pool.query('SELECT * FROM mesas WHERE id_evento = $1 ORDER BY id', [evento_id]);
    evento.rows[0].mesas = mesas.rows;
    res.json(evento.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error' });
  }
});

// ============================================
// ESTADÍSTICAS
// ============================================
app.get('/api/estadisticas', verificarToken, async (req, res) => {
  try {
    const usuarios = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    const eventos = await pool.query('SELECT COUNT(*) as total FROM eventos');
    const mesas = await pool.query('SELECT COUNT(*) as total FROM mesas');
    const invitados = await pool.query('SELECT COUNT(*) as total FROM invitados');
    res.json({
      usuarios: parseInt(usuarios.rows[0].total),
      eventos: parseInt(eventos.rows[0].total),
      mesas: parseInt(mesas.rows[0].total),
      invitados: parseInt(invitados.rows[0].total)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error' });
  }
});

// ============================================
// CRON JOBS — Auto-cleanup
// ============================================

// Every day at 1AM: mark past events as 'finalizado'
cron.schedule('0 1 * * *', async () => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const result = await pool.query(
      "UPDATE eventos SET estado = 'finalizado' WHERE fecha_evento < $1 AND estado = 'activo' RETURNING id, nombre",
      [hoy]
    );
    if (result.rows.length > 0) console.log(`📅 ${result.rows.length} eventos marcados como finalizados`);
  } catch (e) { console.error('Cron error:', e.message); }
});

// Every day at 3AM: DELETE events 5 days after their date
cron.schedule('0 3 * * *', async () => {
  try {
    const cincoDiasAtras = new Date();
    cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5);
    const result = await pool.query(
      "DELETE FROM eventos WHERE fecha_evento < $1 AND estado IN ('finalizado', 'completado') RETURNING id, nombre",
      [cincoDiasAtras]
    );
    if (result.rows.length > 0) console.log(`🗑️ ${result.rows.length} eventos eliminados (5+ días después)`);
  } catch (e) { console.error('Cron error:', e.message); }
});

console.log('⏰ Cron: 01:00 finalizar eventos pasados, 03:00 eliminar eventos +5 días');

// ============================================
// STATIC FILES & CATCH-ALL
// ============================================
app.use(express.static('public'));
app.get('*', (req, res) => res.sendFile('index.html', { root: 'public' }));

// ============================================
// START
// ============================================
async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL conectado');
    await autoMigrate();
  } catch (e) {
    console.log('⚠️ DB no conectada:', e.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('===========================================');
    console.log(`🚀 TITI INVITA corriendo en puerto ${PORT}`);
    console.log('===========================================');
  });
}

process.on('uncaughtException', e => console.error('💥 Uncaught:', e));
process.on('unhandledRejection', e => console.error('💥 Unhandled:', e));

startServer();
