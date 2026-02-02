// login.js - Sistema de autenticación COMPLETO

// ===== CONFIGURACIÓN =====
const API_URL = window.location.origin.includes('localhost') 
    ? 'http://localhost:8080/api' 
    : '/api';

// ===== ELEMENTOS DOM =====
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember');
const loginButton = document.getElementById('loginButton');
const messageToast = document.getElementById('messageToast');
const themeToggle = document.getElementById('themeToggle');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const forgotPasswordModal = document.getElementById('forgotPasswordModal');
const closeForgotModal = document.getElementById('closeForgotModal');
const cancelForgotBtn = document.getElementById('cancelForgotBtn');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const resetEmail = document.getElementById('resetEmail');
const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');

// ===== VARIABLES DE ESTADO =====
let isProcessing = false;

// ===== FUNCIONES DE UTILIDAD =====
function showToast(message, type = 'success') {
    if (!messageToast) return;
    messageToast.textContent = message;
    messageToast.className = `toast ${type} show`;
    setTimeout(() => {
        messageToast.classList.remove('show');
    }, 4000);
}

function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validarPassword(password) {
    // Validación más flexible - mínimo 8 caracteres
    return password.length >= 8;
}

// ===== MODO OSCURO =====
function initTheme() {
    const savedTheme = localStorage.getItem('titi_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('titi_theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// ===== SESIÓN =====
function guardarSesion(usuario, token, remember) {
    const sesionData = {
        usuario: usuario,
        token: token,
        timestamp: new Date().getTime()
    };
    
    if (remember) {
        localStorage.setItem('titi_token', token);
        localStorage.setItem('titi_usuario_actual', JSON.stringify(usuario));
        localStorage.setItem('titi_sesion', JSON.stringify(sesionData));
    } else {
        sessionStorage.setItem('titi_token', token);
        localStorage.setItem('titi_usuario_actual', JSON.stringify(usuario));
        sessionStorage.setItem('titi_sesion', JSON.stringify(sesionData));
    }
}

function limpiarSesion() {
    localStorage.removeItem('titi_token');
    localStorage.removeItem('titi_sesion');
    localStorage.removeItem('titi_usuario_actual');
    sessionStorage.removeItem('titi_token');
    sessionStorage.removeItem('titi_sesion');
}

function obtenerToken() {
    return localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
}

function obtenerUsuarioActual() {
    const usuarioStr = localStorage.getItem('titi_usuario_actual');
    if (usuarioStr) {
        try {
            return JSON.parse(usuarioStr);
        } catch (error) {
            return null;
        }
    }
    return null;
}

// ===== NAVEGACIÓN =====
function redireccionarPorRol(usuario) {
    // CRÍTICO: Guardar usuario antes de redirigir
    localStorage.setItem('titi_usuario_actual', JSON.stringify(usuario));
    
    // Pequeño delay para asegurar que se guardó
    setTimeout(() => {
        if (usuario.rol === 'admin') {
            window.location.href = 'admin.html';
        } else if (usuario.rol === 'cliente' || usuario.rol === 'organizador') {
            window.location.href = 'cliente.html';
        } else {
            window.location.href = 'index.html';
        }
    }, 100);
}

// ===== LOGIN =====
async function loginAPI(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return {
                success: false,
                message: data.message || data.error || 'Error en el login'
            };
        }
        
        return data;
        
    } catch (error) {
        console.error('Error en loginAPI:', error);
        return {
            success: false,
            message: 'Error de conexión. Verifica tu internet.'
        };
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    if (isProcessing) return;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const remember = rememberCheckbox.checked;
    
    // Validaciones
    if (!email || !password) {
        showToast('Completa todos los campos', 'error');
        return;
    }
    
    if (!validarEmail(email)) {
        showToast('Email inválido', 'error');
        emailInput.focus();
        return;
    }
    
    if (!validarPassword(password)) {
        showToast('Contraseña debe tener 8+ caracteres, mayúsculas, minúsculas, números y símbolos', 'warning');
        return;
    }
    
    // Deshabilitar formulario
    isProcessing = true;
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    emailInput.disabled = true;
    passwordInput.disabled = true;
    
    try {
        const resultado = await loginAPI(email, password);
        
        if (resultado.success) {
            guardarSesion(resultado.usuario, resultado.token, remember);
            showToast(`¡Bienvenido ${resultado.usuario.nombre}!`, 'success');
            
            // Redirigir después de guardar
            setTimeout(() => {
                redireccionarPorRol(resultado.usuario);
            }, 500);
        } else {
            showToast(resultado.message, 'error');
            passwordInput.value = '';
            passwordInput.focus();
        }
    } catch (error) {
        console.error('Error en login:', error);
        showToast('Error de conexión', 'error');
    } finally {
        // Restaurar botón solo si no fue exitoso
        if (!isProcessing) {
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
            loginButton.disabled = false;
            emailInput.disabled = false;
            passwordInput.disabled = false;
        }
        isProcessing = false;
    }
}

// ===== RECUPERACIÓN DE CONTRASEÑA =====
async function changePasswordAPI(email, newPassword) {
    try {
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, newPassword })
        });
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        return {
            success: false,
            message: 'Error de conexión'
        };
    }
}

function openForgotPasswordModal() {
    if (forgotPasswordModal) {
        forgotPasswordModal.classList.add('show');
        resetEmail.value = '';
        newPassword.value = '';
        confirmPassword.value = '';
        resetEmail.focus();
    }
}

function closeForgotPasswordModal() {
    if (forgotPasswordModal) {
        forgotPasswordModal.classList.remove('show');
    }
}

async function handlePasswordReset() {
    const email = resetEmail.value.trim();
    const password = newPassword.value;
    const confirm = confirmPassword.value;
    
    if (!email || !password || !confirm) {
        showToast('Completa todos los campos', 'error');
        return;
    }
    
    if (!validarEmail(email)) {
        showToast('Email inválido', 'error');
        return;
    }
    
    if (!validarPassword(password)) {
        showToast('Contraseña debe tener 8+ caracteres, mayúsculas, minúsculas, números y símbolos', 'warning');
        return;
    }
    
    if (password !== confirm) {
        showToast('Las contraseñas no coinciden', 'error');
        return;
    }
    
    resetPasswordBtn.disabled = true;
    resetPasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cambiando...';
    
    try {
        const result = await changePasswordAPI(email, password);
        
        if (result.success) {
            showToast('Contraseña cambiada exitosamente', 'success');
            closeForgotPasswordModal();
            
            // Auto-llenar el email en el login
            emailInput.value = email;
            passwordInput.value = '';
            passwordInput.focus();
        } else {
            showToast(result.message || 'Error cambiando contraseña', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
    } finally {
        resetPasswordBtn.disabled = false;
        resetPasswordBtn.innerHTML = '<i class="fas fa-save"></i> Cambiar Contraseña';
    }
}

// ===== ATAJOS =====
function setupShortcuts() {
    emailInput.addEventListener('dblclick', function() {
        this.value = "jorge.flores@titi-app.com";
        passwordInput.value = "Titi-apps2026@!";
        rememberCheckbox.checked = true;
        showToast('Credenciales de admin cargadas', 'success');
    });
}

// ===== VERIFICAR AUTENTICACIÓN =====
function verificarAutenticacion() {
    const usuario = obtenerUsuarioActual();
    const token = obtenerToken();
    const paginaActual = window.location.pathname.split('/').pop();
    
    // Si está en login y ya tiene sesión, redirigir
    if (paginaActual === 'login.html' && usuario && token) {
        redireccionarPorRol(usuario);
        return false;
    }
    
    return true;
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar tema
    initTheme();
    
    // Verificar si ya está autenticado
    if (!verificarAutenticacion()) {
        return;
    }
    
    // Event listeners
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            openForgotPasswordModal();
        });
    }
    
    if (closeForgotModal) {
        closeForgotModal.addEventListener('click', closeForgotPasswordModal);
    }
    
    if (cancelForgotBtn) {
        cancelForgotBtn.addEventListener('click', closeForgotPasswordModal);
    }
    
    if (resetPasswordBtn) {
        resetPasswordBtn.addEventListener('click', handlePasswordReset);
    }
    
    if (forgotPasswordModal) {
        forgotPasswordModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeForgotPasswordModal();
            }
        });
    }
    
    // Atajos de teclado
    setupShortcuts();
    
    // Exponer funciones globales
    window.titiAuth = {
        logout: limpiarSesion,
        obtenerUsuarioActual: obtenerUsuarioActual,
        obtenerToken: obtenerToken,
        API_URL: API_URL
    };
    
    console.log('✅ Sistema de login inicializado');
});
