// cliente.js - Sistema de mesas completo para cliente con 3 roles

// ===== VARIABLES GLOBALES =====
let eventosCliente = [];
let eventoActual = null;
let mesas = [];
let invitados = [];
let sillaSeleccionada = null;
let zoomLevel = 1;
let usuario = null;
let limiteEventos = null;
let configuracionDisposicion = {
    columnas: 4,
    filas: 2,
    espaciado: 70
};

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
const newEventModal = document.getElementById('newEventModal');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const roleBadge = document.getElementById('roleBadge');
const eventLimitInfo = document.getElementById('eventLimitInfo');
const limitText = document.getElementById('limitText');
const searchGuests = document.getElementById('searchGuests');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const resetViewBtn = document.getElementById('resetViewBtn');
const showNamesCheckbox = document.getElementById('showNames');
const autoSaveCheckbox = document.getElementById('autoSave');

// Elementos de disposición
const numColumnasInput = document.getElementById('numColumnas');
const numFilasInput = document.getElementById('numFilas');
const espaciadoInput = document.getElementById('espaciado');

// Estadísticas
const statTotalMesas = document.getElementById('statTotalMesas');
const statTotalSillas = document.getElementById('statTotalSillas');
const statSillasOcupadas = document.getElementById('statSillasOcupadas');
const statPorcentajeOcupacion = document.getElementById('statPorcentajeOcupacion');
const ocupacionBar = document.getElementById('ocupacionBar');
const totalEventsCount = document.getElementById('totalEventsCount');
const activeEventsCount = document.getElementById('activeEventsCount');
const draftEventsCount = document.getElementById('draftEventsCount');

// Lista de invitados
const guestsList = document.getElementById('guestsList');
const guestSearch = document.getElementById('guestSearch');
const guestFilter = document.getElementById('guestFilter');
const addGuestBtn = document.getElementById('addGuestBtn');
const guestDetails = document.getElementById('guestDetails');

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Cargar usuario actual
    usuario = window.titiAuth?.obtenerUsuarioActual();
    
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }
    
    // Configurar UI con datos del usuario
    inicializarInterfazUsuario();
    
    // Configurar límite de eventos según rol
    configurarLimiteEventos();
    
    // Cargar datos iniciales
    cargarEventosUsuario();
    cargarInvitadosDemo();
    configurarFechaHora();
    
    // Configurar event listeners
    configurarEventListeners();
    
    // Crear mesas por defecto
    crearMesas();
    
    // Verificar límite al cargar
    verificarLimiteEventos();
});

// ===== FUNCIONES PRINCIPALES =====

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
    
    // Configurar límite de eventos
    limiteEventos = usuario.limite_eventos;
}

function configurarLimiteEventos() {
    if (limiteEventos === 1) {
        // Mostrar información de límite para clientes
        eventLimitInfo.style.display = 'flex';
        limitText.textContent = 'Límite: 1 evento activo';
        
        // Actualizar mensaje en modal de nuevo evento
        const limitWarning = document.getElementById('eventLimitWarning');
        if (limitWarning) {
            limitWarning.style.display = 'block';
        }
    }
}

// 1. Cargar eventos del usuario desde la API
async function cargarEventosUsuario() {
    const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
    const API = window.location.origin + '/api';

    // Check if we're viewing a specific event (from ?evento=ID)
    const urlParams = new URLSearchParams(window.location.search);
    const eventoIdParam = urlParams.get('evento');

    try {
        let eventosData = [];

        if (usuario.rol === 'admin') {
            const res = await fetch(API + '/eventos', { headers: { 'Authorization': 'Bearer ' + token } });
            const data = await res.json();
            eventosData = data.eventos || data || [];
        } else if (usuario.rol === 'organizador') {
            const res = await fetch(API + '/mis-eventos', { headers: { 'Authorization': 'Bearer ' + token } });
            eventosData = await res.json();
            if (!Array.isArray(eventosData)) eventosData = eventosData.eventos || [];
        } else if (usuario.rol === 'colaborador' && usuario.evento_id) {
            const res = await fetch(API + '/mi-evento', { headers: { 'Authorization': 'Bearer ' + token } });
            const ev = await res.json();
            if (ev && ev.id) eventosData = [ev];
        } else {
            // cliente
            const res = await fetch(API + '/eventos-usuario', { headers: { 'Authorization': 'Bearer ' + token } });
            const data = await res.json();
            eventosData = data.eventos || data || [];
        }

        // Map API fields to local fields
        eventosCliente = eventosData.map(e => ({
            id: e.id,
            nombre: e.nombre,
            descripcion: e.descripcion || '',
            fecha: e.fecha_evento ? e.fecha_evento.substring(0, 10) : '',
            hora: e.hora_evento || '',
            ubicacion: e.ubicacion || '',
            estado: e.estado || 'activo',
            mesas: e.num_mesas || 8,
            sillasPorMesa: e.sillas_por_mesa || 8,
            formaMesa: e.forma_mesa || 'rectangular',
            configuracion: e.configuracion || {}
        }));
    } catch (error) {
        console.error('Error cargando eventos:', error);
        eventosCliente = [];
    }

    // Update stats
    actualizarEstadisticasEventos();

    // Fill selector
    eventSelector.innerHTML = '<option value="">Seleccionar Evento...</option>';
    eventosCliente.forEach(evento => {
        const option = document.createElement('option');
        option.value = evento.id;
        option.textContent = evento.nombre;
        if (evento.estado === 'borrador') option.textContent += ' (Borrador)';
        eventSelector.appendChild(option);
    });

    // Auto-select
    if (eventoIdParam) {
        eventSelector.value = eventoIdParam;
        cargarEvento(eventoIdParam);
    } else if (eventosCliente.length > 0) {
        eventSelector.value = eventosCliente[0].id;
        cargarEvento(eventosCliente[0].id);
    }
}

function actualizarEstadisticasEventos() {
    const total = eventosCliente.length;
    const activos = eventosCliente.filter(e => e.estado === 'activo').length;
    const borradores = eventosCliente.filter(e => e.estado === 'borrador').length;
    
    totalEventsCount.textContent = total;
    activeEventsCount.textContent = activos;
    draftEventsCount.textContent = borradores;
}

// 2. Cargar un evento específico (with mesas from API)
async function cargarEvento(eventoId) {
    const evento = eventosCliente.find(e => e.id == eventoId);
    if (!evento) return;
    
    eventoActual = evento;
    currentEventName.textContent = evento.nombre;
    
    // Fill form
    eventNameInput.value = evento.nombre;
    eventDescriptionInput.value = evento.descripcion || '';
    eventDateInput.value = evento.fecha;
    eventTimeInput.value = evento.hora;
    numMesasInput.value = evento.mesas;
    sillasPorMesaInput.value = evento.sillasPorMesa;
    formaMesaSelect.value = evento.formaMesa;
    
    // Load mesas from API
    const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
    const API = window.location.origin + '/api';
    
    try {
        const res = await fetch(API + '/eventos/' + eventoId + '/mesas', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        const mesasAPI = data.mesas || data || [];
        
        if (mesasAPI.length > 0) {
            // Convert API mesas to local format
            mesas = mesasAPI.map((m, idx) => ({
                id: m.id, // Use real DB id
                nombre: m.nombre || `Mesa ${idx + 1}`,
                forma: m.forma || evento.formaMesa || 'rectangular',
                sillas: (typeof m.sillas === 'string' ? JSON.parse(m.sillas) : m.sillas) || []
            }));
            
            mesasContainer.innerHTML = '';
            mesas.forEach(mesa => crearMesaVisual(mesa));
            actualizarEstadisticas();
            console.log('✅ Mesas cargadas desde API:', mesas.length);
        } else {
            crearMesas();
        }
    } catch (error) {
        console.error('Error cargando mesas:', error);
        crearMesas();
    }
    
    // Load invitados from API
    try {
        const res = await fetch(API + '/eventos/' + eventoId + '/invitados', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        const invitadosAPI = data.invitados || data || [];
        
        invitados = invitadosAPI.map(inv => ({
            id: inv.id,
            nombre: inv.nombre,
            email: inv.email || '',
            telefono: inv.telefono || '',
            estado: inv.estado || 'pendiente',
            idMesa: inv.id_mesa,
            idSilla: inv.silla_numero,
            notas: inv.notas || ''
        }));
        
        actualizarListaInvitados();
        console.log('✅ Invitados cargados:', invitados.length);
    } catch (error) {
        console.error('Error cargando invitados:', error);
    }
    
    // Update event info display
    const fechaDisplay = evento.fecha ? new Date(evento.fecha + 'T00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    document.getElementById('currentEventDate').textContent = fechaDisplay + (evento.hora ? ' - ' + evento.hora : '');
    document.getElementById('currentEventStatus').innerHTML = 'Estado: <span class="status-active">' + (evento.estado || 'Activo') + '</span>';
}

// 3. Crear mesas (basado en final.html pero adaptado)
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
    
    // Calcular mesas por fila/columna
    const mesasPorFila = Math.ceil(numMesas / filas);
    
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
    
    // Guardar en evento actual si existe
    if (eventoActual) {
        guardarConfiguracionEvento();
    }
    
    mostrarMensaje(`${numMesas} mesas creadas con éxito`, 'success');
}

// 4. Renderizar mesa visual
function crearMesaVisual(mesa) {
    const mesaElement = document.createElement('div');
    mesaElement.className = 'mesa';
    mesaElement.dataset.id = mesa.id;
    mesaElement.style.transform = `scale(${zoomLevel})`;
    mesaElement.style.transition = 'transform 0.3s ease';
    
    // Información de la mesa (editable)
    const mesaInfo = document.createElement('div');
    mesaInfo.className = 'mesa-info';
    mesaInfo.textContent = `${mesa.nombre} (${mesa.sillas.length} sillas)`;
    mesaInfo.addEventListener('click', function() {
        editarNombreMesa(mesa.id, mesaInfo);
    });
    mesaElement.appendChild(mesaInfo);
    
    // Representación gráfica de la mesa
    const mesaGrafica = document.createElement('div');
    mesaGrafica.className = `mesa-grafica mesa-${mesa.forma}`;
    mesaGrafica.textContent = mesa.nombre;
    mesaElement.appendChild(mesaGrafica);
    
    // Contenedor para las sillas
    const sillasContainer = document.createElement('div');
    sillasContainer.className = `sillas-container ${mesa.forma}-sillas`;
    
    // Calcular posiciones de las sillas según la forma de la mesa
    const posiciones = calcularPosicionesSillas(mesa.sillas.length, mesa.forma);
    
    // Crear cada silla
    mesa.sillas.forEach((silla, index) => {
        const sillaElement = document.createElement('div');
        sillaElement.className = `silla estado-${silla.estado}`;
        sillaElement.dataset.mesaId = mesa.id;
        sillaElement.dataset.sillaId = silla.id;
        sillaElement.textContent = silla.id;
        
        // Mostrar nombre si está asignado y la opción está activa
        if (silla.nombre && showNamesCheckbox.checked) {
            sillaElement.setAttribute('title', silla.nombre);
        }
        
        // Posicionar la silla
        const pos = posiciones[index];
        sillaElement.style.left = `calc(${pos.x}% - 16px)`;
        sillaElement.style.top = `calc(${pos.y}% - 21px)`;
        
        // Rotar silla para orientarla hacia la mesa
        const centroX = 50;
        const centroY = 50;
        
        if (mesa.forma === 'rectangular' || mesa.forma === 'cuadrada') {
            if (pos.y < 25) {
                sillaElement.style.transform = `rotate(180deg)`;
            } else if (pos.y > 75) {
                sillaElement.style.transform = `rotate(0deg)`;
            } else if (pos.x < 25) {
                sillaElement.style.transform = `rotate(90deg)`;
            } else if (pos.x > 75) {
                sillaElement.style.transform = `rotate(270deg)`;
            }
        } else {
            const angulo = Math.atan2(centroY - pos.y, centroX - pos.x) * (180 / Math.PI);
            sillaElement.style.transform = `rotate(${angulo + 90}deg)`;
        }
        
        // Event listener para cambiar estado
        sillaElement.addEventListener('click', function(e) {
            e.stopPropagation();
            seleccionarSilla(mesa.id, silla.id);
        });
        
        sillasContainer.appendChild(sillaElement);
    });
    
    mesaElement.appendChild(sillasContainer);
    mesasContainer.appendChild(mesaElement);
}

// 5. Calcular posiciones de sillas
function calcularPosicionesSillas(numSillas, forma) {
    const posiciones = [];
    
    if (forma === 'rectangular' || forma === 'cuadrada') {
        const anchoContenedor = 100;
        const sillasLadosCortos = 2;
        const sillasRestantes = Math.max(0, numSillas - sillasLadosCortos);
        const sillasPorLadoLargo = Math.floor(sillasRestantes / 2);
        const sillasImpares = sillasRestantes % 2;
        const margenLateral = 20;
        const margenVertical = 15;
        
        // Lados cortos
        posiciones.push({x: -5, y: 50});
        if (numSillas >= 2) {
            posiciones.push({x: anchoContenedor + 5, y: 50});
        }
        
        // Lados largos
        if (sillasPorLadoLargo > 0) {
            const distancia = anchoContenedor - (margenLateral * 2);
            const divisor = Math.max(sillasPorLadoLargo - 1, 1);
            
            // Lado superior
            for (let i = 0; i < sillasPorLadoLargo; i++) {
                const posRelativa = (i * (distancia / divisor));
                const x = margenLateral + posRelativa;
                const y = margenVertical;
                posiciones.push({x, y});
            }
            
            // Lado inferior
            for (let i = 0; i < sillasPorLadoLargo; i++) {
                const posRelativa = (i * (distancia / divisor));
                const x = margenLateral + posRelativa;
                const y = anchoContenedor - margenVertical;
                posiciones.push({x, y});
            }
        }
        
        // Silla impar
        if (sillasImpares > 0) {
            posiciones.push({x: 50, y: margenVertical});
        }
        
        // Recortar si hay más sillas de las calculadas
        while (posiciones.length > numSillas) {
            posiciones.pop();
        }
    } else if (forma === 'circular') {
        const centroX = 50;
        const centroY = 50;
        const radio = 75;
        
        for (let i = 0; i < numSillas; i++) {
            const angulo = (2 * Math.PI / numSillas) * i;
            const x = centroX + radio * Math.cos(angulo);
            const y = centroY + radio * Math.sin(angulo);
            posiciones.push({x, y});
        }
    }
    
    return posiciones;
}

// 6. Renderizar todas las mesas
function renderizarMesas() {
    mesasContainer.innerHTML = '';
    mesas.forEach(mesa => {
        crearMesaVisual(mesa);
    });
}

// 7. Verificar límite de eventos
function verificarLimiteEventos() {
    if (limiteEventos === 1) {
        // Contar eventos activos (no borradores)
        const eventosActivos = eventosCliente.filter(e => e.estado === 'activo').length;
        
        if (eventosActivos >= limiteEventos) {
            // Ocultar botón de nuevo evento si ya tiene el máximo
            if (newEventBtn) {
                newEventBtn.style.display = 'none';
            }
            
            // Mostrar mensaje si intenta crear otro
            const crearBtn = document.getElementById('createEventBtn');
            if (crearBtn) {
                crearBtn.onclick = function() {
                    mostrarMensaje('Cliente solo puede tener 1 evento activo. Finaliza o elimina el actual.', 'error');
                    cerrarModal(document.getElementById('newEventModal'));
                    return false;
                };
            }
        } else {
            // Mostrar botón si aún no alcanzó el límite
            if (newEventBtn) {
                newEventBtn.style.display = 'block';
            }
        }
    }
}

// 8. Crear nuevo evento (con verificación de límite)
function crearNuevoEvento() {
    // VERIFICAR LÍMITE ANTES DE CREAR
    if (limiteEventos === 1) {
        const eventosActivos = eventosCliente.filter(e => e.estado === 'activo').length;
        if (eventosActivos >= limiteEventos) {
            mostrarMensaje('Cliente solo puede tener 1 evento activo. Finaliza o elimina el actual.', 'error');
            document.getElementById('newEventModal').style.display = 'none';
            return;
        }
    }
    
    const nombre = document.getElementById('newEventName').value;
    const fecha = document.getElementById('newEventDate').value;
    const hora = document.getElementById('newEventTime').value;
    const ubicacion = document.getElementById('newEventLocation').value;
    const tipo = document.getElementById('newEventType').value;
    const usarPlantilla = document.getElementById('useTemplate').checked;
    
    if (!nombre || !fecha) {
        mostrarMensaje('Nombre y fecha son obligatorios', 'error');
        return;
    }
    
    const nuevoEvento = {
        id: eventosCliente.length + 1,
        nombre: nombre,
        descripcion: `Evento de tipo ${tipo}`,
        fecha: fecha,
        hora: hora || '18:00',
        ubicacion: ubicacion,
        tipo: tipo,
        estado: 'borrador',
        mesas: usarPlantilla ? 8 : 1,
        sillasPorMesa: usarPlantilla ? 8 : 6,
        formaMesa: 'rectangular',
        configuracion: {}
    };
    
    eventosCliente.push(nuevoEvento);
    
    // Agregar al selector
    const option = document.createElement('option');
    option.value = nuevoEvento.id;
    option.textContent = nuevoEvento.nombre + ' (Borrador)';
    eventSelector.appendChild(option);
    
    // Seleccionar el nuevo evento
    eventSelector.value = nuevoEvento.id;
    cargarEvento(nuevoEvento.id);
    
    // Cerrar modal
    document.getElementById('newEventModal').style.display = 'none';
    
    // Resetear formulario
    document.getElementById('newEventForm').reset();
    
    // Actualizar estadísticas
    actualizarEstadisticasEventos();
    
    mostrarMensaje(`Nuevo evento "${nombre}" creado`, 'success');
    
    // Verificar límite después de crear
    verificarLimiteEventos();
}

// 9. Finalizar evento
function finalizarEvento() {
    if (!eventoActual) {
        mostrarMensaje('No hay evento seleccionado', 'error');
        return;
    }
    
    if (confirm(`¿Estás seguro de finalizar el evento "${eventoActual.nombre}"? Esto cambiará su estado a "completado".`)) {
        eventoActual.estado = 'completado';
        
        // Actualizar selector
        const option = eventSelector.querySelector(`option[value="${eventoActual.id}"]`);
        if (option) {
            option.textContent = eventoActual.nombre + ' (Completado)';
        }
        
        // Actualizar estadísticas
        actualizarEstadisticasEventos();
        
        // Si es cliente y finaliza su único evento, habilitar crear nuevo
        if (limiteEventos === 1) {
            verificarLimiteEventos();
        }
        
        mostrarMensaje(`Evento "${eventoActual.nombre}" finalizado`, 'success');
    }
}

// 10. Configurar event listeners
function configurarEventListeners() {
    // Selector de evento
    eventSelector.addEventListener('change', function() {
        if (this.value) {
            cargarEvento(parseInt(this.value));
        }
    });
    
    // Botón crear mesas
    btnCrearMesas.addEventListener('click', crearMesas);
    
    // Botón guardar evento
    btnGuardarEvento.addEventListener('click', function() {
        guardarEvento();
    });
    
    // Botón finalizar evento
    if (btnFinalizarEvento) {
        btnFinalizarEvento.addEventListener('click', finalizarEvento);
    }
    
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
    document.getElementById('createEventBtn').addEventListener('click', function() {
        crearNuevoEvento();
    });
    
    // Cerrar sesión
    logoutBtn.addEventListener('click', function() {
        window.titiAuth.logout();
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
    
    // Guardado automático
    autoSaveCheckbox.addEventListener('change', function() {
        mostrarMensaje(`Guardado automático ${this.checked ? 'activado' : 'desactivado'}`, 'info');
    });
    
    // Configuración de disposición
    numColumnasInput.addEventListener('change', actualizarDisposicion);
    numFilasInput.addEventListener('change', actualizarDisposicion);
    espaciadoInput.addEventListener('change', actualizarDisposicion);
    
    // ===== CORRECCIÓN: Permitir escritura en inputs =====
    const inputs = [
        eventNameInput, eventDateInput, eventTimeInput, eventDescriptionInput,
        numMesasInput, sillasPorMesaInput, searchGuests, guestSearch,
        numColumnasInput, numFilasInput, espaciadoInput
    ];
    
    inputs.forEach(input => {
        if (input) {
            input.addEventListener('keydown', function(e) {
                e.stopPropagation();
            });
        }
    });
    
    // Shortcuts de teclado
    document.addEventListener('keydown', function(e) {
        const activeElement = document.activeElement;
        const isInputFocused = activeElement.tagName === 'INPUT' || 
                              activeElement.tagName === 'TEXTAREA' || 
                              activeElement.tagName === 'SELECT';
        
        if (isInputFocused) {
            return;
        }
        
        // Ctrl+S para guardar
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            guardarEvento();
        }
        
        // Ctrl+N para nuevo evento
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            document.getElementById('newEventModal').style.display = 'flex';
        }
        
        // Ctrl+F para buscar
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            searchGuests.focus();
        }
        
        // Ctrl+E para finalizar evento
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            finalizarEvento();
        }
        
        // + para zoom in
        if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            if (zoomLevel < 2) {
                zoomLevel += 0.1;
                aplicarZoom();
            }
        }
        
        // - para zoom out
        if (e.key === '-') {
            e.preventDefault();
            if (zoomLevel > 0.5) {
                zoomLevel -= 0.1;
                aplicarZoom();
            }
        }
        
        // 0 para reset zoom
        if (e.key === '0') {
            e.preventDefault();
            zoomLevel = 1;
            aplicarZoom();
        }
    });
}

// 11. Aplicar zoom
function aplicarZoom() {
    document.querySelectorAll('.mesa').forEach(mesa => {
        mesa.style.transform = `scale(${zoomLevel})`;
    });
}

// 12. Actualizar disposición
function actualizarDisposicion() {
    const columnas = parseInt(numColumnasInput.value) || 4;
    const filas = parseInt(numFilasInput.value) || 2;
    const espaciado = parseInt(espaciadoInput.value) || 70;
    
    configuracionDisposicion = { columnas, filas, espaciado };
    
    // Actualizar contenedor
    mesasContainer.style.gap = `${espaciado}px`;
    mesasContainer.style.gridTemplateColumns = `repeat(${columnas}, 1fr)`;
    
    // Si hay mesas, re-renderizar
    if (mesas.length > 0) {
        renderizarMesas();
    }
    
    mostrarMensaje(`Disposición actualizada: ${columnas}×${filas}`, 'info');
}

// 13. Resto de funciones (se mantienen igual que antes)
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
    
    const guardar = () => {
        guardarNombreMesa(mesaId, input.value, elementoInfo);
    };
    
    input.addEventListener('blur', guardar);
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            guardar();
        }
    });
}

function guardarNombreMesa(mesaId, nuevoNombre, elementoInfo) {
    const mesa = mesas.find(m => m.id === mesaId);
    if (mesa) {
        mesa.nombre = nuevoNombre || `Mesa ${mesaId}`;
        elementoInfo.textContent = `${mesa.nombre} (${mesa.sillas.length} sillas)`;
        
        const mesaGrafica = elementoInfo.nextElementSibling;
        if (mesaGrafica && mesaGrafica.classList.contains('mesa-grafica')) {
            mesaGrafica.textContent = mesa.nombre;
        }
        
        guardarConfiguracionEvento();
        actualizarListaInvitados();
    }
}

function seleccionarSilla(mesaId, sillaId) {
    sillaSeleccionada = { mesaId, sillaId };
    mostrarModalSilla(mesaId, sillaId);
}

function mostrarModalSilla(mesaId, sillaId) {
    // Crear modal dinámico
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
    
    // Obtener silla actual
    const mesa = mesas.find(m => m.id === parseInt(mesaId));
    const silla = mesa?.sillas.find(s => s.id === parseInt(sillaId));
    
    // Configurar valores actuales
    if (silla) {
        const select = modal.querySelector('#selectInvitadoSilla');
        select.value = silla.invitadoId || '';
        
        // Marcar botón de estado actual
        const estadoBtns = modal.querySelectorAll('.estado-btn');
        estadoBtns.forEach(btn => {
            if (btn.dataset.estado === silla.estado) {
                btn.style.boxShadow = '0 0 0 2px #333';
            }
        });
    }
    
    // Event listeners del modal
    modal.querySelector('.modal-close').onclick = () => cerrarModal(modal);
    modal.querySelector('#cancelarSilla').onclick = () => cerrarModal(modal);
    
    // Botones de estado
    modal.querySelectorAll('.estado-btn').forEach(btn => {
        btn.onclick = function() {
            // Remover selección anterior
            modal.querySelectorAll('.estado-btn').forEach(b => {
                b.style.boxShadow = '';
            });
            // Seleccionar este
            this.style.boxShadow = '0 0 0 2px #333';
        };
    });
    
    // Guardar cambios
    modal.querySelector('#guardarSilla').onclick = () => {
        const select = modal.querySelector('#selectInvitadoSilla');
        const invitadoId = select.value ? parseInt(select.value) : null;
        const estadoBtn = modal.querySelector('.estado-btn[style*="box-shadow"]');
        const nuevoEstado = estadoBtn ? estadoBtn.dataset.estado : 'sin-asignar';
        
        actualizarSilla(mesaId, sillaId, invitadoId, nuevoEstado);
        cerrarModal(modal);
    };
    
    // Cerrar al hacer click fuera
    modal.onclick = (e) => {
        if (e.target === modal) {
            cerrarModal(modal);
        }
    };
}

function cerrarModal(modal) {
    modal.style.display = 'none';
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 300);
}

function actualizarSilla(mesaId, sillaId, invitadoId, nuevoEstado) {
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
    }
    
    // Actualizar UI
    actualizarEstadisticas();
    actualizarListaInvitados();
    guardarConfiguracionEvento();
    
    mostrarMensaje(`Silla ${sillaId} de ${mesa.nombre} actualizada`, 'success');
}

function actualizarEstadisticas() {
    let totalSillas = 0;
    let sillasOcupadas = 0;
    
    mesas.forEach(mesa => {
        totalSillas += mesa.sillas.length;
        mesa.sillas.forEach(silla => {
            if (silla.estado !== 'sin-asignar') {
                sillasOcupadas++;
            }
        });
    });
    
    const porcentaje = totalSillas > 0 ? Math.round((sillasOcupadas / totalSillas) * 100) : 0;
    
    statTotalMesas.textContent = mesas.length;
    statTotalSillas.textContent = totalSillas;
    statSillasOcupadas.textContent = sillasOcupadas;
    statPorcentajeOcupacion.textContent = `${porcentaje}%`;
    ocupacionBar.style.width = `${porcentaje}%`;
}

async function guardarConfiguracionEvento() {
    if (!eventoActual) return;
    
    const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
    const API = window.location.origin + '/api';
    
    // Build mesas payload for API
    const mesasPayload = mesas.map(m => ({
        nombre: m.nombre,
        forma: m.forma || eventoActual.formaMesa || 'rectangular',
        posicion_x: 0,
        posicion_y: 0,
        sillas: m.sillas
    }));
    
    try {
        const res = await fetch(API + '/eventos/' + eventoActual.id + '/mesas', {
            method: 'PUT',
            headers: { 
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mesas: mesasPayload })
        });
        
        if (res.ok) {
            console.log('✅ Mesas guardadas en servidor');
            if (autoSaveCheckbox.checked) {
                mostrarMensaje('Cambios guardados', 'success');
            }
        } else {
            console.error('Error guardando mesas:', res.status);
            mostrarMensaje('Error al guardar', 'error');
        }
    } catch (error) {
        console.error('Error guardando:', error);
        mostrarMensaje('Error de conexión al guardar', 'error');
    }
}

function cargarInvitadosDemo() {
    // Invitados are now loaded from API in cargarEvento()
    // This function is kept for compatibility but does nothing
    console.log('Invitados se cargan desde la API');
}

function actualizarListaInvitados() {
    const searchTerm = guestSearch.value.toLowerCase();
    const filterValue = guestFilter.value;
    
    let invitadosFiltrados = invitados.filter(invitado => {
        const matchesSearch = 
            invitado.nombre.toLowerCase().includes(searchTerm) ||
            (invitado.email && invitado.email.toLowerCase().includes(searchTerm));
        
        const matchesFilter = 
            filterValue === 'all' ||
            (filterValue === 'assigned' && invitado.idMesa) ||
            (filterValue === 'unassigned' && !invitado.idMesa) ||
            (filterValue === 'confirmed' && invitado.estado === 'confirmado');
        
        return matchesSearch && matchesFilter;
    });
    
    guestsList.innerHTML = invitadosFiltrados.map(invitado => {
        const mesaInfo = invitado.idMesa ? 
            `Mesa ${invitado.idMesa}, Silla ${invitado.idSilla}` : 
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
    
    // Agregar event listeners a los items
    document.querySelectorAll('.guest-item').forEach(item => {
        item.addEventListener('click', function() {
            const invitadoId = parseInt(this.dataset.id);
            mostrarDetallesInvitado(invitadoId);
        });
    });
}

function mostrarDetallesInvitado(invitadoId) {
    const invitado = invitados.find(i => i.id === invitadoId);
    if (!invitado) return;
    
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
                        ${invitado.idMesa ? 
                            `Mesa ${invitado.idMesa}, Silla ${invitado.idSilla}` : 
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
                <button class="btn-secondary btn-small" onclick="editarInvitado(${invitado.id})" style="display:flex;align-items:center;gap:6px">
                    ✏️ Editar
                </button>
                <button class="btn-secondary btn-small" onclick="asignarInvitado(${invitado.id})" style="display:flex;align-items:center;gap:6px">
                    🪑 Asignar
                </button>
            </div>
        </div>
    `;
}

function configurarFechaHora() {
    const ahora = new Date();
    const manana = new Date();
    manana.setDate(ahora.getDate() + 1);
    
    // Formato YYYY-MM-DD para input date
    const formatoFecha = (fecha) => {
        return fecha.toISOString().split('T')[0];
    };
    
    // Formato HH:MM para input time
    const formatoHora = (fecha) => {
        return fecha.getHours().toString().padStart(2, '0') + ':' + 
               fecha.getMinutes().toString().padStart(2, '0');
    };
    
    // Valores por defecto si están vacíos
    if (!eventDateInput.value) {
        eventDateInput.value = formatoFecha(manana);
    }
    
    if (!eventTimeInput.value) {
        eventTimeInput.value = formatoHora(new Date(manana.setHours(18, 0, 0, 0)));
    }
}

function buscarEnMesas(termino) {
    if (!termino) {
        // Resetear colores
        document.querySelectorAll('.silla').forEach(silla => {
            silla.style.boxShadow = '';
        });
        return;
    }
    
    const busqueda = termino.toLowerCase();
    document.querySelectorAll('.silla').forEach(silla => {
        const sillaNombre = silla.getAttribute('title') || '';
        if (sillaNombre.toLowerCase().includes(busqueda)) {
            silla.style.boxShadow = '0 0 0 3px yellow';
        } else {
            silla.style.boxShadow = '';
        }
    });
}

async function guardarEvento() {
    if (!eventoActual) {
        mostrarMensaje('No hay evento seleccionado', 'error');
        return;
    }
    
    const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
    const API = window.location.origin + '/api';
    
    // Update event details via API
    try {
        const res = await fetch(API + '/eventos/' + eventoActual.id, {
            method: 'PUT',
            headers: { 
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre: eventNameInput.value || 'Evento sin nombre',
                descripcion: eventDescriptionInput.value,
                fecha_evento: eventDateInput.value || null,
                hora_evento: eventTimeInput.value || null,
                num_mesas: parseInt(numMesasInput.value),
                sillas_por_mesa: parseInt(sillasPorMesaInput.value),
                forma_mesa: formaMesaSelect.value
            })
        });
        
        if (res.ok) {
            // Also save mesas
            await guardarConfiguracionEvento();
            
            eventoActual.nombre = eventNameInput.value;
            currentEventName.textContent = eventoActual.nombre;
            
            const option = eventSelector.querySelector(`option[value="${eventoActual.id}"]`);
            if (option) option.textContent = eventoActual.nombre;
            
            mostrarMensaje(`Evento "${eventoActual.nombre}" guardado`, 'success');
        } else {
            mostrarMensaje('Error al guardar evento', 'error');
        }
    } catch (error) {
        console.error('Error guardando evento:', error);
        mostrarMensaje('Error de conexión', 'error');
    }
}

function agregarInvitado() {
    const nombre = prompt('Nombre del invitado:');
    if (!nombre) return;
    
    const email = prompt('Email (opcional):');
    const telefono = prompt('Teléfono (opcional):');
    
    const nuevoInvitado = {
        id: invitados.length + 1,
        nombre: nombre,
        email: email || null,
        telefono: telefono || null,
        estado: 'pendiente',
        idMesa: null,
        idSilla: null
    };
    
    invitados.push(nuevoInvitado);
    actualizarListaInvitados();
    
    mostrarMensaje(`Invitado "${nombre}" agregado`, 'success');
}

function mostrarMensaje(mensaje, tipo = 'info') {
    const toast = document.getElementById('messageToast');
    if (!toast) return;
    
    toast.textContent = mensaje;
    toast.className = `toast ${tipo} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== FUNCIONES GLOBALES PARA HTML =====
window.editarInvitado = function(invitadoId) {
    mostrarMensaje('Funcionalidad de editar invitado en desarrollo', 'info');
};

window.asignarInvitado = function(invitadoId) {
    const invitado = invitados.find(i => i.id === invitadoId);
    if (!invitado) return;
    
    // Crear modal para asignar
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
    
    // Event listeners para sillas
    modal.querySelectorAll('.silla-asignacion:not(.ocupada)').forEach(btn => {
        btn.addEventListener('click', function() {
            const mesaId = parseInt(this.dataset.mesa);
            const sillaId = parseInt(this.dataset.silla);
            
            actualizarSilla(mesaId, sillaId, invitadoId, 'asignado');
            cerrarModal(modal);
        });
    });
    
    // Cerrar modal
    modal.querySelector('.modal-close').onclick = () => cerrarModal(modal);
    modal.onclick = (e) => {
        if (e.target === modal) {
            cerrarModal(modal);
        }
    };
};

window.cerrarModal = cerrarModal;
// ===== SOLO FUNCIONALIDAD CERRAR SESIÓN =====

const btnLogout = document.getElementById('logoutBtn');
if (btnLogout) {
    btnLogout.addEventListener('click', function(e) {
        e.preventDefault();
        mostrarModalCerrarSesion();
    });
}

function mostrarModalCerrarSesion() {
    const modal = document.createElement('div');
    modal.className = 'modal-logout show';
    modal.id = 'modalLogout';
    modal.innerHTML = `
        <div class="modal-logout-box">
            <div class="logout-icon">
                🚪
            </div>
            <h3>¿Cerrar Sesión?</h3>
            <p>¿Estás seguro de que deseas cerrar tu sesión?</p>
            <div class="logout-buttons">
                <button class="btn-cancel-logout" onclick="cerrarModalLogout()">
                    Cancelar
                </button>
                <button class="btn-confirm-logout" onclick="confirmarCerrarSesion()">
                    Cerrar Sesión
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.cerrarModalLogout = function() {
    const modal = document.getElementById('modalLogout');
    if (modal) modal.remove();
};

window.confirmarCerrarSesion = function() {
    // Limpiar datos
    localStorage.removeItem('titi_usuario_actual');
    localStorage.removeItem('titi_token');
    sessionStorage.removeItem('titi_token');
    
    // Redirigir a login
    window.location.href = 'login.html';
};

console.log('✅ Cerrar sesión listo');

// ===== REEMPLAZAR FUNCIÓN agregarInvitado CON MODAL BONITO =====

// Sobrescribir la función agregarInvitado
function agregarInvitado() {
    mostrarModalAgregarInvitado();
}

function mostrarModalAgregarInvitado(invitadoId = null) {
    let invitado = null;
    let titulo = 'Agregar Invitado';
    let isEdit = false;
    
    if (invitadoId) {
        invitado = invitados.find(i => i.id === invitadoId);
        titulo = 'Editar Invitado';
        isEdit = true;
    }
    
    // Crear modal
    const modalHTML = `
        <div class="modal-invitado show" id="modalAgregarInvitado">
            <div class="modal-invitado-box">
                <div class="modal-invitado-header">
                    <h2>
                        ${isEdit ? '✏️' : '➕'}
                        ${titulo}
                    </h2>
                    <button class="btn-close-invitado" onclick="cerrarModalAgregarInvitado()">&times;</button>
                </div>
                
                <form class="modal-invitado-body" onsubmit="event.preventDefault(); guardarInvitadoModal(${invitadoId});">
                    <div class="form-group-invitado" data-hint="Nombre completo del invitado">
                        <label data-required="*">Nombre Completo</label>
                        <input 
                            type="text" 
                            id="modalNombre" 
                            required 
                            value="${invitado ? invitado.nombre : ''}"
                            placeholder="Ej: Ana María García"
                            autofocus>
                    </div>
                    
                    <div class="form-group-invitado" data-hint="Correo electrónico">
                        <label>Email</label>
                        <input 
                            type="email" 
                            id="modalEmail"
                            value="${invitado ? (invitado.email || '') : ''}"
                            placeholder="ejemplo@correo.com">
                    </div>
                    
                    <div class="form-row-invitado">
                        <div class="form-group-invitado" data-hint="Número telefónico">
                            <label>Teléfono</label>
                            <input 
                                type="tel" 
                                id="modalTelefono"
                                value="${invitado ? (invitado.telefono || '') : ''}"
                                placeholder="+52 55 1234 5678">
                        </div>
                        
                        <div class="form-group-invitado" data-hint="Estado del invitado">
                            <label>Estado</label>
                            <select id="modalEstado">
                                <option value="pendiente" ${invitado && invitado.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="confirmado" ${invitado && invitado.estado === 'confirmado' ? 'selected' : ''}>Confirmado</option>
                                <option value="rechazado" ${invitado && invitado.estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-buttons-invitado">
                        <button type="button" class="btn-cancel-invitado" onclick="cerrarModalAgregarInvitado()">
                            Cancelar
                        </button>
                        <button type="submit" class="btn-save-invitado">
                            💾 Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Insertar modal en el body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Focus en el primer campo
    setTimeout(() => {
        document.getElementById('modalNombre').focus();
    }, 100);
}

window.cerrarModalAgregarInvitado = function() {
    const modal = document.getElementById('modalAgregarInvitado');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
};

window.guardarInvitadoModal = async function(invitadoId) {
    const nombre = document.getElementById('modalNombre').value.trim();
    const email = document.getElementById('modalEmail').value.trim();
    const telefono = document.getElementById('modalTelefono').value.trim();
    const estado = document.getElementById('modalEstado').value;
    
    if (!nombre) {
        mostrarToastBonito('El nombre es obligatorio', 'error');
        return;
    }
    
    if (!eventoActual) {
        mostrarToastBonito('No hay evento seleccionado', 'error');
        return;
    }
    
    const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
    const API = window.location.origin + '/api';
    
    try {
        if (invitadoId) {
            // Edit existing
            const res = await fetch(API + '/eventos/' + eventoActual.id + '/invitados/' + invitadoId, {
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, email: email || null, telefono: telefono || null, estado })
            });
            if (res.ok) {
                const inv = invitados.find(i => i.id === invitadoId);
                if (inv) { inv.nombre = nombre; inv.email = email; inv.telefono = telefono; inv.estado = estado; }
                mostrarToastBonito('Invitado actualizado', 'success');
            } else {
                mostrarToastBonito('Error al actualizar', 'error');
            }
        } else {
            // Create new
            const res = await fetch(API + '/eventos/' + eventoActual.id + '/invitados', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, email: email || null, telefono: telefono || null, estado })
            });
            if (res.ok) {
                const data = await res.json();
                const nuevo = data.invitado || data;
                invitados.push({
                    id: nuevo.id, nombre: nuevo.nombre, email: nuevo.email || '',
                    telefono: nuevo.telefono || '', estado: nuevo.estado || 'pendiente',
                    idMesa: null, idSilla: null
                });
                mostrarToastBonito('Invitado agregado', 'success');
            } else {
                mostrarToastBonito('Error al agregar', 'error');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToastBonito('Error de conexión', 'error');
    }
    
    cerrarModalAgregarInvitado();
    actualizarListaInvitados();
};

// Toast bonito
function mostrarToastBonito(mensaje, tipo = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-custom ${tipo}`;
    toast.innerHTML = `
        <span>${tipo === 'success' ? '✅' : '⚠️'}</span>
        <span>${mensaje}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// También sobrescribir editarInvitado
window.editarInvitado = function(invitadoId) {
    mostrarModalAgregarInvitado(invitadoId);
};

console.log('✅ Modal bonito de agregar invitado activado');


// ===== CAMBIAR TEXTO BOTÓN FINALIZAR =====

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const btnFinalizar = document.getElementById('btnFinalizarEvento');
        if (btnFinalizar) btnFinalizar.innerHTML = '⚠️ Finalizar Evento';
    }, 100);
});

// ===== CLEAN ICON SETUP =====

function setupCleanIcons() {
    // Config buttons - use simple text, FontAwesome already hidden by CSS was removed
    const btnActualizar = document.getElementById('btnCrearMesas');
    if (btnActualizar) btnActualizar.innerHTML = '↻ Actualizar Mesas';
    
    const btnGuardar = document.getElementById('btnGuardarEvento');
    if (btnGuardar) btnGuardar.innerHTML = '💾 Guardar Cambios';
    
    const btnEliminar = document.getElementById('btnFinalizarEvento');
    if (btnEliminar) btnEliminar.innerHTML = '⚠️ Finalizar Evento';
    
    // Zoom buttons
    const zoomIn = document.getElementById('zoomInBtn');
    if (zoomIn) { zoomIn.textContent = '+'; zoomIn.style.fontSize = '1.3rem'; }
    
    const zoomOut = document.getElementById('zoomOutBtn');
    if (zoomOut) { zoomOut.textContent = '−'; zoomOut.style.fontSize = '1.3rem'; }
    
    const resetView = document.getElementById('resetViewBtn');
    if (resetView) { resetView.textContent = '↻'; resetView.style.fontSize = '1.1rem'; }
    
    // Add guest button - clean icon
    const addGuest = document.getElementById('addGuestBtn');
    if (addGuest) { addGuest.textContent = '+'; addGuest.title = 'Agregar Invitado'; }
    
    // Logout button - just an icon
    const logout = document.getElementById('logoutBtn');
    if (logout) {
        logout.innerHTML = '⏻';
        logout.title = 'Cerrar Sesión';
        logout.style.fontSize = '1.2rem';
    }
    
    // Back to Dashboard button — only for admin and organizador
    const backBtn = document.getElementById('backToDashBtn');
    const usr = JSON.parse(localStorage.getItem('titi_usuario_actual') || '{}');
    if (backBtn && (usr.rol === 'admin' || usr.rol === 'organizador')) {
        backBtn.style.display = 'flex';
        backBtn.style.cssText = 'display:flex !important;width:42px;height:42px;background:linear-gradient(135deg,#667eea,#5B2D8E);color:white;border:none;border-radius:50%;font-size:1.2rem;cursor:pointer;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(91,45,142,.25);transition:all .25s;padding:0';
        backBtn.onclick = function() {
            if (usr.rol === 'admin') window.location.href = 'admin.html';
            else window.location.href = 'organizador.html';
        };
    }
    
    // Logo
    const logo = document.querySelector('.logo h1');
    if (logo) logo.textContent = 'Titi Invita';
    
    // Section titles with bullets  
    document.querySelectorAll('h3').forEach(h3 => {
        const texto = h3.textContent.trim().replace(/^[•\[\]🪑📊⚙️👥ℹ️📅⏩]/g, '').trim();
        if (texto.includes('Seleccionar Evento')) h3.textContent = '• Seleccionar Evento';
        else if (texto.includes('Estadísticas')) h3.textContent = '• Estadísticas de Eventos';
        else if (texto.includes('Vista')) h3.textContent = '• Vista Rápida';
        else if (texto.includes('Configuración')) h3.textContent = '• Configuración del Evento';
        else if (texto.includes('Invitados') || texto.includes('Lista')) h3.textContent = '• Lista de Invitados';
        else if (texto.includes('Información')) h3.textContent = '• Información de Invitado';
    });
    
    // DO NOT remove FontAwesome icons globally anymore
    // Only remove orphan <i> inside buttons we already replaced
    
    console.log('✅ Clean icons applied');
}

// Run setup
setupCleanIcons();
setTimeout(setupCleanIcons, 100);
setTimeout(setupCleanIcons, 500);
document.addEventListener('DOMContentLoaded', setupCleanIcons);
window.addEventListener('load', setupCleanIcons);
