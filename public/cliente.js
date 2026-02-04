// cliente.js - Sistema de mesas completo para cliente con 3 roles

// ===== CONFIGURACIÓN API =====
const API_BASE = 'https://titi-invita-app-azhcw.ondigitalocean.app/api';
console.log('🔗 API configurada:', API_BASE);

// ===== FUNCIONES DE AUTENTICACIÓN =====
function obtenerToken() {
    return localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
}

function limpiarSesion() {
    localStorage.removeItem('titi_token');
    localStorage.removeItem('titi_sesion');
    localStorage.removeItem('titi_usuario_actual');
    sessionStorage.removeItem('titi_token');
    sessionStorage.removeItem('titi_sesion');
}

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
    espaciado: 150
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
// const logoutBtn = document.getElementById('logoutBtn'); // Se obtiene dentro de configurarEventListeners
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const roleBadge = document.getElementById('roleBadge');
const eventLimitInfo = document.getElementById('eventLimitInfo');
const limitText = document.getElementById('limitText');
const searchGuests = document.getElementById('searchGuests');
// const zoomInBtn = document.getElementById('zoomInBtn'); // Se obtiene dentro de configurarEventListeners
// const zoomOutBtn = document.getElementById('zoomOutBtn'); // Se obtiene dentro de configurarEventListeners
// const resetViewBtn = document.getElementById('resetViewBtn'); // Se obtiene dentro de configurarEventListeners
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

// Lista de invitados
const guestsList = document.getElementById('guestsList');
const guestSearch = document.getElementById('guestSearch');
const guestFilter = document.getElementById('guestFilter');
const addGuestBtn = document.getElementById('addGuestBtn');
const guestDetails = document.getElementById('guestDetails');

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Cargar usuario actual desde localStorage directamente
    const usuarioStr = localStorage.getItem('titi_usuario_actual');
    
    if (!usuarioStr) {
        console.log('❌ No hay usuario en localStorage, redirigiendo a login');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        usuario = JSON.parse(usuarioStr);
        console.log('✅ Usuario cargado:', usuario.nombre, usuario.rol);
    } catch (error) {
        console.error('❌ Error parseando usuario:', error);
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
async function cargarEventosUsuario() {
    const token = obtenerToken();
    
    if (!token) {
        console.log('❌ No hay token');
        return;
    }
    
    try {
        console.log('📡 Cargando eventos...');
        
        const response = await fetch(`${API_BASE}/eventos-usuario`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('📊 Eventos:', data);
        
        if (response.ok && data.success) {
            eventosCliente = data.eventos || [];
            
            // Llenar selector
            eventSelector.innerHTML = '<option value="">Seleccionar evento...</option>';
            eventosCliente.forEach(evento => {
                const option = document.createElement('option');
                option.value = evento.id;
                option.textContent = evento.nombre;
                eventSelector.appendChild(option);
            });
            
            // Cargar primer evento
            if (eventosCliente.length > 0) {
                await cargarEvento(eventosCliente[0].id);
            }
            
            actualizarEstadisticasEventos();
        } else {
            console.error('❌ Error:', data.message);
            mostrarMensaje(data.message || 'Error cargando eventos', 'error');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('Error de conexión', 'error');
    }
}

function actualizarEstadisticasEventos() {
    const total = eventosCliente.length;
    const activos = eventosCliente.filter(e => e.estado === 'activo').length;
    
    totalEventsCount.textContent = total;
    activeEventsCount.textContent = activos;
}

// 2. Cargar un evento específico
async function cargarEvento(eventoId) {
    const token = obtenerToken();
    eventoActual = eventosCliente.find(e => e.id === eventoId);
    
    if (!eventoActual) {
        console.log('❌ Evento no encontrado');
        return;
    }
    
    console.log('📂 Cargando evento:', eventoActual.nombre);
    
    // Actualizar UI
    currentEventName.textContent = eventoActual.nombre;
    eventNameInput.value = eventoActual.nombre || '';
    eventDescriptionInput.value = eventoActual.descripcion || '';
    
    if (eventoActual.fecha_evento) {
        const fecha = new Date(eventoActual.fecha_evento);
        eventDateInput.value = fecha.toISOString().split('T')[0];
        eventTimeInput.value = fecha.toTimeString().slice(0,5);
    }
    
    // Cargar mesas desde API
    try {
        const response = await fetch(`${API_BASE}/eventos/${eventoId}/mesas`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('📊 Mesas:', data);
        
        if (response.ok && data.success) {
            mesas = data.mesas || [];
            
            // Si no hay mesas, crear por defecto
            if (mesas.length === 0) {
                crearMesas();
            } else {
                renderizarMesas();
            }
            
            actualizarEstadisticas();
        }
    } catch (error) {
        console.error('❌ Error cargando mesas:', error);
        crearMesas();
    }
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
        const margenLateral = 17;
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
        const radio = 65; // Reducido para que las sillas no se salgan
        
        for (let i = 0; i < numSillas; i++) {
            const angulo = (2 * Math.PI / numSillas) * i - (Math.PI / 2); // Empezar desde arriba
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
    
    const nombre = document.getElementById('newEventName').value.trim();
    const fecha = document.getElementById('newEventDate').value;
    const hora = document.getElementById('newEventTime').value;
    const ubicacion = document.getElementById('newEventLocation').value;
    const tipo = document.getElementById('newEventType').value;
    const numMesas = parseInt(document.getElementById('newEventMesas').value) || 8;
    const sillasPorMesa = parseInt(document.getElementById('newEventSillas').value) || 8;
    const formaMesa = document.getElementById('newEventForma').value;
    
    if (!nombre || !fecha) {
        mostrarMensaje('Nombre y fecha son obligatorios', 'error');
        return;
    }
    
    if (numMesas < 1 || numMesas > 50) {
        mostrarMensaje('El número de mesas debe estar entre 1 y 50', 'error');
        return;
    }
    
    if (sillasPorMesa < 2 || sillasPorMesa > 20) {
        mostrarMensaje('Las sillas por mesa deben estar entre 2 y 20', 'error');
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
        estado: 'activo', // Siempre activo, no hay borradores
        mesas: numMesas,
        sillasPorMesa: sillasPorMesa,
        formaMesa: formaMesa,
        configuracion: {}
    };
    
    eventosCliente.push(nuevoEvento);
    
    // Agregar al selector
    const option = document.createElement('option');
    option.value = nuevoEvento.id;
    option.textContent = nuevoEvento.nombre;
    eventSelector.appendChild(option);
    
    // Seleccionar el nuevo evento
    eventSelector.value = nuevoEvento.id;
    cargarEvento(nuevoEvento.id);
    
    // Cerrar modal
    document.getElementById('newEventModal').style.display = 'none';
    
    // Actualizar estadísticas
    actualizarEstadisticasEventos();
    
    mostrarMensaje(`Nuevo evento "${nombre}" creado`, 'success');
    
    // Verificar límite después de crear
    verificarLimiteEventos();
}

// 9. Finalizar evento
async function eliminarEvento() {
    if (!eventoActual) {
        mostrarMensaje('No hay evento seleccionado', 'error');
        return;
    }
    
    if (!confirm(`⚠️ ¿Estás seguro de ELIMINAR el evento "${eventoActual.nombre}"?\n\nEsta acción NO se puede deshacer y borrará todas las mesas e invitados asociados.`)) {
        return;
    }
    
    const eventoId = eventoActual.id;
    const token = obtenerToken();
    
    try {
        console.log('🗑️ Eliminando evento:', eventoId);
        
        const response = await fetch(`${API_BASE}/eventos/${eventoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            mostrarMensaje(`Evento "${eventoActual.nombre}" eliminado`, 'success');
            
            eventosCliente = eventosCliente.filter(e => e.id !== eventoId);
            const option = eventSelector.querySelector(`option[value="${eventoId}"]`);
            if (option) option.remove();
            
            eventoActual = null;
            mesas = [];
            invitados = [];
            mesasContainer.innerHTML = '';
            
            actualizarEstadisticasEventos();
            
            if (limiteEventos === 1) {
                verificarLimiteEventos();
            }
            
            if (eventosCliente.length > 0) {
                cargarEvento(eventosCliente[0].id);
            } else {
                currentEventName.textContent = 'Sin eventos';
            }
        } else {
            mostrarMensaje(data.message || 'Error eliminando evento', 'error');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('Error de conexión', 'error');
    }
}

// 10. Configurar event listeners
function configurarEventListeners() {
    console.log('🎯 Configurando event listeners...');
    
    try {
        // Selector de evento
        if (eventSelector) {
            eventSelector.addEventListener('change', function() {
                if (this.value) {
                    cargarEvento(parseInt(this.value));
                }
            });
            console.log('✅ Event selector configurado');
        }
    } catch (e) { console.error('❌ Error en eventSelector:', e); }
    
    try {
        // Botón crear mesas
        if (btnCrearMesas) {
            btnCrearMesas.addEventListener('click', crearMesas);
            console.log('✅ btnCrearMesas configurado');
        }
    } catch (e) { console.error('❌ Error en btnCrearMesas:', e); }
    
    try {
        // Botón guardar evento
        if (btnGuardarEvento) {
            btnGuardarEvento.addEventListener('click', function() {
                guardarEvento();
            });
            console.log('✅ btnGuardarEvento configurado');
        }
    } catch (e) { console.error('❌ Error en btnGuardarEvento:', e); }
    
    try {
        // Botón finalizar evento
        if (btnFinalizarEvento) {
            btnFinalizarEvento.addEventListener('click', eliminarEvento);
            console.log('✅ btnFinalizarEvento configurado');
        }
    } catch (e) { console.error('❌ Error en btnFinalizarEvento:', e); }
    
    try {
        // Botón nuevo evento
        if (newEventBtn) {
            newEventBtn.addEventListener('click', function() {
                document.getElementById('newEventModal').style.display = 'flex';
            });
            console.log('✅ newEventBtn configurado');
        }
    } catch (e) { console.error('❌ Error en newEventBtn:', e); }
    
    try {
        // Cerrar modal nuevo evento
        const modalClose = document.querySelector('#newEventModal .modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', function() {
                document.getElementById('newEventModal').style.display = 'none';
            });
            console.log('✅ Modal close configurado');
        }
    } catch (e) { console.error('❌ Error en modal close:', e); }
    
    try {
        const modalCancel = document.querySelector('#newEventModal .modal-cancel');
        if (modalCancel) {
            modalCancel.addEventListener('click', function() {
                document.getElementById('newEventModal').style.display = 'none';
            });
            console.log('✅ Modal cancel configurado');
        }
    } catch (e) { console.error('❌ Error en modal cancel:', e); }
    
    try {
        // Crear evento
        const createBtn = document.getElementById('createEventBtn');
        if (createBtn) {
            createBtn.addEventListener('click', function() {
                crearNuevoEvento();
            });
            console.log('✅ createEventBtn configurado');
        }
    } catch (e) { console.error('❌ Error en createEventBtn:', e); }
    
    try {
        // Cerrar sesión
        const logoutBtn = document.getElementById('logoutBtn');
        console.log('🔍 logoutBtn:', logoutBtn);
        if (logoutBtn) {
            console.log('✅ Configurando logout');
            logoutBtn.addEventListener('click', function() {
                console.log('🚪 Click en logout');
                if (confirm('¿Cerrar sesión?')) {
                    limpiarSesion();
                    window.location.href = 'login.html';
                }
            });
        } else {
            console.error('❌ No se encontró logoutBtn');
        }
    } catch (e) { console.error('❌ Error en logout:', e); }
    
    try {
        // Fullscreen
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        console.log('🔍 fullscreenBtn:', fullscreenBtn);
        if (fullscreenBtn) {
            console.log('✅ Configurando fullscreen');
            fullscreenBtn.addEventListener('click', function() {
                console.log('🖥️ Click en fullscreen');
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                    this.querySelector('i').className = 'fas fa-compress';
                } else {
                    document.exitFullscreen();
                    this.querySelector('i').className = 'fas fa-expand';
                }
            });
        } else {
            console.error('❌ No se encontró fullscreenBtn');
        }
    } catch (e) { console.error('❌ Error en fullscreen:', e); }
    
    try {
        // Zoom
        const zoomInBtn = document.getElementById('zoomInBtn');
        const zoomOutBtn = document.getElementById('zoomOutBtn');
        const resetViewBtn = document.getElementById('resetViewBtn');
        
        console.log('🔍 zoomInBtn:', zoomInBtn);
        console.log('🔍 zoomOutBtn:', zoomOutBtn);
        console.log('🔍 resetViewBtn:', resetViewBtn);
        
        if (zoomInBtn) {
            console.log('✅ Configurando zoom in');
            zoomInBtn.addEventListener('click', function(e) {
                console.log('🔍 Click en zoom in, zoomLevel:', zoomLevel);
                e.preventDefault();
                if (zoomLevel < 2) {
                    zoomLevel += 0.1;
                    aplicarZoom();
                    console.log('➕ Nuevo zoomLevel:', zoomLevel);
                }
            });
        } else {
            console.error('❌ No se encontró zoomInBtn');
        }
        
        if (zoomOutBtn) {
            console.log('✅ Configurando zoom out');
            zoomOutBtn.addEventListener('click', function(e) {
                console.log('🔍 Click en zoom out, zoomLevel:', zoomLevel);
                e.preventDefault();
                if (zoomLevel > 0.5) {
                    zoomLevel -= 0.1;
                    aplicarZoom();
                    console.log('➖ Nuevo zoomLevel:', zoomLevel);
                }
            });
        } else {
            console.error('❌ No se encontró zoomOutBtn');
        }
        
        if (resetViewBtn) {
            console.log('✅ Configurando reset view');
            resetViewBtn.addEventListener('click', function(e) {
                console.log('🔄 Click en reset view');
                e.preventDefault();
                zoomLevel = 1;
                aplicarZoom();
                console.log('↩️ zoomLevel reseteado a 1');
            });
        } else {
            console.error('❌ No se encontró resetViewBtn');
        }
    } catch (e) { console.error('❌ Error en zoom:', e); }
    
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
    if (!eventoActual) {
        console.log('⚠️ No hay evento');
        return;
    }
    
    const token = obtenerToken();
    if (!token) {
        mostrarMensaje('Error: No autenticado', 'error');
        return;
    }
    
    try {
        console.log('💾 Guardando...');
        
        // 1. Guardar mesas
        const mesasResponse = await fetch(`${API_BASE}/eventos/${eventoActual.id}/mesas`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mesas: mesas })
        });
        
        if (mesasResponse.ok) {
            console.log('✅ Mesas guardadas');
        }
        
        // 2. Guardar evento
        const eventoResponse = await fetch(`${API_BASE}/eventos/${eventoActual.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre: eventNameInput.value || eventoActual.nombre,
                descripcion: eventDescriptionInput.value || '',
                fecha_evento: eventDateInput.value ? `${eventDateInput.value}T${eventTimeInput.value || '00:00'}:00` : null,
                configuracion: JSON.stringify({
                    mesas: mesas.length,
                    disposicion: configuracionDisposicion
                })
            })
        });
        
        if (eventoResponse.ok) {
            console.log('✅ Evento guardado');
            mostrarMensaje('Cambios guardados', 'success');
        } else {
            const err = await eventoResponse.json();
            console.error('❌ Error:', err);
            mostrarMensaje('Error guardando', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarMensaje('Error de conexión', 'error');
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
    // Limpiar formulario
    document.getElementById('guestName').value = '';
    document.getElementById('guestEmail').value = '';
    document.getElementById('guestPhone').value = '';
    document.querySelector('input[name="guestStatus"][value="pendiente"]').checked = true;
    
    // Mostrar modal
    document.getElementById('addGuestModal').style.display = 'flex';
}

function guardarNuevoInvitado() {
    const nombre = document.getElementById('guestName').value.trim();
    const email = document.getElementById('guestEmail').value.trim();
    const telefono = document.getElementById('guestPhone').value.trim();
    const estado = document.querySelector('input[name="guestStatus"]:checked').value;
    
    if (!nombre) {
        mostrarMensaje('El nombre es obligatorio', 'error');
        return;
    }
    
    const nuevoInvitado = {
        id: invitados.length + 1,
        nombre: nombre,
        email: email || null,
        telefono: telefono || null,
        estado: estado,
        idMesa: null,
        idSilla: null
    };
    
    invitados.push(nuevoInvitado);
    actualizarListaInvitados();
    cerrarModal(document.getElementById('addGuestModal'));
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
    const invitado = invitados.find(i => i.id === invitadoId);
    if (!invitado) {
        mostrarMensaje('Invitado no encontrado', 'error');
        return;
    }
    
    // Llenar formulario con datos actuales
    document.getElementById('editGuestId').value = invitado.id;
    document.getElementById('editGuestName').value = invitado.nombre;
    document.getElementById('editGuestEmail').value = invitado.email || '';
    document.getElementById('editGuestPhone').value = invitado.telefono || '';
    document.querySelector(`input[name="editGuestStatus"][value="${invitado.estado}"]`).checked = true;
    
    // Mostrar modal
    document.getElementById('editGuestModal').style.display = 'flex';
};

function guardarEdicionInvitado() {
    const id = parseInt(document.getElementById('editGuestId').value);
    const nombre = document.getElementById('editGuestName').value.trim();
    const email = document.getElementById('editGuestEmail').value.trim();
    const telefono = document.getElementById('editGuestPhone').value.trim();
    const estado = document.querySelector('input[name="editGuestStatus"]:checked').value;
    
    if (!nombre) {
        mostrarMensaje('El nombre es obligatorio', 'error');
        return;
    }
    
    const invitado = invitados.find(i => i.id === id);
    if (invitado) {
        invitado.nombre = nombre;
        invitado.email = email || null;
        invitado.telefono = telefono || null;
        invitado.estado = estado;
        
        actualizarListaInvitados();
        cerrarModal(document.getElementById('editGuestModal'));
        mostrarMensaje(`Invitado "${nombre}" actualizado`, 'success');
    }
}

function cerrarModal(modal) {
    if (modal) {
        modal.style.display = 'none';
    }
}

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
