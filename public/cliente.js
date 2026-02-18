// cliente.js - VERSIÓN COMPLETA CON TODAS LAS FUNCIONALIDADES
const API_BASE = 'https://titi-invita-app-azhcw.ondigitalocean.app/api';
let currentUser = null;
let currentEvent = null;
let mesas = [];
let invitados = [];
let mesasConInvitados = {};

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando cliente.js COMPLETO');
    
    const usuarioStr = localStorage.getItem('titi_usuario_actual');
    if (!usuarioStr) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(usuarioStr);
    console.log('✅ Usuario:', currentUser.nombre, '- Rol:', currentUser.rol);
    
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
    const newEventBtn = document.getElementById('newEventBtn');
    const refreshEventsBtn = document.getElementById('refreshEventsBtn');
    const eventSelector = document.getElementById('eventSelector');
    const btnGuardarEvento = document.getElementById('btnGuardarEvento');
    const btnCrearMesas = document.getElementById('btnCrearMesas');
    const addGuestBtn = document.getElementById('addGuestBtn');
    
    if (newEventBtn) newEventBtn.addEventListener('click', () => abrirModalNuevoEvento());
    if (refreshEventsBtn) refreshEventsBtn.addEventListener('click', () => cargarEventos());
    if (eventSelector) {
        eventSelector.addEventListener('change', (e) => {
            if (e.target.value) cargarEvento(e.target.value);
        });
    }
    if (btnGuardarEvento) btnGuardarEvento.addEventListener('click', () => guardarCambiosEvento());
    if (btnCrearMesas) btnCrearMesas.addEventListener('click', () => crearActualizarMesas());
    if (addGuestBtn) {
        addGuestBtn.addEventListener('click', () => {
            document.getElementById('addGuestModal').classList.add('active');
            cargarMesasEnSelector();
        });
    }
    
    // Form de invitado
    const formInvitado = document.getElementById('formAgregarInvitado');
    if (formInvitado) {
        formInvitado.addEventListener('submit', (e) => {
            e.preventDefault();
            guardarInvitado();
        });
    }
    
    // Select de mesa en modal invitado
    const guestMesa = document.getElementById('guestMesa');
    if (guestMesa) {
        guestMesa.addEventListener('change', (e) => {
            cargarSillasDisponibles(e.target.value);
        });
    }
}

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
        
        console.log('📥 Cargando desde:', endpoint);
        
        const response = await fetch(API_BASE + endpoint, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) throw new Error('Error al cargar eventos');
        
        const data = await response.json();
        const eventos = Array.isArray(data) ? data : (data.eventos || [data]);
        
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
                cargarEvento(eventos[0].id);
            }
        }
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('Error al cargar eventos', 'error');
    }
}

async function cargarEvento(eventoId) {
    try {
        console.log('📥 Cargando evento:', eventoId);
        
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/eventos/' + eventoId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) throw new Error('Error');
        
        currentEvent = await response.json();
        console.log('✅ Evento cargado:', currentEvent);
        
        actualizarInfoEvento();
        await cargarMesas(eventoId);
        await cargarInvitados(eventoId);
        actualizarEstadisticas();
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('Error al cargar evento', 'error');
    }
}

function actualizarInfoEvento() {
    if (!currentEvent) return;
    
    const currentEventName = document.getElementById('currentEventName');
    const currentEventDate = document.getElementById('currentEventDate');
    const eventName = document.getElementById('eventName');
    const eventDate = document.getElementById('eventDate');
    const eventTime = document.getElementById('eventTime');
    const eventDescription = document.getElementById('eventDescription');
    
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
    if (eventTime && currentEvent.fecha_evento) {
        const fecha = new Date(currentEvent.fecha_evento);
        eventTime.value = fecha.toTimeString().substring(0, 5);
    }
    if (eventDescription) eventDescription.value = currentEvent.descripcion || '';
}

async function cargarMesas(eventoId) {
    try {
        console.log('📥 Cargando mesas...');
        
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/eventos/' + eventoId + '/mesas', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) {
            console.log('⚠️ No hay mesas');
            mesas = [];
            renderizarMesas([]);
            return;
        }
        
        const data = await response.json();
        
        // Asegurar array
        if (Array.isArray(data)) {
            mesas = data;
        } else if (data && typeof data === 'object') {
            mesas = data.mesas || data.data || [];
        } else {
            mesas = [];
        }
        
        console.log('✅ Mesas:', mesas.length);
        renderizarMesas(mesas);
        actualizarEstadisticas();
    } catch (error) {
        console.error('❌ Error mesas:', error);
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
                <p>No hay mesas creadas</p>
                <small>Usa "Crear/Actualizar Mesas"</small>
            </div>
        `;
        return;
    }
    
    // Calcular asignaciones de invitados por silla
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
    mesaDiv.setAttribute('data-mesa-id', mesa.id);
    
    // Info de la mesa (nombre editable)
    const mesaInfo = document.createElement('div');
    mesaInfo.className = 'mesa-info';
    mesaInfo.innerHTML = `
        <strong>${mesa.nombre || 'Mesa ' + mesa.numero}</strong>
        <div style="margin-top:5px; font-size:0.85rem">
            <button onclick="editarMesa(${mesa.id})" style="background:#2196F3; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; margin-right:5px">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button onclick="cambiarColorMesa(${mesa.id})" style="background:#FF9800; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer">
                <i class="fas fa-palette"></i> Color
            </button>
        </div>
    `;
    mesaDiv.appendChild(mesaInfo);
    
    // Mesa gráfica
    const mesaGrafica = document.createElement('div');
    mesaGrafica.className = 'mesa-grafica mesa-' + forma;
    mesaGrafica.style.backgroundColor = colorMesa;
    mesaGrafica.textContent = mesa.nombre || `Mesa ${mesa.numero}`;
    mesaDiv.appendChild(mesaGrafica);
    
    // Agregar sillas con colores
    agregarSillasConEstado(mesaDiv, mesa, forma, capacidad);
    
    return mesaDiv;
}

function agregarSillasConEstado(mesaDiv, mesa, forma, cantidad) {
    const posiciones = calcularPosicionesSillas(forma, cantidad);
    
    posiciones.forEach((pos, index) => {
        const sillaNro = index + 1;
        const key = `${mesa.id}-${sillaNro}`;
        const invitado = mesasConInvitados[key];
        
        const silla = document.createElement('div');
        silla.className = 'silla';
        silla.setAttribute('data-mesa-id', mesa.id);
        silla.setAttribute('data-silla-numero', sillaNro);
        silla.textContent = sillaNro;
        silla.style.left = pos.x + 'px';
        silla.style.top = pos.y + 'px';
        silla.style.transform = `rotate(${pos.rotation}deg)`;
        
        // COLORES SEGÚN ESTADO
        if (invitado) {
            if (invitado.estado === 'confirmado') {
                silla.style.backgroundColor = '#4CAF50'; // Verde
                silla.title = `${invitado.nombre} - Confirmado`;
            } else if (invitado.estado === 'rechazado') {
                silla.style.backgroundColor = '#f44336'; // Rojo
                silla.title = `${invitado.nombre} - Rechazado`;
            } else {
                silla.style.backgroundColor = '#FFA726'; // Naranja pendiente
                silla.title = `${invitado.nombre} - Pendiente`;
            }
        } else {
            silla.style.backgroundColor = '#9E9E9E'; // Gris disponible
            silla.title = 'Disponible';
        }
        
        // Click para asignar invitado
        silla.addEventListener('click', () => {
            if (invitado) {
                mostrarInfoInvitado(invitado);
            } else {
                asignarInvitadoASilla(mesa.id, sillaNro);
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
            posiciones.push({ x, y, rotation: angulo });
        }
    } else if (forma === 'cuadrada') {
        const sillasPorLado = Math.ceil(cantidad / 4);
        const espaciado = 50;
        
        for (let i = 0; i < cantidad; i++) {
            const lado = Math.floor(i / sillasPorLado);
            const posEnLado = i % sillasPorLado;
            
            let x, y, rotation;
            if (lado === 0) {
                x = 30 + posEnLado * espaciado;
                y = 10;
                rotation = 0;
            } else if (lado === 1) {
                x = 180;
                y = 30 + posEnLado * espaciado;
                rotation = 90;
            } else if (lado === 2) {
                x = 30 + posEnLado * espaciado;
                y = 240;
                rotation = 180;
            } else {
                x = -20;
                y = 30 + posEnLado * espaciado;
                rotation = 270;
            }
            posiciones.push({ x, y, rotation });
        }
    } else { // rectangular
        const sillasLaterales = Math.floor((cantidad - 2) / 2);
        const espaciado = 50;
        
        posiciones.push({ x: -20, y: 150, rotation: 270 });
        posiciones.push({ x: 220, y: 150, rotation: 90 });
        
        for (let i = 0; i < sillasLaterales; i++) {
            posiciones.push({
                x: 30 + i * espaciado,
                y: 20,
                rotation: 0
            });
        }
        
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
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear mesas');
        }
        
        showToast('✅ Mesas creadas exitosamente', 'success');
        await cargarMesas(currentEvent.id);
    } catch (error) {
        console.error('❌ Error:', error);
        showToast(error.message || 'Error al crear mesas', 'error');
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
        invitados = Array.isArray(data) ? data : (data.invitados || []);
        
        console.log('✅ Invitados:', invitados.length);
        renderizarInvitados(invitados);
        actualizarEstadisticas();
    } catch (error) {
        console.error('Error invitados:', error);
        invitados = [];
        renderizarInvitados([]);
    }
}

function renderizarInvitados(invitadosArray) {
    const container = document.getElementById('invitadosList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!invitadosArray || invitadosArray.length === 0) {
        container.innerHTML = `
            <div class="empty-invitados">
                <i class="fas fa-user-friends"></i>
                <p>No hay invitados</p>
            </div>
        `;
        return;
    }
    
    invitadosArray.forEach(inv => {
        const div = document.createElement('div');
        div.className = 'invitado-item';
        div.innerHTML = `
            <div>
                <strong>${inv.nombre}</strong><br>
                <small>${inv.email || 'Sin email'}</small>
                ${inv.mesa_id ? `<br><small>Mesa ${inv.mesa_numero || inv.mesa_id}, Silla ${inv.silla_numero}</small>` : ''}
            </div>
            <div>
                <span class="estado-badge ${inv.estado}">${inv.estado}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

function cargarMesasEnSelector() {
    const guestMesa = document.getElementById('guestMesa');
    if (!guestMesa) return;
    
    guestMesa.innerHTML = '<option value="">Sin asignar</option>';
    mesas.forEach(mesa => {
        const option = document.createElement('option');
        option.value = mesa.id;
        option.textContent = mesa.nombre || `Mesa ${mesa.numero}`;
        guestMesa.appendChild(option);
    });
}

function cargarSillasDisponibles(mesaId) {
    const guestSilla = document.getElementById('guestSilla');
    if (!guestSilla || !mesaId) {
        if (guestSilla) guestSilla.innerHTML = '<option value="">Primero selecciona mesa</option>';
        return;
    }
    
    const mesa = mesas.find(m => m.id == mesaId);
    if (!mesa) return;
    
    guestSilla.innerHTML = '<option value="">Seleccionar silla...</option>';
    for (let i = 1; i <= mesa.capacidad; i++) {
        const key = `${mesaId}-${i}`;
        const ocupada = mesasConInvitados[key];
        
        const option = document.createElement('option');
        option.value = i;
        option.textContent = ocupada ? `Silla ${i} (Ocupada por ${ocupada.nombre})` : `Silla ${i}`;
        option.disabled = !!ocupada;
        guestSilla.appendChild(option);
    }
}

async function guardarInvitado() {
    if (!currentEvent) return;
    
    const nombre = document.getElementById('guestName').value;
    const email = document.getElementById('guestEmail').value;
    const telefono = document.getElementById('guestPhone').value;
    const mesaId = document.getElementById('guestMesa').value;
    const sillaNro = document.getElementById('guestSilla').value;
    const estado = document.getElementById('guestEstado').value;
    
    if (!nombre) {
        showToast('El nombre es obligatorio', 'error');
        return;
    }
    
    try {
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/invitados', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                evento_id: currentEvent.id,
                nombre,
                email,
                telefono,
                mesa_id: mesaId || null,
                silla_numero: sillaNro || null,
                estado: estado || 'pendiente'
            })
        });
        
        if (!response.ok) throw new Error('Error');
        
        showToast('✅ Invitado agregado', 'success');
        document.getElementById('addGuestModal').classList.remove('active');
        document.getElementById('formAgregarInvitado').reset();
        await cargarInvitados(currentEvent.id);
        renderizarMesas(mesas);
    } catch (error) {
        showToast('Error al guardar', 'error');
    }
}

function asignarInvitadoASilla(mesaId, sillaNro) {
    // Abrir modal con mesa y silla pre-seleccionadas
    document.getElementById('addGuestModal').classList.add('active');
    cargarMesasEnSelector();
    
    setTimeout(() => {
        const guestMesa = document.getElementById('guestMesa');
        if (guestMesa) {
            guestMesa.value = mesaId;
            cargarSillasDisponibles(mesaId);
            
            setTimeout(() => {
                const guestSilla = document.getElementById('guestSilla');
                if (guestSilla) guestSilla.value = sillaNro;
            }, 100);
        }
    }, 100);
}

function mostrarInfoInvitado(invitado) {
    alert(`Invitado: ${invitado.nombre}\nEstado: ${invitado.estado}\nEmail: ${invitado.email || 'N/A'}`);
}

function editarMesa(mesaId) {
    const mesa = mesas.find(m => m.id === mesaId);
    if (!mesa) return;
    
    const nuevoNombre = prompt('Nombre de la mesa:', mesa.nombre || `Mesa ${mesa.numero}`);
    if (nuevoNombre === null) return;
    
    actualizarMesa(mesaId, { nombre: nuevoNombre });
}

function cambiarColorMesa(mesaId) {
    const mesa = mesas.find(m => m.id === mesaId);
    if (!mesa) return;
    
    const nuevoColor = prompt('Color (ej: #8B4513, red, blue):', mesa.color || '#8B4513');
    if (nuevoColor === null) return;
    
    actualizarMesa(mesaId, { color: nuevoColor });
}

async function actualizarMesa(mesaId, cambios) {
    try {
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/mesas/' + mesaId, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(cambios)
        });
        
        if (!response.ok) throw new Error('Error');
        
        showToast('✅ Mesa actualizada', 'success');
        await cargarMesas(currentEvent.id);
    } catch (error) {
        showToast('Error al actualizar mesa', 'error');
    }
}

async function guardarCambiosEvento() {
    if (!currentEvent) return;
    
    const nombre = document.getElementById('eventName').value;
    const fecha = document.getElementById('eventDate').value;
    const hora = document.getElementById('eventTime')?.value || '00:00';
    const descripcion = document.getElementById('eventDescription')?.value || '';
    
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
            body: JSON.stringify({
                nombre,
                fecha_evento: fecha ? `${fecha} ${hora}` : null,
                descripcion
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error');
        }
        
        showToast('✅ Evento actualizado', 'success');
        await cargarEvento(currentEvent.id);
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message || 'Error al actualizar', 'error');
    }
}

async function finalizarEvento() {
    if (!currentEvent) return;
    
    try {
        const token = obtenerToken();
        const response = await fetch(API_BASE + '/eventos/' + currentEvent.id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        
        if (!response.ok) throw new Error('Error');
        
        showToast('✅ Evento eliminado', 'success');
        currentEvent = null;
        cargarEventos();
    } catch (error) {
        showToast('Error al eliminar', 'error');
    }
}

function abrirModalNuevoEvento() {
    const modal = document.getElementById('newEventModal');
    if (modal) modal.classList.add('active');
}

function actualizarEstadisticas() {
    const totalMesas = mesas.length;
    const totalSillas = mesas.reduce((sum, m) => sum + (m.capacidad || 0), 0);
    const ocupadas = invitados.filter(i => i.mesa_id && i.silla_numero).length;
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
    toast.style.background = type === 'error' ? '#f44336' : '#4CAF50';
    toast.style.color = 'white';
    toast.style.padding = '15px 20px';
    toast.style.borderRadius = '8px';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

console.log('✅ cliente.js COMPLETO cargado');
