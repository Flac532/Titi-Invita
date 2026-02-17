// cliente.js - VERSIÓN PERFECTA con renderizado centrado
const API_BASE = 'https://titi-invita-app-azhcw.ondigitalocean.app/api';
let currentUser = null;
let currentEvent = null;
let mesas = [];
let invitados = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Cliente.js PERFECTO iniciando');
    
    const usuarioStr = localStorage.getItem('titi_usuario_actual');
    if (!usuarioStr) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(usuarioStr);
    console.log('✅ Usuario:', currentUser.nombre);
    
    inicializarInterfaz();
    cargarEventos();
    setupEventListeners();
});

function inicializarInterfaz() {
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const roleBadge = document.getElementById('roleBadge');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) userName.textContent = currentUser.nombre;
    if (userRole) userRole.textContent = currentUser.rol;
    if (roleBadge) {
        roleBadge.textContent = currentUser.rol.toUpperCase();
        roleBadge.className = 'role-badge ' + currentUser.rol;
    }
    if (userAvatar) {
        const iniciales = currentUser.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        userAvatar.textContent = iniciales;
    }
}

function setupEventListeners() {
    const newEventBtn = document.getElementById('newEventBtn');
    const refreshEventsBtn = document.getElementById('refreshEventsBtn');
    const eventSelector = document.getElementById('eventSelector');
    const btnGuardarEvento = document.getElementById('btnGuardarEvento');
    const btnCrearMesas = document.getElementById('btnCrearMesas');
    const addGuestBtn = document.getElementById('addGuestBtn');
    
    if (newEventBtn) newEventBtn.addEventListener('click', () => alert('Crear evento (implementar)'));
    if (refreshEventsBtn) refreshEventsBtn.addEventListener('click', () => cargarEventos());
    if (eventSelector) eventSelector.addEventListener('change', (e) => {
        if (e.target.value) cargarEvento(e.target.value);
    });
    if (btnGuardarEvento) btnGuardarEvento.addEventListener('click', () => guardarCambiosEvento());
    if (btnCrearMesas) btnCrearMesas.addEventListener('click', () => crearActualizarMesas());
    if (addGuestBtn) addGuestBtn.addEventListener('click', () => {
        document.getElementById('addGuestModal').classList.add('active');
    });
}

async function cargarEventos() {
    try {
        const token = obtenerToken();
        let endpoint = '/eventos-usuario';
        if (currentUser.rol === 'admin') endpoint = '/eventos';
        else if (currentUser.rol === 'organizador') endpoint = '/mis-eventos';
        else if (currentUser.rol === 'colaborador') endpoint = '/mi-evento';
        
        const response = await fetch(API_BASE + endpoint, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) throw new Error('Error');
        
        const data = await response.json();
        const eventos = Array.isArray(data) ? data : (data.eventos || [data]);
        
        const eventSelector = document.getElementById('eventSelector');
        if (eventSelector) {
            eventSelector.innerHTML = '<option value="">Seleccionar...</option>';
            eventos.forEach(evento => {
                const option = document.createElement('option');
                option.value = evento.id;
                option.textContent = evento.nombre;
                eventSelector.appendChild(option);
            });
            
            if (eventos.length > 0) {
                eventSelector.value = eventos[0].id;
                cargarEvento(eventos[0].id);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarEvento(eventoId) {
    try {
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/eventos/' + eventoId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) throw new Error('Error');
        
        currentEvent = await response.json();
        console.log('Evento cargado:', currentEvent);
        
        actualizarInfoEvento();
        await cargarMesas(eventoId);
        await cargarInvitados(eventoId);
    } catch (error) {
        console.error('Error:', error);
    }
}

function actualizarInfoEvento() {
    if (!currentEvent) return;
    
    const currentEventName = document.getElementById('currentEventName');
    const currentEventDate = document.getElementById('currentEventDate');
    const eventName = document.getElementById('eventName');
    const eventDate = document.getElementById('eventDate');
    
    if (currentEventName) currentEventName.textContent = currentEvent.nombre;
    if (currentEventDate && currentEvent.fecha_evento) {
        const fecha = new Date(currentEvent.fecha_evento);
        currentEventDate.textContent = fecha.toLocaleDateString();
    }
    if (eventName) eventName.value = currentEvent.nombre || '';
    if (eventDate && currentEvent.fecha_evento) {
        const fecha = new Date(currentEvent.fecha_evento);
        eventDate.value = fecha.toISOString().split('T')[0];
    }
}

async function cargarMesas(eventoId) {
    try {
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/eventos/' + eventoId + '/mesas', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) {
            mesas = [];
            renderizarMesas([]);
            return;
        }
        
        const data = await response.json();
        
        // FIX: Asegurar array
        if (Array.isArray(data)) {
            mesas = data;
        } else if (data && typeof data === 'object') {
            mesas = data.mesas || data.data || [];
        } else {
            mesas = [];
        }
        
        console.log('✅ Mesas:', mesas.length);
        renderizarMesas(mesas);
    } catch (error) {
        console.error('Error mesas:', error);
        mesas = [];
        renderizarMesas([]);
    }
}

// RENDERIZADO EXACTO COMO FINAL.HTML
function renderizarMesas(mesasArray) {
    const container = document.getElementById('mesasContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!Array.isArray(mesasArray) || mesasArray.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chair"></i>
                <p>No hay mesas creadas</p>
            </div>
        `;
        return;
    }
    
    mesasArray.forEach(mesa => {
        if (!mesa) return;
        const mesaElement = crearMesa(mesa);
        if (mesaElement) container.appendChild(mesaElement);
    });
}

function crearMesa(mesa) {
    const forma = mesa.forma || 'rectangular';
    const capacidad = mesa.capacidad || 8;
    
    const mesaDiv = document.createElement('div');
    mesaDiv.className = 'mesa';
    
    const mesaGrafica = document.createElement('div');
    mesaGrafica.className = 'mesa-grafica mesa-' + forma;
    mesaGrafica.textContent = mesa.nombre || `Mesa ${mesa.numero}`;
    
    mesaDiv.appendChild(mesaGrafica);
    
    // Agregar sillas
    agregarSillas(mesaDiv, forma, capacidad);
    
    return mesaDiv;
}

function agregarSillas(mesaDiv, forma, cantidad) {
    const posiciones = calcularPosicionesSillas(forma, cantidad);
    
    posiciones.forEach((pos, index) => {
        const silla = document.createElement('div');
        silla.className = 'silla';
        silla.textContent = index + 1;
        silla.style.left = pos.x + 'px';
        silla.style.top = pos.y + 'px';
        silla.style.transform = `rotate(${pos.rotation}deg)`;
        mesaDiv.appendChild(silla);
    });
}

function calcularPosicionesSillas(forma, cantidad) {
    const posiciones = [];
    
    if (forma === 'circular') {
        const radio = 90;
        const centerX = 70;
        const centerY = 170;
        
        for (let i = 0; i < cantidad; i++) {
            const angulo = (360 / cantidad) * i;
            const radianes = (angulo - 90) * (Math.PI / 180);
            const x = centerX + radio * Math.cos(radianes);
            const y = centerY + radio * Math.sin(radianes);
            posiciones.push({ x, y, rotation: angulo });
        }
    } else if (forma === 'cuadrada') {
        const sillasPorLado = Math.ceil(cantidad / 4);
        const espaciado = 50;
        
        for (let i = 0; i < cantidad; i++) {
            const lado = Math.floor(i / sillasPorLado);
            const posEnLado = i % sillasPorLado;
            
            let x, y, rotation;
            if (lado === 0) { // Arriba
                x = 30 + posEnLado * espaciado;
                y = 10;
                rotation = 0;
            } else if (lado === 1) { // Derecha
                x = 180;
                y = 30 + posEnLado * espaciado;
                rotation = 90;
            } else if (lado === 2) { // Abajo
                x = 30 + posEnLado * espaciado;
                y = 240;
                rotation = 180;
            } else { // Izquierda
                x = -20;
                y = 30 + posEnLado * espaciado;
                rotation = 270;
            }
            posiciones.push({ x, y, rotation });
        }
    } else { // rectangular
        const sillasLaterales = Math.floor((cantidad - 2) / 2);
        const espaciado = 50;
        
        // Lados cortos
        posiciones.push({ x: -20, y: 150, rotation: 270 });
        posiciones.push({ x: 220, y: 150, rotation: 90 });
        
        // Lado superior
        for (let i = 0; i < sillasLaterales; i++) {
            posiciones.push({
                x: 30 + i * espaciado,
                y: 20,
                rotation: 0
            });
        }
        
        // Lado inferior
        for (let i = 0; i < Math.ceil((cantidad - 2) / 2) - sillasLaterales; i++) {
            posiciones.push({
                x: 30 + i * espaciado,
                y: 200,
                rotation: 180
            });
        }
    }
    
    return posiciones.slice(0, cantidad);
}

async function crearActualizarMesas() {
    if (!currentEvent) {
        showToast('Selecciona un evento', 'error');
        return;
    }
    
    const numMesas = parseInt(document.getElementById('numMesas').value);
    const sillasPorMesa = parseInt(document.getElementById('sillasPorMesa').value);
    const formaMesa = document.getElementById('formaMesa').value;
    
    if (!numMesas || !sillasPorMesa) {
        showToast('Completa los campos', 'error');
        return;
    }
    
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
        
        if (!response.ok) throw new Error('Error');
        
        showToast('✅ Mesas creadas', 'success');
        await cargarMesas(currentEvent.id);
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al crear mesas', 'error');
    }
}

async function cargarInvitados(eventoId) {
    try {
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/invitados?evento_id=' + eventoId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) {
            invitados = [];
            return;
        }
        
        const data = await response.json();
        invitados = Array.isArray(data) ? data : (data.invitados || []);
        console.log('Invitados:', invitados.length);
    } catch (error) {
        console.error('Error invitados:', error);
        invitados = [];
    }
}

async function guardarCambiosEvento() {
    if (!currentEvent) return;
    
    const nombre = document.getElementById('eventName').value;
    const fecha = document.getElementById('eventDate').value;
    
    try {
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/eventos/' + currentEvent.id, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, fecha_evento: fecha })
        });
        
        if (!response.ok) throw new Error('Error');
        
        showToast('✅ Guardado', 'success');
        cargarEvento(currentEvent.id);
    } catch (error) {
        showToast('Error', 'error');
    }
}

async function finalizarEvento() {
    if (!currentEvent) return;
    if (!confirm('¿Eliminar?')) return;
    
    try {
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/eventos/' + currentEvent.id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) throw new Error('Error');
        
        showToast('✅ Eliminado', 'success');
        currentEvent = null;
        cargarEventos();
    } catch (error) {
        showToast('Error', 'error');
    }
}

function obtenerToken() {
    return localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
}

function showToast(message, type) {
    const toast = document.getElementById('messageToast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.background = type === 'error' ? '#f44336' : '#4CAF50';
    toast.style.color = 'white';
    setTimeout(() => toast.style.display = 'none', 3000);
}

console.log('✅ Cliente.js PERFECTO cargado');
