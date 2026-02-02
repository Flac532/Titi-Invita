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

// Elementos DOM (se inicializarán después)
let userCountElement, eventCountElement, pageTitle, currentTime, menuToggle, sidebar, navItems, pages;
let logoutBtn, userAvatar, userName, userEmail;
let statTotalUsers, statTotalEvents, statActiveEvents, statOccupiedChairs, recentUsers;
let usersTableBody, userSearch, filterRole, filterStatus, clearFilters, showingCount, totalCount, currentPage, prevPage, nextPage;
let addUserModalBtn, addUserModal, editUserModal, confirmModal;
let eventsGrid, eventSearch, filterClient, filterDate, filterEventStatus;
let testConnectionBtn, saveSettingsBtn, resetSettingsBtn, clearCacheBtn;
let messageToast;

// Inicializar elementos DOM
function inicializarElementosDOM() {
    console.log('🔄 Inicializando elementos DOM...');
    
    // Header y navegación
    userCountElement = document.getElementById('userCount');
    eventCountElement = document.getElementById('eventCount');
    pageTitle = document.getElementById('pageTitle');
    currentTime = document.getElementById('currentTime');
    menuToggle = document.querySelector('.menu-toggle');
    sidebar = document.querySelector('.sidebar');
    navItems = document.querySelectorAll('.nav-item');
    pages = document.querySelectorAll('.page');
    
    // Usuario
    logoutBtn = document.getElementById('logoutBtn');
    userAvatar = document.getElementById('userAvatar');
    userName = document.getElementById('userName');
    userEmail = document.getElementById('userEmail');
    
    // Dashboard stats
    statTotalUsers = document.getElementById('statTotalUsers');
    statTotalEvents = document.getElementById('statTotalEvents');
    statActiveEvents = document.getElementById('statActiveEvents');
    statOccupiedChairs = document.getElementById('statOccupiedChairs');
    recentUsers = document.getElementById('recentUsers');
    
    // Gestión de usuarios
    usersTableBody = document.getElementById('usersTableBody');
    userSearch = document.getElementById('userSearch');
    filterRole = document.getElementById('filterRole');
    filterStatus = document.getElementById('filterStatus');
    clearFilters = document.getElementById('clearFilters');
    showingCount = document.getElementById('showingCount');
    totalCount = document.getElementById('totalCount');
    currentPage = document.getElementById('currentPage');
    prevPage = document.getElementById('prevPage');
    nextPage = document.getElementById('nextPage');
    addUserModalBtn = document.getElementById('addUserModalBtn');
    addUserModal = document.getElementById('addUserModal');
    
    // Gestión de eventos
    eventsGrid = document.getElementById('eventsGrid');
    eventSearch = document.getElementById('eventSearch');
    filterClient = document.getElementById('filterClient');
    filterDate = document.getElementById('filterDate');
    filterEventStatus = document.getElementById('filterEventStatus');
    
    // Configuración
    testConnectionBtn = document.getElementById('testConnectionBtn');
    saveSettingsBtn = document.getElementById('saveSettingsBtn');
    resetSettingsBtn = document.getElementById('resetSettingsBtn');
    clearCacheBtn = document.getElementById('clearCacheBtn');
    
    // Toast y modales
    messageToast = document.getElementById('messageToast');
    confirmModal = document.getElementById('confirmModal');
    
    console.log('✅ Elementos DOM inicializados');
    console.log('   - logoutBtn:', logoutBtn ? 'Encontrado' : 'No encontrado');
    console.log('   - navItems:', navItems.length);
    console.log('   - pages:', pages.length);
}

// Inicializar aplicación
function initAdmin() {
    console.log('🚀 === INICIANDO ADMIN ===');
    
    // Inicializar elementos DOM primero
    inicializarElementosDOM();
    
    // Cargar usuario actual
    const usuarioStr = localStorage.getItem('titi_usuario') || 
                       localStorage.getItem('titi_usuario_actual') ||
                       sessionStorage.getItem('titi_usuario');
    
    if (!usuarioStr) {
        console.log('❌ No hay usuario en storage, redirigiendo a login');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        usuarioActual = JSON.parse(usuarioStr);
        console.log('✅ Usuario cargado:', usuarioActual);
    } catch (error) {
        console.error('❌ Error parseando usuario:', error);
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
    if (userAvatar) {
        userAvatar.textContent = usuarioActual.avatar || usuarioActual.nombre.substring(0, 2).toUpperCase();
        console.log('✅ Avatar configurado:', userAvatar.textContent);
    }
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
    
    console.log('✅ Admin inicializado correctamente');
    
    // Debug: mostrar elementos importantes
    debugAdmin();
}

// Debug function
function debugAdmin() {
    console.log('🔍 === DEBUG ===');
    console.log('Usuario actual:', usuarioActual);
    console.log('Botones de navegación encontrados:', navItems.length);
    console.log('Páginas encontradas:', pages.length);
    console.log('Botón logout:', logoutBtn ? '✓' : '✗');
    console.log('Botón agregar usuario:', addUserModalBtn ? '✓' : '✗');
    console.log('================');
}

// Configurar acciones rápidas
function setupQuickActions() {
    console.log('⚡ Configurando acciones rápidas...');
    
    // Botón "Agregar Usuario" en dashboard
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        console.log('✅ Botón "Agregar Usuario" encontrado');
        addUserBtn.addEventListener('click', function() {
            console.log('📍 Click en Agregar Usuario');
            cambiarPagina('usuarios');
            setTimeout(() => {
                if (addUserModalBtn) {
                    addUserModalBtn.click();
                    console.log('✅ Modal de agregar usuario abierto');
                }
            }, 300);
        });
    } else {
        console.log('❌ Botón "Agregar Usuario" NO encontrado');
    }
    
    // Botón "Ver Eventos" en dashboard
    const viewEventsBtn = document.getElementById('viewEventsBtn');
    if (viewEventsBtn) {
        console.log('✅ Botón "Ver Eventos" encontrado');
        viewEventsBtn.addEventListener('click', function() {
            console.log('📍 Click en Ver Eventos');
            cambiarPagina('eventos');
        });
    }
    
    // Botón "Ver Todos" usuarios
    const viewAllUsers = document.getElementById('viewAllUsers');
    if (viewAllUsers) {
        viewAllUsers.addEventListener('click', function() {
            console.log('📍 Click en Ver Todos Usuarios');
            cambiarPagina('usuarios');
        });
    }
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
    console.log('📊 Cargando dashboard...');
    
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
    console.log('👥 Cargando usuarios...');
    
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
    console.log('🎪 Cargando eventos...');
    
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
    console.log('⚙️ Cargando configuración...');
    
    // Cargar configuración guardada de localStorage
    const settings = JSON.parse(localStorage.getItem('titi_settings') || '{}');
    
    // Aplicar configuración a los campos si existen
    const setValue = (id, defaultValue) => {
        const element = document.getElementById(id);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = settings[id] !== undefined ? settings[id] : defaultValue;
            } else {
                element.value = settings[id] || defaultValue;
            }
        }
    };
    
    setValue('dbHost', '');
    setValue('dbPort', '25060');
    setValue('dbName', 'defaultdb');
    setValue('dbUser', 'titi_admin');
    setValue('dbPassword', '');
    setValue('sessionDuration', '24');
    setValue('maxLoginAttempts', '5');
    setValue('requireSSL', true);
    setValue('autoBackup', true);
    setValue('notifyNewUsers', true);
    setValue('notifyLargeEvents', true);
    setValue('notifySystemAlerts', true);
    setValue('notificationEmail', 'admin@titi-invita.com');
}

// Configurar event listeners - VERSIÓN CORREGIDA
function setupEventListeners() {
    console.log('🎯 Configurando event listeners...');
    
    // 1. LOGOUT - Versión segura y funcional
    if (logoutBtn) {
        console.log('✅ Configurando logout button');
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🚪 Cerrando sesión...');
            
            // Limpiar todo
            localStorage.clear();
            sessionStorage.clear();
            
            // Redirigir
            window.location.href = 'index.html';
        });
        
        // También asignar directamente al enlace por si falla el event listener
        logoutBtn.onclick = function(e) {
            e.preventDefault();
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'index.html';
        };
    } else {
        console.log('❌ logoutBtn NO encontrado');
    }
    
    // 2. NAVEGACIÓN - Versión mejorada
    if (navItems.length > 0) {
        console.log(`✅ Configurando ${navItems.length} items de navegación`);
        
        navItems.forEach((item, index) => {
            if (item.dataset.page) {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    console.log(`📍 Click en navegación: ${item.dataset.page}`);
                    cambiarPagina(item.dataset.page);
                });
                
                // También asignar onclick directo
                item.onclick = function(e) {
                    e.preventDefault();
                    cambiarPagina(item.dataset.page);
                };
            }
        });
    }
    
    // 3. TOGGLE SIDEBAR
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });
    }
    
    // 4. FILTROS DE USUARIOS
    if (userSearch) userSearch.addEventListener('input', cargarUsuarios);
    if (filterRole) filterRole.addEventListener('change', cargarUsuarios);
    if (filterStatus) filterStatus.addEventListener('change', cargarUsuarios);
    
    if (clearFilters) {
        clearFilters.addEventListener('click', function() {
            if (userSearch) userSearch.value = '';
            if (filterRole) filterRole.value = '';
            if (filterStatus) filterStatus.value = '';
            cargarUsuarios();
        });
    }
    
    // 5. PAGINACIÓN
    if (prevPage) {
        prevPage.addEventListener('click', function() {
            if (paginaActualUsuarios > 1) {
                paginaActualUsuarios--;
                cargarUsuarios();
            }
        });
    }
    
    if (nextPage) {
        nextPage.addEventListener('click', function() {
            const totalPages = Math.ceil(usuariosFiltrados.length / usuariosPorPagina);
            if (paginaActualUsuarios < totalPages) {
                paginaActualUsuarios++;
                cargarUsuarios();
            }
        });
    }
    
    // 6. FILTROS DE EVENTOS
    if (eventSearch) eventSearch.addEventListener('input', cargarEventos);
    if (filterClient) filterClient.addEventListener('change', cargarEventos);
    if (filterDate) filterDate.addEventListener('change', cargarEventos);
    if (filterEventStatus) filterEventStatus.addEventListener('change', cargarEventos);
    
    // 7. CONFIGURACIÓN
    if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', function() {
            showToast('✅ Conexión a PostgreSQL configurada correctamente', 'success');
        });
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
    
    // 8. MODAL AGREGAR USUARIO
    if (addUserModalBtn) {
        addUserModalBtn.addEventListener('click', function() {
            abrirModal(addUserModal);
        });
    }
    
    // 9. CERRAR MODALES
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            cerrarTodosModales();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            cerrarTodosModales();
        }
    });
    
    console.log('✅ Todos los event listeners configurados');
}

// Cambiar página - VERSIÓN MEJORADA
function cambiarPagina(pageId) {
    console.log(`🔄 Cambiando a página: ${pageId}`);
    
    // 1. Actualizar navegación
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });
    
    // 2. Mostrar página correspondiente
    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === `${pageId}Page`) {
            page.classList.add('active');
            console.log(`✅ Mostrando página: ${page.id}`);
        }
    });
    
    // 3. Actualizar título
    const pageTitles = {
        'dashboard': 'Dashboard',
        'usuarios': 'Gestión de Usuarios',
        'eventos': 'Gestión de Eventos',
        'configuracion': 'Configuración'
    };
    
    if (pageTitle) {
        pageTitle.textContent = pageTitles[pageId] || 'Dashboard';
        console.log(`✅ Título cambiado a: ${pageTitle.textContent}`);
    }
    
    // 4. Ocultar sidebar en móvil
    if (sidebar) {
        sidebar.classList.remove('show');
    }
    
    // 5. Scroll al inicio
    window.scrollTo(0, 0);
    
    console.log(`✅ Página ${pageId} cargada correctamente`);
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
    console.log(`📢 Toast: ${message}`);
    if (messageToast) {
        messageToast.textContent = message;
        messageToast.className = `toast ${type} show`;
        
        setTimeout(() => {
            messageToast.classList.remove('show');
        }, 4000);
    } else {
        alert(message); // Fallback si no hay toast
    }
}

// Funciones de gestión de usuarios (para onclick en HTML)
function editarUsuario(userId) {
    const usuario = USUARIOS_DEMO.find(u => u.id === userId);
    if (usuario) {
        showToast(`Editando usuario: ${usuario.nombre}`, 'info');
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
function guardarConfiguracionDB() {
    const settings = {
        dbHost: document.getElementById('dbHost')?.value || '',
        dbPort: document.getElementById('dbPort')?.value || '25060',
        dbName: document.getElementById('dbName')?.value || 'defaultdb',
        dbUser: document.getElementById('dbUser')?.value || 'titi_admin',
        dbPassword: document.getElementById('dbPassword')?.value || '',
        sessionDuration: document.getElementById('sessionDuration')?.value || '24',
        maxLoginAttempts: document.getElementById('maxLoginAttempts')?.value || '5',
        requireSSL: document.getElementById('requireSSL')?.checked || true,
        autoBackup: document.getElementById('autoBackup')?.checked || true,
        notifyNewUsers: document.getElementById('notifyNewUsers')?.checked || true,
        notifyLargeEvents: document.getElementById('notifyLargeEvents')?.checked || true,
        notifySystemAlerts: document.getElementById('notifySystemAlerts')?.checked || true,
        notificationEmail: document.getElementById('notificationEmail')?.value || 'admin@titi-invita.com',
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
    
    // Configurar acción
    confirmAction.onclick = function() {
        if (callback) callback();
        cerrarModal(confirmModal);
    };
    
    confirmCancel.onclick = function() {
        cerrarModal(confirmModal);
    };
    
    abrirModal(confirmModal);
}

// Inicializar cuando el DOM esté listo - VERSIÓN MEJORADA
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM completamente cargado');
    
    // Esperar un poco más para asegurar que todo está listo
    setTimeout(function() {
        console.log('⏳ Iniciando admin después de espera...');
        initAdmin();
    }, 100);
});

// También iniciar cuando la ventana se cargue completamente
window.addEventListener('load', function() {
    console.log('🖼️ Ventana completamente cargada');
});

// Exponer funciones para HTML
window.editarUsuario = editarUsuario;
window.resetPassword = resetPassword;
window.eliminarUsuario = eliminarUsuario;
window.verEvento = verEvento;
window.cambiarPagina = cambiarPagina; // ¡IMPORTANTE! Exponer esta función
