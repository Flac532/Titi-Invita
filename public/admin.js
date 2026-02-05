console.log('==============================================');
console.log('🚀 ADMIN.JS INICIANDO - ' + new Date().toLocaleTimeString());
console.log('==============================================');

// Variables globales
const API_BASE = 'https://titi-invita-app-azhcw.ondigitalocean.app/api';
let allUsers = [];
let allEvents = [];
let currentUser = null;

// ===== INICIALIZACIÓN INMEDIATA =====
console.log('1️⃣ Verificando usuario...');
const usuarioStr = localStorage.getItem('titi_usuario_actual');
if (!usuarioStr) {
    console.error('❌ No hay usuario, redirigiendo a login');
    alert('Sesión expirada. Por favor inicia sesión nuevamente.');
    window.location.href = 'login.html';
} else {
    try {
        currentUser = JSON.parse(usuarioStr);
        console.log('✅ Usuario actual:', currentUser.nombre, '- Rol:', currentUser.rol);
        
        if (currentUser.rol !== 'admin') {
            alert('Acceso denegado. Solo administradores.');
            window.location.href = 'index.html';
        }
        
        // Actualizar nombre en UI
        const adminNameEl = document.getElementById('adminName');
        if (adminNameEl) {
            adminNameEl.textContent = currentUser.nombre;
            console.log('✅ Nombre actualizado en UI');
        }
    } catch (error) {
        console.error('❌ Error parseando usuario:', error);
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

// ===== OBTENER TOKEN =====
function obtenerToken() {
    let token = localStorage.getItem('titi_token');
    if (!token) token = sessionStorage.getItem('titi_token');
    if (!token) {
        const sesion = localStorage.getItem('titi_sesion') || sessionStorage.getItem('titi_sesion');
        if (sesion) {
            try {
                token = JSON.parse(sesion).token;
            } catch (e) {}
        }
    }
    return token;
}

// ===== NAVEGACIÓN =====
window.showPage = function(pageName) {
    console.log('');
    console.log('📄 showPage(' + pageName + ')');
    
    // Remover active de todos
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Activar seleccionado
    const navItem = document.querySelector('[data-page="' + pageName + '"]');
    if (navItem) {
        navItem.classList.add('active');
        console.log('✅ Nav activado');
    }
    
    const pageElement = document.getElementById(pageName);
    if (pageElement) {
        pageElement.classList.add('active');
        console.log('✅ Página mostrada');
    } else {
        console.error('❌ No se encontró página:', pageName);
    }
    
    // Cargar datos
    if (pageName === 'usuarios') {
        console.log('📊 Cargando usuarios...');
        cargarUsuarios();
    } else if (pageName === 'eventos') {
        console.log('📅 Cargando eventos...');
        cargarTodosEventos();
    } else if (pageName === 'dashboard') {
        console.log('📊 Cargando dashboard...');
        cargarDashboard();
    }
};

// ===== CARGAR USUARIOS =====
window.cargarUsuarios = async function() {
    console.log('');
    console.log('🔄 cargarUsuarios() iniciando...');
    
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) {
        console.error('❌ No existe elemento usersTableBody');
        return;
    }
    
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Cargando...</td></tr>';
    
    try {
        const token = obtenerToken();
        console.log('🔑 Token:', token ? 'SI' : 'NO');
        
        const response = await fetch(API_BASE + '/usuarios', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Status:', response.status);
        
        if (!response.ok) {
            throw new Error('Error ' + response.status);
        }
        
        const data = await response.json();
        allUsers = Array.isArray(data) ? data : [];
        
        console.log('✅ Usuarios recibidos:', allUsers.length);
        allUsers.forEach(u => console.log('   -', u.nombre, u.email));
        
        // Mostrar en tabla
        if (allUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay usuarios</td></tr>';
        } else {
            let html = '';
            allUsers.forEach(user => {
                html += '<tr>' +
                    '<td>#' + user.id + '</td>' +
                    '<td>' + user.nombre + '</td>' +
                    '<td>' + user.email + '</td>' +
                    '<td>' + user.rol + '</td>' +
                    '<td>0</td>' +
                    '<td>' + (user.fecha_creacion || 'N/A') + '</td>' +
                    '<td>-</td>' +
                    '</tr>';
            });
            tbody.innerHTML = html;
            console.log('✅ Tabla renderizada con', allUsers.length, 'usuarios');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error: ' + error.message + '</td></tr>';
    }
};

// ===== CARGAR EVENTOS =====
window.cargarTodosEventos = async function() {
    console.log('');
    console.log('🔄 cargarTodosEventos() iniciando...');
    
    const grid = document.getElementById('eventsGrid');
    if (!grid) {
        console.error('❌ No existe elemento eventsGrid');
        return;
    }
    
    grid.innerHTML = '<p class="text-center">Cargando eventos...</p>';
    
    try {
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/eventos-admin', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Status:', response.status);
        
        if (!response.ok) {
            throw new Error('Error ' + response.status);
        }
        
        const data = await response.json();
        allEvents = Array.isArray(data) ? data : [];
        
        console.log('✅ Eventos recibidos:', allEvents.length);
        
        if (allEvents.length === 0) {
            grid.innerHTML = '<p class="text-muted">No hay eventos</p>';
        } else {
            let html = '<div class="events-grid">';
            allEvents.forEach(evento => {
                html += '<div class="event-card">' +
                    '<h3>' + evento.nombre + '</h3>' +
                    '<p>' + (evento.fecha_evento || 'Sin fecha') + '</p>' +
                    '</div>';
            });
            html += '</div>';
            grid.innerHTML = html;
            console.log('✅ Eventos renderizados');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        grid.innerHTML = '<p class="text-danger">Error: ' + error.message + '</p>';
    }
};

// ===== DASHBOARD =====
window.cargarDashboard = async function() {
    console.log('🔄 Cargando dashboard...');
    await cargarUsuarios();
    await cargarTodosEventos();
    
    document.getElementById('totalUsers').textContent = allUsers.length;
    document.getElementById('totalEvents').textContent = allEvents.length;
    console.log('✅ Dashboard actualizado');
};

// ===== LOGOUT =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('2️⃣ DOMContentLoaded - Configurando botones...');
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = function() {
            if (confirm('¿Cerrar sesión?')) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = 'login.html';
            }
        };
        console.log('✅ Logout configurado');
    }
    
    // Cargar dashboard inicial
    console.log('3️⃣ Cargando dashboard inicial...');
    cargarDashboard();
});

console.log('==============================================');
console.log('✅ ADMIN.JS COMPLETAMENTE CARGADO');
console.log('==============================================');
