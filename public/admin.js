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
    },
    {
        id: 5,
        nombre: "Roberto Sánchez",
        email: "roberto@negocio.com",
        rol: "cliente",
        estado: "inactivo",
        fechaRegistro: "2024-01-30",
        avatar: "RS",
        eventos: 2
    },
    {
        id: 6,
        nombre: "Laura Ramírez",
        email: "laura@empresa.com",
        rol: "cliente",
        estado: "activo",
        fechaRegistro: "2024-03-10",
        avatar: "LR",
        eventos: 4
    },
    {
        id: 7,
        nombre: "Pedro Hernández",
        email: "pedro.h@corp.com",
        rol: "cliente",
        estado: "activo",
        fechaRegistro: "2024-02-15",
        avatar: "PH",
        eventos: 6
    },
    {
        id: 8,
        nombre: "Sofía Castro",
        email: "sofia@eventos.com",
        rol: "cliente",
        estado: "inactivo",
        fechaRegistro: "2024-01-25",
        avatar: "SC",
        eventos: 1
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
    },
    {
        id: 4,
        nombre: "Reunión Corporativa Q1",
        cliente: "Roberto Sánchez",
        fecha: "2024-03-15",
        estado: "completado",
        mesas: 8,
        sillas: 64,
        ocupadas: 60,
        color: "#43e97b"
    },
    {
        id: 5,
        nombre: "Lanzamiento Producto",
        cliente: "Laura Ramírez",
        fecha: "2024-06-30",
        estado: "activo",
        mesas: 18,
        sillas: 144,
        ocupadas: 110,
        color: "#667eea"
    },
    {
        id: 6,
        nombre: "Graduación Universidad",
        cliente: "Pedro Hernández",
        fecha: "2024-07-20",
        estado: "activo",
        mesas: 30,
        sillas: 240,
        ocupadas: 220,
        color: "#f5576c"
    },
    {
        id: 7,
        nombre: "Cena de Gala Beneficencia",
        cliente: "Sofía Castro",
        fecha: "2024-03-05",
        estado: "cancelado",
        mesas: 20,
        sillas: 160,
        ocupadas: 0,
        color: "#9E9E9E"
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
const exportCSV = document.getElementById('exportCSV');
const exportJSON = document.getElementById('exportJSON');

// Configuración
const testConnectionBtn = document.getElementById('testConnectionBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const clearCacheBtn = document.getElementById('clearCacheBtn');

// Toast
const messageToast = document.getElementById('messageToast');

// Inicializar aplicación
function initAdmin() {
    // Cargar usuario actual
    usuarioActual = window.titiAuth?.obtenerUsuarioActual();
    if (!usuarioActual) {
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
    userAvatar.textContent = usuarioActual.avatar || usuarioActual.nombre.substring(0, 2).toUpperCase();
    userName.textContent = usuarioActual.nombre;
    userEmail.textContent = usuarioActual.email;
    
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
    // Actualizar estadísticas
    const totalUsers = USUARIOS_DEMO.length;
    const totalEvents = EVENTOS_DEMO.length;
    const activeEvents = EVENTOS_DEMO.filter(e => e.estado === 'activo').length;
    const occupiedChairs = EVENTOS_DEMO.reduce((sum, event) => sum + event.ocupadas, 0);
    
    statTotalUsers.textContent = totalUsers;
    statTotalEvents.textContent = totalEvents;
    statActiveEvents.textContent = activeEvents;
    statOccupiedChairs.textContent = occupiedChairs;
    userCountElement.textContent = totalUsers;
    eventCountElement.textContent = totalEvents;
    
    // Cargar usuarios recientes
    const recentUsersList = USUARIOS_DEMO
        .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro))
        .slice(0, 5);
    
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

// Cargar usuarios en tabla
function cargarUsuarios() {
    // Aplicar filtros
    aplicarFiltrosUsuarios();
    
    // Calcular paginación
    const totalUsers = usuariosFiltrados.length;
    const totalPages = Math.ceil(totalUsers / usuariosPorPagina);
    const startIndex = (paginaActualUsuarios - 1) * usuariosPorPagina;
    const endIndex = startIndex + usuariosPorPagina;
    const usuariosPaginados = usuariosFiltrados.slice(startIndex, endIndex);
    
    // Actualizar tabla
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
    
    // Actualizar controles de paginación
    showingCount.textContent = usuariosPaginados.length;
    totalCount.textContent = totalUsers;
    currentPage.textContent = paginaActualUsuarios;
    
    prevPage.disabled = paginaActualUsuarios === 1;
    nextPage.disabled = paginaActualUsuarios === totalPages;
}

// Aplicar filtros de usuarios
function aplicarFiltrosUsuarios() {
    const searchTerm = userSearch.value.toLowerCase();
    const roleFilter = filterRole.value;
    const statusFilter = filterStatus.value;
    
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
    // Aplicar filtros
    aplicarFiltrosEventos();
    
    // Actualizar grid
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
    
    // Actualizar lista de clientes en filtro
    const clientesUnicos = [...new Set(EVENTOS_DEMO.map(e => e.cliente))];
    filterClient.innerHTML = `
        <option value="">Todos los clientes</option>
        ${clientesUnicos.map(cliente => `
            <option value="${cliente}">${cliente}</option>
        `).join('')}
    `;
}

// Aplicar filtros de eventos
function aplicarFiltrosEventos() {
    const searchTerm = eventSearch.value.toLowerCase();
    const clientFilter = filterClient.value;
    const dateFilter = filterDate.value;
    const statusFilter = filterEventStatus.value;
    
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
    // Cargar configuración guardada de localStorage
    const settings = JSON.parse(localStorage.getItem('titi_settings') || '{}');
    
    // Aplicar configuración a los campos
    document.getElementById('dbHost').value = settings.dbHost || '';
    document.getElementById('dbPort').value = settings.dbPort || 25060;
    document.getElementById('dbName').value = settings.dbName || 'defaultdb';
    document.getElementById('dbUser').value = settings.dbUser || 'titi_admin';
    document.getElementById('dbPassword').value = settings.dbPassword || '';
    document.getElementById('sessionDuration').value = settings.sessionDuration || 24;
    document.getElementById('maxLoginAttempts').value = settings.maxLoginAttempts || 5;
    document.getElementById('requireSSL').checked = settings.requireSSL !== false;
    document.getElementById('autoBackup').checked = settings.autoBackup !== false;
    document.getElementById('notifyNewUsers').checked = settings.notifyNewUsers !== false;
    document.getElementById('notifyLargeEvents').checked = settings.notifyLargeEvents !== false;
    document.getElementById('notifySystemAlerts').checked = settings.notifySystemAlerts !== false;
    document.getElementById('notificationEmail').value = settings.notificationEmail || 'admin@titi-invita.com';
}

// Configurar event listeners
function setupEventListeners() {
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
             // Limpiar todo y redirigir
             localStorage.removeItem('titi_token');
             localStorage.removeItem('titi_usuario');
             localStorage.removeItem('titi_usuario_actual');
             sessionStorage.clear();
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
            userSearch.value = '';
            filterRole.value = '';
            filterStatus.value = '';
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
    
    // Exportar datos
    if (exportCSV) {
        exportCSV.addEventListener('click', exportarCSV);
    }
    
    if (exportJSON) {
        exportJSON.addEventListener('click', exportarJSON);
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
    
    // Botones de acción rápida
    document.getElementById('viewAllUsers')?.addEventListener('click', () => {
        cambiarPagina('usuarios');
    });
    
    document.getElementById('addUserBtn')?.addEventListener('click', () => {
        abrirModal(addUserModal);
    });
    
    document.getElementById('viewEventsBtn')?.addEventListener('click', () => {
        cambiarPagina('eventos');
    });
    
    document.getElementById('exportDataBtn')?.addEventListener('click', exportarTodosDatos);
    document.getElementById('systemReportBtn')?.addEventListener('click', generarReporteSistema);
}

// Cambiar página
function cambiarPagina(pageId) {
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
    
    pageTitle.textContent = pageTitles[pageId] || 'Dashboard';
    
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
    messageToast.textContent = message;
    messageToast.className = `toast ${type} show`;
    
    setTimeout(() => {
        messageToast.classList.remove('show');
    }, 4000);
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
                // En una implementación real, eliminaría de la base de datos
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
        // En una implementación real, redireccionaría a la vista del evento
    }
}

// Funciones de exportación
function exportarCSV() {
    const headers = ['ID', 'Nombre', 'Cliente', 'Fecha', 'Estado', 'Mesas', 'Sillas', 'Ocupadas'];
    const rows = eventosFiltrados.map(event => [
        event.id,
        event.nombre,
        event.cliente,
        event.fecha,
        event.estado,
        event.mesas,
        event.sillas,
        event.ocupadas
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    descargarArchivo(csvContent, 'eventos.csv', 'text/csv');
    showToast('Datos exportados en formato CSV', 'success');
}

function exportarJSON() {
    const jsonContent = JSON.stringify(eventosFiltrados, null, 2);
    descargarArchivo(jsonContent, 'eventos.json', 'application/json');
    showToast('Datos exportados en formato JSON', 'success');
}

function exportarTodosDatos() {
    const data = {
        usuarios: USUARIOS_DEMO,
        eventos: EVENTOS_DEMO,
        exportado: new Date().toISOString(),
        sistema: 'Titi Invita v1.0.0'
    };
    
    const jsonContent = JSON.stringify(data, null, 2);
    descargarArchivo(jsonContent, 'titi-invita-backup.json', 'application/json');
    showToast('Backup completo exportado', 'success');
}

// Funciones de configuración
function testConexionDB() {
    showToast('Probando conexión a PostgreSQL...', 'info');
    
    // Simular prueba de conexión
    setTimeout(() => {
        const exito = Math.random() > 0.3; // 70% de éxito para demo
        if (exito) {
            showToast('✅ Conexión exitosa a PostgreSQL', 'success');
        } else {
            showToast('❌ Error de conexión a PostgreSQL', 'error');
        }
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
            showToast('Caché limpiado correctamente. Las sesiones serán cerradas.', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        },
        true
    );
}

// Funciones de utilidad
function descargarArchivo(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function abrirModal(modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cerrarModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function cerrarTodosModales() {
    document.querySelectorAll('.modal').forEach(modal => {
        cerrarModal(modal);
    });
}

function mostrarConfirmacion(titulo, mensaje, callback, warning = false) {
    document.getElementById('confirmTitle').textContent = titulo;
    document.getElementById('confirmMessage').textContent = mensaje;
    document.getElementById('confirmWarning').style.display = warning ? 'flex' : 'none';
    
    const confirmModal = document.getElementById('confirmModal');
    const confirmAction = document.getElementById('confirmAction');
    const confirmCancel = document.getElementById('confirmCancel');
    
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
    
    // Limpiar después de cerrar
    confirmModal.addEventListener('click', function(e) {
        if (e.target === confirmModal) {
            confirmAction.onclick = null;
            confirmCancel.onclick = null;
        }
    });
}

function generarReporteSistema() {
    const reporte = {
        fecha: new Date().toISOString(),
        sistema: 'Titi Invita v1.0.0',
        estadisticas: {
            totalUsuarios: USUARIOS_DEMO.length,
            usuariosActivos: USUARIOS_DEMO.filter(u => u.estado === 'activo').length,
            totalEventos: EVENTOS_DEMO.length,
            eventosActivos: EVENTOS_DEMO.filter(e => e.estado === 'activo').length,
            totalSillas: EVENTOS_DEMO.reduce((sum, e) => sum + e.sillas, 0),
            sillasOcupadas: EVENTOS_DEMO.reduce((sum, e) => sum + e.ocupadas, 0),
            tasaOcupacion: Math.round((EVENTOS_DEMO.reduce((sum, e) => sum + e.ocupadas, 0) / EVENTOS_DEMO.reduce((sum, e) => sum + e.sillas, 0)) * 100) + '%'
        },
        configuracion: JSON.parse(localStorage.getItem('titi_settings') || '{}')
    };
    
    const reporteHTML = `
        <h2>Reporte del Sistema - Titi Invita</h2>
        <p><strong>Fecha:</strong> ${new Date(reporte.fecha).toLocaleString()}</p>
        
        <h3>📊 Estadísticas</h3>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td>Total Usuarios:</td><td><strong>${reporte.estadisticas.totalUsuarios}</strong></td></tr>
            <tr><td>Usuarios Activos:</td><td><strong>${reporte.estadisticas.usuariosActivos}</strong></td></tr>
            <tr><td>Total Eventos:</td><td><strong>${reporte.estadisticas.totalEventos}</strong></td></tr>
            <tr><td>Eventos Activos:</td><td><strong>${reporte.estadisticas.eventosActivos}</strong></td></tr>
            <tr><td>Total Sillas:</td><td><strong>${reporte.estadisticas.totalSillas}</strong></td></tr>
            <tr><td>Sillas Ocupadas:</td><td><strong>${reporte.estadisticas.sillasOcupadas}</strong></td></tr>
            <tr><td>Tasa de Ocupación:</td><td><strong>${reporte.estadisticas.tasaOcupacion}</strong></td></tr>
        </table>
        
        <h3>⚙️ Configuración Actual</h3>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto;">
${JSON.stringify(reporte.configuracion, null, 2)}
        </pre>
    `;
    
    // Crear ventana de reporte
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte del Sistema - Titi Invita</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h2 { color: #764ba2; }
                h3 { color: #333; margin-top: 30px; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                pre { background: #f5f5f5; padding: 15px; border-radius: 5px; }
            </style>
        </head>
        <body>
            ${reporteHTML}
            <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
                Reporte generado automáticamente por Titi Invita v1.0.0
            </p>
        </body>
        </html>
    `);
    reportWindow.document.close();
    
    showToast('Reporte del sistema generado', 'success');
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initAdmin);
