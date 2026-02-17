// cliente.js - Sistema de gestión de eventos ARREGLADO Y FUNCIONAL
// Versión: 3.0 - Con 3 formas de mesas y validaciones

const API_BASE = 'https://titi-invita-app-azhcw.ondigitalocean.app/api';
let currentUser = null;
let currentEvent = null;
let mesas = [];
let invitados = [];

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando cliente.js arreglado');
    
    // Verificar autenticación
    const usuarioStr = localStorage.getItem('titi_usuario_actual');
    if (!usuarioStr) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(usuarioStr);
    console.log('✅ Usuario cargado:', currentUser.nombre, '- Rol:', currentUser.rol);
    
    // Inicializar interfaz
    inicializarInterfaz();
    cargarEventos();
    setupEventListeners();
});

// ============================================
// INICIALIZAR INTERFAZ
// ============================================

function inicializarInterfaz() {
    // Actualizar info de usuario
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const roleBadge = document.getElementById('roleBadge');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) userName.textContent = currentUser.nombre;
    if (userRole) userRole.textContent = currentUser.rol.charAt(0).toUpperCase() + currentUser.rol.slice(1);
    if (roleBadge) {
        roleBadge.textContent = currentUser.rol.toUpperCase();
        roleBadge.className = 'role-badge ' + currentUser.rol;
    }
    if (userAvatar) {
        const iniciales = currentUser.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        userAvatar.textContent = iniciales;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    console.log('📌 Configurando event listeners...');
    
    // Botón nuevo evento
    const newEventBtn = document.getElementById('newEventBtn');
    if (newEventBtn) {
        newEventBtn.addEventListener('click', () => abrirModalNuevoEvento());
    }
    
    // Botón refrescar
    const refreshEventsBtn = document.getElementById('refreshEventsBtn');
    if (refreshEventsBtn) {
        refreshEventsBtn.addEventListener('click', () => cargarEventos());
    }
    
    // Selector de eventos
    const eventSelector = document.getElementById('eventSelector');
    if (eventSelector) {
        eventSelector.addEventListener('change', (e) => {
            if (e.target.value) {
                cargarEvento(e.target.value);
            }
        });
    }
    
    // Botón guardar evento
    const btnGuardarEvento = document.getElementById('btnGuardarEvento');
    if (btnGuardarEvento) {
        btnGuardarEvento.addEventListener('click', () => guardarCambiosEvento());
    }
    
    // Botón crear mesas
    const btnCrearMesas = document.getElementById('btnCrearMesas');
    if (btnCrearMesas) {
        btnCrearMesas.addEventListener('click', () => crearActualizarMesas());
    }
    
    // Botón agregar invitado ← FIX PRINCIPAL
    const addGuestBtn = document.getElementById('addGuestBtn');
    const addGuestModal = document.getElementById('addGuestModal');
    if (addGuestBtn && addGuestModal) {
        addGuestBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('✅ Abriendo modal de invitado');
            addGuestModal.classList.add('active');
            addGuestModal.style.display = 'flex';
        });
    }
    
    // Cerrar modales
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.display = 'none';
            }
        });
    });
    
    // Cerrar modal al hacer click fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                this.style.display = 'none';
            }
        });
    });
    
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            cambiarTab(tabName);
        });
    });
    
    console.log('✅ Event listeners configurados');
}

// ============================================
// CARGAR EVENTOS
// ============================================

async function cargarEventos() {
    try {
        const token = obtenerToken();
        let endpoint = '/eventos-usuario';
        
        if (currentUser.rol === 'admin') {
            endpoint = '/eventos';
        } else if (currentUser.rol === 'organizador') {
            endpoint = '/mis-eventos';
        } else if (currentUser.rol === 'colaborador') {
            endpoint = '/mi-evento';
        }
        
        console.log('📥 Cargando eventos desde:', endpoint);
        
        const response = await fetch(API_BASE + endpoint, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) throw new Error('Error al cargar eventos');
        
        const data = await response.json();
        const eventos = Array.isArray(data) ? data : (data.eventos || [data]);
        
        console.log('✅ Eventos cargados:', eventos.length);
        
        // Llenar selector
        const eventSelector = document.getElementById('eventSelector');
        if (eventSelector) {
            eventSelector.innerHTML = '<option value="">Seleccionar Evento...</option>';
            eventos.forEach(evento => {
                const option = document.createElement('option');
                option.value = evento.id;
                option.textContent = evento.nombre;
                eventSelector.appendChild(option);
            });
            
            // Cargar primer evento automáticamente
            if (eventos.length > 0) {
                eventSelector.value = eventos[0].id;
                cargarEvento(eventos[0].id);
            }
        }
        
    } catch (error) {
        console.error('❌ Error cargando eventos:', error);
        showToast('Error al cargar eventos', 'error');
    }
}

// ============================================
// CARGAR EVENTO
// ============================================

async function cargarEvento(eventoId) {
    try {
        console.log('📥 Cargando evento:', eventoId);
        
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/eventos/' + eventoId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) throw new Error('Error al cargar evento');
        
        currentEvent = await response.json();
        console.log('✅ Evento cargado:', currentEvent);
        
        // Actualizar UI
        actualizarInfoEvento();
        await cargarMesas(eventoId);
        await cargarInvitados(eventoId);
        
    } catch (error) {
        console.error('❌ Error cargando evento:', error);
        showToast('Error al cargar evento', 'error');
    }
}

// ============================================
// ACTUALIZAR INFO EVENTO
// ============================================

function actualizarInfoEvento() {
    if (!currentEvent) return;
    
    const currentEventName = document.getElementById('currentEventName');
    const currentEventDate = document.getElementById('currentEventDate');
    const currentEventStatus = document.getElementById('currentEventStatus');
    const eventName = document.getElementById('eventName');
    const eventDate = document.getElementById('eventDate');
    const eventTime = document.getElementById('eventTime');
    const eventDescription = document.getElementById('eventDescription');
    
    if (currentEventName) currentEventName.textContent = currentEvent.nombre;
    if (currentEventDate && currentEvent.fecha_evento) {
        const fecha = new Date(currentEvent.fecha_evento);
        currentEventDate.textContent = fecha.toLocaleDateString();
    }
    if (currentEventStatus) {
        const statusSpan = currentEventStatus.querySelector('span');
        if (statusSpan) statusSpan.textContent = currentEvent.estado || 'activo';
    }
    
    // Formulario
    if (eventName) eventName.value = currentEvent.nombre || '';
    if (eventDate && currentEvent.fecha_evento) {
        const fecha = new Date(currentEvent.fecha_evento);
        eventDate.value = fecha.toISOString().split('T')[0];
    }
    if (eventTime && currentEvent.fecha_evento) {
        const fecha = new Date(currentEvent.fecha_evento);
        eventTime.value = fecha.toTimeString().substring(0, 5);
    }
    if (eventDescription) eventDescription.value = currentEvent.descripcion || '';
}

// ============================================
// CARGAR MESAS
// ============================================

async function cargarMesas(eventoId) {
    try {
        console.log('📥 Cargando mesas del evento:', eventoId);
        
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/eventos/' + eventoId + '/mesas', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) throw new Error('Error al cargar mesas');
        
        mesas = await response.json();
        console.log('✅ Mesas cargadas:', mesas.length);
        
        renderizarMesas(mesas);
        actualizarEstadisticas();
        
    } catch (error) {
        console.error('❌ Error cargando mesas:', error);
        mesas = [];
        renderizarMesas([]);
    }
}

// ============================================
// RENDERIZAR MESAS - FIX PRINCIPAL
// ============================================

function renderizarMesas(mesas) {
    const container = document.getElementById('mesasContainer');
    if (!container) {
        console.error('❌ Container de mesas no encontrado');
        return;
    }
    
    console.log('🎨 Renderizando', mesas.length, 'mesas');
    
    // Limpiar
    container.innerHTML = '';
    
    // Si no hay mesas, mostrar empty state
    if (!mesas || mesas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chair"></i>
                <p>No hay mesas creadas</p>
                <small>Usa "Crear/Actualizar Mesas" para comenzar</small>
            </div>
        `;
        return;
    }
    
    // Renderizar cada mesa
    mesas.forEach(mesa => {
        if (!mesa) return;
        
        const mesaElement = crearElementoMesa(mesa);
        if (mesaElement) {
            container.appendChild(mesaElement);
        }
    });
    
    console.log('✅ Mesas renderizadas');
}

// ============================================
// CREAR ELEMENTO MESA - FIX COMPLETO
// ============================================

function crearElementoMesa(mesa) {
    const mesaDiv = document.createElement('div');
    mesaDiv.className = 'mesa';
    mesaDiv.setAttribute('data-mesa-id', mesa.id);
    mesaDiv.style.position = 'absolute';
    mesaDiv.style.left = (mesa.posicion_x || 50) + 'px';
    mesaDiv.style.top = (mesa.posicion_y || 50) + 'px';
    mesaDiv.style.cursor = 'move';
    mesaDiv.style.transition = 'all 0.3s';
    
    const forma = mesa.forma || 'rectangular';
    
    // Configuración según forma
    if (forma === 'circular') {
        mesaDiv.style.width = '150px';
        mesaDiv.style.height = '150px';
        mesaDiv.style.borderRadius = '50%';
        mesaDiv.style.background = '#8B4513';
        mesaDiv.style.border = '6px solid #654321';
        mesaDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    } else if (forma === 'cuadrada') {
        mesaDiv.style.width = '150px';
        mesaDiv.style.height = '150px';
        mesaDiv.style.borderRadius = '12px';
        mesaDiv.style.background = '#8B4513';
        mesaDiv.style.border = '6px solid #654321';
        mesaDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    } else { // rectangular
        mesaDiv.style.width = '200px';
        mesaDiv.style.height = '100px';
        mesaDiv.style.borderRadius = '12px';
        mesaDiv.style.background = '#8B4513';
        mesaDiv.style.border = '6px solid #654321';
        mesaDiv.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    }
    
    // Título de la mesa
    const titulo = document.createElement('div');
    titulo.className = 'mesa-titulo';
    titulo.textContent = mesa.nombre || `Mesa ${mesa.numero}`;
    titulo.style.position = 'absolute';
    titulo.style.top = '50%';
    titulo.style.left = '50%';
    titulo.style.transform = 'translate(-50%, -50%)';
    titulo.style.color = 'white';
    titulo.style.fontWeight = 'bold';
    titulo.style.fontSize = '16px';
    titulo.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    titulo.style.pointerEvents = 'none';
    mesaDiv.appendChild(titulo);
    
    // Agregar sillas
    const numSillas = mesa.capacidad || 8;
    for (let i = 0; i < numSillas; i++) {
        const silla = crearSilla(i, numSillas, forma, mesa.id);
        if (silla) {
            mesaDiv.appendChild(silla);
        }
    }
    
    return mesaDiv;
}

// ============================================
// CREAR SILLA
// ============================================

function crearSilla(index, total, forma, mesaId) {
    const silla = document.createElement('div');
    silla.className = 'silla';
    silla.setAttribute('data-silla-numero', index + 1);
    silla.setAttribute('data-mesa-id', mesaId);
    silla.style.position = 'absolute';
    silla.style.width = '30px';
    silla.style.height = '30px';
    silla.style.borderRadius = '6px';
    silla.style.background = '#999';
    silla.style.border = '2px solid #666';
    silla.style.cursor = 'pointer';
    silla.style.display = 'flex';
    silla.style.alignItems = 'center';
    silla.style.justifyContent = 'center';
    silla.style.color = 'white';
    silla.style.fontSize = '11px';
    silla.style.fontWeight = 'bold';
    silla.style.transition = 'all 0.3s';
    silla.textContent = index + 1;
    
    // Hover effect
    silla.addEventListener('mouseenter', function() {
        this.style.background = '#764ba2';
        this.style.transform = 'scale(1.1)';
    });
    
    silla.addEventListener('mouseleave', function() {
        this.style.background = '#999';
        this.style.transform = 'scale(1)';
    });
    
    // Posicionar silla según forma
    if (forma === 'circular') {
        const angulo = (360 / total) * index;
        const radianes = (angulo - 90) * (Math.PI / 180);
        const radio = 90;
        silla.style.left = (75 + radio * Math.cos(radianes) - 15) + 'px';
        silla.style.top = (75 + radio * Math.sin(radianes) - 15) + 'px';
    } else if (forma === 'cuadrada') {
        const lado = Math.floor(index / Math.ceil(total / 4));
        const posEnLado = index % Math.ceil(total / 4);
        const espaciado = 40;
        
        if (lado === 0) { // Arriba
            silla.style.left = (20 + posEnLado * espaciado) + 'px';
            silla.style.top = '-40px';
        } else if (lado === 1) { // Derecha
            silla.style.left = '160px';
            silla.style.top = (20 + posEnLado * espaciado) + 'px';
        } else if (lado === 2) { // Abajo
            silla.style.left = (20 + posEnLado * espaciado) + 'px';
            silla.style.top = '160px';
        } else { // Izquierda
            silla.style.left = '-40px';
            silla.style.top = (20 + posEnLado * espaciado) + 'px';
        }
    } else { // rectangular
        const espaciado = 45;
        
        if (index < 2) { // Lados cortos
            silla.style.left = index === 0 ? '-40px' : '210px';
            silla.style.top = '35px';
        } else { // Lados largos
            const pos = index - 2;
            const mitad = Math.floor((total - 2) / 2);
            
            if (pos < mitad) { // Arriba
                silla.style.left = (20 + pos * espaciado) + 'px';
                silla.style.top = '-40px';
            } else { // Abajo
                const posAbajo = pos - mitad;
                silla.style.left = (20 + posAbajo * espaciado) + 'px';
                silla.style.top = '110px';
            }
        }
    }
    
    return silla;
}

// ============================================
// CREAR/ACTUALIZAR MESAS
// ============================================

async function crearActualizarMesas() {
    if (!currentEvent) {
        showToast('Selecciona un evento primero', 'error');
        return;
    }
    
    const numMesas = parseInt(document.getElementById('numMesas').value);
    const sillasPorMesa = parseInt(document.getElementById('sillasPorMesa').value);
    const formaMesa = document.getElementById('formaMesa').value;
    
    if (!numMesas || !sillasPorMesa) {
        showToast('Completa todos los campos', 'error');
        return;
    }
    
    console.log('🔨 Creando mesas:', { numMesas, sillasPorMesa, formaMesa });
    
    try {
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/eventos/' + currentEvent.id + '/mesas', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cantidad: numMesas,
                capacidad: sillasPorMesa,
                forma: formaMesa
            })
        });
        
        if (!response.ok) throw new Error('Error al crear mesas');
        
        showToast('Mesas creadas exitosamente', 'success');
        await cargarMesas(currentEvent.id);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('Error al crear mesas', 'error');
    }
}

// ============================================
// CARGAR INVITADOS
// ============================================

async function cargarInvitados(eventoId) {
    try {
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/invitados?evento_id=' + eventoId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) throw new Error('Error al cargar invitados');
        
        invitados = await response.json();
        console.log('✅ Invitados cargados:', invitados.length);
        
        renderizarInvitados(invitados);
        actualizarEstadisticas();
        
    } catch (error) {
        console.error('❌ Error cargando invitados:', error);
        invitados = [];
    }
}

// ============================================
// RENDERIZAR INVITADOS
// ============================================

function renderizarInvitados(invitados) {
    const container = document.getElementById('invitadosList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!invitados || invitados.length === 0) {
        container.innerHTML = `
            <div class="empty-invitados">
                <i class="fas fa-user-friends"></i>
                <p>No hay invitados agregados</p>
                <small>Agrega invitados para comenzar</small>
            </div>
        `;
        return;
    }
    
    invitados.forEach(inv => {
        const div = document.createElement('div');
        div.className = 'invitado-item';
        div.innerHTML = `
            <div class="invitado-info">
                <strong>${inv.nombre}</strong>
                <small>${inv.email || 'Sin email'}</small>
            </div>
            <div class="invitado-estado ${inv.estado}">
                ${inv.estado}
            </div>
        `;
        container.appendChild(div);
    });
}

// ============================================
// ACTUALIZAR ESTADÍSTICAS
// ============================================

function actualizarEstadisticas() {
    const statTotalMesas = document.getElementById('statTotalMesas');
    const statTotalSillas = document.getElementById('statTotalSillas');
    const statSillasOcupadas = document.getElementById('statSillasOcupadas');
    const statPorcentajeOcupacion = document.getElementById('statPorcentajeOcupacion');
    const confirmados = document.getElementById('confirmados');
    const pendientes = document.getElementById('pendientes');
    const rechazados = document.getElementById('rechazados');
    
    const totalMesas = mesas.length;
    const totalSillas = mesas.reduce((sum, m) => sum + (m.capacidad || 0), 0);
    const ocupadas = invitados.filter(i => i.mesa_id && i.silla_numero).length;
    const porcentaje = totalSillas > 0 ? Math.round((ocupadas / totalSillas) * 100) : 0;
    
    if (statTotalMesas) statTotalMesas.textContent = totalMesas;
    if (statTotalSillas) statTotalSillas.textContent = totalSillas;
    if (statSillasOcupadas) statSillasOcupadas.textContent = ocupadas;
    if (statPorcentajeOcupacion) statPorcentajeOcupacion.textContent = porcentaje + '%';
    
    const conf = invitados.filter(i => i.estado === 'confirmado').length;
    const pend = invitados.filter(i => i.estado === 'pendiente').length;
    const rech = invitados.filter(i => i.estado === 'rechazado').length;
    
    if (confirmados) confirmados.textContent = conf;
    if (pendientes) pendientes.textContent = pend;
    if (rechazados) rechazados.textContent = rech;
}

// ============================================
// UTILIDADES
// ============================================

function obtenerToken() {
    return localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('messageToast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function cambiarTab(tabName) {
    // Desactivar todos los tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // Activar el tab seleccionado
    const tab = document.querySelector(`[data-tab="${tabName}"]`);
    const content = document.getElementById(tabName + 'Tab');
    
    if (tab) tab.classList.add('active');
    if (content) content.classList.add('active');
}

function abrirModalNuevoEvento() {
    const modal = document.getElementById('newEventModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

async function guardarCambiosEvento() {
    if (!currentEvent) return;
    
    const nombre = document.getElementById('eventName').value;
    const fecha = document.getElementById('eventDate').value;
    const hora = document.getElementById('eventTime').value;
    const descripcion = document.getElementById('eventDescription').value;
    
    try {
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/eventos/' + currentEvent.id, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre,
                fecha_evento: fecha + ' ' + hora,
                descripcion
            })
        });
        
        if (!response.ok) throw new Error('Error');
        
        showToast('Evento actualizado', 'success');
        cargarEvento(currentEvent.id);
        
    } catch (error) {
        showToast('Error al actualizar', 'error');
    }
}

async function finalizarEvento() {
    if (!currentEvent) return;
    if (!confirm('¿Eliminar este evento?')) return;
    
    try {
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/eventos/' + currentEvent.id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) throw new Error('Error');
        
        showToast('Evento eliminado', 'success');
        currentEvent = null;
        cargarEventos();
        
    } catch (error) {
        showToast('Error al eliminar', 'error');
    }
}

console.log('✅ cliente.js cargado y arreglado');
