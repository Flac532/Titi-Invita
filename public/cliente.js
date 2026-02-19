// cliente.js - SOLO RENDERIZADO PERFECTO
const API_BASE = 'https://titi-invita-app-azhcw.ondigitalocean.app/api';

let currentUser = null;
let currentEvent = null;
let mesas = [];
let invitados = [];

document.addEventListener('DOMContentLoaded', async function() {
    const usuarioStr = localStorage.getItem('titi_usuario_actual');
    if (!usuarioStr) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(usuarioStr);
    
    const userName = document.getElementById('userName');
    if (userName) userName.textContent = currentUser.nombre;
    
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        const iniciales = currentUser.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        userAvatar.textContent = iniciales;
    }
    
    setupEventListeners();
    await cargarEventos();
});

function setupEventListeners() {
    const eventSelector = document.getElementById('eventSelector');
    if (eventSelector) {
        eventSelector.addEventListener('change', async function(e) {
            if (e.target.value) await cargarEvento(e.target.value);
        });
    }
    
    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) btnRefresh.addEventListener('click', () => cargarEventos());
}

async function cargarEventos() {
    try {
        const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
        const response = await fetch(`${API_BASE}/eventos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const eventos = Array.isArray(data) ? data : (data.eventos || []);
        
        const eventSelector = document.getElementById('eventSelector');
        if (eventSelector) {
            eventSelector.innerHTML = '<option value="">Seleccionar evento...</option>';
            
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
        console.error('Error eventos:', error);
    }
}

async function cargarEvento(eventoId) {
    if (!eventoId) return;
    
    try {
        const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
        
        const response = await fetch(`${API_BASE}/eventos/${eventoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            currentEvent = await response.json();
        } else {
            currentEvent = { id: eventoId, nombre: 'Mi Evento' };
        }
        
        const currentEventName = document.getElementById('currentEventName');
        if (currentEventName) currentEventName.textContent = currentEvent.nombre;
        
        await cargarMesas(eventoId);
        
    } catch (error) {
        console.error('Error evento:', error);
    }
}

async function cargarMesas(eventoId) {
    try {
        const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
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
        
        console.log('✅ Mesas cargadas:', mesas.length);
        renderizarMesas(mesas);
        
    } catch (error) {
        console.error('Error mesas:', error);
        mesas = [];
        renderizarMesas([]);
    }
}

// ========================================
// RENDERIZADO DE MESAS - PERFECTO
// ========================================
function renderizarMesas(mesasArray) {
    const container = document.getElementById('mesasContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!mesasArray || mesasArray.length === 0) {
        container.innerHTML = `
            <div style="width:100%; text-align:center; padding:60px 20px">
                <i class="fas fa-chair" style="font-size:4rem; color:#cbd5e0; margin-bottom:20px"></i>
                <p style="color:#cbd5e0; font-size:1.2rem">No hay mesas creadas</p>
                <small style="color:#cbd5e0">Crea mesas desde la configuración</small>
            </div>
        `;
        return;
    }
    
    console.log('🎨 Renderizando', mesasArray.length, 'mesas');
    
    mesasArray.forEach(mesa => {
        if (!mesa) return;
        
        const mesaElement = crearElementoMesa(mesa);
        container.appendChild(mesaElement);
    });
}

function crearElementoMesa(mesa) {
    const mesaDiv = document.createElement('div');
    mesaDiv.className = 'mesa';
    mesaDiv.style.cssText = `
        position: relative;
        margin-bottom: 80px;
        flex-shrink: 0;
    `;
    
    // Título de la mesa
    const titulo = document.createElement('div');
    titulo.style.cssText = `
        text-align: center;
        margin-bottom: 15px;
        padding: 10px;
        background: #e8f5e9;
        border-radius: 8px;
        font-weight: bold;
    `;
    titulo.textContent = mesa.nombre || `Mesa ${mesa.numero}`;
    mesaDiv.appendChild(titulo);
    
    // Forma y color
    const forma = mesa.forma || 'rectangular';
    const color = mesa.color || '#8B4513';
    const capacidad = mesa.capacidad || 8;
    
    // Mesa gráfica
    const mesaGrafica = document.createElement('div');
    mesaGrafica.style.cssText = `
        position: relative;
        margin: 0 auto;
        margin-top: 100px;
        background-color: ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        z-index: 1;
    `;
    
    // Tamaño según forma
    if (forma === 'circular') {
        mesaGrafica.style.width = '140px';
        mesaGrafica.style.height = '140px';
        mesaGrafica.style.borderRadius = '50%';
    } else if (forma === 'cuadrada') {
        mesaGrafica.style.width = '160px';
        mesaGrafica.style.height = '160px';
        mesaGrafica.style.borderRadius = '10px';
    } else { // rectangular
        mesaGrafica.style.width = '210px';
        mesaGrafica.style.height = '110px';
        mesaGrafica.style.borderRadius = '10px';
    }
    
    mesaGrafica.textContent = mesa.nombre || `Mesa ${mesa.numero}`;
    mesaDiv.appendChild(mesaGrafica);
    
    // AGREGAR SILLAS
    agregarSillas(mesaDiv, forma, capacidad);
    
    return mesaDiv;
}

// ========================================
// AGREGAR SILLAS - PERFECTO
// ========================================
function agregarSillas(mesaDiv, forma, cantidad) {
    const posiciones = calcularPosicionesSillas(forma, cantidad);
    
    posiciones.forEach((pos, index) => {
        const silla = document.createElement('div');
        silla.textContent = index + 1;
        
        silla.style.cssText = `
            position: absolute;
            left: ${pos.x}px;
            top: ${pos.y}px;
            width: 32px;
            height: 42px;
            background-color: #9E9E9E;
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
        
        // Respaldo de la silla
        const respaldo = document.createElement('div');
        respaldo.style.cssText = `
            position: absolute;
            top: -6px;
            left: 6px;
            width: 20px;
            height: 8px;
            background-color: #9E9E9E;
            border-radius: 3px 3px 0 0;
        `;
        silla.appendChild(respaldo);
        
        // Hover
        silla.addEventListener('mouseenter', () => {
            silla.style.transform = 'scale(1.15)';
        });
        
        silla.addEventListener('mouseleave', () => {
            silla.style.transform = 'scale(1)';
        });
        
        mesaDiv.appendChild(silla);
    });
}

// ========================================
// CALCULAR POSICIONES - PERFECTO
// ========================================
function calcularPosicionesSillas(forma, cantidad) {
    const posiciones = [];
    
    if (forma === 'circular') {
        // CIRCULAR: Distribuir en círculo
        const radio = 90; // Radio del círculo
        const centerX = 70; // Centro X de la mesa circular (140/2)
        const centerY = 170; // Centro Y (100 margin-top + 70)
        
        for (let i = 0; i < cantidad; i++) {
            const angulo = (360 / cantidad) * i; // Ángulo en grados
            const radianes = (angulo - 90) * (Math.PI / 180); // Convertir a radianes, -90 para empezar arriba
            
            const x = centerX + radio * Math.cos(radianes);
            const y = centerY + radio * Math.sin(radianes);
            
            posiciones.push({ x, y });
        }
    } 
    else if (forma === 'cuadrada') {
        // CUADRADA: Distribuir en 4 lados
        const lado = 160; // Tamaño de la mesa
        const sillasPorLado = Math.ceil(cantidad / 4);
        const espaciado = lado / sillasPorLado;
        
        for (let i = 0; i < cantidad; i++) {
            const ladoActual = Math.floor(i / sillasPorLado);
            const posEnLado = i % sillasPorLado;
            
            let x, y;
            
            if (ladoActual === 0) { // Arriba
                x = 30 + posEnLado * espaciado;
                y = 10;
            } else if (ladoActual === 1) { // Derecha
                x = 180;
                y = 30 + posEnLado * espaciado;
            } else if (ladoActual === 2) { // Abajo
                x = 30 + posEnLado * espaciado;
                y = 240;
            } else { // Izquierda
                x = -20;
                y = 30 + posEnLado * espaciado;
            }
            
            posiciones.push({ x, y });
        }
    } 
    else { // RECTANGULAR
        // RECTANGULAR: 2 en los lados cortos, resto en lados largos
        const ancho = 210;
        const sillasLaterales = Math.floor((cantidad - 2) / 2);
        const espaciado = ancho / (sillasLaterales + 1);
        
        // Lado izquierdo (corto)
        posiciones.push({ x: -20, y: 150 });
        
        // Lado derecho (corto)
        posiciones.push({ x: 220, y: 150 });
        
        // Lado superior (largo)
        for (let i = 0; i < sillasLaterales; i++) {
            posiciones.push({
                x: 30 + i * espaciado,
                y: 20
            });
        }
        
        // Lado inferior (largo)
        const restantes = cantidad - 2 - sillasLaterales;
        for (let i = 0; i < restantes; i++) {
            posiciones.push({
                x: 30 + i * espaciado,
                y: 200
            });
        }
    }
    
    return posiciones.slice(0, cantidad);
}

console.log('✅ Cliente cargado - SOLO RENDERIZADO');
