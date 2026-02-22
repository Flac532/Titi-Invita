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

// 1. Cargar eventos del usuario según su rol
function cargarEventosUsuario() {
    // Datos de demo - en producción vendrían de la API
    let eventosDemo = [];
    
    if (usuario.rol === 'cliente') {
        // Cliente solo ve sus eventos (máximo 1 activo)
        eventosDemo = [
            {
                id: 1,
                nombre: 'Boda de Ana y Carlos',
                descripcion: 'Celebración en jardín botánico',
                fecha: '2024-06-15',
                hora: '18:00',
                ubicacion: 'Jardín Botánico',
                estado: 'activo',
                mesas: 8,
                sillasPorMesa: 8,
                formaMesa: 'rectangular',
                configuracion: {}
            }
        ];
    } else if (usuario.rol === 'organizador') {
        // Organizador ve múltiples eventos
        eventosDemo = [
            {
                id: 1,
                nombre: 'Boda de Ana y Carlos',
                descripcion: 'Celebración en jardín botánico',
                fecha: '2024-06-15',
                hora: '18:00',
                ubicacion: 'Jardín Botánico',
                estado: 'activo',
                mesas: 8,
                sillasPorMesa: 8,
                formaMesa: 'rectangular',
                configuracion: {}
            },
            {
                id: 2,
                nombre: 'Conferencia Tech 2024',
                descripcion: 'Conferencia anual de tecnología',
                fecha: '2024-07-20',
                hora: '09:00',
                ubicacion: 'Centro de Convenciones',
                estado: 'activo',
                mesas: 12,
                sillasPorMesa: 6,
                formaMesa: 'circular',
                configuracion: {}
            },
            {
                id: 3,
                nombre: 'Fiesta de Graduación',
                descripcion: 'Celebración de graduación universitaria',
                fecha: '2024-08-10',
                hora: '20:00',
                ubicacion: 'Salón de Eventos',
                estado: 'borrador',
                mesas: 6,
                sillasPorMesa: 10,
                formaMesa: 'rectangular',
                configuracion: {}
            }
        ];
    } else if (usuario.rol === 'admin') {
        // Admin vería todos, pero admin va a admin.html
        // Por si acaso, mostramos algunos eventos
        eventosDemo = [
            {
                id: 1,
                nombre: 'Evento de Administración',
                descripcion: 'Evento de prueba para admin',
                fecha: '2024-06-20',
                hora: '10:00',
                ubicacion: 'Oficina Principal',
                estado: 'activo',
                mesas: 10,
                sillasPorMesa: 8,
                formaMesa: 'rectangular',
                configuracion: {}
            }
        ];
    }
    
    eventosCliente = eventosDemo;
    
    // Actualizar estadísticas de eventos
    actualizarEstadisticasEventos();
    
    // Llenar selector de eventos
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
    
    // Seleccionar primer evento por defecto
    if (eventosCliente.length > 0) {
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

// 2. Cargar un evento específico
function cargarEvento(eventoId) {
    const evento = eventosCliente.find(e => e.id == eventoId);
    if (!evento) return;
    
    eventoActual = evento;
    currentEventName.textContent = evento.nombre;
    
    // Llenar formulario con datos del evento
    eventNameInput.value = evento.nombre;
    eventDescriptionInput.value = evento.descripcion || '';
    eventDateInput.value = evento.fecha;
    eventTimeInput.value = evento.hora;
    numMesasInput.value = evento.mesas;
    sillasPorMesaInput.value = evento.sillasPorMesa;
    formaMesaSelect.value = evento.formaMesa;
    
    // Cargar configuración si existe
    if (evento.configuracion && evento.configuracion.mesas) {
        mesas = evento.configuracion.mesas;
        renderizarMesas();
    } else {
        crearMesas();
    }
    
    // Actualizar estadísticas
    actualizarEstadisticas();
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

function guardarConfiguracionEvento() {
    if (!eventoActual) return;
    
    eventoActual.configuracion = {
        mesas: JSON.parse(JSON.stringify(mesas)),
        disposicion: configuracionDisposicion,
        fechaActualizacion: new Date().toISOString()
    };
    
    eventoActual.mesas = mesas.length;
    eventoActual.sillasPorMesa = mesas.length > 0 ? mesas[0].sillas.length : 0;
    eventoActual.formaMesa = mesas.length > 0 ? mesas[0].forma : 'rectangular';
    
    // En producción, aquí harías fetch a la API
    console.log('Guardando evento:', eventoActual);
    
    // Simular guardado
    if (autoSaveCheckbox.checked) {
        localStorage.setItem(`titi_evento_${eventoActual.id}`, JSON.stringify(eventoActual));
        mostrarMensaje('Cambios guardados automáticamente', 'info');
    }
}

function cargarInvitadosDemo() {
    invitados = [
        { id: 1, nombre: 'Ana López', email: 'ana@email.com', telefono: '555-0101', estado: 'confirmado', idMesa: 1, idSilla: 1 },
        { id: 2, nombre: 'Carlos Ruiz', email: 'carlos@email.com', telefono: '555-0102', estado: 'confirmado', idMesa: 1, idSilla: 2 },
        { id: 3, nombre: 'María González', email: 'maria@email.com', telefono: '555-0103', estado: 'asignado', idMesa: 2, idSilla: 1 },
        { id: 4, nombre: 'Pedro Hernández', email: 'pedro@email.com', telefono: '555-0104', estado: 'pendiente' },
        { id: 5, nombre: 'Laura Martínez', email: 'laura@email.com', telefono: '555-0105', estado: 'pendiente' },
        { id: 6, nombre: 'Roberto Sánchez', email: 'roberto@email.com', telefono: '555-0106', estado: 'asignado' },
        { id: 7, nombre: 'Sofía Castro', email: 'sofia@email.com', telefono: '555-0107', estado: 'pendiente' },
        { id: 8, nombre: 'David Ramírez', email: 'david@email.com', telefono: '555-0108', estado: 'pendiente' }
    ];
    
    actualizarListaInvitados();
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

function guardarEvento() {
    if (!eventoActual) {
        mostrarMensaje('No hay evento seleccionado', 'error');
        return;
    }
    
    // Actualizar datos del evento
    eventoActual.nombre = eventNameInput.value || 'Evento sin nombre';
    eventoActual.descripcion = eventDescriptionInput.value;
    eventoActual.fecha = eventDateInput.value;
    eventoActual.hora = eventTimeInput.value;
    eventoActual.mesas = parseInt(numMesasInput.value);
    eventoActual.sillasPorMesa = parseInt(sillasPorMesaInput.value);
    eventoActual.formaMesa = formaMesaSelect.value;
    
    // Guardar configuración
    guardarConfiguracionEvento();
    
    // Actualizar UI
    currentEventName.textContent = eventoActual.nombre;
    
    // Actualizar selector de eventos
    const option = eventSelector.querySelector(`option[value="${eventoActual.id}"]`);
    if (option) {
        option.textContent = eventoActual.nombre;
        if (eventoActual.estado === 'borrador') {
            option.textContent += ' (Borrador)';
        } else if (eventoActual.estado === 'completado') {
            option.textContent += ' (Completado)';
        }
    }
    
    mostrarMensaje(`Evento "${eventoActual.nombre}" guardado correctamente`, 'success');
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

// ===== FUNCIONALIDADES NUEVAS AGREGADAS =====

// ===== CERRAR SESIÓN =====
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            localStorage.removeItem('titi_usuario_actual');
            localStorage.removeItem('titi_token');
            sessionStorage.removeItem('titi_token');
            
            mostrarToastNuevo('✅ Sesión cerrada exitosamente', 'success');
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        }
    });
}

// ===== MODAL AGREGAR INVITADO =====
if (addGuestBtn) {
    addGuestBtn.addEventListener('click', mostrarModalAgregarInvitadoNuevo);
}

function mostrarModalAgregarInvitadoNuevo() {
    const modalHTML = `
        <div class="modal-nuevo active">
            <div class="modal-overlay-nuevo" onclick="cerrarModalesNuevos()"></div>
            <div class="modal-content-nuevo">
                <button class="modal-close-nuevo" onclick="cerrarModalesNuevos()">×</button>
                <h2><i class="fas fa-user-plus"></i> Agregar Invitado</h2>
                
                <form id="formAgregarInvitadoNuevo" onsubmit="event.preventDefault(); guardarNuevoInvitadoNuevo();">
                    <div class="form-group">
                        <label>Nombre Completo *</label>
                        <input type="text" id="nuevoInvitadoNombre" required placeholder="Juan Pérez" autofocus>
                    </div>
                    
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="nuevoInvitadoEmail" placeholder="juan@ejemplo.com">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="tel" id="nuevoInvitadoTelefono" placeholder="+52 55 1234 5678">
                        </div>
                        
                        <div class="form-group">
                            <label>Estado</label>
                            <select id="nuevoInvitadoEstado">
                                <option value="pendiente">Pendiente</option>
                                <option value="confirmado">Confirmado</option>
                                <option value="rechazado">Rechazado</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="button-group">
                        <button type="button" class="btn-secondary" onclick="cerrarModalesNuevos()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function guardarNuevoInvitadoNuevo() {
    const nombre = document.getElementById('nuevoInvitadoNombre').value.trim();
    const email = document.getElementById('nuevoInvitadoEmail').value.trim();
    const telefono = document.getElementById('nuevoInvitadoTelefono').value.trim();
    const estado = document.getElementById('nuevoInvitadoEstado').value;
    
    if (!nombre) {
        mostrarToastNuevo('❌ El nombre es obligatorio', 'error');
        return;
    }
    
    const nuevoInvitado = {
        id: invitados.length + 1,
        nombre: nombre,
        email: email || '',
        telefono: telefono || '',
        estado: estado,
        mesa: null,
        silla: null
    };
    
    invitados.push(nuevoInvitado);
    
    mostrarToastNuevo('✅ Invitado agregado exitosamente', 'success');
    cerrarModalesNuevos();
    actualizarListaInvitados();
}

// ===== EDITAR INVITADO =====
window.editarInvitadoNuevo = function(invitadoId) {
    const invitado = invitados.find(i => i.id === invitadoId);
    if (!invitado) return;
    
    const modalHTML = `
        <div class="modal-nuevo active">
            <div class="modal-overlay-nuevo" onclick="cerrarModalesNuevos()"></div>
            <div class="modal-content-nuevo">
                <button class="modal-close-nuevo" onclick="cerrarModalesNuevos()">×</button>
                <h2><i class="fas fa-edit"></i> Editar Invitado</h2>
                
                <form id="formEditarInvitado" onsubmit="event.preventDefault(); actualizarInvitadoNuevo(${invitadoId});">
                    <div class="form-group">
                        <label>Nombre Completo *</label>
                        <input type="text" id="editInvitadoNombre" required value="${invitado.nombre}" autofocus>
                    </div>
                    
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="editInvitadoEmail" value="${invitado.email || ''}">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="tel" id="editInvitadoTelefono" value="${invitado.telefono || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label>Estado</label>
                            <select id="editInvitadoEstado">
                                <option value="pendiente" ${invitado.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="confirmado" ${invitado.estado === 'confirmado' ? 'selected' : ''}>Confirmado</option>
                                <option value="rechazado" ${invitado.estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="button-group">
                        <button type="button" class="btn-secondary" onclick="cerrarModalesNuevos()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Actualizar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

function actualizarInvitadoNuevo(invitadoId) {
    const invitado = invitados.find(i => i.id === invitadoId);
    if (!invitado) return;
    
    invitado.nombre = document.getElementById('editInvitadoNombre').value.trim();
    invitado.email = document.getElementById('editInvitadoEmail').value.trim();
    invitado.telefono = document.getElementById('editInvitadoTelefono').value.trim();
    const nuevoEstado = document.getElementById('editInvitadoEstado').value;
    
    // Actualizar estado del invitado
    invitado.estado = nuevoEstado;
    
    // Si está asignado a una silla, actualizar el color de la silla
    if (invitado.mesa !== null && invitado.silla !== null) {
        const mesa = mesas.find(m => m.id === invitado.mesa);
        if (mesa) {
            const silla = mesa.sillas.find(s => s.id === invitado.silla);
            if (silla) {
                // Mapear estado de invitado a estado de silla
                if (nuevoEstado === 'confirmado') {
                    silla.estado = 'confirmado';
                } else if (nuevoEstado === 'rechazado') {
                    silla.estado = 'asignado'; // rojo
                } else {
                    silla.estado = 'asignado'; // rojo por defecto si está asignado
                }
            }
        }
    }
    
    mostrarToastNuevo('✅ Invitado actualizado', 'success');
    cerrarModalesNuevos();
    actualizarListaInvitados();
    renderizarMesas();
}

// ===== ASIGNAR INVITADO =====
window.asignarInvitadoNuevo = function(invitadoId) {
    mostrarToastNuevo('💡 Haz click en una silla disponible para asignar este invitado', 'info');
    window.invitadoPendienteAsignacion = invitadoId;
};

// ===== MODAL CAMBIAR DISPOSICIÓN =====
if (document.getElementById('changeLayoutBtn')) {
    document.getElementById('changeLayoutBtn').addEventListener('click', mostrarModalDisposicionNuevo);
}

function mostrarModalDisposicionNuevo() {
    const modalHTML = `
        <div class="modal-nuevo active">
            <div class="modal-overlay-nuevo" onclick="cerrarModalesNuevos()"></div>
            <div class="modal-content-nuevo">
                <button class="modal-close-nuevo" onclick="cerrarModalesNuevos()">×</button>
                <h2><i class="fas fa-th"></i> Cambiar Disposición</h2>
                
                <div class="layout-options">
                    <div class="layout-option selected" data-layout="grid">
                        <i class="fas fa-th"></i>
                        <p>Cuadrícula</p>
                        <small>Disposición en filas y columnas</small>
                    </div>
                    <div class="layout-option" data-layout="circle">
                        <i class="fas fa-circle"></i>
                        <p>Circular</p>
                        <small>Mesas en círculo</small>
                    </div>
                    <div class="layout-option" data-layout="custom">
                        <i class="fas fa-sliders-h"></i>
                        <p>Personalizado</p>
                        <small>Arrastra las mesas</small>
                    </div>
                </div>
                
                <div class="button-group" style="margin-top: 24px;">
                    <button class="btn-secondary" onclick="cerrarModalesNuevos()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn-primary" onclick="aplicarDisposicionNuevo()">
                        <i class="fas fa-check"></i> Aplicar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    document.querySelectorAll('.layout-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.layout-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

function aplicarDisposicionNuevo() {
    const selectedLayout = document.querySelector('.layout-option.selected');
    const layoutType = selectedLayout ? selectedLayout.getAttribute('data-layout') : 'grid';
    
    mostrarToastNuevo('✅ Disposición ' + layoutType + ' aplicada', 'success');
    cerrarModalesNuevos();
}

// ===== CERRAR MODALES =====
function cerrarModalesNuevos() {
    const modales = document.querySelectorAll('.modal-nuevo');
    modales.forEach(modal => {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 300);
    });
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        cerrarModalesNuevos();
    }
});

// ===== TOAST NOTIFICATIONS =====
function mostrarToastNuevo(mensaje, tipo = 'info') {
    const iconos = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast-nuevo ${tipo}`;
    toast.innerHTML = `
        <i class="fas ${iconos[tipo]}"></i>
        <span>${mensaje}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ===== MEJORAR LISTA DE INVITADOS =====
const actualizarListaInvitadosOriginal = actualizarListaInvitados;

actualizarListaInvitados = function() {
    if (!guestsList) return;
    
    const filtro = guestFilter ? guestFilter.value : 'all';
    const busqueda = guestSearch ? guestSearch.value.toLowerCase() : '';
    
    let invitadosFiltrados = invitados.filter(inv => {
        const matchBusqueda = inv.nombre.toLowerCase().includes(busqueda) || 
                             (inv.email && inv.email.toLowerCase().includes(busqueda));
        
        if (filtro === 'all') return matchBusqueda;
        if (filtro === 'assigned') return matchBusqueda && inv.mesa;
        if (filtro === 'unassigned') return matchBusqueda && !inv.mesa;
        if (filtro === 'confirmed') return matchBusqueda && inv.estado === 'confirmado';
        
        return matchBusqueda;
    });
    
    guestsList.innerHTML = '';
    
    if (invitadosFiltrados.length === 0) {
        guestsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>No hay invitados</p>
                <small>Agrega invitados con el botón de arriba</small>
            </div>
        `;
        return;
    }
    
    invitadosFiltrados.forEach(invitado => {
        const guestItem = document.createElement('div');
        guestItem.className = 'guest-item';
        guestItem.style.cursor = 'pointer';
        
        let estadoClass = 'confirmado';
        let estadoTexto = 'Confirmado';
        let estadoColor = '#d1fae5';
        let estadoTextColor = '#065f46';
        
        if (invitado.estado === 'pendiente') {
            estadoClass = 'pendiente';
            estadoTexto = 'Pendiente';
            estadoColor = '#fef3c7';
            estadoTextColor = '#92400e';
        } else if (invitado.estado === 'rechazado') {
            estadoClass = 'rechazado';
            estadoTexto = 'Rechazado';
            estadoColor = '#fee2e2';
            estadoTextColor = '#991b1b';
        }
        
        const mesaInfo = invitado.mesa ? `Mesa ${invitado.mesa}, Silla ${invitado.silla}` : 'Sin asignar';
        
        guestItem.innerHTML = `
            <strong style="font-size: 0.95rem; color: #0f172a;">${invitado.nombre}</strong>
            <small style="display: block; color: #64748b; font-size: 0.85rem;">${invitado.email || 'Sin email'}</small>
            <small style="display: block; margin-top: 4px; color: #94a3b8; font-size: 0.8rem;">${mesaInfo}</small>
            <div class="guest-actions">
                <button class="btn-guest-action" onclick="editarInvitadoNuevo(${invitado.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-guest-action" onclick="asignarInvitadoNuevo(${invitado.id})" title="Asignar a mesa">
                    <i class="fas fa-chair"></i>
                </button>
            </div>
            <span style="display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; margin-top: 6px; background: ${estadoColor}; color: ${estadoTextColor};">${estadoTexto}</span>
        `;
        
        guestsList.appendChild(guestItem);
    });
};

console.log('✅ Funcionalidades nuevas cargadas: Modales, Colores, Cerrar Sesión, Botones');
