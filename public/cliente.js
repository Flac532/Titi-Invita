// cliente.js - FINAL COMBINADO
// Renderizado de final.html + Funcionalidad completa

const API_BASE = 'https://titi-invita-app-azhcw.ondigitalocean.app/api';

let currentUser = null;
let currentEvent = null;
let mesas = [];
let invitados = [];

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando Titi Invita');
    
    const usuarioStr = localStorage.getItem('titi_usuario_actual');
    if (!usuarioStr) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(usuarioStr);
        console.log('✅ Usuario:', currentUser.nombre);
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

function setupEventListeners() {
    const eventSelector = document.getElementById('eventSelector');
    if (eventSelector) {
        eventSelector.addEventListener('change', async function(e) {
            if (e.target.value) await cargarEvento(e.target.value);
        });
    }
    
    const btnRefresh = document.getElementById('refreshEventsBtn');
    if (btnRefresh) btnRefresh.addEventListener('click', () => cargarEventos());
    
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const tabName = this.getAttribute('data-tab');
            const content = document.getElementById(tabName + 'Tab');
            if (content) content.classList.add('active');
        });
    });
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
        
        console.log('✅ Eventos:', eventos.length);
        
        const eventSelector = document.getElementById('eventSelector');
        if (eventSelector) {
            eventSelector.innerHTML = '<option value="">Seleccionar Evento...</option>';
            
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
        
        console.log('✅ Evento:', currentEvent.nombre);
        
        const currentEventName = document.getElementById('currentEventName');
        const currentEventDate = document.getElementById('currentEventDate');
        
        if (currentEventName) currentEventName.textContent = currentEvent.nombre;
        if (currentEventDate && currentEvent.fecha_evento) {
            const fecha = new Date(currentEvent.fecha_evento);
            currentEventDate.textContent = fecha.toLocaleDateString('es-ES');
        }
        
        await cargarMesas(eventoId);
        await cargarInvitados(eventoId);
        actualizarEstadisticas();
        
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
        
        // Convertir al formato esperado (con array de sillas)
        mesas = mesas.map(mesa => ({
            ...mesa,
            sillas: Array.from({ length: mesa.capacidad || 8 }, (_, i) => ({
                id: i + 1,
                estado: 'sin-asignar',
                nombre: ''
            }))
        }));
        
        console.log('✅ Mesas:', mesas.length);
        renderizarMesas(mesas);
        
    } catch (error) {
        console.error('Error mesas:', error);
        mesas = [];
        renderizarMesas([]);
    }
}

async function cargarInvitados(eventoId) {
    try {
        const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
        const response = await fetch(`${API_BASE}/invitados?evento_id=${eventoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            invitados = Array.isArray(data) ? data : [];
            
            console.log('✅ Invitados:', invitados.length);
            
            // Actualizar estado de sillas con invitados
            invitados.forEach(inv => {
                if (inv.mesa_id && inv.silla_numero) {
                    const mesa = mesas.find(m => m.id === inv.mesa_id);
                    if (mesa && mesa.sillas[inv.silla_numero - 1]) {
                        mesa.sillas[inv.silla_numero - 1].estado = inv.estado === 'confirmado' ? 'confirmado' : 
                                                                    inv.estado === 'rechazado' ? 'asignado' : 
                                                                    'sin-asignar';
                        mesa.sillas[inv.silla_numero - 1].nombre = inv.nombre;
                    }
                }
            });
            
            renderizarMesas(mesas);
        }
    } catch (error) {
        console.error('Error invitados:', error);
    }
}

// ========================================
// RENDERIZADO EXACTO DE final.html
// ========================================
function renderizarMesas(mesasArray) {
    const container = document.getElementById('mesasContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!mesasArray || mesasArray.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chair"></i>
                <p>No hay mesas creadas</p>
                <small>Crea mesas desde Configuración</small>
            </div>
        `;
        return;
    }
    
    console.log('🎨 Renderizando', mesasArray.length, 'mesas');
    
    mesasArray.forEach(mesa => {
        if (!mesa) return;
        crearMesaVisual(mesa, container);
    });
}

function crearMesaVisual(mesa, container) {
    const mesaElement = document.createElement('div');
    mesaElement.className = 'mesa';
    mesaElement.dataset.id = mesa.id;
    
    // Información de la mesa
    const mesaInfo = document.createElement('div');
    mesaInfo.className = 'mesa-info';
    mesaInfo.textContent = `${mesa.nombre || 'Mesa ' + mesa.numero} (${mesa.sillas.length} sillas)`;
    mesaElement.appendChild(mesaInfo);
    
    // Representación gráfica de la mesa
    const mesaGrafica = document.createElement('div');
    mesaGrafica.className = `mesa-grafica mesa-${mesa.forma}`;
    mesaGrafica.textContent = mesa.nombre || `Mesa ${mesa.numero}`;
    mesaGrafica.style.backgroundColor = mesa.color || '#8B4513';
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
        
        // Posicionar la silla (EXACTO de final.html)
        const pos = posiciones[index];
        sillaElement.style.left = `calc(${pos.x}% - 16px)`;
        sillaElement.style.top = `calc(${pos.y}% - 21px)`;
        
        // Rotar silla para orientarla hacia la mesa (EXACTO de final.html)
        const centroX = 50;
        const centroY = 50;
        const angulo = Math.atan2(centroY - pos.y, centroX - pos.x) * (180 / Math.PI);
        
        if (mesa.forma === 'rectangular' || mesa.forma === 'cuadrada') {
            if (pos.y < 25) {
                sillaElement.style.transform = `rotate(180deg)`;
            } else if (pos.y > 75) {
                sillaElement.style.transform = `rotate(0deg)`;
            } else if (pos.x < 25) {
                sillaElement.style.transform = `rotate(90deg)`;
            } else if (pos.x > 75) {
                sillaElement.style.transform = `rotate(270deg)`;
            } else {
                sillaElement.style.transform = `rotate(${angulo}deg)`;
            }
        } else {
            sillaElement.style.transform = `rotate(${angulo + 90}deg)`;
        }
        
        sillasContainer.appendChild(sillaElement);
    });
    
    mesaElement.appendChild(sillasContainer);
    container.appendChild(mesaElement);
}

// FUNCIÓN EXACTA DE final.html
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
        
        // Lado IZQUIERDO
        posiciones.push({x: -5, y: 50});
        
        // Lado DERECHO
        if (numSillas >= 2) {
            posiciones.push({x: anchoContenedor + 5, y: 50});
        }
        
        // LADOS LARGOS
        if (sillasPorLadoLargo > 0) {
            const distancia = anchoContenedor - (margenLateral * 2);
            const divisor = Math.max(sillasPorLadoLargo - 1, 1);
            
            // LADO SUPERIOR
            for (let i = 0; i < sillasPorLadoLargo; i++) {
                const posRelativa = (i * (distancia / divisor));
                const x = margenLateral + posRelativa;
                const y = margenVertical;
                posiciones.push({x, y});
            }
            
            // LADO INFERIOR
            for (let i = 0; i < sillasPorLadoLargo; i++) {
                const posRelativa = (i * (distancia / divisor));
                const x = margenLateral + posRelativa;
                const y = anchoContenedor - margenVertical;
                posiciones.push({x, y});
            }
        }
        
        // Silla impar centrada
        if (sillasImpares > 0) {
            posiciones.push({x: 50, y: margenVertical});
        }
        
        // Recortar si excede
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

function actualizarEstadisticas() {
    const totalMesas = mesas.length;
    const totalSillas = mesas.reduce((sum, m) => sum + (m.sillas ? m.sillas.length : 0), 0);
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

console.log('✅ Titi Invita cargado - Renderizado final.html');
