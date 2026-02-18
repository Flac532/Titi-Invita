// cliente.js - VERSIÓN SIN ERRORES - Sin endpoints inexistentes
const API_BASE = 'https://titi-invita-app-azhcw.ondigitalocean.app/api';
let currentUser = null;
let currentEvent = null;
let mesas = [];
let invitados = [];
let mesasConInvitados = {};

// COLORES PREDEFINIDOS PARA MESAS
const COLORES_MESA = [
    { nombre: 'Café', valor: '#8B4513' },
    { nombre: 'Marrón Claro', valor: '#A0522D' },
    { nombre: 'Rojo', valor: '#DC143C' },
    { nombre: 'Azul', valor: '#4169E1' },
    { nombre: 'Verde', valor: '#228B22' },
    { nombre: 'Morado', valor: '#9370DB' },
    { nombre: 'Naranja', valor: '#FF8C00' },
    { nombre: 'Rosa', valor: '#FF69B4' }
];

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando cliente SIN ERRORES');
    
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
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) userName.textContent = currentUser.nombre;
    if (userAvatar) {
        const iniciales = currentUser.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        userAvatar.textContent = iniciales;
    }
}

function setupEventListeners() {
    const refreshEventsBtn = document.getElementById('refreshEventsBtn');
    const eventSelector = document.getElementById('eventSelector');
    const btnGuardarEvento = document.getElementById('btnGuardarEvento');
    const btnCrearMesas = document.getElementById('btnCrearMesas');
    
    if (refreshEventsBtn) refreshEventsBtn.addEventListener('click', () => cargarEventos());
    if (eventSelector) {
        eventSelector.addEventListener('change', (e) => {
            if (e.target.value) cargarEvento(e.target.value);
        });
    }
    if (btnGuardarEvento) btnGuardarEvento.addEventListener('click', () => guardarCambiosEvento());
    if (btnCrearMesas) btnCrearMesas.addEventListener('click', () => crearActualizarMesas());
    
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            cambiarTab(tabName);
        });
    });
}

function cambiarTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    const tab = document.querySelector(`[data-tab="${tabName}"]`);
    const content = document.getElementById(tabName + 'Tab');
    
    if (tab) tab.classList.add('active');
    if (content) content.classList.add('active');
}

async function cargarEventos() {
    try {
        const token = obtenerToken();
        let endpoint = '/eventos';
        
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
        console.log('Evento:', currentEvent);
        
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
    const eventName = document.getElementById('eventName');
    const eventDate = document.getElementById('eventDate');
    
    if (currentEventName) currentEventName.textContent = currentEvent.nombre;
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
        mesas = Array.isArray(data) ? data : (data.mesas || []);
        
        console.log('Mesas:', mesas.length);
        renderizarMesas(mesas);
    } catch (error) {
        console.error('Error mesas:', error);
        mesas = [];
        renderizarMesas([]);
    }
}

function renderizarMesas(mesasArray) {
    const container = document.getElementById('mesasContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!Array.isArray(mesasArray) || mesasArray.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chair"></i>
                <p>No hay mesas</p>
            </div>
        `;
        return;
    }
    
    calcularAsignaciones();
    
    mesasArray.forEach(mesa => {
        if (!mesa) return;
        const mesaElement = crearMesa(mesa);
        if (mesaElement) container.appendChild(mesaElement);
    });
}

function calcularAsignaciones() {
    mesasConInvitados = {};
    invitados.forEach(inv => {
        if (inv.mesa_id && inv.silla_numero) {
            const key = `${inv.mesa_id}-${inv.silla_numero}`;
            mesasConInvitados[key] = inv;
        }
    });
}

function crearMesa(mesa) {
    const forma = mesa.forma || 'rectangular';
    const capacidad = mesa.capacidad || 8;
    const colorMesa = mesa.color || '#8B4513';
    
    const mesaDiv = document.createElement('div');
    mesaDiv.className = 'mesa';
    
    // Título de la mesa
    const mesaTitulo = document.createElement('div');
    mesaTitulo.className = 'mesa-titulo';
    mesaTitulo.textContent = mesa.nombre || `Mesa ${mesa.numero}`;
    mesaTitulo.style.textAlign = 'center';
    mesaTitulo.style.fontWeight = 'bold';
    mesaTitulo.style.marginBottom = '10px';
    mesaTitulo.style.padding = '8px';
    mesaTitulo.style.background = '#e8f5e9';
    mesaTitulo.style.borderRadius = '8px';
    mesaDiv.appendChild(mesaTitulo);
    
    // Mesa gráfica
    const mesaGrafica = document.createElement('div');
    mesaGrafica.className = 'mesa-grafica mesa-' + forma;
    mesaGrafica.style.backgroundColor = colorMesa;
    mesaGrafica.textContent = mesa.nombre || `Mesa ${mesa.numero}`;
    mesaDiv.appendChild(mesaGrafica);
    
    // Sillas
    agregarSillas(mesaDiv, mesa, forma, capacidad);
    
    return mesaDiv;
}

function agregarSillas(mesaDiv, mesa, forma, cantidad) {
    const posiciones = calcularPosicionesSillas(forma, cantidad);
    
    posiciones.forEach((pos, index) => {
        const sillaNro = index + 1;
        const key = `${mesa.id}-${sillaNro}`;
        const invitado = mesasConInvitados[key];
        
        const silla = document.createElement('div');
        silla.className = 'silla';
        silla.textContent = sillaNro;
        silla.style.position = 'absolute';
        silla.style.left = pos.x + 'px';
        silla.style.top = pos.y + 'px';
        silla.style.width = '32px';
        silla.style.height = '42px';
        silla.style.display = 'flex';
        silla.style.alignItems = 'center';
        silla.style.justifyContent = 'center';
        silla.style.borderRadius = '5px 5px 2px 2px';
        silla.style.color = 'white';
        silla.style.fontSize = '10px';
        silla.style.fontWeight = 'bold';
        silla.style.cursor = 'pointer';
        silla.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        silla.style.transition = 'transform 0.2s';
        silla.style.zIndex = '2';
        
        // Color según estado
        if (invitado) {
            if (invitado.estado === 'confirmado') {
                silla.style.backgroundColor = '#4CAF50';
                silla.title = `${invitado.nombre} - Confirmado`;
            } else if (invitado.estado === 'rechazado') {
                silla.style.backgroundColor = '#f44336';
                silla.title = `${invitado.nombre} - Rechazado`;
            } else {
                silla.style.backgroundColor = '#FFA726';
                silla.title = `${invitado.nombre} - Pendiente`;
            }
        } else {
            silla.style.backgroundColor = '#9E9E9E';
            silla.title = 'Click para asignar';
        }
        
        // Respaldo de silla
        const respaldo = document.createElement('div');
        respaldo.style.position = 'absolute';
        respaldo.style.top = '-6px';
        respaldo.style.left = '6px';
        respaldo.style.width = '20px';
        respaldo.style.height = '8px';
        respaldo.style.backgroundColor = silla.style.backgroundColor;
        respaldo.style.borderRadius = '3px 3px 0 0';
        silla.appendChild(respaldo);
        
        silla.addEventListener('mouseenter', () => {
            silla.style.transform = 'scale(1.15)';
        });
        
        silla.addEventListener('mouseleave', () => {
            silla.style.transform = 'scale(1)';
        });
        
        silla.addEventListener('click', () => {
            if (invitado) {
                mostrarInfoInvitado(invitado);
            } else {
                mostrarModalAsignarInvitado(mesa.id, sillaNro);
            }
        });
        
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
            posiciones.push({ x, y });
        }
    } else if (forma === 'cuadrada') {
        const lado = 160;
        const sillasPorLado = Math.ceil(cantidad / 4);
        const espaciado = lado / sillasPorLado;
        
        for (let i = 0; i < cantidad; i++) {
            const ladoActual = Math.floor(i / sillasPorLado);
            const posEnLado = i % sillasPorLado;
            
            let x, y;
            if (ladoActual === 0) {
                x = 30 + posEnLado * espaciado;
                y = 10;
            } else if (ladoActual === 1) {
                x = 180;
                y = 30 + posEnLado * espaciado;
            } else if (ladoActual === 2) {
                x = 30 + posEnLado * espaciado;
                y = 240;
            } else {
                x = -20;
                y = 30 + posEnLado * espaciado;
            }
            posiciones.push({ x, y });
        }
    } else { // rectangular
        const ancho = 210;
        const sillasLaterales = Math.floor((cantidad - 2) / 2);
        const espaciado = ancho / (sillasLaterales + 1);
        
        // Lados cortos
        posiciones.push({ x: -20, y: 150 });
        posiciones.push({ x: 220, y: 150 });
        
        // Lado superior
        for (let i = 0; i < sillasLaterales; i++) {
            posiciones.push({ x: 30 + i * espaciado, y: 20 });
        }
        
        // Lado inferior
        const restantes = cantidad - 2 - sillasLaterales;
        for (let i = 0; i < restantes; i++) {
            posiciones.push({ x: 30 + i * espaciado, y: 200 });
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
    const colorMesa = document.getElementById('colorMesa').value;
    
    if (!numMesas || !sillasPorMesa) {
        showToast('Completa los campos', 'error');
        return;
    }
    
    console.log('Creando mesas:', { numMesas, sillasPorMesa, formaMesa, colorMesa });
    
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
                forma: formaMesa,
                color: colorMesa
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error');
        }
        
        showToast('✅ Mesas creadas', 'success');
        await cargarMesas(currentEvent.id);
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message, 'error');
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
            renderizarInvitados([]);
            return;
        }
        
        const data = await response.json();
        invitados = Array.isArray(data) ? data : [];
        
        console.log('Invitados:', invitados.length);
        renderizarInvitados(invitados);
        actualizarEstadisticas();
    } catch (error) {
        console.error('Error invitados:', error);
        invitados = [];
    }
}

function renderizarInvitados(invitadosArray) {
    const container = document.getElementById('invitadosList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!invitadosArray || invitadosArray.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; padding:40px 0">No hay invitados</p>';
        return;
    }
    
    invitadosArray.forEach(inv => {
        const div = document.createElement('div');
        div.className = 'invitado-item';
        div.innerHTML = `
            <div>
                <strong>${inv.nombre}</strong><br>
                <small>${inv.email || 'Sin email'}</small>
            </div>
            <span class="estado-badge ${inv.estado}">${inv.estado}</span>
        `;
        container.appendChild(div);
    });
}

function mostrarModalAsignarInvitado(mesaId, sillaNro) {
    if (invitados.length === 0) {
        showToast('No hay invitados. Agrégalos primero.', 'error');
        return;
    }
    
    const modal = document.getElementById('modalAsignarInvitado');
    if (!modal) return;
    
    const select = document.getElementById('selectInvitado');
    if (select) {
        select.innerHTML = '<option value="">Seleccionar invitado...</option>';
        invitados.forEach(inv => {
            const option = document.createElement('option');
            option.value = inv.id;
            option.textContent = `${inv.nombre} - ${inv.estado}`;
            select.appendChild(option);
        });
    }
    
    modal.setAttribute('data-mesa-id', mesaId);
    modal.setAttribute('data-silla-nro', sillaNro);
    modal.classList.add('active');
}

async function confirmarAsignacion() {
    const modal = document.getElementById('modalAsignarInvitado');
    const invitadoId = document.getElementById('selectInvitado').value;
    const mesaId = modal.getAttribute('data-mesa-id');
    const sillaNro = modal.getAttribute('data-silla-nro');
    
    if (!invitadoId) {
        showToast('Selecciona un invitado', 'error');
        return;
    }
    
    try {
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/invitados/' + invitadoId, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mesa_id: parseInt(mesaId),
                silla_numero: parseInt(sillaNro)
            })
        });
        
        if (!response.ok) throw new Error('Error');
        
        showToast('✅ Invitado asignado', 'success');
        modal.classList.remove('active');
        await cargarInvitados(currentEvent.id);
        renderizarMesas(mesas);
    } catch (error) {
        showToast('Error al asignar', 'error');
    }
}

function mostrarInfoInvitado(invitado) {
    showToast(`${invitado.nombre} - ${invitado.estado}`, 'info');
}

async function guardarCambiosEvento() {
    if (!currentEvent) return;
    
    const nombre = document.getElementById('eventName').value;
    const fecha = document.getElementById('eventDate').value;
    
    if (!nombre) {
        showToast('El nombre es obligatorio', 'error');
        return;
    }
    
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
        await cargarEvento(currentEvent.id);
    } catch (error) {
        showToast('Error al guardar', 'error');
    }
}

function actualizarEstadisticas() {
    const totalMesas = mesas.length;
    const totalSillas = mesas.reduce((sum, m) => sum + (m.capacidad || 0), 0);
    const ocupadas = invitados.filter(i => i.mesa_id).length;
    const porcentaje = totalSillas > 0 ? Math.round((ocupadas / totalSillas) * 100) : 0;
    
    const statTotalMesas = document.getElementById('statTotalMesas');
    const statTotalSillas = document.getElementById('statTotalSillas');
    const statSillasOcupadas = document.getElementById('statSillasOcupadas');
    const statPorcentajeOcupacion = document.getElementById('statPorcentajeOcupacion');
    
    if (statTotalMesas) statTotalMesas.textContent = totalMesas;
    if (statTotalSillas) statTotalSillas.textContent = totalSillas;
    if (statSillasOcupadas) statSillasOcupadas.textContent = ocupadas;
    if (statPorcentajeOcupacion) statPorcentajeOcupacion.textContent = porcentaje + '%';
    
    const confirmados = invitados.filter(i => i.estado === 'confirmado').length;
    const pendientes = invitados.filter(i => i.estado === 'pendiente').length;
    const rechazados = invitados.filter(i => i.estado === 'rechazado').length;
    
    const elConfirmados = document.getElementById('confirmados');
    const elPendientes = document.getElementById('pendientes');
    const elRechazados = document.getElementById('rechazados');
    
    if (elConfirmados) elConfirmados.textContent = confirmados;
    if (elPendientes) elPendientes.textContent = pendientes;
    if (elRechazados) elRechazados.textContent = rechazados;
}

function obtenerToken() {
    return localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('messageToast');
    if (!toast) {
        console.log(message);
        return;
    }
    
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.background = type === 'error' ? '#f44336' : (type === 'info' ? '#2196F3' : '#4CAF50');
    toast.style.color = 'white';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

async function finalizarEvento() {
    if (!currentEvent || !confirm('¿Eliminar evento?')) return;
    
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

console.log('✅ cliente.js SIN ERRORES cargado');
