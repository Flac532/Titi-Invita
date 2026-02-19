// cliente.js - ÚLTIMA VERSIÓN FUNCIONAL
const API_BASE = 'https://titi-invita-app-azhcw.ondigitalocean.app/api';

let currentUser = null;
let currentEvent = null;
let currentEventId = null;
let mesas = [];
let invitados = [];

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Iniciando...');
    
    const usuarioStr = localStorage.getItem('titi_usuario_actual');
    if (!usuarioStr) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(usuarioStr);
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
    
    const btnCrearMesas = document.getElementById('btnCrearMesas');
    if (btnCrearMesas) btnCrearMesas.addEventListener('click', () => crearMesas());
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(this.getAttribute('data-tab') + 'Tab').classList.add('active');
        });
    });
}

async function cargarEventos() {
    try {
        const token = obtenerToken();
        const response = await fetch(`${API_BASE}/eventos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Error');
        
        const data = await response.json();
        const eventos = Array.isArray(data) ? data : (data.eventos || []);
        
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
    }
}

async function cargarEvento(eventoId) {
    if (!eventoId) return;
    
    try {
        currentEventId = eventoId;
        const token = obtenerToken();
        
        const response = await fetch(`${API_BASE}/eventos/${eventoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (!data.id) data.id = eventoId;
            currentEvent = data;
        } else {
            currentEvent = { id: eventoId, nombre: 'Evento' };
        }
        
        const currentEventName = document.getElementById('currentEventName');
        if (currentEventName) currentEventName.textContent = currentEvent.nombre || 'Evento';
        
        await cargarMesas(eventoId);
        await cargarInvitados(eventoId);
        
    } catch (error) {
        console.error('Error:', error);
        currentEvent = { id: eventoId, nombre: 'Evento' };
    }
}

async function cargarMesas(eventoId) {
    if (!eventoId) return;
    
    try {
        const token = obtenerToken();
        const response = await fetch(`${API_BASE}/eventos/${eventoId}/mesas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            mesas = [];
            renderizarMesas([]);
            return;
        }
        
        const data = await response.json();
        mesas = Array.isArray(data) ? data : (data.mesas || []);
        
        renderizarMesas(mesas);
        
    } catch (error) {
        mesas = [];
        renderizarMesas([]);
    }
}

function renderizarMesas(mesasArray) {
    const container = document.getElementById('mesasContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!mesasArray || mesasArray.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:60px; color:#cbd5e0"><i class="fas fa-chair" style="font-size:4rem; margin-bottom:20px"></i><p>No hay mesas</p></div>';
        return;
    }
    
    mesasArray.forEach(mesa => {
        if (!mesa) return;
        const mesaElement = crearMesa(mesa);
        container.appendChild(mesaElement);
    });
}

function crearMesa(mesa) {
    const mesaDiv = document.createElement('div');
    mesaDiv.style.position = 'relative';
    mesaDiv.style.marginBottom = '80px';
    
    // Título
    const titulo = document.createElement('div');
    titulo.style.textAlign = 'center';
    titulo.style.marginBottom = '15px';
    titulo.style.padding = '10px';
    titulo.style.background = '#e8f5e9';
    titulo.style.borderRadius = '8px';
    titulo.innerHTML = `
        <strong>${mesa.nombre || 'Mesa ' + mesa.numero}</strong><br>
        <button onclick="editarNombre(${mesa.id})" style="margin-top:5px; padding:5px 10px; background:#2196F3; color:white; border:none; border-radius:5px; cursor:pointer; margin-right:5px">
            Nombre
        </button>
        <button onclick="cambiarColor(${mesa.id})" style="padding:5px 10px; background:#FF9800; color:white; border:none; border-radius:5px; cursor:pointer">
            Color
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
    const posiciones = calcularPosiciones(forma, cantidad);
    
    posiciones.forEach((pos, index) => {
        const sillaNro = index + 1;
        const invitado = invitados.find(inv => inv.mesa_id === mesa.id && inv.silla_numero === sillaNro);
        
        const silla = document.createElement('div');
        silla.textContent = sillaNro;
        silla.style.cssText = `
            position: absolute;
            left: ${pos.x}px;
            top: ${pos.y}px;
            width: 32px;
            height: 42px;
            border-radius: 5px 5px 2px 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: bold;
            color: white;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transition: transform 0.2s;
            z-index: 2;
        `;
        
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
            silla.title = 'Disponible';
        }
        
        const respaldo = document.createElement('div');
        respaldo.style.cssText = `
            position: absolute;
            top: -6px;
            left: 6px;
            width: 20px;
            height: 8px;
            background-color: ${silla.style.backgroundColor};
            border-radius: 3px 3px 0 0;
        `;
        silla.appendChild(respaldo);
        
        silla.addEventListener('mouseenter', () => silla.style.transform = 'scale(1.15)');
        silla.addEventListener('mouseleave', () => silla.style.transform = 'scale(1)');
        silla.addEventListener('click', () => menuSilla(mesa.id, sillaNro, invitado));
        
        mesaDiv.appendChild(silla);
    });
}

function calcularPosiciones(forma, cantidad) {
    const posiciones = [];
    
    if (forma === 'circular') {
        const radio = 90;
        const centerX = 70;
        const centerY = 170;
        for (let i = 0; i < cantidad; i++) {
            const angulo = (360 / cantidad) * i;
            const radianes = (angulo - 90) * (Math.PI / 180);
            posiciones.push({ x: centerX + radio * Math.cos(radianes), y: centerY + radio * Math.sin(radianes) });
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
        for (let i = 0; i < lat; i++) posiciones.push({ x: 30 + i * 50, y: 20 });
        const rest = cantidad - 2 - lat;
        for (let i = 0; i < rest; i++) posiciones.push({ x: 30 + i * 50, y: 200 });
    }
    
    return posiciones.slice(0, cantidad);
}

async function cargarInvitados(eventoId) {
    if (!eventoId) return;
    
    try {
        const token = obtenerToken();
        const response = await fetch(`${API_BASE}/invitados?evento_id=${eventoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            invitados = Array.isArray(data) ? data : [];
        } else {
            invitados = [];
        }
    } catch (error) {
        invitados = [];
    }
}

async function crearMesas() {
    const eventoId = currentEventId || (currentEvent && currentEvent.id);
    if (!eventoId) {
        alert('Selecciona un evento');
        return;
    }
    
    const numMesas = parseInt(document.getElementById('numMesas').value);
    const sillasPorMesa = parseInt(document.getElementById('sillasPorMesa').value);
    const formaMesa = document.getElementById('formaMesa').value;
    const colorMesa = document.getElementById('colorMesa').value;
    
    if (!numMesas || !sillasPorMesa) {
        alert('Completa los campos');
        return;
    }
    
    try {
        const token = obtenerToken();
        const response = await fetch(`${API_BASE}/mesas`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                evento_id: parseInt(eventoId),
                cantidad: numMesas,
                capacidad: sillasPorMesa,
                forma: formaMesa,
                color: colorMesa
            })
        });
        
        if (response.ok) {
            alert('✅ Mesas creadas');
            await cargarMesas(eventoId);
        } else {
            alert('Error al crear mesas');
        }
    } catch (error) {
        alert('Error');
    }
}

function menuSilla(mesaId, sillaNro, invitado) {
    let html = '<div style="padding:20px"><h3>Silla ' + sillaNro + '</h3>';
    
    if (invitado) {
        html += '<p><strong>' + invitado.nombre + '</strong></p>';
        html += '<p>Estado: ' + invitado.estado + '</p>';
        html += '<div style="display:flex; flex-direction:column; gap:10px; margin-top:20px">';
        html += '<button onclick="cambiarEstado(' + invitado.id + ', \'confirmado\')" style="padding:12px; background:#4CAF50; color:white; border:none; border-radius:8px; cursor:pointer">Confirmado</button>';
        html += '<button onclick="cambiarEstado(' + invitado.id + ', \'pendiente\')" style="padding:12px; background:#FFA726; color:white; border:none; border-radius:8px; cursor:pointer">Pendiente</button>';
        html += '<button onclick="cambiarEstado(' + invitado.id + ', \'rechazado\')" style="padding:12px; background:#f44336; color:white; border:none; border-radius:8px; cursor:pointer">Rechazado</button>';
        html += '</div>';
    } else {
        html += '<p>Disponible</p>';
    }
    
    html += '</div>';
    
    const modal = document.getElementById('modalGenerico');
    if (modal) {
        modal.querySelector('.modal-content').innerHTML = html;
        modal.classList.add('active');
    }
}

window.cambiarEstado = async function(invitadoId, estado) {
    try {
        const token = obtenerToken();
        await fetch(`${API_BASE}/invitados/${invitadoId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado })
        });
        
        document.getElementById('modalGenerico').classList.remove('active');
        const eventoId = currentEventId || (currentEvent && currentEvent.id);
        await cargarInvitados(eventoId);
        await cargarMesas(eventoId);
    } catch (error) {
        alert('Error');
    }
};

window.editarNombre = function(mesaId) {
    const mesa = mesas.find(m => m.id === mesaId);
    if (!mesa) return;
    const nuevo = prompt('Nombre:', mesa.nombre || 'Mesa ' + mesa.numero);
    if (nuevo) {
        mesa.nombre = nuevo;
        renderizarMesas(mesas);
    }
};

window.cambiarColor = function(mesaId) {
    const colores = [
        { n: 'Café', v: '#8B4513' },
        { n: 'Rojo', v: '#DC143C' },
        { n: 'Azul', v: '#4169E1' },
        { n: 'Verde', v: '#228B22' },
        { n: 'Morado', v: '#9370DB' },
        { n: 'Naranja', v: '#FF8C00' }
    ];
    
    let html = '<div style="padding:20px"><h3>Color</h3><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">';
    colores.forEach(c => {
        html += `<button onclick="aplicarColor(${mesaId}, '${c.v}')" style="padding:15px; background:${c.v}; color:white; border:none; border-radius:8px; cursor:pointer">${c.n}</button>`;
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
    if (mesa) {
        mesa.color = color;
        renderizarMesas(mesas);
    }
    document.getElementById('modalGenerico').classList.remove('active');
};

function obtenerToken() {
    return localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token') || '';
}

console.log('✅ Cargado');
