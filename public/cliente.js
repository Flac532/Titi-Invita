// cliente.js - VERSIÓN FINAL DEFINITIVA
const API_BASE = 'https://titi-invita-app-azhcw.ondigitalocean.app/api';

let currentUser = null;
let currentEvent = null;
let mesas = [];
let invitados = [];

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando');
    
    const usuarioStr = localStorage.getItem('titi_usuario_actual');
    if (!usuarioStr) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(usuarioStr);
        console.log('Usuario:', currentUser.nombre);
    } catch (error) {
        window.location.href = 'login.html';
        return;
    }
    
    inicializarUI();
    setupEventListeners();
    await cargarEventos();
});

function inicializarUI() {
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userName) userName.textContent = currentUser.nombre;
    if (userAvatar) {
        const iniciales = currentUser.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        userAvatar.textContent = iniciales;
    }
}

function setupEventListeners() {
    const eventSelector = document.getElementById('eventSelector');
    if (eventSelector) {
        eventSelector.addEventListener('change', async function(e) {
            if (e.target.value) await cargarEvento(e.target.value);
        });
    }
    
    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) btnRefresh.addEventListener('click', () => cargarEventos());
    
    const btnGuardarEvento = document.getElementById('btnGuardarEvento');
    if (btnGuardarEvento) btnGuardarEvento.addEventListener('click', () => guardarEvento());
    
    const btnCrearMesas = document.getElementById('btnCrearMesas');
    if (btnCrearMesas) btnCrearMesas.addEventListener('click', () => crearMesas());
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            cambiarTab(this.getAttribute('data-tab'));
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
        console.log('Cargando eventos...');
        const token = obtenerToken();
        
        const response = await fetch(`${API_BASE}/eventos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error');
        
        const data = await response.json();
        const eventos = Array.isArray(data) ? data : (data.eventos || []);
        
        console.log('Eventos:', eventos.length);
        
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
                await cargarEvento(eventos[0].id);
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar eventos', 'error');
    }
}

async function cargarEvento(eventoId) {
    try {
        console.log('Cargando evento:', eventoId);
        const token = obtenerToken();
        
        const response = await fetch(`${API_BASE}/eventos/${eventoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error');
        
        currentEvent = await response.json();
        console.log('Evento:', currentEvent.nombre);
        
        actualizarInfoEvento();
        
        await Promise.all([
            cargarMesas(eventoId),
            cargarInvitados(eventoId)
        ]);
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar evento', 'error');
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
        try {
            const fecha = new Date(currentEvent.fecha_evento);
            eventDate.value = fecha.toISOString().split('T')[0];
        } catch (e) {
            console.error('Error fecha');
        }
    }
}

async function cargarMesas(eventoId) {
    try {
        console.log('Cargando mesas...');
        const token = obtenerToken();
        
        const response = await fetch(`${API_BASE}/eventos/${eventoId}/mesas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            console.log('No hay mesas');
            mesas = [];
            renderizarMesas([]);
            return;
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
            mesas = data;
        } else if (data && data.mesas && Array.isArray(data.mesas)) {
            mesas = data.mesas;
        } else {
            mesas = [];
        }
        
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
                <i class="fas fa-chair" style="font-size:4rem; color:#cbd5e0"></i>
                <p style="color:#cbd5e0">No hay mesas</p>
            </div>
        `;
        return;
    }
    
    console.log('Renderizando', mesasArray.length, 'mesas');
    
    mesasArray.forEach((mesa, index) => {
        if (!mesa) return;
        try {
            const mesaElement = crearMesaElement(mesa);
            container.appendChild(mesaElement);
        } catch (error) {
            console.error('Error mesa', index, error);
        }
    });
}

function crearMesaElement(mesa) {
    const mesaDiv = document.createElement('div');
    mesaDiv.className = 'mesa';
    mesaDiv.style.position = 'relative';
    mesaDiv.style.marginBottom = '80px';
    
    // Título con botones
    const titulo = document.createElement('div');
    titulo.style.textAlign = 'center';
    titulo.style.marginBottom = '15px';
    titulo.style.padding = '10px';
    titulo.style.background = '#e8f5e9';
    titulo.style.borderRadius = '8px';
    titulo.innerHTML = `
        <strong>${mesa.nombre || 'Mesa ' + mesa.numero}</strong><br>
        <button onclick="editarNombreMesa(${mesa.id})" style="margin-top:5px; padding:5px 10px; background:#2196F3; color:white; border:none; border-radius:5px; cursor:pointer; margin-right:5px">
            <i class="fas fa-edit"></i> Nombre
        </button>
        <button onclick="cambiarColorMesa(${mesa.id})" style="padding:5px 10px; background:#FF9800; color:white; border:none; border-radius:5px; cursor:pointer">
            <i class="fas fa-palette"></i> Color
        </button>
    `;
    mesaDiv.appendChild(titulo);
    
    // Mesa gráfica
    const forma = mesa.forma || 'rectangular';
    const color = mesa.color || '#8B4513';
    
    const mesaGrafica = document.createElement('div');
    mesaGrafica.style.position = 'relative';
    mesaGrafica.style.margin = '0 auto';
    mesaGrafica.style.marginTop = '100px';
    mesaGrafica.style.backgroundColor = color;
    mesaGrafica.style.display = 'flex';
    mesaGrafica.style.alignItems = 'center';
    mesaGrafica.style.justifyContent = 'center';
    mesaGrafica.style.color = 'white';
    mesaGrafica.style.fontWeight = 'bold';
    mesaGrafica.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    
    if (forma === 'circular') {
        mesaGrafica.style.width = '140px';
        mesaGrafica.style.height = '140px';
        mesaGrafica.style.borderRadius = '50%';
    } else if (forma === 'cuadrada') {
        mesaGrafica.style.width = '160px';
        mesaGrafica.style.height = '160px';
        mesaGrafica.style.borderRadius = '10px';
    } else {
        mesaGrafica.style.width = '210px';
        mesaGrafica.style.height = '110px';
        mesaGrafica.style.borderRadius = '10px';
    }
    
    mesaGrafica.textContent = mesa.nombre || 'Mesa ' + mesa.numero;
    mesaDiv.appendChild(mesaGrafica);
    
    // Sillas
    const capacidad = mesa.capacidad || 8;
    agregarSillas(mesaDiv, mesa, forma, capacidad);
    
    return mesaDiv;
}

function agregarSillas(mesaDiv, mesa, forma, cantidad) {
    const posiciones = calcularPosicionesSillas(forma, cantidad);
    
    posiciones.forEach((pos, index) => {
        const sillaNro = index + 1;
        const silla = crearSilla(sillaNro, mesa, pos);
        mesaDiv.appendChild(silla);
    });
}

function crearSilla(numero, mesa, posicion) {
    const invitado = invitados.find(inv => 
        inv.mesa_id === mesa.id && inv.silla_numero === numero
    );
    
    const silla = document.createElement('div');
    silla.textContent = numero;
    silla.style.position = 'absolute';
    silla.style.left = posicion.x + 'px';
    silla.style.top = posicion.y + 'px';
    silla.style.width = '32px';
    silla.style.height = '42px';
    silla.style.borderRadius = '5px 5px 2px 2px';
    silla.style.display = 'flex';
    silla.style.alignItems = 'center';
    silla.style.justifyContent = 'center';
    silla.style.fontSize = '11px';
    silla.style.fontWeight = 'bold';
    silla.style.color = 'white';
    silla.style.cursor = 'pointer';
    silla.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    silla.style.transition = 'transform 0.2s';
    silla.style.zIndex = '2';
    
    // Color según estado
    if (invitado) {
        if (invitado.estado === 'confirmado') {
            silla.style.backgroundColor = '#4CAF50';
            silla.title = invitado.nombre + ' - Confirmado';
        } else if (invitado.estado === 'rechazado') {
            silla.style.backgroundColor = '#f44336';
            silla.title = invitado.nombre + ' - Rechazado';
        } else {
            silla.style.backgroundColor = '#FFA726';
            silla.title = invitado.nombre + ' - Pendiente';
        }
    } else {
        silla.style.backgroundColor = '#9E9E9E';
        silla.title = 'Click para asignar';
    }
    
    // Respaldo
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
            showToast(`${invitado.nombre} - ${invitado.estado}`, 'info');
        } else {
            mostrarModalAsignar(mesa.id, numero);
        }
    });
    
    return silla;
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
            posiciones.push({
                x: centerX + radio * Math.cos(radianes),
                y: centerY + radio * Math.sin(radianes)
            });
        }
    } else if (forma === 'cuadrada') {
        const lado = 160;
        const sillasPorLado = Math.ceil(cantidad / 4);
        const esp = lado / sillasPorLado;
        
        for (let i = 0; i < cantidad; i++) {
            const l = Math.floor(i / sillasPorLado);
            const p = i % sillasPorLado;
            
            if (l === 0) posiciones.push({ x: 30 + p * esp, y: 10 });
            else if (l === 1) posiciones.push({ x: 180, y: 30 + p * esp });
            else if (l === 2) posiciones.push({ x: 30 + p * esp, y: 240 });
            else posiciones.push({ x: -20, y: 30 + p * esp });
        }
    } else {
        const lat = Math.floor((cantidad - 2) / 2);
        posiciones.push({ x: -20, y: 150 });
        posiciones.push({ x: 220, y: 150 });
        
        for (let i = 0; i < lat; i++) {
            posiciones.push({ x: 30 + i * 50, y: 20 });
        }
        
        const rest = cantidad - 2 - lat;
        for (let i = 0; i < rest; i++) {
            posiciones.push({ x: 30 + i * 50, y: 200 });
        }
    }
    
    return posiciones.slice(0, cantidad);
}

async function cargarInvitados(eventoId) {
    try {
        const token = obtenerToken();
        const response = await fetch(`${API_BASE}/invitados?evento_id=${eventoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            console.log('No hay invitados o error');
            invitados = [];
            renderizarInvitados([]);
            actualizarEstadisticas();
            return;
        }
        
        // FIX: Verificar que la respuesta sea JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('Respuesta no es JSON');
            invitados = [];
            renderizarInvitados([]);
            actualizarEstadisticas();
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
        renderizarInvitados([]);
        actualizarEstadisticas();
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
        div.style.padding = '15px';
        div.style.background = '#f7fafc';
        div.style.borderRadius = '8px';
        div.style.marginBottom = '10px';
        div.innerHTML = `
            <strong>${inv.nombre}</strong><br>
            <small>${inv.email || 'Sin email'}</small>
        `;
        container.appendChild(div);
    });
}

async function crearMesas() {
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
    
    try {
        const token = obtenerToken();
        const response = await fetch(`${API_BASE}/eventos/${currentEvent.id}/mesas`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
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

// EDITAR NOMBRE DE MESA
window.editarNombreMesa = function(mesaId) {
    const mesa = mesas.find(m => m.id === mesaId);
    if (!mesa) return;
    
    const nuevoNombre = prompt('Nombre de la mesa:', mesa.nombre || 'Mesa ' + mesa.numero);
    if (nuevoNombre === null || nuevoNombre === '') return;
    
    mesa.nombre = nuevoNombre;
    renderizarMesas(mesas);
    showToast('✅ Nombre actualizado', 'success');
};

// CAMBIAR COLOR DE MESA
window.cambiarColorMesa = function(mesaId) {
    const colores = [
        { nombre: 'Café', valor: '#8B4513' },
        { nombre: 'Rojo', valor: '#DC143C' },
        { nombre: 'Azul', valor: '#4169E1' },
        { nombre: 'Verde', valor: '#228B22' },
        { nombre: 'Morado', valor: '#9370DB' },
        { nombre: 'Naranja', valor: '#FF8C00' }
    ];
    
    let html = '<div style="padding:20px">';
    html += '<h3 style="margin-bottom:20px">Selecciona un color:</h3>';
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">';
    
    colores.forEach(c => {
        html += `<button onclick="aplicarColor(${mesaId}, '${c.valor}')" 
                 style="padding:15px; background:${c.valor}; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold">
                 ${c.nombre}
                 </button>`;
    });
    
    html += '</div></div>';
    
    const modal = document.getElementById('modalGenerico');
    if (modal) {
        modal.querySelector('.modal-content').innerHTML = html;
        modal.classList.add('active');
    }
};

window.aplicarColor = function(mesaId, color) {
    const mesa = mesas.find(m => m.id === mesaId);
    if (!mesa) return;
    
    mesa.color = color;
    renderizarMesas(mesas);
    
    const modal = document.getElementById('modalGenerico');
    if (modal) modal.classList.remove('active');
    
    showToast('✅ Color aplicado', 'success');
};

function mostrarModalAsignar(mesaId, sillaNro) {
    if (invitados.length === 0) {
        showToast('Agrega invitados primero', 'error');
        return;
    }
    
    const modal = document.getElementById('modalAsignar');
    if (!modal) return;
    
    const select = document.getElementById('selectInvitado');
    if (select) {
        select.innerHTML = '<option value="">Seleccionar...</option>';
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

window.confirmarAsignacion = async function() {
    const modal = document.getElementById('modalAsignar');
    const invitadoId = document.getElementById('selectInvitado').value;
    const mesaId = modal.getAttribute('data-mesa-id');
    const sillaNro = modal.getAttribute('data-silla-nro');
    
    if (!invitadoId) {
        showToast('Selecciona un invitado', 'error');
        return;
    }
    
    try {
        const token = obtenerToken();
        const response = await fetch(`${API_BASE}/invitados/${invitadoId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mesa_id: parseInt(mesaId),
                silla_numero: parseInt(sillaNro)
            })
        });
        
        if (!response.ok) throw new Error('Error');
        
        showToast('✅ Asignado', 'success');
        modal.classList.remove('active');
        await cargarInvitados(currentEvent.id);
        renderizarMesas(mesas);
        
    } catch (error) {
        showToast('Error', 'error');
    }
};

async function guardarEvento() {
    if (!currentEvent) return;
    
    const nombre = document.getElementById('eventName').value;
    const fecha = document.getElementById('eventDate').value;
    
    if (!nombre) {
        showToast('El nombre es obligatorio', 'error');
        return;
    }
    
    try {
        const token = obtenerToken();
        const response = await fetch(`${API_BASE}/eventos/${currentEvent.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, fecha_evento: fecha })
        });
        
        if (!response.ok) throw new Error('Error');
        
        showToast('✅ Guardado', 'success');
        await cargarEvento(currentEvent.id);
        
    } catch (error) {
        showToast('Error', 'error');
    }
}

function actualizarEstadisticas() {
    const totalMesas = mesas.length;
    const totalSillas = mesas.reduce((sum, m) => sum + (m.capacidad || 0), 0);
    const ocupadas = invitados.filter(i => i.mesa_id).length;
    const porcentaje = totalSillas > 0 ? Math.round((ocupadas / totalSillas) * 100) : 0;
    
    setElementText('statTotalMesas', totalMesas);
    setElementText('statTotalSillas', totalSillas);
    setElementText('statSillasOcupadas', ocupadas);
    setElementText('statPorcentajeOcupacion', porcentaje + '%');
    
    const conf = invitados.filter(i => i.estado === 'confirmado').length;
    const pend = invitados.filter(i => i.estado === 'pendiente').length;
    const rech = invitados.filter(i => i.estado === 'rechazado').length;
    
    setElementText('confirmados', conf);
    setElementText('pendientes', pend);
    setElementText('rechazados', rech);
}

function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function obtenerToken() {
    return localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token') || '';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('messageToast');
    if (!toast) {
        console.log(message);
        return;
    }
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        info: '#2196F3'
    };
    
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.background = colors[type] || colors.success;
    toast.style.color = 'white';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

window.finalizarEvento = async function() {
    if (!currentEvent || !confirm('¿Eliminar?')) return;
    
    try {
        const token = obtenerToken();
        const response = await fetch(`${API_BASE}/eventos/${currentEvent.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error');
        
        showToast('✅ Eliminado', 'success');
        currentEvent = null;
        await cargarEventos();
        
    } catch (error) {
        showToast('Error', 'error');
    }
};

console.log('✅ Cliente cargado');
