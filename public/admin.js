// ===== VERIFICACIÓN DE CARGA =====
console.log("🚀🚀🚀 admin.js CARGADO - " + new Date().toLocaleTimeString());
console.log("📍 Punto de inicio del script");

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
    const token = obtenerToken();
    
    console.log('👤 Usuario en localStorage:', usuarioStr ? 'Presente' : 'Ausente');
    console.log('🔑 Token disponible:', token ? 'Sí' : 'No');
    
    if (!usuarioStr) {
        console.log('❌ No hay usuario, redirigiendo...');
        window.location.href = 'login.html';
        return;
    }
    
    if (!token) {
        console.log('❌ No hay token, limpiando sesión y redirigiendo...');
        localStorage.clear();
        sessionStorage.clear();
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
        localStorage.clear();
        sessionStorage.clear();
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
    console.log('📄 showPage() llamada con:', pageName);
    
    // Actualizar nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const navItem = document.querySelector(`[data-page="${pageName}"]`);
    if (navItem) {
        navItem.classList.add('active');
        console.log('✅ Nav item activado');
    } else {
        console.warn('⚠️ No se encontró nav-item para:', pageName);
    }
    
    // Actualizar páginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const pageElement = document.getElementById(pageName);
    if (pageElement) {
        pageElement.classList.add('active');
        console.log('✅ Página activada:', pageName);
    } else {
        console.error('❌ No se encontró página con id:', pageName);
    }
    
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
    console.log('🔄 Cargando datos para página:', pageName);
    if (pageName === 'usuarios') {
        console.log('   -> Llamando cargarUsuarios()');
        cargarUsuarios();
    }
    if (pageName === 'eventos') {
        console.log('   -> Llamando cargarTodosEventos()');
        cargarTodosEventos();
    }
    if (pageName === 'dashboard') {
        console.log('   -> Llamando cargarDashboard()');
        cargarDashboard();
    }
    if (pageName === 'mis-eventos') {
        console.log('   -> Cargando iframe de cliente.html');
    }
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
            const usuario = allUsers.find(u => u.id === evento.id_usuario);
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
        
        const data = await response.json();
        allUsers = Array.isArray(data) ? data : [];
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
    console.log('📊 mostrarUsuariosTabla() llamada. allUsers:', allUsers.length);
    const tbody = document.getElementById('usersTableBody');
    
    if (!tbody) {
        console.error('❌ No se encontró elemento usersTableBody');
        return;
    }
    
    console.log('✅ Elemento tbody encontrado');
    
    if (allUsers.length === 0) {
        console.log('⚠️ No hay usuarios para mostrar');
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay usuarios registrados</td></tr>';
        return;
    }
    
    console.log('🔨 Construyendo HTML para', allUsers.length, 'usuarios');
    let html = '';
    allUsers.forEach(user => {
        console.log('   - Usuario:', user.nombre, user.email);
        const eventosCount = allEvents.filter(e => e.id_usuario === user.id).length;
        
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
                <td>${formatearFecha(user.fecha_creacion)}</td>
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
    
    console.log('✅ HTML construido, insertando en tbody');
    tbody.innerHTML = html;
    console.log('✅ Usuarios mostrados en tabla');
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
        const eventosCount = allEvents.filter(e => e.id_usuario === user.id).length;
        
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
                <td>${formatearFecha(user.fecha_creacion)}</td>
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
        
        // Recargar usuarios y dashboard
        await cargarUsuarios();
        if (document.querySelector('.nav-item.active')?.dataset.page === 'dashboard') {
            await cargarDashboard();
        }
        
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
            const data = await response.json();
            allEvents = Array.isArray(data) ? data : [];
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
        const usuario = allUsers.find(u => u.id === evento.id_usuario);
        const mesasCount = evento.mesas?.length || 0;
        
        html += `
            <div class="event-card" onclick="verDetalleEvento(${evento.id})">
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
        const matchUser = !userFilter || evento.id_usuario == userFilter;
        return matchSearch && matchStatus && matchUser;
    });
    
    const grid = document.getElementById('eventsGrid');
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p class="text-muted">No se encontraron eventos</p>';
        return;
    }
    
    let html = '';
    filtered.forEach(evento => {
        const usuario = allUsers.find(u => u.id === evento.id_usuario);
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
    // Primero intentar obtener del localStorage
    let token = localStorage.getItem('titi_token');
    
    // Si no está, intentar sessionStorage
    if (!token) {
        token = sessionStorage.getItem('titi_token');
    }
    
    // Si tampoco, intentar desde sesión
    if (!token) {
        const sesion = localStorage.getItem('titi_sesion') || sessionStorage.getItem('titi_sesion');
        if (sesion) {
            try {
                const sesionData = JSON.parse(sesion);
                token = sesionData.token;
            } catch (e) {
                console.error('Error parseando sesión:', e);
            }
        }
    }
    
    console.log('🔑 Token obtenido:', token ? `${token.substring(0, 20)}...` : 'null');
    return token;
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

// ===== MANEJO DE TABS =====
let eventoActual = null;

function cambiarTabEvento(tabName) {
    // Cambiar tabs activos
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Si cambia a tab mesas, renderizar
    if (tabName === 'mesas' && eventoActual) {
        renderizarMesas(eventoActual);
    }
}

// ===== VER DETALLE DE EVENTO (MEJORADO) =====
function verDetalleEvento(eventoId) {
    const evento = allEvents.find(e => e.id === eventoId);
    if (!evento) {
        mostrarToast('Evento no encontrado', 'error');
        return;
    }
    
    eventoActual = evento;
    const usuario = allUsers.find(u => u.id === evento.id_usuario);
    
    // Calcular estadísticas
    const mesasCount = evento.mesas?.length || 0;
    let capacidadTotal = 0;
    let invitadosTotal = 0;
    let confirmadosTotal = 0;
    
    if (evento.mesas && Array.isArray(evento.mesas)) {
        evento.mesas.forEach(mesa => {
            if (mesa.sillas) {
                capacidadTotal += mesa.sillas.length;
                const ocupadas = mesa.sillas.filter(s => s.estado !== 'sin-asignar');
                invitadosTotal += ocupadas.length;
                const confirmadas = mesa.sillas.filter(s => s.estado === 'confirmado');
                confirmadosTotal += confirmadas.length;
            }
        });
    }
    
    // Llenar modal
    document.getElementById('modal-evento-titulo').textContent = evento.nombre;
    document.getElementById('detalle-nombre').textContent = evento.nombre;
    document.getElementById('detalle-usuario').textContent = usuario?.nombre || 'Usuario desconocido';
    document.getElementById('detalle-fecha').textContent = formatearFecha(evento.fecha_evento);
    document.getElementById('detalle-hora').textContent = evento.hora_evento || 'No especificada';
    document.getElementById('detalle-ubicacion').textContent = evento.ubicacion || 'Sin ubicación';
    document.getElementById('detalle-descripcion').textContent = evento.descripcion || 'Sin descripción';
    document.getElementById('detalle-mesas').textContent = mesasCount;
    document.getElementById('detalle-capacidad').textContent = `${capacidadTotal} sillas`;
    document.getElementById('detalle-invitados').textContent = `${invitadosTotal} invitados`;
    document.getElementById('detalle-confirmados').textContent = `${confirmadosTotal} confirmados`;
    
    // Resetear a tab de info
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.getElementById('tab-info').classList.add('active');
    
    // Mostrar modal
    document.getElementById('eventoDetalleModal').style.display = 'flex';
}

function cerrarModalEvento() {
    document.getElementById('eventoDetalleModal').style.display = 'none';
    eventoActual = null;
}

// ===== RENDERIZAR MESAS =====
function renderizarMesas(evento) {
    const container = document.getElementById('mesasViewerContainer');
    
    if (!evento.mesas || evento.mesas.length === 0) {
        container.innerHTML = `
            <div class="viewer-empty">
                <i class="fas fa-table"></i>
                <h3>No hay mesas configuradas</h3>
                <p>Este evento aún no tiene mesas asignadas</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="mesas-grid">';
    
    evento.mesas.forEach(mesa => {
        const sillasData = typeof mesa.sillas === 'string' ? JSON.parse(mesa.sillas) : mesa.sillas;
        const ocupadas = sillasData.filter(s => s.estado !== 'sin-asignar').length;
        const disponibles = sillasData.length - ocupadas;
        
        html += `
            <div class="mesa-viewer">
                <div class="mesa-viewer-header">
                    <h4><i class="fas fa-table"></i> Mesa ${mesa.numero || mesa.id}</h4>
                    <div class="mesa-viewer-stats">
                        <span class="stat-badge ocupadas">${ocupadas} ocupadas</span>
                        <span class="stat-badge disponibles">${disponibles} libres</span>
                    </div>
                </div>
                <div class="sillas-list">
        `;
        
        sillasData.forEach((silla, index) => {
            const estadoClass = silla.estado.replace('sin-asignar', 'sin-asignar');
            const icono = silla.estado === 'sin-asignar' ? '○' : 
                         silla.estado === 'asignado' ? '●' : '✓';
            const nombre = silla.invitado?.nombre || 'Disponible';
            const info = silla.estado === 'sin-asignar' ? 'Sin asignar' :
                        silla.estado === 'asignado' ? 'Asignado' : 'Confirmado';
            
            html += `
                <div class="silla-item ${estadoClass}">
                    <div class="silla-icon ${estadoClass}">
                        ${icono}
                    </div>
                    <div class="silla-info">
                        <strong>Silla ${index + 1}</strong>
                        <small>${nombre} - ${info}</small>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Exponer funciones
window.verDetalleEvento = verDetalleEvento;
window.cerrarModalEvento = cerrarModalEvento;
window.cambiarTabEvento = cambiarTabEvento;
