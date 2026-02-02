// cliente.js - Sistema de mesas completo para cliente con conexión a API

// ===== VARIABLES GLOBALES =====
let eventosCliente = [];
let eventoActual = null;
let mesas = [];
let invitados = [];
let sillaSeleccionada = null;
let zoomLevel = 1;
let usuario = null;
let token = null;
let limiteEventos = null;
let configuracionDisposicion = {
    columnas: 4,
    filas: 2,
    espaciado: 70
};

// URL base de la API (Digital Ocean)
const API_BASE_URL = 'https://titi-invita-app-azhcw.ondigitalocean.app/api';

// ===== ELEMENTOS DOM =====
// (Mantén los mismos que ya tienes)

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Cargar usuario actual y token del almacenamiento
    cargarUsuarioYToken();
    
    if (!usuario || !token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Configurar UI con datos del usuario
    inicializarInterfazUsuario();
    
    // Cargar datos iniciales desde la API
    cargarDatosIniciales();
    
    // Configurar event listeners
    configurarEventListeners();
    
    // Configurar fecha/hora por defecto
    configurarFechaHora();
});

// ===== FUNCIONES DE AUTENTICACIÓN Y CONEXIÓN =====
function cargarUsuarioYToken() {
    usuario = JSON.parse(localStorage.getItem('titi_usuario'));
    token = localStorage.getItem('titi_token');
}

async function verificarSesion() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Sesión expirada');
        }
        return true;
    } catch (error) {
        console.error('Error de sesión:', error);
        mostrarMensaje('Sesión expirada. Redirigiendo al login...', 'error');
        setTimeout(() => {
            localStorage.removeItem('titi_usuario');
            localStorage.removeItem('titi_token');
            window.location.href = 'login.html';
        }, 2000);
        return false;
    }
}

// ===== FUNCIONES PRINCIPALES CONEXIÓN API =====

async function cargarDatosIniciales() {
    if (!await verificarSesion()) return;
    
    try {
        // Cargar eventos del usuario
        const eventosResponse = await fetch(`${API_BASE_URL}/eventos`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (eventosResponse.ok) {
            const data = await eventosResponse.json();
            eventosCliente = data.eventos || [];
        } else {
            // Si falla, usar datos demo
            cargarEventosDemo();
        }
        
        // Actualizar UI
        actualizarListaEventos();
        
        // Si hay eventos, cargar el primero
        if (eventosCliente.length > 0) {
            await cargarEvento(eventosCliente[0].id);
        } else {
            // Mostrar estado vacío
            mostrarEstadoVacio();
        }
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        cargarEventosDemo(); // Fallback a datos demo
        mostrarMensaje('Modo demo activado - Datos locales', 'info');
    }
}

async function cargarEvento(eventoId) {
    if (!await verificarSesion()) return;
    
    try {
        // Cargar evento específico
        const eventoResponse = await fetch(`${API_BASE_URL}/eventos/${eventoId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (eventoResponse.ok) {
            const data = await eventoResponse.json();
            eventoActual = data.evento;
            
            // Cargar mesas del evento
            const mesasResponse = await fetch(`${API_BASE_URL}/eventos/${eventoId}/mesas`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (mesasResponse.ok) {
                const mesasData = await mesasResponse.json();
                mesas = mesasData.mesas || [];
            }
            
            // Cargar invitados del evento
            const invitadosResponse = await fetch(`${API_BASE_URL}/eventos/${eventoId}/invitados`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (invitadosResponse.ok) {
                const invitadosData = await invitadosResponse.json();
                invitados = invitadosData.invitados || [];
            }
            
            // Actualizar UI
            actualizarUIEvento();
            renderizarMesas();
            actualizarListaInvitados();
            actualizarEstadisticas();
            
        } else {
            throw new Error('Evento no encontrado');
        }
        
    } catch (error) {
        console.error('Error cargando evento:', error);
        mostrarMensaje('Error cargando evento', 'error');
    }
}

async function guardarEvento() {
    if (!eventoActual || !await verificarSesion()) return;
    
    try {
        const eventoData = {
            nombre: eventNameInput.value,
            descripcion: eventDescriptionInput.value,
            fecha_evento: eventDateInput.value,
            ubicacion: 'Digital Ocean', // Agrega un campo de ubicación si no existe
            configuracion: {
                mesas: mesas,
                disposicion: configuracionDisposicion,
                fechaActualizacion: new Date().toISOString()
            }
        };
        
        const response = await fetch(`${API_BASE_URL}/eventos/${eventoActual.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventoData)
        });
        
        if (response.ok) {
            const data = await response.json();
            eventoActual = data.evento;
            mostrarMensaje('Evento guardado correctamente', 'success');
        } else {
            throw new Error('Error al guardar');
        }
        
    } catch (error) {
        console.error('Error guardando evento:', error);
        mostrarMensaje('Error guardando evento', 'error');
    }
}

async function crearNuevoEvento() {
    if (!await verificarSesion()) return;
    
    const nombre = document.getElementById('newEventName').value;
    const fecha = document.getElementById('newEventDate').value;
    const hora = document.getElementById('newEventTime').value;
    
    if (!nombre || !fecha) {
        mostrarMensaje('Nombre y fecha son obligatorios', 'error');
        return;
    }
    
    try {
        const eventoData = {
            id_usuario: usuario.id,
            nombre: nombre,
            descripcion: `Evento creado desde Digital Ocean`,
            fecha_evento: fecha,
            ubicacion: 'Digital Ocean',
            estado: 'activo',
            configuracion: {}
        };
        
        const response = await fetch(`${API_BASE_URL}/eventos`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventoData)
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Agregar a la lista local
            eventosCliente.push(data.evento);
            
            // Actualizar selector
            actualizarListaEventos();
            
            // Seleccionar nuevo evento
            eventSelector.value = data.evento.id;
            await cargarEvento(data.evento.id);
            
            // Cerrar modal
            document.getElementById('newEventModal').style.display = 'none';
            document.getElementById('newEventForm').reset();
            
            mostrarMensaje(`Evento "${nombre}" creado`, 'success');
            
        } else {
            throw new Error('Error creando evento');
        }
        
    } catch (error) {
        console.error('Error creando evento:', error);
        mostrarMensaje('Error creando evento', 'error');
    }
}

async function guardarMesas() {
    if (!eventoActual || !await verificarSesion()) return;
    
    try {
        // Actualizar número de mesas y sillas
        eventoActual.mesas = mesas.length;
        if (mesas.length > 0) {
            eventoActual.sillasPorMesa = mesas[0].sillas.length;
            eventoActual.formaMesa = mesas[0].forma;
        }
        
        // Guardar configuración en evento
        if (!eventoActual.configuracion) {
            eventoActual.configuracion = {};
        }
        eventoActual.configuracion.mesas = mesas;
        eventoActual.configuracion.disposicion = configuracionDisposicion;
        eventoActual.configuracion.fechaActualizacion = new Date().toISOString();
        
        // Enviar a la API
        const response = await fetch(`${API_BASE_URL}/eventos/${eventoActual.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                configuracion: eventoActual.configuracion
            })
        });
        
        if (response.ok) {
            mostrarMensaje('Mesas guardadas correctamente', 'success');
        } else {
            throw new Error('Error guardando mesas');
        }
        
    } catch (error) {
        console.error('Error guardando mesas:', error);
        mostrarMensaje('Error guardando mesas', 'error');
    }
}

// ===== FUNCIONES AUXILIARES =====

function actualizarListaEventos() {
    eventSelector.innerHTML = '<option value="">Seleccionar Evento...</option>';
    eventosCliente.forEach(evento => {
        const option = document.createElement('option');
        option.value = evento.id;
        option.textContent = evento.nombre;
        if (evento.estado === 'borrador') {
            option.textContent += ' (Borrador)';
        }
        eventSelector.appendChild(option);
    });
    
    // Actualizar estadísticas
    actualizarEstadisticasEventos();
}

function actualizarUIEvento() {
    if (!eventoActual) return;
    
    currentEventName.textContent = eventoActual.nombre;
    eventNameInput.value = eventoActual.nombre;
    eventDescriptionInput.value = eventoActual.descripcion || '';
    eventDateInput.value = eventoActual.fecha_evento ? eventoActual.fecha_evento.split('T')[0] : '';
    eventTimeInput.value = eventoActual.hora || '18:00';
}

function mostrarEstadoVacio() {
    mesasContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-calendar-plus" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
            <h3>No hay eventos creados</h3>
            <p>Crea tu primer evento para comenzar</p>
            <button class="btn-primary" onclick="document.getElementById('newEventModal').style.display='flex'">
                <i class="fas fa-plus"></i> Crear Primer Evento
            </button>
        </div>
    `;
}

// ===== FUNCIONES DE MESAS (modificadas para guardar en API) =====

function crearMesas() {
    const numMesas = parseInt(numMesasInput.value);
    const sillasPorMesa = parseInt(sillasPorMesaInput.value);
    const formaMesa = formaMesaSelect.value;
    
    // Validaciones
    if (numMesas < 1 || numMesas > 50) {
        mostrarMensaje('El número de mesas debe estar entre 1 y 50', 'error');
        return;
    }
    
    if (sillasPorMesa < 1 || sillasPorMesa > 12) {
        mostrarMensaje('Las sillas por mesa deben estar entre 1 y 12', 'error');
        return;
    }
    
    // Limpiar contenedor
    mesasContainer.innerHTML = '';
    mesas = [];
    
    // Obtener configuración de disposición
    const columnas = parseInt(numColumnasInput.value) || 4;
    const filas = parseInt(numFilasInput.value) || 2;
    const espaciado = parseInt(espaciadoInput.value) || 70;
    
    // Guardar configuración
    configuracionDisposicion = { columnas, filas, espaciado };
    
    // Actualizar CSS del contenedor
    mesasContainer.style.gap = `${espaciado}px`;
    mesasContainer.style.gridTemplateColumns = `repeat(${columnas}, 1fr)`;
    
    // Crear cada mesa
    for (let i = 0; i < numMesas; i++) {
        const mesa = {
            id: i + 1,
            nombre: `Mesa ${i + 1}`,
            forma: formaMesa,
            sillas: []
        };
        
        // Crear sillas para esta mesa
        for (let j = 0; j < sillasPorMesa; j++) {
            mesa.sillas.push({
                id: j + 1,
                estado: 'sin-asignar',
                nombre: '',
                invitadoId: null
            });
        }
        
        mesas.push(mesa);
        crearMesaVisual(mesa);
    }
    
    // Actualizar estadísticas
    actualizarEstadisticas();
    
    // Guardar en API
    guardarMesas();
    
    mostrarMensaje(`${numMesas} mesas creadas con éxito`, 'success');
}

async function actualizarSilla(mesaId, sillaId, invitadoId, nuevoEstado) {
    const mesa = mesas.find(m => m.id === parseInt(mesaId));
    if (!mesa) return;
    
    const silla = mesa.sillas.find(s => s.id === parseInt(sillaId));
    if (!silla) return;
    
    // Actualizar silla
    silla.estado = nuevoEstado;
    silla.invitadoId = invitadoId;
    
    // Buscar invitado si existe
    let invitado = null;
    if (invitadoId) {
        invitado = invitados.find(i => i.id === invitadoId);
        silla.nombre = invitado ? invitado.nombre : '';
    } else {
        silla.nombre = '';
    }
    
    // Actualizar visual de la silla
    const sillaElement = document.querySelector(`.silla[data-mesa-id="${mesaId}"][data-silla-id="${sillaId}"]`);
    if (sillaElement) {
        sillaElement.className = `silla estado-${nuevoEstado}`;
        if (silla.nombre && showNamesCheckbox.checked) {
            sillaElement.setAttribute('title', silla.nombre);
        } else {
            sillaElement.removeAttribute('title');
        }
    }
    
    // Actualizar invitado
    if (invitado) {
        invitado.idMesa = parseInt(mesaId);
        invitado.idSilla = parseInt(sillaId);
        invitado.estado = nuevoEstado;
        
        // Guardar invitado en API
        await actualizarInvitadoAPI(invitado);
    }
    
    // Actualizar UI
    actualizarEstadisticas();
    actualizarListaInvitados();
    
    // Guardar mesas en API
    guardarMesas();
    
    mostrarMensaje(`Silla ${sillaId} de ${mesa.nombre} actualizada`, 'success');
}

async function actualizarInvitadoAPI(invitado) {
    if (!await verificarSesion() || !eventoActual) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/eventos/${eventoActual.id}/invitados/${invitado.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id_mesa: invitado.idMesa,
                silla_numero: invitado.idSilla,
                estado: invitado.estado
            })
        });
        
        return response.ok;
    } catch (error) {
        console.error('Error actualizando invitado:', error);
        return false;
    }
}

// ===== DATOS DE DEMO (fallback) =====

function cargarEventosDemo() {
    eventosCliente = [
        {
            id: 1,
            nombre: 'Boda de Ana y Carlos',
            descripcion: 'Celebración en jardín botánico',
            fecha_evento: '2024-06-15',
            hora: '18:00',
            ubicacion: 'Jardín Botánico',
            estado: 'activo',
            mesas: 8,
            sillasPorMesa: 8,
            formaMesa: 'rectangular',
            configuracion: {}
        }
    ];
    
    // Generar mesas demo
    mesas = [];
    for (let i = 0; i < 8; i++) {
        const mesa = {
            id: i + 1,
            nombre: `Mesa ${i + 1}`,
            forma: 'rectangular',
            sillas: []
        };
        
        for (let j = 0; j < 8; j++) {
            mesa.sillas.push({
                id: j + 1,
                estado: 'sin-asignar',
                nombre: '',
                invitadoId: null
            });
        }
        
        mesas.push(mesa);
    }
    
    // Invitados demo
    invitados = [
        { id: 1, nombre: 'Ana López', email: 'ana@email.com', telefono: '555-0101', estado: 'confirmado', idMesa: 1, idSilla: 1 },
        { id: 2, nombre: 'Carlos Ruiz', email: 'carlos@email.com', telefono: '555-0102', estado: 'confirmado', idMesa: 1, idSilla: 2 }
    ];
}

// ===== FUNCIONES RESTANTES (mantén las que ya tienes) =====

// Las siguientes funciones se mantienen igual que en tu código original:
// - inicializarInterfazUsuario()
// - configurarEventListeners()
// - crearMesaVisual()
// - calcularPosicionesSillas()
// - renderizarMesas()
// - editarNombreMesa()
// - guardarNombreMesa()
// - seleccionarSilla()
// - mostrarModalSilla()
// - cerrarModal()
// - actualizarEstadisticas()
// - cargarInvitadosDemo()
// - actualizarListaInvitados()
// - configurarFechaHora()
// - buscarEnMesas()
// - agregarInvitado()
// - mostrarMensaje()

// ===== INICIALIZACIÓN DE FUNCIONES =====

function inicializarInterfazUsuario() {
    // Configurar avatar
    userAvatar.textContent = usuario.avatar || usuario.nombre.substring(0, 2).toUpperCase();
    userName.textContent = usuario.nombre;
    
    // Configurar rol y badge
    const roleNames = {
        'admin': 'Administrador',
        'cliente': 'Cliente',
        'organizador': 'Organizador'
    };
    const roleColors = {
        'admin': 'admin',
        'cliente': 'cliente',
        'organizador': 'organizador'
    };
    
    userRole.textContent = roleNames[usuario.rol] || usuario.rol;
    roleBadge.textContent = usuario.rol.toUpperCase();
    roleBadge.className = `role-badge ${roleColors[usuario.rol]}`;
}

function configurarEventListeners() {
    // Selector de evento
    eventSelector.addEventListener('change', async function() {
        if (this.value) {
            await cargarEvento(parseInt(this.value));
        }
    });
    
    // Botón crear mesas
    btnCrearMesas.addEventListener('click', crearMesas);
    
    // Botón guardar evento
    btnGuardarEvento.addEventListener('click', guardarEvento);
    
    // Botón nuevo evento
    newEventBtn.addEventListener('click', function() {
        document.getElementById('newEventModal').style.display = 'flex';
    });
    
    // Cerrar modal nuevo evento
    document.querySelector('#newEventModal .modal-close').addEventListener('click', function() {
        document.getElementById('newEventModal').style.display = 'none';
    });
    
    document.querySelector('#newEventModal .modal-cancel').addEventListener('click', function() {
        document.getElementById('newEventModal').style.display = 'none';
    });
    
    // Crear evento
    document.getElementById('createEventBtn').addEventListener('click', crearNuevoEvento);
    
    // Cerrar sesión
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('titi_usuario');
        localStorage.removeItem('titi_token');
        window.location.href = 'login.html';
    });
    
    // Zoom
    zoomInBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (zoomLevel < 2) {
            zoomLevel += 0.1;
            aplicarZoom();
        }
    });
    
    zoomOutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (zoomLevel > 0.5) {
            zoomLevel -= 0.1;
            aplicarZoom();
        }
    });
    
    resetViewBtn.addEventListener('click', function(e) {
        e.preventDefault();
        zoomLevel = 1;
        aplicarZoom();
    });
    
    // Mostrar nombres
    showNamesCheckbox.addEventListener('change', function() {
        renderizarMesas();
    });
    
    // Búsqueda de invitados
    guestSearch.addEventListener('input', actualizarListaInvitados);
    guestFilter.addEventListener('change', actualizarListaInvitados);
    
    // Agregar invitado
    addGuestBtn.addEventListener('click', function() {
        agregarInvitado();
    });
    
    // Búsqueda en visualización
    searchGuests.addEventListener('input', function() {
        buscarEnMesas(this.value);
    });
    
    // Configuración de disposición
    numColumnasInput.addEventListener('change', actualizarDisposicion);
    numFilasInput.addEventListener('change', actualizarDisposicion);
    espaciadoInput.addEventListener('change', actualizarDisposicion);
}

// Asegúrate de mantener todas las demás funciones que ya tienes...
// Si necesitas alguna función específica, dime y te la proporciono.
