// cliente.js - Sistema de mesas completo para cliente con conexión REAL a Digital Ocean

// ===== VARIABLES GLOBALES =====
let eventosCliente = [];
let eventoActual = null;
let mesas = [];
let invitados = [];
let sillaSeleccionada = null;
let zoomLevel = 1;
let usuario = null;
let token = null;
let configuracionDisposicion = {
    columnas: 4,
    filas: 2,
    espaciado: 70
};
let autoSaveInterval = null;

// URL base de la API (Digital Ocean)
const API_BASE_URL = window.location.origin + '/api';

// ===== ELEMENTOS DOM =====
const eventSelector = document.getElementById('eventSelector');
const currentEventName = document.getElementById('currentEventName');
const eventNameInput = document.getElementById('eventName');
const eventDateInput = document.getElementById('eventDate');
const eventTimeInput = document.getElementById('eventTime');
const eventDescriptionInput = document.getElementById('eventDescription');
const numMesasInput = document.getElementById('numMesas');
const sillasPorMesaInput = document.getElementById('sillasPorMesa');
const formaMesaSelect = document.getElementById('formaMesa');
const btnCrearMesas = document.getElementById('btnCrearMesas');
const btnGuardarEvento = document.getElementById('btnGuardarEvento');
const btnFinalizarEvento = document.getElementById('btnFinalizarEvento');
const mesasContainer = document.getElementById('mesasContainer');
const newEventBtn = document.getElementById('newEventBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const roleBadge = document.getElementById('roleBadge');
const searchGuests = document.getElementById('searchGuests');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const resetViewBtn = document.getElementById('resetViewBtn');
const showNamesCheckbox = document.getElementById('showNames');
const autoSaveCheckbox = document.getElementById('autoSave');
const numColumnasInput = document.getElementById('numColumnas');
const numFilasInput = document.getElementById('numFilas');
const espaciadoInput = document.getElementById('espaciado');
const statTotalMesas = document.getElementById('statTotalMesas');
const statTotalSillas = document.getElementById('statTotalSillas');
const statSillasOcupadas = document.getElementById('statSillasOcupadas');
const statPorcentajeOcupacion = document.getElementById('statPorcentajeOcupacion');
const ocupacionBar = document.getElementById('ocupacionBar');
const totalEventsCount = document.getElementById('totalEventsCount');
const activeEventsCount = document.getElementById('activeEventsCount');
const draftEventsCount = document.getElementById('draftEventsCount');
const guestsList = document.getElementById('guestsList');
const guestSearch = document.getElementById('guestSearch');
const guestFilter = document.getElementById('guestFilter');
const addGuestBtn = document.getElementById('addGuestBtn');
const guestDetails = document.getElementById('guestDetails');

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Titi Invita Cliente...');
    
    // Cargar usuario y token
    cargarUsuarioYToken();
    
    if (!usuario || !token) {
        console.log('❌ No hay sesión activa');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('✅ Usuario:', usuario.nombre);
    
    // Configurar UI
    inicializarInterfazUsuario();
    
    // Configurar eventos
    configurarEventListeners();
    
    // Cargar datos
    cargarDatosIniciales();
    
    // Iniciar auto-save
    iniciarAutoSave();
});

// ===== FUNCIONES DE AUTENTICACIÓN =====
function cargarUsuarioYToken() {
    usuario = JSON.parse(localStorage.getItem('titi_usuario'));
    token = localStorage.getItem('titi_token');
    
    if (!usuario || !token) {
        usuario = JSON.parse(sessionStorage.getItem('titi_usuario'));
        token = sessionStorage.getItem('titi_token');
    }
}

async function verificarSesion() {
    try {
        const response = await fetch(`${API_BASE_URL}/protegido`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Sesión expirada');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error de sesión:', error);
        
        mostrarMensaje('Sesión expirada. Redirigiendo al login...', 'error');
        setTimeout(() => {
            localStorage.removeItem('titi_usuario');
            localStorage.removeItem('titi_token');
            sessionStorage.removeItem('titi_usuario');
            sessionStorage.removeItem('titi_token');
            window.location.href = 'login.html';
        }, 2000);
        
        return false;
    }
}

// ===== FUNCIONES PRINCIPALES (API) =====
async function cargarDatosIniciales() {
    console.log('📥 Cargando datos...');
    
    if (!await verificarSesion()) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/eventos-usuario`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            eventosCliente = data.eventos || [];
            console.log(`✅ ${eventosCliente.length} eventos cargados`);
            
            actualizarListaEventos();
            actualizarEstadisticasEventos();
            
            if (eventosCliente.length > 0) {
                await cargarEvento(eventosCliente[0].id);
            } else {
                mostrarEstadoVacio();
            }
        } else {
            throw new Error(data.error || 'Error cargando eventos');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('Error cargando datos. Usando modo demo.', 'warning');
        
        // Modo demo
        cargarEventosDemo();
        actualizarListaEventos();
        actualizarEstadisticasEventos();
        
        if (eventosCliente.length > 0) {
            cargarEvento(eventosCliente[0].id);
        }
    }
}

async function cargarEvento(eventoId) {
    console.log(`📥 Cargando evento ${eventoId}...`);
    
    if (!await verificarSesion()) return;
    
    try {
        // Cargar evento
        const eventoResponse = await fetch(`${API_BASE_URL}/eventos/${eventoId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!eventoResponse.ok) throw new Error(`Error HTTP: ${eventoResponse.status}`);
        
        const eventoData = await eventoResponse.json();
        
        if (!eventoData.success) throw new Error(eventoData.error || 'Error cargando evento');
        
        eventoActual = eventoData.evento;
        console.log('✅ Evento:', eventoActual.nombre);
        
        // Cargar mesas
        const mesasResponse = await fetch(`${API_BASE_URL}/eventos/${eventoId}/mesas`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (mesasResponse.ok) {
            const mesasData = await mesasResponse.json();
            mesas = mesasData.mesas || [];
            
            // Parsear sillas si son string
            mesas.forEach(mesa => {
                if (typeof mesa.sillas === 'string') {
                    try {
                        mesa.sillas = JSON.parse(mesa.sillas);
                    } catch (e) {
                        mesa.sillas = [];
                    }
                }
            });
        } else {
            mesas = [];
        }
        
        // Cargar invitados
        const invitadosResponse = await fetch(`${API_BASE_URL}/eventos/${eventoId}/invitados`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (invitadosResponse.ok) {
            const invitadosData = await invitadosResponse.json();
            invitados = invitadosData.invitados || [];
        } else {
            invitados = [];
        }
        
        // Actualizar UI
        actualizarUIEvento();
        renderizarMesas();
        actualizarListaInvitados();
        actualizarEstadisticas();
        
    } catch (error) {
        console.error('❌ Error cargando evento:', error);
        mostrarMensaje('Error cargando evento: ' + error.message, 'error');
    }
}

async function guardarEvento() {
    console.log('💾 Guardando evento...');
    
    if (!eventoActual || !await verificarSesion()) return;
    
    try {
        const eventoData = {
            nombre: eventNameInput.value,
            descripcion: eventDescriptionInput.value,
            fecha_evento: eventDateInput.value,
            ubicacion: 'Digital Ocean',
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
        
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        
        const data = await response.json();
        
        if (data.success) {
            eventoActual = data.evento;
            currentEventName.textContent = eventoActual.nombre;
            
            const option = eventSelector.querySelector(`option[value="${eventoActual.id}"]`);
            if (option) option.textContent = eventoActual.nombre;
            
            mostrarMensaje('✅ Evento guardado', 'success');
            await guardarMesas();
            
        } else {
            throw new Error(data.error || 'Error guardando evento');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

async function crearNuevoEvento() {
    console.log('➕ Creando evento...');
    
    if (!await verificarSesion()) return;
    
    const nombre = document.getElementById('newEventName').value;
    const fecha = document.getElementById('newEventDate').value;
    const hora = document.getElementById('newEventTime').value;
    const ubicacion = document.getElementById('newEventLocation').value;
    
    if (!nombre || !fecha) {
        mostrarMensaje('Nombre y fecha son obligatorios', 'error');
        return;
    }
    
    try {
        const eventoData = {
            nombre: nombre,
            descripcion: `Evento creado desde Digital Ocean`,
            fecha_evento: fecha,
            ubicacion: ubicacion || 'Digital Ocean',
            estado: 'activo'
        };
        
        const response = await fetch(`${API_BASE_URL}/eventos`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(eventoData)
        });
        
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        
        const data = await response.json();
        
        if (data.success) {
            eventosCliente.push(data.evento);
            actualizarListaEventos();
            eventSelector.value = data.evento.id;
            await cargarEvento(data.evento.id);
            
            document.getElementById('newEventModal').style.display = 'none';
            document.getElementById('newEventForm').reset();
            
            mostrarMensaje(`✅ Evento "${nombre}" creado`, 'success');
            
        } else {
            throw new Error(data.error || 'Error creando evento');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('Error: ' + error.message, 'error');
    }
}

async function guardarMesas() {
    console.log('💾 Guardando mesas...');
    
    if (!eventoActual || !await verificarSesion()) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/eventos/${eventoActual.id}/mesas`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mesas: mesas })
        });
        
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Mesas guardadas:', data.count);
            return true;
        } else {
            throw new Error(data.error || 'Error guardando mesas');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('Error guardando mesas: ' + error.message, 'error');
        return false;
    }
}

// ===== FUNCIONES AUXILIARES =====
function inicializarInterfazUsuario() {
    userAvatar.textContent = usuario.avatar || usuario.nombre.substring(0, 2).toUpperCase();
    userName.textContent = usuario.nombre;
    
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
}

function actualizarUIEvento() {
    if (!eventoActual) return;
    
    currentEventName.textContent = eventoActual.nombre;
    eventNameInput.value = eventoActual.nombre;
    eventDescriptionInput.value = eventoActual.descripcion || '';
    
    if (eventoActual.fecha_evento) {
        eventDateInput.value = eventoActual.fecha_evento.split('T')[0];
    }
    
    if (eventoActual.configuracion && eventoActual.configuracion.disposicion) {
        configuracionDisposicion = eventoActual.configuracion.disposicion;
        numColumnasInput.value = configuracionDisposicion.columnas || 4;
        numFilasInput.value = configuracionDisposicion.filas || 2;
        espaciadoInput.value = configuracionDisposicion.espaciado || 70;
        
        mesasContainer.style.gap = `${configuracionDisposicion.espaciado}px`;
        mesasContainer.style.gridTemplateColumns = `repeat(${configuracionDisposicion.columnas}, 1fr)`;
    }
}

function mostrarEstadoVacio() {
    mesasContainer.innerHTML = `
        <div style="text-align: center; padding: 50px; color: #666; width: 100%;">
            <i class="fas fa-calendar-plus" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
            <h3>No hay eventos creados</h3>
            <p>Crea tu primer evento para comenzar</p>
            <button class="btn-primary" onclick="document.getElementById('newEventModal').style.display='flex'" 
                    style="margin-top: 20px; padding: 10px 20px;">
                <i class="fas fa-plus"></i> Crear Primer Evento
            </button>
        </div>
    `;
}

// ===== FUNCIONES DE MESAS =====
function crearMesas() {
    const numMesas = parseInt(numMesasInput.value);
    const sillasPorMesa = parseInt(sillasPorMesaInput.value);
    const formaMesa = formaMesaSelect.value;
    
    if (numMesas < 1 || numMesas > 50) {
        mostrarMensaje('El número de mesas debe estar entre 1 y 50', 'error');
        return;
    }
    
    if (sillasPorMesa < 1 || sillasPorMesa > 12) {
        mostrarMensaje('Las sillas por mesa deben estar entre 1 y 12', 'error');
        return;
    }
    
    mesasContainer.innerHTML = '';
    mesas = [];
    
    const columnas = parseInt(numColumnasInput.value) || 4;
    const filas = parseInt(numFilasInput.value) || 2;
    const espaciado = parseInt(espaciadoInput.value) || 70;
    
    configuracionDisposicion = { columnas, filas, espaciado };
    
    mesasContainer.style.gap = `${espaciado}px`;
    mesasContainer.style.gridTemplateColumns = `repeat(${columnas}, 1fr)`;
    
    for (let i = 0; i < numMesas; i++) {
        const mesa = {
            id: i + 1,
            nombre: `Mesa ${i + 1}`,
            forma: formaMesa,
            sillas: []
        };
        
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
    
    actualizarEstadisticas();
    guardarMesas();
    mostrarMensaje(`${numMesas} mesas creadas con éxito`, 'success');
}

async function guardarNombreMesa(mesaId, nuevoNombre, elementoInfo) {
    const mesa = mesas.find(m => m.id === mesaId);
    if (mesa) {
        mesa.nombre = nuevoNombre || `Mesa ${mesaId}`;
        elementoInfo.textContent = `${mesa.nombre} (${mesa.sillas.length} sillas)`;
        
        const mesaGrafica = elementoInfo.nextElementSibling;
        if (mesaGrafica && mesaGrafica.classList.contains('mesa-grafica')) {
            mesaGrafica.textContent = mesa.nombre;
        }
        
        await guardarMesas();
        actualizarListaInvitados();
        mostrarMensaje(`Nombre de mesa actualizado: ${mesa.nombre}`, 'success');
    }
}

async function actualizarSilla(mesaId, sillaId, invitadoId, nuevoEstado) {
    const mesa = mesas.find(m => m.id === parseInt(mesaId));
    if (!mesa) return;
    
    const silla = mesa.sillas.find(s => s.id === parseInt(sillaId));
    if (!silla) return;
    
    silla.estado = nuevoEstado;
    silla.invitadoId = invitadoId;
    
    let invitado = null;
    if (invitadoId) {
        invitado = invitados.find(i => i.id === invitadoId);
        silla.nombre = invitado ? invitado.nombre : '';
    } else {
        silla.nombre = '';
    }
    
    const sillaElement = document.querySelector(`.silla[data-mesa-id="${mesaId}"][data-silla-id="${sillaId}"]`);
    if (sillaElement) {
        sillaElement.className = `silla estado-${nuevoEstado}`;
        if (silla.nombre && showNamesCheckbox.checked) {
            sillaElement.setAttribute('title', silla.nombre);
        } else {
            sillaElement.removeAttribute('title');
        }
    }
    
    if (invitado) {
        invitado.id_mesa = parseInt(mesaId);
        invitado.silla_numero = parseInt(sillaId);
        invitado.estado = nuevoEstado;
        await actualizarInvitadoAPI(invitado);
    }
    
    actualizarEstadisticas();
    actualizarListaInvitados();
    guardarMesas();
    
    mostrarMensaje(`Silla ${sillaId} de ${mesa.nombre} actualizada`, 'success');
}

async function actualizarInvitadoAPI(invitado) {
    if (!await verificarSesion() || !eventoActual) return false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/eventos/${eventoActual.id}/invitados/${invitado.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id_mesa: invitado.id_mesa,
                silla_numero: invitado.silla_numero,
                estado: invitado.estado
            })
        });
        
        return response.ok;
    } catch (error) {
        console.error('Error actualizando invitado:', error);
        return false;
    }
}

// ===== FUNCIONES DE RENDERIZADO =====
function crearMesaVisual(mesa) {
    const mesaElement = document.createElement('div');
    mesaElement.className = 'mesa';
    mesaElement.dataset.id = mesa.id;
    mesaElement.style.transform = `scale(${zoomLevel})`;
    mesaElement.style.transition = 'transform 0.3s ease';
    
    const mesaInfo = document.createElement('div');
    mesaInfo.className = 'mesa-info';
    mesaInfo.textContent = `${mesa.nombre} (${mesa.sillas.length} sillas)`;
    mesaInfo.addEventListener('click', function() {
        editarNombreMesa(mesa.id, mesaInfo);
    });
    mesaElement.appendChild(mesaInfo);
    
    const mesaGrafica = document.createElement('div');
    mesaGrafica.className = `mesa-grafica mesa-${mesa.forma}`;
    mesaGrafica.textContent = mesa.nombre;
    mesaElement.appendChild(mesaGrafica);
    
    const sillasContainer = document.createElement('div');
    sillasContainer.className = `sillas-container ${mesa.forma}-sillas`;
    
    const posiciones = calcularPosicionesSillas(mesa.sillas.length, mesa.forma);
    
    mesa.sillas.forEach((silla, index) => {
        const sillaElement = document.createElement('div');
        sillaElement.className = `silla estado-${silla.estado}`;
        sillaElement.dataset.mesaId = mesa.id;
        sillaElement.dataset.sillaId = silla.id;
        sillaElement.textContent = silla.id;
        
        if (silla.nombre && showNamesCheckbox.checked) {
            sillaElement.setAttribute('title', silla.nombre);
        }
        
        const pos = posiciones[index];
        if (pos) {
            sillaElement.style.left = `calc(${pos.x}% - 16px)`;
            sillaElement.style.top = `calc(${pos.y}% - 21px)`;
        }
        
        sillaElement.addEventListener('click', function(e) {
            e.stopPropagation();
            seleccionarSilla(mesa.id, silla.id);
        });
        
        sillasContainer.appendChild(sillaElement);
    });
    
    mesaElement.appendChild(sillasContainer);
    mesasContainer.appendChild(mesaElement);
}

function renderizarMesas() {
    mesasContainer.innerHTML = '';
    mesas.forEach(mesa => {
        crearMesaVisual(mesa);
    });
}

// ===== FUNCIONES DE INVITADOS =====
async function agregarInvitado() {
    const nombre = prompt('Nombre del invitado:');
    if (!nombre) return;
    
    const email = prompt('Email (opcional):');
    const telefono = prompt('Teléfono (opcional):');
    
    if (!await verificarSesion() || !eventoActual) return;
    
    try {
        const invitadoData = {
            nombre: nombre,
            email: email || null,
            telefono: telefono || null,
            estado: 'pendiente'
        };
        
        const response = await fetch(`${API_BASE_URL}/eventos/${eventoActual.id}/invitados`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(invitadoData)
        });
        
        if (!response.ok) throw new Error('Error HTTP');
        
        const data = await response.json();
        
        if (data.success) {
            invitados.push(data.invitado);
            actualizarListaInvitados();
            mostrarMensaje(`✅ Invitado "${nombre}" agregado`, 'success');
        } else {
            throw new Error(data.error || 'Error agregando invitado');
        }
        
    } catch (error) {
        console.error('Error agregando invitado:', error);
        mostrarMensaje('Error agregando invitado', 'error');
    }
}

function actualizarListaInvitados() {
    if (!guestsList) return;
    
    const searchTerm = guestSearch?.value.toLowerCase() || '';
    const filterValue = guestFilter?.value || 'all';
    
    let invitadosFiltrados = invitados.filter(invitado => {
        const matchesSearch = 
            invitado.nombre.toLowerCase().includes(searchTerm) ||
            (invitado.email && invitado.email.toLowerCase().includes(searchTerm));
        
        const matchesFilter = 
            filterValue === 'all' ||
            (filterValue === 'assigned' && invitado.id_mesa) ||
            (filterValue === 'unassigned' && !invitado.id_mesa) ||
            (filterValue === 'confirmed' && invitado.estado === 'confirmado');
        
        return matchesSearch && matchesFilter;
    });
    
    guestsList.innerHTML = invitadosFiltrados.map(invitado => {
        const mesaInfo = invitado.id_mesa ? 
            `Mesa ${invitado.id_mesa}, Silla ${invitado.silla_numero}` : 
            'Sin asignar';
        
        return `
            <div class="guest-item" data-id="${invitado.id}">
                <div class="guest-item-header">
                    <div class="guest-name">${invitado.nombre}</div>
                    <div class="guest-status status-${invitado.estado}">${invitado.estado}</div>
                </div>
                <div class="guest-details">
                    <span>${invitado.email || 'Sin email'}</span>
                    <span>${mesaInfo}</span>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.guest-item').forEach(item => {
        item.addEventListener('click', function() {
            const invitadoId = parseInt(this.dataset.id);
            mostrarDetallesInvitado(invitadoId);
        });
    });
}

// ===== FUNCIONES DE UI =====
function configurarEventListeners() {
    // Eventos
    eventSelector?.addEventListener('change', async function() {
        if (this.value) await cargarEvento(parseInt(this.value));
    });
    
    btnCrearMesas?.addEventListener('click', crearMesas);
    btnGuardarEvento?.addEventListener('click', guardarEvento);
    
    newEventBtn?.addEventListener('click', function() {
        document.getElementById('newEventModal').style.display = 'flex';
    });
    
    document.querySelector('#newEventModal .modal-close')?.addEventListener('click', function() {
        document.getElementById('newEventModal').style.display = 'none';
    });
    
    document.querySelector('#newEventModal .modal-cancel')?.addEventListener('click', function() {
        document.getElementById('newEventModal').style.display = 'none';
    });
    
    document.getElementById('createEventBtn')?.addEventListener('click', crearNuevoEvento);
    
    // Logout
    logoutBtn?.addEventListener('click', function() {
        localStorage.removeItem('titi_usuario');
        localStorage.removeItem('titi_token');
        sessionStorage.removeItem('titi_usuario');
        sessionStorage.removeItem('titi_token');
        window.location.href = 'login.html';
    });
    
    // Zoom
    zoomInBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        if (zoomLevel < 2) {
            zoomLevel += 0.1;
            aplicarZoom();
        }
    });
    
    zoomOutBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        if (zoomLevel > 0.5) {
            zoomLevel -= 0.1;
            aplicarZoom();
        }
    });
    
    resetViewBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        zoomLevel = 1;
        aplicarZoom();
    });
    
    // Mostrar nombres
    showNamesCheckbox?.addEventListener('change', function() {
        renderizarMesas();
    });
    
    // Auto-save
    autoSaveCheckbox?.addEventListener('change', iniciarAutoSave);
    
    // Invitados
    guestSearch?.addEventListener('input', actualizarListaInvitados);
    guestFilter?.addEventListener('change', actualizarListaInvitados);
    addGuestBtn?.addEventListener('click', agregarInvitado);
    
    // Búsqueda
    searchGuests?.addEventListener('input', function() {
        buscarEnMesas(this.value);
    });
    
    // Disposición
    numColumnasInput?.addEventListener('change', actualizarDisposicion);
    numFilasInput?.addEventListener('change', actualizarDisposicion);
    espaciadoInput?.addEventListener('change', actualizarDisposicion);
}

function mostrarMensaje(mensaje, tipo = 'info') {
    const toast = document.getElementById('messageToast');
    if (!toast) {
        console.log(`[${tipo}] ${mensaje}`);
        return;
    }
    
    toast.textContent = mensaje;
    toast.className = `toast ${tipo} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function actualizarEstadisticas() {
    let totalSillas = 0;
    let sillasOcupadas = 0;
    
    mesas.forEach(mesa => {
        totalSillas += mesa.sillas.length;
        mesa.sillas.forEach(silla => {
            if (silla.estado !== 'sin-asignar') sillasOcupadas++;
        });
    });
    
    const porcentaje = totalSillas > 0 ? Math.round((sillasOcupadas / totalSillas) * 100) : 0;
    
    if (statTotalMesas) statTotalMesas.textContent = mesas.length;
    if (statTotalSillas) statTotalSillas.textContent = totalSillas;
    if (statSillasOcupadas) statSillasOcupadas.textContent = sillasOcupadas;
    if (statPorcentajeOcupacion) statPorcentajeOcupacion.textContent = `${porcentaje}%`;
    if (ocupacionBar) ocupacionBar.style.width = `${porcentaje}%`;
}

function actualizarEstadisticasEventos() {
    const total = eventosCliente.length;
    const activos = eventosCliente.filter(e => e.estado === 'activo').length;
    const borradores = eventosCliente.filter(e => e.estado === 'borrador').length;
    
    if (totalEventsCount) totalEventsCount.textContent = total;
    if (activeEventsCount) activeEventsCount.textContent = activos;
    if (draftEventsCount) draftEventsCount.textContent = borradores;
}

function iniciarAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    
    if (autoSaveCheckbox && autoSaveCheckbox.checked) {
        autoSaveInterval = setInterval(async () => {
            if (eventoActual && mesas.length > 0) {
                try {
                    await guardarMesas();
                    console.log('💾 Auto-save ejecutado');
                } catch (error) {
                    console.error('Error en auto-save:', error);
                }
            }
        }, 30000);
    }
}

// ===== FUNCIONES DE POSICIONAMIENTO =====
function calcularPosicionesSillas(numSillas, forma) {
    const posiciones = [];
    
    if (forma === 'rectangular' || forma === 'cuadrada') {
        const anchoContenedor = 100;
        const sillasLadosCortos = 2;
        const sillasRestantes = Math.max(0, numSillas - sillasLadosCortos);
        const sillasPorLadoLargo = Math.floor(sillasRestantes / 2);
        const margenLateral = 20;
        const margenVertical = 15;
        
        posiciones.push({x: -5, y: 50});
        if (numSillas >= 2) posiciones.push({x: anchoContenedor + 5, y: 50});
        
        if (sillasPorLadoLargo > 0) {
            const distancia = anchoContenedor - (margenLateral * 2);
            const divisor = Math.max(sillasPorLadoLargo - 1, 1);
            
            for (let i = 0; i < sillasPorLadoLargo; i++) {
                const posRelativa = (i * (distancia / divisor));
                posiciones.push({x: margenLateral + posRelativa, y: margenVertical});
            }
            
            for (let i = 0; i < sillasPorLadoLargo; i++) {
                const posRelativa = (i * (distancia / divisor));
                posiciones.push({x: margenLateral + posRelativa, y: anchoContenedor - margenVertical});
            }
        }
        
        while (posiciones.length > numSillas) posiciones.pop();
        
    } else if (forma === 'circular') {
        const centroX = 50;
        const centroY = 50;
        const radio = 75;
        
        for (let i = 0; i < numSillas; i++) {
            const angulo = (2 * Math.PI / numSillas) * i;
            posiciones.push({
                x: centroX + radio * Math.cos(angulo),
                y: centroY + radio * Math.sin(angulo)
            });
        }
    }
    
    return posiciones;
}

function aplicarZoom() {
    document.querySelectorAll('.mesa').forEach(mesa => {
        mesa.style.transform = `scale(${zoomLevel})`;
    });
}

function actualizarDisposicion() {
    const columnas = parseInt(numColumnasInput.value) || 4;
    const filas = parseInt(numFilasInput.value) || 2;
    const espaciado = parseInt(espaciadoInput.value) || 70;
    
    configuracionDisposicion = { columnas, filas, espaciado };
    
    mesasContainer.style.gap = `${espaciado}px`;
    mesasContainer.style.gridTemplateColumns = `repeat(${columnas}, 1fr)`;
    
    if (mesas.length > 0) renderizarMesas();
    
    mostrarMensaje(`Disposición actualizada: ${columnas}×${filas}`, 'info');
}

// ===== FUNCIONES DEMO =====
function cargarEventosDemo() {
    eventosCliente = [
        {
            id: 1,
            nombre: 'Boda de Ana y Carlos',
            descripcion: 'Celebración en jardín botánico',
            fecha_evento: '2024-06-15',
            ubicacion: 'Jardín Botánico',
            estado: 'activo',
            configuracion: {}
        }
    ];
    
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
    
    invitados = [
        { id: 1, nombre: 'Ana López', email: 'ana@email.com', estado: 'confirmado', id_mesa: 1, silla_numero: 1 },
        { id: 2, nombre: 'Carlos Ruiz', email: 'carlos@email.com', estado: 'confirmado', id_mesa: 1, silla_numero: 2 }
    ];
}

// ===== FUNCIONES QUE USAN MODALES =====
function editarNombreMesa(mesaId, elementoInfo) {
    const mesa = mesas.find(m => m.id === mesaId);
    if (!mesa) return;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-mesa-input';
    input.value = mesa.nombre;
    input.style.cssText = `
        width: 100%;
        padding: 5px;
        border: 1px solid #4CAF50;
        border-radius: 4px;
        text-align: center;
        font-weight: bold;
    `;
    
    elementoInfo.innerHTML = '';
    elementoInfo.appendChild(input);
    input.focus();
    
    const guardar = () => guardarNombreMesa(mesaId, input.value, elementoInfo);
    
    input.addEventListener('blur', guardar);
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') guardar();
    });
}

function seleccionarSilla(mesaId, sillaId) {
    sillaSeleccionada = { mesaId, sillaId };
    mostrarModalSilla(mesaId, sillaId);
}

function mostrarModalSilla(mesaId, sillaId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>Asignar Invitado a Silla</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>Mesa ${mesaId}, Silla ${sillaId}</p>
                
                <div class="form-group">
                    <label>Seleccionar Invitado:</label>
                    <select id="selectInvitadoSilla" style="width: 100%; padding: 10px; margin: 10px 0;">
                        <option value="">-- Sin asignar --</option>
                        ${invitados.map(invitado => `
                            <option value="${invitado.id}">
                                ${invitado.nombre} ${invitado.email ? `(${invitado.email})` : ''}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Estado:</label>
                    <div style="display: flex; gap: 10px; margin: 10px 0;">
                        <button class="estado-btn estado-sin-asignar" data-estado="sin-asignar">Sin Asignar</button>
                        <button class="estado-btn estado-asignado" data-estado="asignado">Asignado</button>
                        <button class="estado-btn estado-confirmado" data-estado="confirmado">Confirmado</button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" id="cancelarSilla">Cancelar</button>
                <button class="btn-primary" id="guardarSilla">Guardar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    const mesa = mesas.find(m => m.id === parseInt(mesaId));
    const silla = mesa?.sillas.find(s => s.id === parseInt(sillaId));
    
    if (silla) {
        const select = modal.querySelector('#selectInvitadoSilla');
        select.value = silla.invitadoId || '';
        
        const estadoBtns = modal.querySelectorAll('.estado-btn');
        estadoBtns.forEach(btn => {
            if (btn.dataset.estado === silla.estado) {
                btn.style.boxShadow = '0 0 0 2px #333';
            }
        });
    }
    
    modal.querySelector('.modal-close').onclick = () => cerrarModal(modal);
    modal.querySelector('#cancelarSilla').onclick = () => cerrarModal(modal);
    
    modal.querySelectorAll('.estado-btn').forEach(btn => {
        btn.onclick = function() {
            modal.querySelectorAll('.estado-btn').forEach(b => b.style.boxShadow = '');
            this.style.boxShadow = '0 0 0 2px #333';
        };
    });
    
    modal.querySelector('#guardarSilla').onclick = () => {
        const select = modal.querySelector('#selectInvitadoSilla');
        const invitadoId = select.value ? parseInt(select.value) : null;
        const estadoBtn = modal.querySelector('.estado-btn[style*="box-shadow"]');
        const nuevoEstado = estadoBtn ? estadoBtn.dataset.estado : 'sin-asignar';
        
        actualizarSilla(mesaId, sillaId, invitadoId, nuevoEstado);
        cerrarModal(modal);
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) cerrarModal(modal);
    };
}

function cerrarModal(modal) {
    modal.style.display = 'none';
    setTimeout(() => {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
    }, 300);
}

function buscarEnMesas(termino) {
    if (!termino) {
        document.querySelectorAll('.silla').forEach(silla => {
            silla.style.boxShadow = '';
        });
        return;
    }
    
    const busqueda = termino.toLowerCase();
    document.querySelectorAll('.silla').forEach(silla => {
        const sillaNombre = silla.getAttribute('title') || '';
        silla.style.boxShadow = sillaNombre.toLowerCase().includes(busqueda) 
            ? '0 0 0 3px yellow' 
            : '';
    });
}

function mostrarDetallesInvitado(invitadoId) {
    const invitado = invitados.find(i => i.id === invitadoId);
    if (!invitado || !guestDetails) return;
    
    guestDetails.innerHTML = `
        <div class="guest-detail-view">
            <div class="guest-detail-header">
                <div class="guest-detail-avatar">
                    ${invitado.nombre.substring(0, 1).toUpperCase()}
                </div>
                <div class="guest-detail-info">
                    <h4>${invitado.nombre}</h4>
                    <p>${invitado.email || 'Sin email'}</p>
                </div>
            </div>
            <div class="guest-detail-content">
                <div class="detail-row">
                    <span class="detail-label">Teléfono:</span>
                    <span class="detail-value">${invitado.telefono || 'No especificado'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Estado:</span>
                    <span class="detail-value">
                        <span class="guest-status status-${invitado.estado}">${invitado.estado}</span>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Asignación:</span>
                    <span class="detail-value">
                        ${invitado.id_mesa ? 
                            `Mesa ${invitado.id_mesa}, Silla ${invitado.silla_numero}` : 
                            'Sin asignar'}
                    </span>
                </div>
                ${invitado.notas ? `
                <div class="detail-row">
                    <span class="detail-label">Notas:</span>
                    <span class="detail-value">${invitado.notas}</span>
                </div>
                ` : ''}
            </div>
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button class="btn-secondary btn-small" onclick="editarInvitado(${invitado.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-secondary btn-small" onclick="asignarInvitado(${invitado.id})">
                    <i class="fas fa-chair"></i> Asignar
                </button>
            </div>
        </div>
    `;
}

// ===== FUNCIONES GLOBALES =====
window.editarInvitado = function(invitadoId) {
    mostrarMensaje('Funcionalidad de editar invitado en desarrollo', 'info');
};

window.asignarInvitado = function(invitadoId) {
    const invitado = invitados.find(i => i.id === invitadoId);
    if (!invitado) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Asignar ${invitado.nombre}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>Selecciona una silla para asignar a ${invitado.nombre}:</p>
                <div style="max-height: 300px; overflow-y: auto; margin: 15px 0;">
                    ${mesas.map(mesa => `
                        <div style="margin-bottom: 15px;">
                            <strong>${mesa.nombre}</strong>
                            <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
                                ${mesa.sillas.map(silla => `
                                    <button class="silla-asignacion ${silla.estado !== 'sin-asignar' ? 'ocupada' : ''}" 
                                            data-mesa="${mesa.id}" 
                                            data-silla="${silla.id}"
                                            style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: ${silla.estado === 'sin-asignar' ? '#f0f0f0' : '#ffebee'};">
                                        Silla ${silla.id} ${silla.nombre ? `(${silla.nombre})` : ''}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="cerrarModal(this.closest('.modal'))">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    modal.querySelectorAll('.silla-asignacion:not(.ocupada)').forEach(btn => {
        btn.addEventListener('click', function() {
            const mesaId = parseInt(this.dataset.mesa);
            const sillaId = parseInt(this.dataset.silla);
            
            actualizarSilla(mesaId, sillaId, invitadoId, 'asignado');
            cerrarModal(modal);
        });
    });
    
    modal.querySelector('.modal-close').onclick = () => cerrarModal(modal);
    modal.onclick = (e) => {
        if (e.target === modal) cerrarModal(modal);
    };
};

window.cerrarModal = cerrarModal;
