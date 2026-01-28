// admin-usuarios.js - Gestión completa de usuarios para admin

// Datos de ejemplo
let usuarios = [
    {
        id: 1,
        nombre: "Jorge Flores",
        email: "jorge.flores@titi-app.com",
        password: "Titi-apps2026@!",
        rol: "admin",
        estado: "activo",
        avatar: "JF",
        fechaRegistro: "2024-01-15",
        eventos: 12,
        limite_eventos: null
    },
    {
        id: 2,
        nombre: "María González",
        email: "cliente@ejemplo.com",
        password: "Titi-apps2026@!",
        rol: "cliente",
        estado: "activo",
        avatar: "MG",
        fechaRegistro: "2024-02-20",
        eventos: 1,
        limite_eventos: 1
    },
    {
        id: 3,
        nombre: "Carlos Organizador",
        email: "organizador@ejemplo.com",
        password: "Titi-apps2026@!",
        rol: "organizador",
        estado: "activo",
        avatar: "CO",
        fechaRegistro: "2024-03-01",
        eventos: 5,
        limite_eventos: null
    },
    {
        id: 4,
        nombre: "Ana Martínez",
        email: "ana.m@eventos.com",
        password: "Titi-apps2026@!",
        rol: "cliente",
        estado: "inactivo",
        avatar: "AM",
        fechaRegistro: "2024-02-28",
        eventos: 0,
        limite_eventos: 1
    },
    {
        id: 5,
        nombre: "Pedro López",
        email: "pedro.l@empresa.com",
        password: "Titi-apps2026@!",
        rol: "organizador",
        estado: "activo",
        avatar: "PL",
        fechaRegistro: "2024-03-10",
        eventos: 3,
        limite_eventos: null
    },
    {
        id: 6,
        nombre: "Laura Sánchez",
        email: "laura.s@email.com",
        password: "Titi-apps2026@!",
        rol: "cliente",
        estado: "activo",
        avatar: "LS",
        fechaRegistro: "2024-03-05",
        eventos: 2,
        limite_eventos: 1
    }
];

let eventosPorUsuario = {
    2: [ // Eventos de María González (cliente)
        {
            id: 1,
            nombre: "Boda de Ana y Carlos",
            descripcion: "Celebración en jardín botánico",
            fecha: "2024-06-15",
            estado: "activo",
            mesas: 8,
            sillas: 64,
            ocupacion: 32
        }
    ],
    3: [ // Eventos de Carlos Organizador
        {
            id: 2,
            nombre: "Conferencia Tech 2024",
            descripcion: "Conferencia anual de tecnología",
            fecha: "2024-07-20",
            estado: "activo",
            mesas: 12,
            sillas: 72,
            ocupacion: 48
        },
        {
            id: 3,
            nombre: "Fiesta de Graduación",
            descripcion: "Celebración de graduación universitaria",
            fecha: "2024-08-10",
            estado: "borrador",
            mesas: 6,
            sillas: 60,
            ocupacion: 0
        },
        {
            id: 4,
            nombre: "Reunión Corporativa",
            descripcion: "Reunión trimestral de la empresa",
            fecha: "2024-05-15",
            estado: "activo",
            mesas: 10,
            sillas: 80,
            ocupacion: 60
        }
    ],
    5: [ // Eventos de Pedro López
        {
            id: 5,
            nombre: "Boda de Laura y Miguel",
            descripcion: "Celebración en hacienda",
            fecha: "2024-09-20",
            estado: "activo",
            mesas: 15,
            sillas: 120,
            ocupacion: 90
        },
        {
            id: 6,
            nombre: "Cena de Gala",
            descripcion: "Evento benéfico anual",
            fecha: "2024-11-30",
            estado: "borrador",
            mesas: 20,
            sillas: 160,
            ocupacion: 0
        }
    ],
    6: [ // Eventos de Laura Sánchez
        {
            id: 7,
            nombre: "Baby Shower",
            descripcion: "Celebración para el bebé",
            fecha: "2024-04-10",
            estado: "activo",
            mesas: 5,
            sillas: 40,
            ocupacion: 25
        }
    ]
};

// Variables de estado
let usuariosFiltrados = [];
let usuarioSeleccionado = null;
let paginaActual = 1;
const usuariosPorPagina = 5;
let rolSeleccionado = "cliente";

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que el usuario sea admin
    const usuarioActual = JSON.parse(localStorage.getItem('titi_usuario_actual') || '{}');
    if (usuarioActual.rol !== 'admin') {
        window.location.href = 'cliente.html';
        return;
    }
    
    cargarUsuarios();
    configurarEventListeners();
});

// Cargar usuarios en tabla
function cargarUsuarios() {
    aplicarFiltros();
    
    const totalUsuarios = usuariosFiltrados.length;
    const totalPaginas = Math.ceil(totalUsuarios / usuariosPorPagina);
    const inicio = (paginaActual - 1) * usuariosPorPagina;
    const fin = inicio + usuariosPorPagina;
    const usuariosPagina = usuariosFiltrados.slice(inicio, fin);
    
    const tabla = document.getElementById('cuerpoTablaUsuarios');
    if (!tabla) return;
    
    tabla.innerHTML = usuariosPagina.map(usuario => `
        <tr data-user-id="${usuario.id}">
            <td>${usuario.id}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="user-list-avatar" style="width: 36px; height: 36px; background: linear-gradient(135deg, ${getRolColor(usuario.rol)}); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600;">
                        ${usuario.avatar}
                    </div>
                    <div>
                        <strong>${usuario.nombre}</strong><br>
                        <small>ID: ${usuario.id.toString().padStart(3, '0')}</small>
                    </div>
                </div>
            </td>
            <td>${usuario.email}</td>
            <td>
                <span class="status-badge ${getRolClass(usuario.rol)}">
                    ${getRolNombre(usuario.rol)}
                </span>
                ${usuario.limite_eventos === 1 ? '<span class="event-limit-badge">1 evento</span>' : ''}
            </td>
            <td>
                <span class="status-badge ${usuario.estado === 'activo' ? 'status-active' : 'status-inactive'}">
                    ${usuario.estado === 'activo' ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>
                <div style="text-align: center;">
                    <strong>${usuario.eventos}</strong><br>
                    <small>eventos</small>
                </div>
            </td>
            <td>${formatearFecha(usuario.fechaRegistro)}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn-small action-btn-view" title="Ver Eventos" 
                            onclick="verEventosUsuario(${usuario.id})">
                        <i class="fas fa-calendar-alt"></i>
                    </button>
                    <button class="action-btn-small action-btn-edit" title="Editar" 
                            onclick="editarUsuario(${usuario.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn-small action-btn-reset" title="Reiniciar Contraseña" 
                            onclick="reiniciarPassword(${usuario.id})">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="action-btn-small action-btn-delete" title="Eliminar" 
                            onclick="eliminarUsuario(${usuario.id})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Actualizar paginación
    document.getElementById('mostrando').textContent = usuariosPagina.length;
    document.getElementById('total').textContent = totalUsuarios;
    document.getElementById('paginaActual').textContent = paginaActual;
    
    const btnAnterior = document.getElementById('paginaAnterior');
    const btnSiguiente = document.getElementById('paginaSiguiente');
    
    if (btnAnterior) btnAnterior.disabled = paginaActual === 1;
    if (btnSiguiente) btnSiguiente.disabled = paginaActual >= totalPaginas;
}

// Aplicar filtros
function aplicarFiltros() {
    const buscar = document.getElementById('buscarUsuario')?.value.toLowerCase() || '';
    const filtroRol = document.getElementById('filtroRol')?.value || '';
    const filtroEstado = document.getElementById('filtroEstado')?.value || '';
    
    usuariosFiltrados = usuarios.filter(usuario => {
        const coincideBusqueda = 
            usuario.nombre.toLowerCase().includes(buscar) ||
            usuario.email.toLowerCase().includes(buscar);
        
        const coincideRol = !filtroRol || usuario.rol === filtroRol;
        const coincideEstado = !filtroEstado || usuario.estado === filtroEstado;
        
        return coincideBusqueda && coincideRol && coincideEstado;
    });
}

// Funciones de ayuda
function getRolNombre(rol) {
    const nombres = {
        'admin': 'Administrador',
        'cliente': 'Cliente',
        'organizador': 'Organizador'
    };
    return nombres[rol] || rol;
}

function getRolClass(rol) {
    const clases = {
        'admin': 'status-active',
        'cliente': 'status-info',
        'organizador': 'status-warning'
    };
    return clases[rol] || '';
}

function getRolColor(rol) {
    const colores = {
        'admin': '#4CAF50, #2E7D32',
        'cliente': '#2196F3, #1565C0',
        'organizador': '#FF9800, #F57C00'
    };
    return colores[rol] || '#667eea, #764ba2';
}

function formatearFecha(fechaStr) {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Configurar event listeners
function configurarEventListeners() {
    // Filtros
    const buscarInput = document.getElementById('buscarUsuario');
    const filtroRol = document.getElementById('filtroRol');
    const filtroEstado = document.getElementById('filtroEstado');
    
    if (buscarInput) buscarInput.addEventListener('input', cargarUsuarios);
    if (filtroRol) filtroRol.addEventListener('change', cargarUsuarios);
    if (filtroEstado) filtroEstado.addEventListener('change', cargarUsuarios);
    
    // Botón limpiar filtros
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltros);
    }
    
    // Paginación
    const btnAnterior = document.getElementById('paginaAnterior');
    const btnSiguiente = document.getElementById('paginaSiguiente');
    
    if (btnAnterior) btnAnterior.addEventListener('click', paginaAnterior);
    if (btnSiguiente) btnSiguiente.addEventListener('click', paginaSiguiente);
    
    // Botón volver a usuarios
    const btnVolver = document.getElementById('btnVolverUsuarios');
    if (btnVolver) {
        btnVolver.addEventListener('click', volverAGestionUsuarios);
    }
    
    // Botón crear evento para usuario
    const btnCrearEvento = document.getElementById('btnCrearEventoUsuario');
    if (btnCrearEvento) {
        btnCrearEvento.addEventListener('click', abrirModalCrearEvento);
    }
    
    // Cerrar modales
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    // Cerrar modales al hacer clic fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
}

// Función para limpiar filtros
function limpiarFiltros() {
    const buscarInput = document.getElementById('buscarUsuario');
    const filtroRol = document.getElementById('filtroRol');
    const filtroEstado = document.getElementById('filtroEstado');
    
    if (buscarInput) buscarInput.value = '';
    if (filtroRol) filtroRol.value = '';
    if (filtroEstado) filtroEstado.value = '';
    
    cargarUsuarios();
}

// Navegación de páginas
function paginaAnterior() {
    if (paginaActual > 1) {
        paginaActual--;
        cargarUsuarios();
    }
}

function paginaSiguiente() {
    const totalPaginas = Math.ceil(usuariosFiltrados.length / usuariosPorPagina);
    if (paginaActual < totalPaginas) {
        paginaActual++;
        cargarUsuarios();
    }
}

// Ver eventos de un usuario (Admin)
function verEventosUsuario(usuarioId) {
    usuarioSeleccionado = usuarios.find(u => u.id === usuarioId);
    if (!usuarioSeleccionado) return;
    
    // Cambiar a página de eventos del usuario
    document.getElementById('gestionUsuariosPage').style.display = 'none';
    document.getElementById('eventosUsuarioPage').style.display = 'block';
    
    // Actualizar información del usuario
    actualizarInfoUsuarioSeleccionado();
    
    // Cargar eventos del usuario
    cargarEventosUsuario(usuarioId);
}

function actualizarInfoUsuarioSeleccionado() {
    if (!usuarioSeleccionado) return;
    
    // Nombre y rol
    document.getElementById('nombreUsuarioSeleccionado').textContent = usuarioSeleccionado.nombre;
    document.getElementById('rolUsuarioSeleccionado').textContent = usuarioSeleccionado.rol.toUpperCase();
    document.getElementById('rolUsuarioSeleccionado').className = `role-badge ${usuarioSeleccionado.rol}`;
    
    // Información de usuario
    document.getElementById('avatarUsuarioSeleccionado').textContent = usuarioSeleccionado.avatar;
    document.getElementById('infoNombreUsuario').textContent = usuarioSeleccionado.nombre;
    document.getElementById('infoEmailUsuario').textContent = usuarioSeleccionado.email;
    document.getElementById('infoRegistroUsuario').textContent = `Registrado: ${formatearFecha(usuarioSeleccionado.fechaRegistro)}`;
    
    // Actualizar nombre en modal de crear evento
    document.getElementById('nombreUsuarioEvento').textContent = usuarioSeleccionado.nombre;
}

function cargarEventosUsuario(usuarioId) {
    const eventos = eventosPorUsuario[usuarioId] || [];
    const eventosGrid = document.getElementById('eventosUsuarioGrid');
    const sinEventos = document.getElementById('sinEventos');
    
    // Actualizar estadísticas
    const totalEventos = eventos.length;
    const eventosActivos = eventos.filter(e => e.estado === 'activo').length;
    const eventosBorrador = eventos.filter(e => e.estado === 'borrador').length;
    
    document.getElementById('statTotalEventos').textContent = totalEventos;
    document.getElementById('statEventosActivos').textContent = eventosActivos;
    document.getElementById('statEventosBorrador').textContent = eventosBorrador;
    
    if (eventos.length === 0) {
        eventosGrid.style.display = 'none';
        sinEventos.style.display = 'block';
    } else {
        eventosGrid.style.display = 'grid';
        sinEventos.style.display = 'none';
        
        eventosGrid.innerHTML = eventos.map(evento => `
            <div class="event-card">
                <div class="event-header">
                    <div class="event-title">${evento.nombre}</div>
                    <div class="event-client">${usuarioSeleccionado.nombre}</div>
                    <div class="event-meta">
                        <span><i class="far fa-calendar"></i> ${formatearFecha(evento.fecha)}</span>
                        <span class="status-badge ${evento.estado}">
                            ${evento.estado}
                        </span>
                    </div>
                </div>
                <div class="event-body">
                    <div class="event-stats">
                        <div class="stat-item">
                            <span class="stat-value">${evento.mesas}</span>
                            <span class="stat-label">Mesas</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${evento.sillas}</span>
                            <span class="stat-label">Sillas</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${evento.ocupacion}</span>
                            <span class="stat-label">Ocupadas</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${evento.sillas > 0 ? Math.round((evento.ocupacion / evento.sillas) * 100) : 0}%</span>
                            <span class="stat-label">Ocupación</span>
                        </div>
                    </div>
                    <div class="event-details">
                        <p>${evento.descripcion || 'Sin descripción'}</p>
                        <p><i class="fas fa-hashtag"></i> ID: ${evento.id.toString().padStart(3, '0')}</p>
                    </div>
                </div>
                <div class="event-footer">
                    <button class="btn-view" onclick="administrarEvento(${evento.id})">
                        <i class="fas fa-cog"></i> Administrar como Admin
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Volver a gestión de usuarios
function volverAGestionUsuarios() {
    document.getElementById('eventosUsuarioPage').style.display = 'none';
    document.getElementById('gestionUsuariosPage').style.display = 'block';
    usuarioSeleccionado = null;
    paginaActual = 1;
    cargarUsuarios();
}

// Administrar evento como admin
function administrarEvento(eventoId) {
    if (!usuarioSeleccionado) return;
    
    // Aquí en una app real, redirigirías al admin a la vista del evento
    mostrarToast(`Redirigiendo a la administración del evento ID: ${eventoId}`, 'info');
    
    // Simulación: abrir en nueva pestaña o redirigir
    // window.open(`cliente.html?evento=${eventoId}&usuario=${usuarioSeleccionado.id}`, '_blank');
    
    // Por ahora, mostrar información
    alert(`Administrar evento ID: ${eventoId}\nUsuario: ${usuarioSeleccionado.nombre}\n\nComo administrador, puedes editar este evento como si fuera el dueño.`);
}

// Modal de usuario
function abrirModalAgregarUsuario() {
    document.getElementById('tituloModalUsuario').innerHTML = `
        <i class="fas fa-user-plus"></i> Agregar Nuevo Usuario
    `;
    document.getElementById('formUsuario').reset();
    document.getElementById('usuarioId').value = '';
    document.getElementById('inputRol').value = 'cliente';
    seleccionarRol('cliente');
    
    document.getElementById('modalUsuario').style.display = 'flex';
}

function cerrarModalUsuario() {
    document.getElementById('modalUsuario').style.display = 'none';
}

function seleccionarRol(rol) {
    rolSeleccionado = rol;
    document.getElementById('inputRol').value = rol;
    
    // Actualizar UI
    document.querySelectorAll('.role-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    const rolElement = document.querySelector(`.role-option.${rol}`);
    if (rolElement) {
        rolElement.classList.add('selected');
    }
}

function guardarUsuario() {
    const id = document.getElementById('usuarioId').value;
    const nombre = document.getElementById('inputNombre').value;
    const email = document.getElementById('inputEmail').value;
    const rol = document.getElementById('inputRol').value;
    const password = document.getElementById('inputPassword').value;
    const estado = document.getElementById('inputEstado').value;
    
    if (!nombre || !email || !password || !rol) {
        mostrarToast('Por favor complete todos los campos obligatorios', 'error');
        return;
    }
    
    // Validar email único
    if (id) {
        // Editar: verificar que el email no esté usado por otro usuario
        const otroUsuario = usuarios.find(u => u.email === email && u.id != id);
        if (otroUsuario) {
            mostrarToast('El email ya está registrado por otro usuario', 'error');
            return;
        }
    } else {
        // Crear: verificar que el email no exista
        const existeEmail = usuarios.find(u => u.email === email);
        if (existeEmail) {
            mostrarToast('El email ya está registrado', 'error');
            return;
        }
    }
    
    if (id) {
        // Editar usuario existente
        const index = usuarios.findIndex(u => u.id == id);
        if (index !== -1) {
            usuarios[index] = {
                ...usuarios[index],
                nombre,
                email,
                rol,
                estado,
                limite_eventos: rol === 'cliente' ? 1 : null
            };
        }
    } else {
        // Crear nuevo usuario
        const nuevoUsuario = {
            id: usuarios.length + 1,
            nombre,
            email,
            password,
            rol,
            estado,
            avatar: nombre.substring(0, 2).toUpperCase(),
            fechaRegistro: new Date().toISOString().split('T')[0],
            eventos: 0,
            limite_eventos: rol === 'cliente' ? 1 : null
        };
        usuarios.push(nuevoUsuario);
    }
    
    cerrarModalUsuario();
    cargarUsuarios();
    mostrarToast(`Usuario ${id ? 'actualizado' : 'creado'} correctamente`, 'success');
}

function editarUsuario(usuarioId) {
    const usuario = usuarios.find(u => u.id === usuarioId);
    if (!usuario) return;
    
    document.getElementById('tituloModalUsuario').innerHTML = `
        <i class="fas fa-user-edit"></i> Editar Usuario
    `;
    
    document.getElementById('usuarioId').value = usuario.id;
    document.getElementById('inputNombre').value = usuario.nombre;
    document.getElementById('inputEmail').value = usuario.email;
    document.getElementById('inputEstado').value = usuario.estado;
    document.getElementById('inputPassword').value = ''; // No mostrar password actual
    seleccionarRol(usuario.rol);
    
    document.getElementById('modalUsuario').style.display = 'flex';
}

function editarUsuarioActual() {
    if (!usuarioSeleccionado) return;
    editarUsuario(usuarioSeleccionado.id);
}

function reiniciarPassword(usuarioId) {
    const usuario = usuarios.find(u => u.id === usuarioId);
    if (!usuario) return;
    
    mostrarConfirmacion(
        'Reiniciar Contraseña',
        `¿Estás seguro de reiniciar la contraseña de ${usuario.nombre}?<br><br>Se generará una nueva contraseña y se enviará a ${usuario.email}`,
        () => {
            const nuevaPassword = generarContraseñaAleatoria();
            
            // Actualizar contraseña
            const index = usuarios.findIndex(u => u.id === usuarioId);
            if (index !== -1) {
                usuarios[index].password = nuevaPassword;
            }
            
            // Mostrar la nueva contraseña (en producción, esto se enviaría por email)
            mostrarToast(`Nueva contraseña para ${usuario.nombre}: ${nuevaPassword}<br>Guarda esta contraseña para el usuario.`, 'success');
        }
    );
}

function reiniciarPasswordUsuarioActual() {
    if (!usuarioSeleccionado) return;
    reiniciarPassword(usuarioSeleccionado.id);
}

function eliminarUsuario(usuarioId) {
    const usuario = usuarios.find(u => u.id === usuarioId);
    if (!usuario) return;
    
    // No permitir eliminarse a sí mismo
    const usuarioActual = JSON.parse(localStorage.getItem('titi_usuario_actual') || '{}');
    if (usuarioActual.id === usuarioId) {
        mostrarToast('No puedes eliminarte a ti mismo', 'error');
        return;
    }
    
    // Verificar si el usuario tiene eventos
    const eventosUsuario = eventosPorUsuario[usuarioId] || [];
    if (eventosUsuario.length > 0) {
        mostrarConfirmacion(
            'Eliminar Usuario con Eventos',
            `⚠️ <strong>¡Atención!</strong><br><br>
            ${usuario.nombre} tiene ${eventosUsuario.length} evento(s) activo(s).<br>
            ¿Estás seguro de eliminar este usuario?<br><br>
            <small>Todos sus eventos también serán eliminados.</small>`,
            () => {
                // Eliminar usuario
                usuarios = usuarios.filter(u => u.id !== usuarioId);
                
                // Eliminar sus eventos
                delete eventosPorUsuario[usuarioId];
                
                cargarUsuarios();
                mostrarToast('Usuario y sus eventos eliminados correctamente', 'success');
            },
            true
        );
    } else {
        mostrarConfirmacion(
            'Eliminar Usuario',
            `¿Estás seguro de eliminar a ${usuario.nombre}?<br><br>
            <small>Esta acción no se puede deshacer.</small>`,
            () => {
                usuarios = usuarios.filter(u => u.id !== usuarioId);
                cargarUsuarios();
                mostrarToast('Usuario eliminado correctamente', 'success');
            },
            true
        );
    }
}

function eliminarUsuarioActual() {
    if (!usuarioSeleccionado) return;
    eliminarUsuario(usuarioSeleccionado.id);
}

// Modal crear evento para usuario
function abrirModalCrearEvento() {
    if (!usuarioSeleccionado) return;
    
    // Configurar fecha por defecto (mañana)
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaFormato = manana.toISOString().split('T')[0];
    
    document.getElementById('eventoFecha').value = fechaFormato;
    document.getElementById('eventoHora').value = '18:00';
    document.getElementById('eventoNombre').value = `Evento de ${usuarioSeleccionado.nombre.split(' ')[0]}`;
    
    // Verificar límite si es cliente
    if (usuarioSeleccionado.rol === 'cliente') {
        const eventosUsuario = eventosPorUsuario[usuarioSeleccionado.id] || [];
        const eventosActivos = eventosUsuario.filter(e => e.estado === 'activo').length;
        
        if (eventosActivos >= 1) {
            mostrarToast('Los clientes solo pueden tener 1 evento activo. Este usuario ya tiene el máximo permitido.', 'error');
            return;
        }
    }
    
    document.getElementById('modalCrearEvento').style.display = 'flex';
}

function cerrarModalCrearEvento() {
    document.getElementById('modalCrearEvento').style.display = 'none';
}

function crearEventoParaUsuarioActual() {
    if (!usuarioSeleccionado) return;
    
    const nombre = document.getElementById('eventoNombre').value;
    const fecha = document.getElementById('eventoFecha').value;
    const hora = document.getElementById('eventoHora').value;
    const ubicacion = document.getElementById('eventoUbicacion').value;
    const tipo = document.getElementById('eventoTipo').value;
    const mesas = parseInt(document.getElementById('eventoMesas').value) || 8;
    const sillas = parseInt(document.getElementById('eventoSillas').value) || 8;
    const forma = document.getElementById('eventoForma').value;
    
    if (!nombre || !fecha) {
        mostrarToast('Nombre y fecha son obligatorios', 'error');
        return;
    }
    
    // Crear nuevo evento
    const nuevoEvento = {
        id: Object.values(eventosPorUsuario).flat().length + 1,
        nombre: nombre,
        descripcion: `Evento de tipo ${tipo} creado por administrador`,
        fecha: fecha,
        hora: hora || '18:00',
        ubicacion: ubicacion || 'Sin ubicación',
        tipo: tipo,
        estado: 'activo',
        mesas: mesas,
        sillas: sillas * mesas,
        ocupacion: 0,
        forma: forma,
        creadoPorAdmin: true
    };
    
    // Agregar a los eventos del usuario
    if (!eventosPorUsuario[usuarioSeleccionado.id]) {
        eventosPorUsuario[usuarioSeleccionado.id] = [];
    }
    eventosPorUsuario[usuarioSeleccionado.id].push(nuevoEvento);
    
    // Actualizar contador de eventos del usuario
    const usuarioIndex = usuarios.findIndex(u => u.id === usuarioSeleccionado.id);
    if (usuarioIndex !== -1) {
        usuarios[usuarioIndex].eventos++;
    }
    
    cerrarModalCrearEvento();
    
    // Recargar eventos del usuario
    cargarEventosUsuario(usuarioSeleccionado.id);
    
    // Notificar
    const notificar = document.getElementById('notificarUsuario').checked;
    if (notificar) {
        mostrarToast(`Evento creado y ${notificar ? 'usuario notificado' : ''}`, 'success');
    } else {
        mostrarToast('Evento creado exitosamente', 'success');
    }
}

// Funciones auxiliares
function generarContraseña() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    document.getElementById('inputPassword').value = password;
    document.getElementById('inputPassword').type = 'text';
    
    // Actualizar indicador de fuerza
    const strengthBar = document.querySelector('#passwordStrength .strength-bar');
    const strengthText = document.querySelector('#passwordStrength .strength-text');
    if (strengthBar && strengthText) {
        strengthBar.style.width = '100%';
        strengthBar.style.background = 'linear-gradient(to right, #4CAF50, #2E7D32)';
        strengthText.textContent = 'Fuerza: Fuerte';
    }
}

function generarContraseñaAleatoria() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return password;
}

function mostrarConfirmacion(titulo, mensaje, callback, advertencia = false) {
    document.getElementById('tituloConfirmacion').textContent = titulo;
    document.getElementById('mensajeConfirmacion').innerHTML = mensaje;
    document.getElementById('advertenciaConfirmacion').style.display = advertencia ? 'flex' : 'none';
    
    const modal = document.getElementById('modalConfirmacion');
    const btnConfirmar = document.getElementById('accionConfirmar');
    
    btnConfirmar.onclick = function() {
        if (callback) callback();
        modal.style.display = 'none';
    };
    
    modal.style.display = 'flex';
}

function cerrarModalConfirmacion() {
    document.getElementById('modalConfirmacion').style.display = 'none';
}

function mostrarToast(mensaje, tipo = 'info') {
    // Crear toast si no existe
    let toast = document.getElementById('messageToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'messageToast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = mensaje;
    toast.className = `toast ${tipo} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

// Exponer funciones globales
window.cargarUsuarios = cargarUsuarios;
window.limpiarFiltros = limpiarFiltros;
window.paginaAnterior = paginaAnterior;
window.paginaSiguiente = paginaSiguiente;
window.verEventosUsuario = verEventosUsuario;
window.volverAGestionUsuarios = volverAGestionUsuarios;
window.abrirModalCrearEvento = abrirModalCrearEvento;
window.crearEventoParaUsuarioActual = crearEventoParaUsuarioActual;
window.administrarEvento = administrarEvento;
window.abrirModalAgregarUsuario = abrirModalAgregarUsuario;
window.cerrarModalUsuario = cerrarModalUsuario;
window.seleccionarRol = seleccionarRol;
window.guardarUsuario = guardarUsuario;
window.editarUsuario = editarUsuario;
window.editarUsuarioActual = editarUsuarioActual;
window.reiniciarPassword = reiniciarPassword;
window.reiniciarPasswordUsuarioActual = reiniciarPasswordUsuarioActual;
window.eliminarUsuario = eliminarUsuario;
window.eliminarUsuarioActual = eliminarUsuarioActual;
window.generarContraseña = generarContraseña;
window.togglePassword = function(inputId, button) {
    const input = document.getElementById(inputId);
    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            input.type = 'password';
            button.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }
};
