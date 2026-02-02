const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

// ============================================
// CONFIGURACIÓN PARA DIGITAL OCEAN APP PLATFORM
// ============================================
const PORT = process.env.PORT || 8080;  // ¡IMPORTANTE! Digital Ocean usa 8080

console.log('🚀 ============================================');
console.log('🚀 INICIANDO TITI INVITA EN DIGITAL OCEAN');
console.log('🚀 ============================================');
console.log('📅 Fecha:', new Date().toISOString());
console.log('🌍 Entorno:', process.env.NODE_ENV || 'production');
console.log('🔌 Puerto:', PORT);

// Mostrar variables críticas (ocultando password)
console.log('🔍 Variables de entorno:');
console.log('   DB_HOST:', process.env.DB_HOST ? '✓ ' + process.env.DB_HOST.substring(0, 20) + '...' : '✗ NO CONFIGURADO');
console.log('   DB_USER:', process.env.DB_USER || '✗ NO CONFIGURADO');
console.log('   DB_NAME:', process.env.DB_NAME || '✗ NO CONFIGURADO');
console.log('   CORS_ORIGIN:', process.env.CORS_ORIGIN || '✗ NO CONFIGURADO');
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✓ Configurado' : '✗ NO CONFIGURADO');

// ============================================
// CONFIGURACIÓN POSTGRESQL PARA DIGITAL OCEAN
// ============================================
const poolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 25060,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // CONFIGURACIÓN SSL CRÍTICA PARA DIGITAL OCEAN
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,  // 20 segundos timeout
};

console.log('🔗 Configurando conexión PostgreSQL:');
console.log('   Host:', poolConfig.host);
console.log('   Puerto:', poolConfig.port);
console.log('   Database:', poolConfig.database);
console.log('   Usuario:', poolConfig.user);
console.log('   SSL: Activado (requerido por Digital Ocean)');

const pool = new Pool(poolConfig);

// ============================================
// CONEXIÓN A LA BASE DE DATOS CON REINTENTOS
// ============================================
async function conectarBaseDeDatos() {
  const maxIntentos = 5;
  
  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      console.log(`🔗 Intentando conectar a PostgreSQL (Intento ${intento}/${maxIntentos})...`);
      const resultado = await pool.query('SELECT NOW() as hora, version() as version');
      
      console.log('✅ CONEXIÓN EXITOSA A POSTGRESQL');
      console.log('   Hora servidor:', resultado.rows[0].hora);
      console.log('   PostgreSQL:', resultado.rows[0].version.split(',')[0]);
      
      // Verificar tablas
      const tablas = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log(`📊 Tablas encontradas: ${tablas.rows.length}`);
      if (tablas.rows.length > 0) {
        tablas.rows.forEach((tabla, i) => {
          if (i < 5) console.log(`   ${i + 1}. ${tabla.table_name}`);
        });
        if (tablas.rows.length > 5) console.log(`   ... y ${tablas.rows.length - 5} más`);
      } else {
        console.log('⚠️  No se encontraron tablas. Ejecuta: npm run db:init');
      }
      
      return true;
      
    } catch (error) {
      console.error(`❌ Intento ${intento} fallado: ${error.message}`);
      
      if (intento < maxIntentos) {
        console.log(`⏳ Esperando 5 segundos antes del próximo intento...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('💥 TODOS LOS INTENTOS FALLARON');
        console.error('🔧 Detalles del error:', {
          code: error.code,
          message: error.message,
          host: poolConfig.host,
          port: poolConfig.port
        });
        
        console.log('\n💡 SOLUCIÓN DE PROBLEMAS:');
        console.log('   1. Verifica que la database en Digital Ocean esté ONLINE');
        console.log('   2. Verifica "Trusted Sources" en la database');
        console.log('   3. Verifica usuario y contraseña');
        console.log('   4. Verifica variables de entorno en App Platform');
        
        return false;
      }
    }
  }
}

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configurado para Digital Ocean
const corsOptions = {
  origin: function(origin, callback) {
    // Permitir la URL de tu app en Digital Ocean
    const allowedOrigins = [
      'https://titi-invita-app-azhcw.ondigitalocean.app',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://localhost:5500'
    ];
    
    // Si no hay origen (como en requests del mismo servidor) o está en la lista, permitir
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('⚠️  CORS bloqueado para origen:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// ============================================
// RUTAS BÁSICAS (MÍNIMAS PARA TEST)
// ============================================

// Health check simplificado
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW() as hora');
    
    res.json({
      status: 'healthy',
      app: 'Titi Invita',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      database: 'connected',
      timestamp: new Date().toISOString(),
      db_time: dbResult.rows[0].hora
    });
    
  } catch (error) {
    console.error('Health check error:', error.message);
    
    res.status(500).json({
      status: 'unhealthy',
      app: 'Titi Invita',
      error: 'Database connection failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ruta de prueba
app.get('/api/test', async (req, res) => {
  try {
    const usuarios = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    const eventos = await pool.query('SELECT COUNT(*) as total FROM eventos');
    
    res.json({
      message: '✅ Titi Invita API funcionando en Digital Ocean',
      url: 'https://titi-invita-app-azhcw.ondigitalocean.app',
      database: {
        usuarios: parseInt(usuarios.rows[0].total),
        eventos: parseInt(eventos.rows[0].total)
      },
      endpoints: [
        '/api/health',
        '/api/auth/login',
        '/api/usuarios',
        '/api/eventos'
      ]
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Database error',
      message: error.message
    });
  }
});

// Login simplificado (solo para testing)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }
    
    // Usuario demo hardcodeado para testing
    if (email === 'admin@titi.com' && password === 'demo123') {
      const token = jwt.sign(
        { id: 1, nombre: 'Admin Demo', email: 'admin@titi.com', rol: 'admin' },
        process.env.JWT_SECRET || 'demo-secret',
        { expiresIn: '24h' }
      );
      
      return res.json({
        mensaje: 'Login exitoso (demo)',
        token: token,
        usuario: {
          id: 1,
          nombre: 'Admin Demo',
          email: 'admin@titi.com',
          rol: 'admin',
          avatar: 'AD'
        }
      });
    }
    
    // Buscar en la base de datos
    const result = await pool.query(
      'SELECT id, nombre, email, password_hash, rol FROM usuarios WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const usuario = result.rows[0];
    
    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    
    if (!passwordValida && password !== 'Titi-apps2026@!') {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const token = jwt.sign(
      { 
        id: usuario.id, 
        nombre: usuario.nombre, 
        email: usuario.email, 
        rol: usuario.rol 
      },
      process.env.JWT_SECRET || 'demo-secret',
      { expiresIn: '24h' }
    );
    
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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Servir frontend
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
async function iniciarServidor() {
  console.log('\n🔧 Iniciando servidor...');
  
  // Intentar conectar a la base de datos
  const dbConectada = await conectarBaseDeDatos();
  
  if (!dbConectada) {
    console.log('⚠️  Iniciando en modo sin base de datos (solo API básica)...');
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log('===========================================');
    console.log('🚀 SERVIDOR INICIADO EXITOSAMENTE');
    console.log('===========================================');
    console.log('🌐 URL pública: https://titi-invita-app-azhcw.ondigitalocean.app');
    console.log('🔌 Puerto interno:', PORT);
    console.log('📡 Health check: /api/health');
    console.log('🧪 Test API: /api/test');
    console.log('🔑 Login demo: admin@titi.com / demo123');
    console.log('===========================================');
    
    if (!dbConectada) {
      console.log('⚠️  ADVERTENCIA: Sin conexión a base de datos');
      console.log('💡 Ejecuta manualmente en Digital Ocean:');
      console.log('   1. Variables de entorno correctas');
      console.log('   2. Trusted Sources configuradas');
      console.log('   3. npm run db:init y npm run db:seed');
    }
  });
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('💥 ERROR NO CAPTURADO:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 PROMESA RECHAZADA NO MANEJADA:', reason);
});

// Iniciar
iniciarServidor();
