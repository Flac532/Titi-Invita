// ===== CONFIGURACIÓN =====
const API_BASE = 'https://titi-invita-app-azhcw.ondigitalocean.app/api';
let currentUser = null;
let allUsers = [];
let allEvents = [];
let deleteTargetId = null;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin panel iniciando...');
    
    // Verificar autenticación
    verificarAuth();
    
    // Inicializar navegación
    inicializarNavegacion();
    
    // Inicializar botones
    inicializarBotones();
    
    // Cargar datos iniciales
    cargarDashboard();
    
    // Actualizar reloj
    actualizarReloj();
    setInterval(actualizarReloj, 1000);
});

// ===== AUTENTICACIÓN =====
function verificarAuth() {
    const usuarioStr = localStorage.getItem('titi_usuario_actual');
    
    if (!usuarioStr) {
        console.log('❌ No hay usuario, redirigiendo...');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(usuarioStr);
        console.log('✅ Usuario:', currentUser.nombre, currentUser.rol);
        
        if (currentUser.rol !== 'admin') {
            alert('Acceso denegado. Solo administradores.');
            window.location.href = 'index.html';
            return;
        }
        
        document.getElementById('adminName').textContent = currentUser.nombre;
    } catch (error) {
        console.error('❌ Error:', error);
        window.location.href = 'login.html';
    }
}

// ===== NAVEGACIÓN =====
function inicializarNavegacion() {
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const pageName = this.dataset.page;
            showPage(pageName);
        });
    });
}

function showPage(pageName) {
    // Actualizar nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');
    
    // Actualizar páginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageName)?.classList.add('active');
    
    // Actualizar título
    const titles = {
        'dashboard': 'Dashboard',
        'usuarios': 'Gestión de Usuarios',
        'eventos': 'Todos los Eventos',
        'mis-eventos': 'Mis Eventos',
        'configuracion': 'Configuración'
    };
    document.getElementById('pageTitle').textContent = titles[pageName] || 'Admin Panel';
    
    // Cargar datos según página
    if (pageName === 'usuarios') cargarUsuarios();
    if (pageName === 'eventos') cargarTodosEventos();
    if (pageName === 'dashboard') cargarDashboard();
}

// ===== BOTONES =====
function inicializarBotones() {
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', function() {
        if (confirm('¿Cerrar sesión?')) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'login.html';
        }
    });
    
    // Fullscreen
    document.getElementById('fullscreenBtn')?.addEventListener('click', function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            this.querySelector('i').className = 'fas fa-compress';
        } else {
            document.exitFullscreen();
            this.querySelector('i').className = 'fas fa-expand';
        }
    });
    
    // Refresh
    document.getElementById('refreshBtn')?.addEventListener('click', function() {
        const activePage = document.querySelector('.nav-item.active').dataset.page;
        showPage(activePage);
        mostrarToast('Datos actualizados', 'success');
    });
    
    // Búsqueda usuarios
    document.getElementById('searchUsers')?.addEventListener('input', function() {
        filtrarUsuarios();
    });
    
    document.getElementById('filterRole')?.addEventListener('change', function() {
        filtrarUsuarios();
    });
    
    // Búsqueda eventos
    document.getElementById('searchEvents')?.addEventListener('input', function() {
        filtrarEventos();
    });
}

// ===== DASHBOARD =====
async function cargarDashboard() {
    try {
        // Cargar usuarios
        await cargarUsuarios(true);
        
        // Cargar eventos
        await cargarTodosEventos(true);
        
        // Actualizar estadísticas
        document.getElementById('totalUsers').textContent = allUsers.length;
        document.getElementById('totalEvents').textContent = allEvents.length;
        document.getElementById('activeEvents').textContent = allEvents.filter(e => e.estado === 'activo').length;
        
        // Calcular sillas ocupadas
        let sillasTotales = 0;
        allEvents.forEach(evento => {
            if (evento.mesas && Array.isArray(evento.mesas)) {
                evento.mesas.forEach(mesa => {
                    if (mesa.sillas) {
                        sillasTotales += mesa.sillas.filter(s => s.estado !== 'sin-asignar').length;
                    }
                });
            }
        });
        document.getElementById('occupiedChairs').textContent = sillasTotales;
        
        // Mostrar actividad reciente
        mostrarActividadReciente();
        
        // Mostrar últimos usuarios
        mostrarUltimosUsuarios();
        
    } catch (error) {
        console.error('❌ Error cargando dashboard:', error);
    }
}

function mostrarActividadReciente() {
    const activityList = document.getElementById('activityList');
    let html = '';
    
    // Últimos 5 eventos
    const recentEvents = allEvents.slice(0, 5);
    
    if (recentEvents.length === 0) {
        html = '<p class="text-muted">No hay actividad reciente</p>';
    } else {
        recentEvents.forEach(evento => {
            const usuario = allUsers.find(u => u.id === evento.usuario_id);
            html += `
                <div class="activity-item">
                    <i class="fas fa-calendar-plus"></i>
                    <div>
                        <strong>${evento.nombre}</strong>
                        <span>por ${usuario?.nombre || 'Usuario'}</span>
                    </div>
                    <span class="activity-time">${formatearFecha(evento.fecha_evento)}</span>
                </div>
            `;
        });
    }
    
    activityList.innerHTML = html;
}

function mostrarUltimosUsuarios() {
    const usersList = document.getElementById('recentUsersList');
    let html = '';
    
    const recentUsers = allUsers.slice(0, 5);
    
    if (recentUsers.length === 0) {
        html = '<p class="text-muted">No hay usuarios registrados</p>';
    } else {
        recentUsers.forEach(user => {
            html += `
                <div class="user-item">
                    <div class="user-avatar">${user.nombre.charAt(0)}</div>
                    <div class="user-details">
                        <strong>${user.nombre}</strong>
                        <span>${user.email}</span>
                    </div>
                    <span class="badge badge-${getRoleBadgeClass(user.rol)}">${user.rol}</span>
                </div>
            `;
        });
    }
    
    usersList.innerHTML = html;
}

// ===== USUARIOS =====
async function cargarUsuarios(silent = false) {
    try {
        if (!silent) mostrarCargando('usersTableBody');
        
        const token = obtenerToken();
        console.log('🔑 Token:', token ? 'Presente' : 'Ausente');
        
        const response = await fetch(`${API_BASE}/usuarios`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('❌ Respuesta no es JSON:', text.substring(0, 200));
            throw new Error('El servidor no devolvió JSON');
        }
        
        allUsers = await response.json();
        console.log('✅ Usuarios cargados:', allUsers.length);
        
        if (!silent) mostrarUsuariosTabla();
        
        // Actualizar filtro de eventos
        actualizarFiltroUsuarios();
        
    } catch (error) {
        console.error('❌ Error cargando usuarios:', error);
        if (!silent) {
            const tbody = document.getElementById('usersTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            }
        }
        mostrarToast('Error cargando usuarios: ' + error.message, 'error');
    }
}

function mostrarUsuariosTabla() {
    const tbody = document.getElementById('usersTableBody');
    
    if (allUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay usuarios registrados</td></tr>';
        return;
    }
    
    let html = '';
    allUsers.forEach(user => {
        const eventosCount = allEvents.filter(e => e.usuario_id === user.id).length;
        
        html += `
            <tr>
                <td>#${user.id}</td>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-sm">${user.nombre.charAt(0)}</div>
                        <strong>${user.nombre}</strong>
                    </div>
                </td>
                <td>${user.email}</td>
                <td><span class="badge badge-${getRoleBadgeClass(user.rol)}">${user.rol}</span></td>
                <td>${eventosCount}</td>
                <td>${formatearFecha(user.created_at)}</td>
                <td>
                    <button class="btn-icon-sm" onclick="editarUsuario(${user.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon-sm btn-danger-sm" onclick="confirmarEliminarUsuario(${user.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function filtrarUsuarios() {
    const searchTerm = document.getElementById('searchUsers').value.toLowerCase();
    const roleFilter = document.getElementById('filterRole').value;
    
    const filtered = allUsers.filter(user => {
        const matchSearch = user.nombre.toLowerCase().includes(searchTerm) || 
                           user.email.toLowerCase().includes(searchTerm);
        const matchRole = !roleFilter || user.rol === roleFilter;
        return matchSearch && matchRole;
    });
    
    const tbody = document.getElementById('usersTableBody');
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron usuarios</td></tr>';
        return;
    }
    
    let html = '';
    filtered.forEach(user => {
        const eventosCount = allEvents.filter(e => e.usuario_id === user.id).length;
        
        html += `
            <tr>
                <td>#${user.id}</td>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-sm">${user.nombre.charAt(0)}</div>
                        <strong>${user.nombre}</strong>
                    </div>
                </td>
                <td>${user.email}</td>
                <td><span class="badge badge-${getRoleBadgeClass(user.rol)}">${user.rol}</span></td>
                <td>${eventosCount}</td>
                <td>${formatearFecha(user.created_at)}</td>
                <td>
                    <button class="btn-icon-sm" onclick="editarUsuario(${user.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon-sm btn-danger-sm" onclick="confirmarEliminarUsuario(${user.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ===== MODAL USUARIO =====
function abrirModalUsuario() {
    document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Agregar Usuario';
    document.getElementById('editUserId').value = '';
    document.getElementById('userName').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userRole').value = '';
    document.getElementById('userModal').style.display = 'flex';
}

function cerrarModalUsuario() {
    document.getElementById('userModal').style.display = 'none';
}

async function editarUsuario(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Editar Usuario';
    document.getElementById('editUserId').value = user.id;
    document.getElementById('userName').value = user.nombre;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').placeholder = 'Dejar vacío para no cambiar';
    document.getElementById('userRole').value = user.rol;
    document.getElementById('userModal').style.display = 'flex';
}

async function guardarUsuario() {
    const userId = document.getElementById('editUserId').value;
    const nombre = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('userPassword').value;
    const rol = document.getElementById('userRole').value;
    
    if (!nombre || !email || !rol) {
        mostrarToast('Completa todos los campos obligatorios', 'error');
        return;
    }
    
    if (!userId && !password) {
        mostrarToast('La contraseña es obligatoria para nuevos usuarios', 'error');
        return;
    }
    
    if (password && password.length < 6) {
        mostrarToast('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    try {
        const data = { nombre, email, rol };
        if (password) data.password = password;
        
        let response;
        if (userId) {
            // Editar
            response = await fetch(`${API_BASE}/usuarios/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${obtenerToken()}`
                },
                body: JSON.stringify(data)
            });
        } else {
            // Crear
            response = await fetch(`${API_BASE}/usuarios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${obtenerToken()}`
                },
                body: JSON.stringify(data)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar usuario');
        }
        
        mostrarToast(userId ? 'Usuario actualizado' : 'Usuario creado', 'success');
        cerrarModalUsuario();
        await cargarUsuarios();
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarToast(error.message, 'error');
    }
}

// ===== ELIMINAR USUARIO =====
function confirmarEliminarUsuario(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    deleteTargetId = userId;
    document.getElementById('deleteMessage').textContent = 
        `¿Eliminar a ${user.nombre}? Se eliminarán todos sus eventos e invitados.`;
    document.getElementById('deleteModal').style.display = 'flex';
    
    document.getElementById('confirmDeleteBtn').onclick = () => eliminarUsuario(userId);
}

function cerrarModalEliminar() {
    document.getElementById('deleteModal').style.display = 'none';
    deleteTargetId = null;
}

async function eliminarUsuario(userId) {
    try {
        const response = await fetch(`${API_BASE}/usuarios/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${obtenerToken()}`
            }
        });
        
        if (!response.ok) throw new Error('Error al eliminar usuario');
        
        mostrarToast('Usuario eliminado correctamente', 'success');
        cerrarModalEliminar();
        await cargarUsuarios();
        await cargarDashboard();
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarToast('Error al eliminar usuario', 'error');
    }
}

// ===== EVENTOS =====
async function cargarTodosEventos(silent = false) {
    try {
        const token = obtenerToken();
        const response = await fetch(`${API_BASE}/eventos-admin`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Eventos response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response eventos:', errorText);
            throw new Error(`Error ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            allEvents = await response.json();
            console.log('✅ Eventos cargados:', allEvents.length);
        } else {
            console.warn('⚠️ Respuesta no es JSON, asumiendo array vacío');
            allEvents = [];
        }
        
        if (!silent) mostrarEventos();
        
    } catch (error) {
        console.error('❌ Error cargando eventos:', error);
        allEvents = [];
        if (!silent) {
            const grid = document.getElementById('eventsGrid');
            if (grid) {
                grid.innerHTML = `<p class="text-center text-danger">Error cargando eventos: ${error.message}</p>`;
            }
        }
    }
}

function mostrarEventos() {
    const grid = document.getElementById('eventsGrid');
    
    if (allEvents.length === 0) {
        grid.innerHTML = '<p class="text-muted">No hay eventos registrados</p>';
        return;
    }
    
    let html = '';
    allEvents.forEach(evento => {
        const usuario = allUsers.find(u => u.id === evento.usuario_id);
        const mesasCount = evento.mesas?.length || 0;
        
        html += `
            <div class="event-card">
                <div class="event-header">
                    <h3>${evento.nombre}</h3>
                    <span class="badge badge-${evento.estado === 'activo' ? 'success' : 'secondary'}">${evento.estado}</span>
                </div>
                <div class="event-body">
                    <p><i class="fas fa-user"></i> ${usuario?.nombre || 'Usuario desconocido'}</p>
                    <p><i class="fas fa-calendar"></i> ${formatearFecha(evento.fecha_evento)}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${evento.ubicacion || 'Sin ubicación'}</p>
                    <p><i class="fas fa-table"></i> ${mesasCount} mesas</p>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
}

function filtrarEventos() {
    const searchTerm = document.getElementById('searchEvents').value.toLowerCase();
    const statusFilter = document.getElementById('filterEventStatus').value;
    const userFilter = document.getElementById('filterEventUser').value;
    
    const filtered = allEvents.filter(evento => {
        const matchSearch = evento.nombre.toLowerCase().includes(searchTerm);
        const matchStatus = !statusFilter || evento.estado === statusFilter;
        const matchUser = !userFilter || evento.usuario_id == userFilter;
        return matchSearch && matchStatus && matchUser;
    });
    
    const grid = document.getElementById('eventsGrid');
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p class="text-muted">No se encontraron eventos</p>';
        return;
    }
    
    let html = '';
    filtered.forEach(evento => {
        const usuario = allUsers.find(u => u.id === evento.usuario_id);
        const mesasCount = evento.mesas?.length || 0;
        
        html += `
            <div class="event-card">
                <div class="event-header">
                    <h3>${evento.nombre}</h3>
                    <span class="badge badge-${evento.estado === 'activo' ? 'success' : 'secondary'}">${evento.estado}</span>
                </div>
                <div class="event-body">
                    <p><i class="fas fa-user"></i> ${usuario?.nombre || 'Usuario desconocido'}</p>
                    <p><i class="fas fa-calendar"></i> ${formatearFecha(evento.fecha_evento)}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${evento.ubicacion || 'Sin ubicación'}</p>
                    <p><i class="fas fa-table"></i> ${mesasCount} mesas</p>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
}

function actualizarFiltroUsuarios() {
    const select = document.getElementById('filterEventUser');
    if (!select) return;
    
    let html = '<option value="">Todos los usuarios</option>';
    allUsers.forEach(user => {
        html += `<option value="${user.id}">${user.nombre} (${user.rol})</option>`;
    });
    select.innerHTML = html;
}

// ===== UTILIDADES =====
function obtenerToken() {
    const usuario = localStorage.getItem('titi_usuario_actual');
    if (!usuario) return null;
    try {
        return JSON.parse(usuario).token;
    } catch {
        return null;
    }
}

function actualizarReloj() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    const dateStr = now.toLocaleDateString('es-MX', { 
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    document.getElementById('currentTime').textContent = `${timeStr} - ${dateStr}`;
}

function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-MX', { 
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getRoleBadgeClass(rol) {
    const classes = {
        'admin': 'danger',
        'organizador': 'primary',
        'cliente': 'success'
    };
    return classes[rol] || 'secondary';
}

function mostrarCargando(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<tr><td colspan="7" class="text-center">Cargando...</td></tr>';
    }
}

function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = mensaje;
    toast.className = `toast ${tipo} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Exponer funciones globales
window.showPage = showPage;
window.abrirModalUsuario = abrirModalUsuario;
window.cerrarModalUsuario = cerrarModalUsuario;
window.guardarUsuario = guardarUsuario;
window.editarUsuario = editarUsuario;
window.confirmarEliminarUsuario = confirmarEliminarUsuario;
window.cerrarModalEliminar = cerrarModalEliminar;
