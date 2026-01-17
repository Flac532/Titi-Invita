// admin.js - Dashboard de administración para Titi Invita

// Datos de ejemplo para la demo
const USUARIOS_DEMO = [
    {
        id: 1,
        nombre: "Jorge Flores",
        email: "jorge.flores@titi-app.com",
        rol: "admin",
        estado: "activo",
        fechaRegistro: "2024-01-15",
        avatar: "JF",
        eventos: 12
    },
    {
        id: 2,
        nombre: "María González",
        email: "cliente@ejemplo.com",
        rol: "cliente",
        estado: "activo",
        fechaRegistro: "2024-02-20",
        avatar: "MG",
        eventos: 5
    },
    {
        id: 3,
        nombre: "Carlos López",
        email: "carlos@empresa.com",
        rol: "cliente",
        estado: "activo",
        fechaRegistro: "2024-02-28",
        avatar: "CL",
        eventos: 3
    },
    {
        id: 4,
        nombre: "Ana Martínez",
        email: "ana.m@eventos.com",
        rol: "cliente",
        estado: "activo",
        fechaRegistro: "2024-03-05",
        avatar: "AM",
        eventos: 8
    }
];

const EVENTOS_DEMO = [
    {
        id: 1,
        nombre: "Boda de Ana y Carlos",
        cliente: "María González",
        fecha: "2024-06-15",
        estado: "activo",
        mesas: 15,
        sillas: 120,
        ocupadas: 98,
        color: "#764ba2"
    },
    {
        id: 2,
        nombre: "Conferencia Anual Tech",
        cliente: "Carlos López",
        fecha: "2024-05-20",
        estado: "activo",
        mesas: 25,
        sillas: 200,
        ocupadas: 150,
        color: "#4facfe"
    },
    {
        id: 3,
        nombre: "Fiesta de 15 Años",
        cliente: "Ana Martínez",
        fecha: "2024-04-10",
        estado: "completado",
        mesas: 12,
        sillas: 96,
        ocupadas: 96,
        color: "#f093fb"
    }
];

// Variables globales
let usuariosFiltrados = [...USUARIOS_DEMO];
let eventosFiltrados = [...EVENTOS_DEMO];
let paginaActualUsuarios = 1;
const usuariosPorPagina = 5;
let usuarioActual = null;

// Elementos DOM
const userCountElement = document.getElementById('userCount');
const eventCountElement = document.getElementById('eventCount');
const pageTitle = document.getElementById('pageTitle');
const currentTime = document.getElementById('currentTime');
const menuToggle = document.querySelector('.menu-toggle');
const sidebar = document.querySelector('.sidebar');
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');

// Estadísticas dashboard
const statTotalUsers = document.getElementById('statTotalUsers');
const statTotalEvents = document.getElementById('statTotalEvents');
const statActiveEvents = document.getElementById('statActiveEvents');
const statOccupiedChairs = document.getElementById('statOccupiedChairs');
const recentUsers = document.getElementById('recentUsers');

// Gestión de usuarios
const usersTableBody = document.getElementById('usersTableBody');
const userSearch = document.getElementById('userSearch');
const filterRole = document.getElementById('filterRole');
const filterStatus = document.getElementById('filterStatus');
const clearFilters = document.getElementById('clearFilters');
const showingCount = document.getElementById('showingCount');
const totalCount = document.getElementById('totalCount');
const currentPage = document.getElementById('currentPage');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const addUserModalBtn = document.getElementById('addUserModalBtn');
const addUserModal = document.getElementById('addUserModal');
const editUserModal = document.getElementById('editUserModal');
const confirmModal = document.getElementById('confirmModal');

// Gestión de eventos
const eventsGrid = document.getElementById('eventsGrid');
const eventSearch = document.getElementById('eventSearch');
const filterClient = document.getElementById('filterClient');
const filterDate = document.getElementById('filterDate');
const filterEventStatus = document.getElementById('filterEventStatus');

// Configuración
const testConnectionBtn = document.getElementById('testConnectionBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const clearCacheBtn = document.getElementById('clearCacheBtn');

// Toast
const messageToast = document.getElementById('messageToast');

// Inicializar aplicación
function initAdmin() {
    console.log('=== INICIANDO ADMIN ===');
    
    // Cargar usuario actual
    const usuarioStr = localStorage.getItem('titi_usuario') || 
                       localStorage.getItem('titi_usuario_actual') ||
                       sessionStorage.getItem('titi_usuario');
    
    if (!usuarioStr) {
        console.log('No hay usuario en storage, redirigiendo a login');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        usuarioActual = JSON.parse(usuarioStr);
        console.log('Usuario cargado:', usuarioActual);
    } catch (error) {
        console.error('Error parseando usuario:', error);
        window.location.href = 'login.html';
        return;
    }
    
    // Verificar que sea admin
    if (usuarioActual.rol !== 'admin') {
        alert('Acceso denegado. Solo administradores pueden acceder a esta sección.');
        window.location.href = 'cliente.html';
        return;
    }
    
    // Configurar UI con datos del usuario
    if (userAvatar) userAvatar.textContent = usuarioActual.avatar || usuarioActual.nombre.substring(0, 2).toUpperCase();
    if (userName) userName.textContent = usuarioActual.nombre;
    if (userEmail) userEmail.textContent = usuarioActual.email;
    
    // Configurar reloj en tiempo real
    updateClock();
    setInterval(updateClock, 1000);
    
    // Cargar datos iniciales
    cargarDashboard();
    cargarUsuarios();
    cargarEventos();
    cargarConfiguracion();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Configurar acciones rápidas
    setupQuickActions();
    
    console.log('Admin inicializado correctamente');
}

// Configurar acciones rápidas
function setupQuickActions() {
    // Botón "Agregar Usuario" en dashboard
    document.getElementById('addUserBtn')?.addEventListener('click', function() {
        cambiarPagina('usuarios');
        setTimeout(() => {
            document.getElementById('addUserModalBtn')?.click();
        }, 300);
    });
    
    // Botón "Ver Eventos" en dashboard
    document.getElementById('viewEventsBtn')?.addEventListener('click', function() {
        cambiarPagina('eventos');
    });
    
    // Botón "Ver Todos" usuarios
    document.getElementById('viewAllUsers')?.addEventListener('click', function() {
        cambiarPagina('usuarios');
    });
}

// Actualizar reloj
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const dateString = now.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    if (currentTime) {
        currentTime.innerHTML = `
            <i class="far fa-clock"></i>
            <span>${timeString} - ${dateString}</span>
        `;
    }
}

// Cargar dashboard
function cargarDashboard() {
    console.log('Cargando dashboard...');
    
    // Actualizar estadísticas
    const totalUsers = USUARIOS_DEMO.length;
    const totalEvents = EVENTOS_DEMO.length;
    const activeEvents = EVENTOS_DEMO.filter(e => e.estado === 'activo').length;
    const occupiedChairs = EVENTOS_DEMO.reduce((sum, event) => sum + event.ocupadas, 0);
    
    if (statTotalUsers) statTotalUsers.textContent = totalUsers;
    if (statTotalEvents) statTotalEvents.textContent = totalEvents;
    if (statActiveEvents) statActiveEvents.textContent = activeEvents;
    if (statOccupiedChairs) statOccupiedChairs.textContent = occupiedChairs;
    if (userCountElement) userCountElement.textContent = totalUsers;
    if (eventCountElement) eventCountElement.textContent = totalEvents;
    
    // Cargar usuarios recientes
    const recentUsersList = USUARIOS_DEMO
        .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro))
        .slice(0, 5);
    
    if (recentUsers) {
        recentUsers.innerHTML = recentUsersList.map(user => `
            <div class="user-list-item">
                <div class="user-list-avatar">${user.avatar}</div>
                <div class="user-list-info">
                    <strong>${user.nombre}</strong>
                    <small>${user.email}</small>
                </div>
                <div class="user-list-date">${formatDate(user.fechaRegistro)}</div>
            </div>
        `).join('');
    }
}

// Cargar usuarios en tabla
function cargarUsuarios() {
    console.log('Cargando usuarios...');
    
    // Aplicar filtros
    aplicarFiltrosUsuarios();
    
    // Calcular paginación
    const totalUsers = usuariosFiltrados.length;
    const totalPages = Math.ceil(totalUsers / usuariosPorPagina);
    const startIndex = (paginaActualUsuarios - 1) * usuariosPorPagina;
    const endIndex = startIndex + usuariosPorPagina;
    const usuariosPaginados = usuariosFiltrados.slice(startIndex, endIndex);
    
    // Actualizar tabla
    if (usersTableBody) {
        usersTableBody.innerHTML = usuariosPaginados.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="user-list-avatar" style="width: 32px; height: 32px; font-size: 0.8rem;">
                            ${user.avatar}
                        </div>
                        ${user.nombre}
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="status-badge ${user.rol === 'admin' ? 'status-active' : ''}">
                        ${user.rol}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${user.estado === 'activo' ? 'status-active' : 'status-inactive'}">
                        ${user.estado}
                    </span>
                </td>
                <td>${formatDate(user.fechaRegistro)}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn-small action-btn-edit" title="Editar" onclick="editarUsuario(${user.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn-small action-btn-reset" title="Reiniciar Contraseña" onclick="resetPassword(${user.id})">
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="action-btn-small action-btn-delete" title="Eliminar" onclick="eliminarUsuario(${user.id})">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    // Actualizar controles de paginación
    if (showingCount) showingCount.textContent = usuariosPaginados.length;
    if (totalCount) totalCount.textContent = totalUsers;
    if (currentPage) currentPage.textContent = paginaActualUsuarios;
    
    if (prevPage) prevPage.disabled = paginaActualUsuarios === 1;
    if (nextPage) nextPage.disabled = paginaActualUsuarios === totalPages;
}

// Aplicar filtros de usuarios
function aplicarFiltrosUsuarios() {
    const searchTerm = userSearch ? userSearch.value.toLowerCase() : '';
    const roleFilter = filterRole ? filterRole.value : '';
    const statusFilter = filterStatus ? filterStatus.value : '';
    
    usuariosFiltrados = USUARIOS_DEMO.filter(user => {
        const matchesSearch = 
            user.nombre.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm);
        
        const matchesRole = !roleFilter || user.rol === roleFilter;
        const matchesStatus = !statusFilter || user.estado === statusFilter;
        
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    // Resetear a página 1
    paginaActualUsuarios = 1;
}

// Cargar eventos
function cargarEventos() {
    console.log('Cargando eventos...');
    
    // Aplicar filtros
    aplicarFiltrosEventos();
    
    // Actualizar grid
    if (eventsGrid) {
        eventsGrid.innerHTML = eventosFiltrados.map(event => `
            <div class="event-card">
                <div class="event-header">
                    <div class="event-title">${event.nombre}</div>
                    <div class="event-client">${event.cliente}</div>
                    <div class="event-meta">
                        <span><i class="far fa-calendar"></i> ${formatDate(event.fecha)}</span>
                        <span class="status-badge ${event.estado}">
                            ${event.estado}
                        </span>
                    </div>
                </div>
                <div class="event-body">
                    <div class="event-stats">
                        <div class="stat-item">
                            <span class="stat-value">${event.mesas}</span>
                            <span class="stat-label">Mesas</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${event.sillas}</span>
                            <span class="stat-label">Sillas</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${event.ocupadas}</span>
                            <span class="stat-label">Ocupadas</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${Math.round((event.ocupadas / event.sillas) * 100)}%</span>
                            <span class="stat-label">Ocupación</span>
                        </div>
                    </div>
                    <div class="event-details">
                        <p><i class="fas fa-chart-pie" style="color: ${event.color};"></i> 
                        ID Evento: ${event.id.toString().padStart(3, '0')}</p>
                    </div>
                </div>
                <div class="event-footer">
                    <button class="btn-view" onclick="verEvento(${event.id})">
                        <i class="fas fa-eye"></i> Ver Detalles
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Actualizar lista de clientes en filtro
    const clientesUnicos = [...new Set(EVENTOS_DEMO.map(e => e.cliente))];
    if (filterClient) {
        filterClient.innerHTML = `
            <option value="">Todos los clientes</option>
            ${clientesUnicos.map(cliente => `
                <option value="${cliente}">${cliente}</option>
            `).join('')}
        `;
    }
}

// Aplicar filtros de eventos
function aplicarFiltrosEventos() {
    const searchTerm = eventSearch ? eventSearch.value.toLowerCase() : '';
    const clientFilter = filterClient ? filterClient.value : '';
    const dateFilter = filterDate ? filterDate.value : '';
    const statusFilter = filterEventStatus ? filterEventStatus.value : '';
    
    eventosFiltrados = EVENTOS_DEMO.filter(event => {
        const matchesSearch = 
            event.nombre.toLowerCase().includes(searchTerm) ||
            event.cliente.toLowerCase().includes(searchTerm);
        
        const matchesClient = !clientFilter || event.cliente === clientFilter;
        const matchesDate = !dateFilter || event.fecha === dateFilter;
        const matchesStatus = !statusFilter || event.estado === statusFilter;
        
        return matchesSearch && matchesClient && matchesDate && matchesStatus;
    });
}

// Cargar configuración
function cargarConfiguracion() {
    console.log('Cargando configuración...');
    
    // Cargar configuración guardada de localStorage
    const settings = JSON.parse(localStorage.getItem('titi_settings') || '{}');
    
    // Aplicar configuración a los campos
    const dbHost = document.getElementById('dbHost');
    const dbPort = document.getElementById('dbPort');
    const dbName = document.getElementById('dbName');
    const dbUser = document.getElementById('dbUser');
    const dbPassword = document.getElementById('dbPassword');
    const sessionDuration = document.getElementById('sessionDuration');
    const maxLoginAttempts = document.getElementById('maxLoginAttempts');
    const requireSSL = document.getElementById('requireSSL');
    const autoBackup = document.getElementById('autoBackup');
    const notifyNewUsers = document.getElementById('notifyNewUsers');
    const notifyLargeEvents = document.getElementById('notifyLargeEvents');
    const notifySystemAlerts = document.getElementById('notifySystemAlerts');
    const notificationEmail = document.getElementById('notificationEmail');
    
    if (dbHost) dbHost.value = settings.dbHost || '';
    if (dbPort) dbPort.value = settings.dbPort || 25060;
    if (dbName) dbName.value = settings.dbName || 'defaultdb';
    if (dbUser) dbUser.value = settings.dbUser || 'titi_admin';
    if (dbPassword) dbPassword.value = settings.dbPassword || '';
    if (sessionDuration) sessionDuration.value = settings.sessionDuration || 24;
    if (maxLoginAttempts) maxLoginAttempts.value = settings.maxLoginAttempts || 5;
    if (requireSSL) requireSSL.checked = settings.requireSSL !== false;
    if (autoBackup) autoBackup.checked = settings.autoBackup !== false;
    if (notifyNewUsers) notifyNewUsers.checked = settings.notifyNewUsers !== false;
    if (notifyLargeEvents) notifyLargeEvents.checked = settings.notifyLargeEvents !== false;
    if (notifySystemAlerts) notifySystemAlerts.checked = settings.notifySystemAlerts !== false;
    if (notificationEmail) notificationEmail.value = settings.notificationEmail || 'admin@titi-invita.com';
}

// Configurar event listeners
function setupEventListeners() {
    console.log('Configurando event listeners...');
    
    // Navegación
    navItems.forEach(item => {
        if (item.dataset.page) {
            item.addEventListener('click', () => cambiarPagina(item.dataset.page));
        }
    });
    
    // Toggle sidebar en móvil
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }
    
    // Cerrar sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Cerrando sesión...');
            
            // Limpiar todo el almacenamiento
            localStorage.removeItem('titi_token');
            localStorage.removeItem('titi_usuario');
            localStorage.removeItem('titi_usuario_actual');
            localStorage.removeItem('titi_sesion');
            sessionStorage.clear();
            
            // Redirigir al inicio
            window.location.href = 'index.html';
        });
    }
    
    // Gestión de usuarios - Filtros
    if (userSearch) {
        userSearch.addEventListener('input', cargarUsuarios);
    }
    
    if (filterRole) {
        filterRole.addEventListener('change', cargarUsuarios);
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', cargarUsuarios);
    }
    
    if (clearFilters) {
        clearFilters.addEventListener('click', () => {
            if (userSearch) userSearch.value = '';
            if (filterRole) filterRole.value = '';
            if (filterStatus) filterStatus.value = '';
            cargarUsuarios();
        });
    }
    
    // Paginación
    if (prevPage) {
        prevPage.addEventListener('click', () => {
            if (paginaActualUsuarios > 1) {
                paginaActualUsuarios--;
                cargarUsuarios();
            }
        });
    }
    
    if (nextPage) {
        nextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(usuariosFiltrados.length / usuariosPorPagina);
            if (paginaActualUsuarios < totalPages) {
                paginaActualUsuarios++;
                cargarUsuarios();
            }
        });
    }
    
    // Gestión de eventos - Filtros
    if (eventSearch) {
        eventSearch.addEventListener('input', cargarEventos);
    }
    
    if (filterClient) {
        filterClient.addEventListener('change', cargarEventos);
    }
    
    if (filterDate) {
        filterDate.addEventListener('change', cargarEventos);
    }
    
    if (filterEventStatus) {
        filterEventStatus.addEventListener('change', cargarEventos);
    }
    
    // Configuración
    if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', testConexionDB);
    }
    
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', guardarConfiguracionDB);
    }
    
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', resetConfiguracion);
    }
    
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', limpiarCache);
    }
    
    // Modal agregar usuario
    if (addUserModalBtn) {
        addUserModalBtn.addEventListener('click', () => {
            abrirModal(addUserModal);
        });
    }
    
    // Cerrar modales al hacer click fuera
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            cerrarTodosModales();
        }
    });
    
    // Cerrar modales con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cerrarTodosModales();
        }
    });
}

// Cambiar página
function cambiarPagina(pageId) {
    console.log('Cambiando a página:', pageId);
    
    // Actualizar navegación
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });
    
    // Mostrar página correspondiente
    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === `${pageId}Page`) {
            page.classList.add('active');
        }
    });
    
    // Actualizar título
    const pageTitles = {
        'dashboard': 'Dashboard',
        'usuarios': 'Gestión de Usuarios',
        'eventos': 'Gestión de Eventos',
        'configuracion': 'Configuración'
    };
    
    if (pageTitle) {
        pageTitle.textContent = pageTitles[pageId] || 'Dashboard';
    }
    
    // Ocultar sidebar en móvil
    sidebar.classList.remove('show');
}

// Formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Mostrar toast
function showToast(message, type = 'success') {
    if (messageToast) {
        messageToast.textContent = message;
        messageToast.className = `toast ${type} show`;
        
        setTimeout(() => {
            messageToast.classList.remove('show');
        }, 4000);
    }
}

// Funciones de gestión de usuarios
function editarUsuario(userId) {
    const usuario = USUARIOS_DEMO.find(u => u.id === userId);
    if (usuario) {
        showToast(`Editando usuario: ${usuario.nombre}`, 'info');
        // En una implementación real, abriría el modal de edición
    }
}

function resetPassword(userId) {
    const usuario = USUARIOS_DEMO.find(u => u.id === userId);
    if (usuario) {
        mostrarConfirmacion(
            'Reiniciar Contraseña',
            `¿Estás seguro de que quieres reiniciar la contraseña de ${usuario.nombre}? Se enviará una nueva contraseña temporal a su email.`,
            () => {
                showToast(`Contraseña reiniciada para ${usuario.nombre}`, 'success');
            }
        );
    }
}

function eliminarUsuario(userId) {
    const usuario = USUARIOS_DEMO.find(u => u.id === userId);
    if (usuario) {
        mostrarConfirmacion(
            'Eliminar Usuario',
            `¿Estás seguro de que quieres eliminar a ${usuario.nombre}? Esta acción no se puede deshacer.`,
            () => {
                showToast(`Usuario ${usuario.nombre} eliminado`, 'success');
            },
            true
        );
    }
}

// Funciones de gestión de eventos
function verEvento(eventId) {
    const evento = EVENTOS_DEMO.find(e => e.id === eventId);
    if (evento) {
        showToast(`Viendo evento: ${evento.nombre}`, 'info');
    }
}

// Funciones de configuración
function testConexionDB() {
    showToast('Probando conexión a PostgreSQL...', 'info');
    
    // Simular prueba de conexión
    setTimeout(() => {
        showToast('✅ Modo demo: La conexión a PostgreSQL está configurada para producción', 'success');
    }, 2000);
}

function guardarConfiguracionDB() {
    const settings = {
        dbHost: document.getElementById('dbHost').value,
        dbPort: document.getElementById('dbPort').value,
        dbName: document.getElementById('dbName').value,
        dbUser: document.getElementById('dbUser').value,
        dbPassword: document.getElementById('dbPassword').value,
        sessionDuration: document.getElementById('sessionDuration').value,
        maxLoginAttempts: document.getElementById('maxLoginAttempts').value,
        requireSSL: document.getElementById('requireSSL').checked,
        autoBackup: document.getElementById('autoBackup').checked,
        notifyNewUsers: document.getElementById('notifyNewUsers').checked,
        notifyLargeEvents: document.getElementById('notifyLargeEvents').checked,
        notifySystemAlerts: document.getElementById('notifySystemAlerts').checked,
        notificationEmail: document.getElementById('notificationEmail').value,
        guardado: new Date().toISOString()
    };
    
    localStorage.setItem('titi_settings', JSON.stringify(settings));
    showToast('Configuración guardada correctamente', 'success');
}

function resetConfiguracion() {
    mostrarConfirmacion(
        'Restaurar Configuración',
        '¿Estás seguro de que quieres restaurar la configuración a los valores por defecto?',
        () => {
            localStorage.removeItem('titi_settings');
            cargarConfiguracion();
            showToast('Configuración restaurada a valores por defecto', 'success');
        }
    );
}

function limpiarCache() {
    mostrarConfirmacion(
        'Limpiar Caché',
        '¿Estás seguro de que quieres limpiar el caché del sistema? Esto cerrará todas las sesiones activas.',
        () => {
            localStorage.removeItem('titi_sesion');
            sessionStorage.removeItem('titi_sesion');
            showToast('Caché limpiado correctamente', 'success');
        },
        true
    );
}

// Funciones de utilidad
function abrirModal(modal) {
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function cerrarModal(modal) {
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function cerrarTodosModales() {
    document.querySelectorAll('.modal').forEach(modal => {
        cerrarModal(modal);
    });
}

function mostrarConfirmacion(titulo, mensaje, callback, warning = false) {
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmWarning = document.getElementById('confirmWarning');
    
    if (confirmTitle) confirmTitle.textContent = titulo;
    if (confirmMessage) confirmMessage.textContent = mensaje;
    if (confirmWarning) confirmWarning.style.display = warning ? 'flex' : 'none';
    
    const confirmModal = document.getElementById('confirmModal');
    const confirmAction = document.getElementById('confirmAction');
    const confirmCancel = document.getElementById('confirmCancel');
    
    if (!confirmModal || !confirmAction || !confirmCancel) return;
    
    // Guardar callback actual
    confirmAction.callback = callback;
    
    abrirModal(confirmModal);
    
    // Configurar event listeners temporales
    const handleConfirm = () => {
        if (confirmAction.callback) {
            confirmAction.callback();
        }
        cerrarModal(confirmModal);
    };
    
    const handleCancel = () => {
        cerrarModal(confirmModal);
    };
    
    confirmAction.onclick = handleConfirm;
    confirmCancel.onclick = handleCancel;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initAdmin);

// Exponer funciones para HTML
window.editarUsuario = editarUsuario;
window.resetPassword = resetPassword;
window.eliminarUsuario = eliminarUsuario;
window.verEvento = verEvento;
