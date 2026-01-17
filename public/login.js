// login.js - Sistema de autenticación para Titi Invita

// Credenciales por defecto
const USUARIOS_PREDEFINIDOS = [
    {
        id: 1,
        nombre: "Jorge Flores",
        email: "jorge.flores@titi-app.com",  // ← CON GUION EN EMAIL
        password: "Titi-apps2026@!",         // ← CON GUION EN CONTRASEÑA
        rol: "admin",
        activo: true,
        avatar: "JF"
    },
    {
        id: 2,
        nombre: "María González",
        email: "cliente@ejemplo.com",
        password: "Titi-apps2026@!",         // ← CON GUION EN CONTRASEÑA
        rol: "cliente",
        activo: true,
        avatar: "MG"
    }
];

// Elementos DOM
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember');
const messageToast = document.getElementById('messageToast');

// Mostrar toast message
function showToast(message, type = 'success') {
    messageToast.textContent = message;
    messageToast.className = `toast ${type} show`;
    
    setTimeout(() => {
        messageToast.classList.remove('show');
    }, 4000);
}

// Verificar credenciales
function verificarCredenciales(email, password) {
    // Buscar usuario por email
    const usuario = USUARIOS_PREDEFINIDOS.find(user => 
        user.email.toLowerCase() === email.toLowerCase() && 
        user.activo
    );
    
    if (!usuario) {
        return { success: false, message: "Usuario no encontrado" };
    }
    
    // Verificar contraseña (en producción usaría bcrypt)
    if (usuario.password !== password) {
        return { success: false, message: "Contraseña incorrecta" };
    }
    
    return { 
        success: true, 
        usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email,
            rol: usuario.rol,
            avatar: usuario.avatar
        }
    };
}

// ========== CAMBIO IMPORTANTE AQUÍ ==========
// Validar formato de email (acepta guiones)
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Validar fortaleza de contraseña (AHORA ACEPTA GUIÓN)
function validarPassword(password) {
    // Mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un símbolo
    // Símbolos aceptados: @$!%*?&.-_ (incluye guión y punto)
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.\-_])[A-Za-z\d@$!%*?&.\-_]{8,}$/;
    return regex.test(password);
}
// ===========================================

// Guardar sesión en localStorage
function guardarSesion(usuario, remember) {
    const sesionData = {
        usuario: usuario,
        timestamp: new Date().getTime(),
        remember: remember
    };
    
    if (remember) {
        localStorage.setItem('titi_sesion', JSON.stringify(sesionData));
    } else {
        sessionStorage.setItem('titi_sesion', JSON.stringify(sesionData));
    }
}

// Cargar sesión guardada
function cargarSesionGuardada() {
    let sesionData = sessionStorage.getItem('titi_sesion');
    
    if (!sesionData) {
        sesionData = localStorage.getItem('titi_sesion');
    }
    
    if (sesionData) {
        try {
            const data = JSON.parse(sesionData);
            const tiempoTranscurrido = new Date().getTime() - data.timestamp;
            const horasTranscurridas = tiempoTranscurrido / (1000 * 60 * 60);
            
            if (horasTranscurridas < 24) {
                emailInput.value = data.usuario.email;
                rememberCheckbox.checked = data.remember;
                showToast(`Bienvenido de nuevo, ${data.usuario.nombre.split(' ')[0]}!`, 'success');
                return true;
            } else {
                localStorage.removeItem('titi_sesion');
                sessionStorage.removeItem('titi_sesion');
            }
        } catch (error) {
            console.error('Error cargando sesión:', error);
        }
    }
    
    return false;
}

// Redireccionar según rol
function redireccionarPorRol(usuario) {
    if (usuario.rol === 'admin') {
        localStorage.setItem('titi_usuario_actual', JSON.stringify(usuario));
        window.location.href = 'admin.html';
    } else {
        localStorage.setItem('titi_usuario_actual', JSON.stringify(usuario));
        window.location.href = 'cliente.html';
    }
}

// Simular llamada a API con delay
function simularAPICall(email, password) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const resultado = verificarCredenciales(email, password);
            resolve(resultado);
        }, 1000);
    });
}

// Manejar submit del formulario
async function handleLogin(event) {
    event.preventDefault();
    
    // Obtener valores
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const remember = rememberCheckbox.checked;
    
    // Validaciones
    if (!email || !password) {
        showToast('Por favor, completa todos los campos', 'error');
        emailInput.focus();
        return;
    }
    
    if (!validarEmail(email)) {
        showToast('Por favor, ingresa un email válido', 'error');
        emailInput.focus();
        return;
    }
    
    // ========== ¡ESTA VALIDACIÓN AHORA ACEPTA GUIÓN! ==========
    if (!validarPassword(password)) {
        showToast('La contraseña debe tener mínimo 8 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos (@$!%*?&.-_)', 'warning');
        passwordInput.focus();
        return;
    }
    
    // Deshabilitar formulario durante la verificación
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    submitButton.disabled = true;
    
    try {
        // Simular llamada a API
        const resultado = await simularAPICall(email, password);
        
        if (resultado.success) {
            // Guardar sesión
            guardarSesion(resultado.usuario, remember);
            
            // Mostrar mensaje de éxito
            showToast(`¡Bienvenido ${resultado.usuario.nombre}!`, 'success');
            
            // Redireccionar después de breve delay
            setTimeout(() => {
                redireccionarPorRol(resultado.usuario);
            }, 1500);
        } else {
            showToast(resultado.message, 'error');
            passwordInput.value = '';
            passwordInput.focus();
        }
    } catch (error) {
        console.error('Error en login:', error);
        showToast('Error de conexión. Por favor, intenta nuevamente.', 'error');
    } finally {
        // Restaurar botón
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
}

// Función para logout
function logout() {
    localStorage.removeItem('titi_usuario_actual');
    localStorage.removeItem('titi_sesion');
    sessionStorage.removeItem('titi_sesion');
    window.location.href = 'index.html';
}

// Función para obtener usuario actual
function obtenerUsuarioActual() {
    const usuarioStr = localStorage.getItem('titi_usuario_actual');
    if (usuarioStr) {
        try {
            return JSON.parse(usuarioStr);
        } catch (error) {
            console.error('Error parseando usuario:', error);
            return null;
        }
    }
    return null;
}

// Verificar si ya está autenticado
function verificarAutenticacion() {
    const usuario = obtenerUsuarioActual();
    const paginaActual = window.location.pathname.split('/').pop();
    
    if (paginaActual === 'login.html' && usuario) {
        redireccionarPorRol(usuario);
        return false;
    }
    
    if (paginaActual !== 'login.html' && paginaActual !== 'index.html' && !usuario) {
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    verificarAutenticacion();
    
    // Cargar sesión guardada si estamos en login
    if (window.location.pathname.includes('login.html')) {
        cargarSesionGuardada();
    }
    
    // Event listener para el formulario
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        
        // Autocompletar con demo credentials al hacer doble click en email
        emailInput.addEventListener('dblclick', function() {
            this.value = "jorge.flores@titi-app.com";
            passwordInput.value = "Titi-apps2026@!";
            rememberCheckbox.checked = true;
            showToast('Credenciales de demo cargadas', 'success');
        });
        
        // Shortcuts de teclado
        document.addEventListener('keydown', function(event) {
            // Ctrl + Enter para login rápido
            if (event.ctrlKey && event.key === 'Enter') {
                loginForm.requestSubmit();
            }
            
            // F1 para ayuda
            if (event.key === 'F1') {
                event.preventDefault();
                showToast('Usa doble click en el campo de email para cargar credenciales demo', 'info');
            }
        });
    }
    
    // Exponer funciones globales para otras páginas
    window.titiAuth = {
        logout: logout,
        obtenerUsuarioActual: obtenerUsuarioActual,
        verificarAutenticacion: verificarAutenticacion
    };
});
