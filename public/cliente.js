// cliente.js - VERSIÓN FINAL COMPLETA
const API_BASE = 'https://titi-invita-app-azhcw.ondigitalocean.app/api';

let currentUser = null;
let currentEvent = null;
let mesas = [];
let invitados = [];

// ===== INICIALIZACIÓN =====
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

// ===== INICIALIZAR UI =====
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

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Event selector
    const eventSelector = document.getElementById('eventSelector');
    if (eventSelector) {
        eventSelector.addEventListener('change', async function(e) {
            if (e.target.value) await cargarEvento(e.target.value);
        });
    }
    
    // Botón refresh
    const btnRefresh = document.getElementById('refreshEventsBtn');
    if (btnRefresh) btnRefresh.addEventListener('click', () => cargarEventos());
    
    // Botón cerrar sesión
    const btnLogout = document.getElementById('logoutBtn');
    if (btnLogout) btnLogout.addEventListener('click', cerrarSesion);
    
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
    
    // Botón agregar invitado
    const btnAddGuest = document.getElementById('addGuestBtn');
    if (btnAddGuest) btnAddGuest.addEventListener('click', mostrarModalAgregarInvitado);
    
    // Botón cambiar disposición
    const btnLayout = document.getElementById('changeLayoutBtn');
    if (btnLayout) btnLayout.addEventListener('click', mostrarModalDisposicion);
    
    // Botón crear mesas
    const btnCrearMesas = document.getElementById('btnCrearMesas');
    if (btnCrearMesas) btnCrearMesas.addEventListener('click', crearMesas);
    
    // Botón guardar evento
    const btnGuardar = document.getElementById('btnGuardarEvento');
    if (btnGuardar) btnGuardar.addEventListener('click', guardarEvento);
    
    // Botón eliminar evento
    const btnEliminar = document.getElementById('btnFinalizarEvento');
    if (btnEliminar) btnEliminar.addEventListener('click', eliminarEvento);
    
    // Cerrar modales con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') cerrarModales();
    });
}

// ===== CERRAR SESIÓN =====
function cerrarSesion() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        localStorage.removeItem('titi_usuario_actual');
        localStorage.removeItem('titi_token');
        sessionStorage.removeItem('titi_token');
        window.location.href = 'login.html';
    }
}

// ===== CARGAR EVENTOS =====
async function cargarEventos() {
    try {
        const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
        const response = await fetch(`${API_BASE}/eventos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const eventos = Array.isArray(data) ? data : (data.eventos || []);
        
        console.log('✅ Eventos cargados:', eventos.length);
        
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
        console.error('Error cargando eventos:', error);
    }
}

// ===== CARGAR EVENTO =====
async function cargarEvento(eventoId) {
    if (!eventoId) return;
    
    try {
        const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
        
        const response = await fetch(`${API_BASE}/eventos/${eventoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            currentEvent = await response.json();
            if (!currentEvent.id) currentEvent.id = eventoId;
        } else {
            currentEvent = { id: eventoId, nombre: 'Mi Evento' };
        }
        
        console.log('✅ Evento cargado:', currentEvent.nombre);
        
        // Actualizar UI
        const currentEventName = document.getElementById('currentEventName');
        const currentEventDate = document.getElementById('currentEventDate');
        const eventNameInput = document.getElementById('eventName');
        
        if (currentEventName) currentEventName.textContent = currentEvent.nombre;
        if (eventNameInput) eventNameInput.value = currentEvent.nombre || '';
        
        if (currentEventDate && currentEvent.fecha_evento) {
            const fecha = new Date(currentEvent.fecha_evento);
            currentEventDate.textContent = fecha.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        await cargarMesas(eventoId);
        await cargarInvitados(eventoId);
        actualizarEstadisticas();
        
    } catch (error) {
        console.error('Error cargando evento:', error);
    }
}

// ===== CARGAR MESAS =====
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
        
        // Convertir al formato con sillas
        mesas = mesas.map(mesa => ({
            ...mesa,
            sillas: Array.from({ length: mesa.capacidad || 8 }, (_, i) => ({
                id: i + 1,
                estado: 'sin-asignar',
                nombre: ''
            }))
        }));
        
        console.log('✅ Mesas cargadas:', mesas.length);
        renderizarMesas(mesas);
        
    } catch (error) {
        console.error('Error cargando mesas:', error);
        mesas = [];
        renderizarMesas([]);
    }
}

// ===== CARGAR INVITADOS =====
async function cargarInvitados(eventoId) {
    try {
        const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
        const response = await fetch(`${API_BASE}/invitados?evento_id=${eventoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            invitados = Array.isArray(data) ? data : [];
            
            console.log('✅ Invitados cargados:', invitados.length);
            
            // Actualizar sillas con invitados
            invitados.forEach(inv => {
                if (inv.mesa_id && inv.silla_numero) {
                    const mesa = mesas.find(m => m.id === inv.mesa_id);
                    if (mesa && mesa.sillas[inv.silla_numero - 1]) {
                        mesa.sillas[inv.silla_numero - 1].estado = inv.estado === 'confirmado' ? 'confirmado' : 
                                                                    inv.estado === 'rechazado' ? 'asignado' : 
                                                                    'sin-asignar';
                        mesa.sillas[inv.silla_numero - 1].nombre = inv.nombre;
                        mesa.sillas[inv.silla_numero - 1].invitadoId = inv.id;
                    }
                }
            });
            
            renderizarMesas(mesas);
            renderizarListaInvitados();
        }
    } catch (error) {
        console.error('Error cargando invitados:', error);
    }
}

// ===== RENDERIZAR MESAS =====
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
    
    mesasArray.forEach(mesa => {
        if (!mesa) return;
        const mesaElement = crearElementoMesa(mesa);
        container.appendChild(mesaElement);
    });
}

// ===== CREAR ELEMENTO MESA =====
function crearElementoMesa(mesa) {
    const mesaDiv = document.createElement('div');
    mesaDiv.className = 'mesa';
    
    // Info
    const mesaInfo = document.createElement('div');
    mesaInfo.className = 'mesa-info';
    mesaInfo.textContent = `${mesa.nombre || 'Mesa ' + mesa.numero} (${mesa.sillas.length} sillas)`;
    mesaDiv.appendChild(mesaInfo);
    
    // Gráfica
    const mesaGrafica = document.createElement('div');
    mesaGrafica.className = `mesa-grafica mesa-${mesa.forma}`;
    mesaGrafica.textContent = mesa.nombre || `Mesa ${mesa.numero}`;
    mesaGrafica.style.backgroundColor = mesa.color || '#8B4513';
    mesaDiv.appendChild(mesaGrafica);
    
    // Sillas
    const sillasContainer = document.createElement('div');
    sillasContainer.className = `sillas-container ${mesa.forma}-sillas`;
    
    const posiciones = calcularPosicionesSillas(mesa.sillas.length, mesa.forma);
    
    mesa.sillas.forEach((silla, index) => {
        const sillaElement = document.createElement('div');
        sillaElement.className = `silla estado-${silla.estado}`;
        sillaElement.textContent = silla.id;
        sillaElement.title = silla.nombre || 'Disponible';
        
        const pos = posiciones[index];
        sillaElement.style.left = `calc(${pos.x}% - 16px)`;
        sillaElement.style.top = `calc(${pos.y}% - 21px)`;
        
        const centroX = 50;
        const centroY = 50;
        const angulo = Math.atan2(centroY - pos.y, centroX - pos.x) * (180 / Math.PI);
        
        if (mesa.forma === 'rectangular' || mesa.forma === 'cuadrada') {
            if (pos.y < 25) sillaElement.style.transform = `rotate(180deg)`;
            else if (pos.y > 75) sillaElement.style.transform = `rotate(0deg)`;
            else if (pos.x < 25) sillaElement.style.transform = `rotate(90deg)`;
            else if (pos.x > 75) sillaElement.style.transform = `rotate(270deg)`;
            else sillaElement.style.transform = `rotate(${angulo}deg)`;
        } else {
            sillaElement.style.transform = `rotate(${angulo + 90}deg)`;
        }
        
        // Click en silla
        sillaElement.addEventListener('click', () => {
            if (silla.invitadoId) {
                mostrarOpcionesSilla(silla, mesa);
            } else {
                mostrarModalAsignarInvitado(mesa.id, silla.id);
            }
        });
        
        sillasContainer.appendChild(sillaElement);
    });
    
    mesaDiv.appendChild(sillasContainer);
    return mesaDiv;
}

// ===== CALCULAR POSICIONES SILLAS =====
function calcularPosicionesSillas(numSillas, forma) {
    const posiciones = [];
    
    if (forma === 'rectangular' || forma === 'cuadrada') {
        const anchoContenedor = 100;
        const sillasLadosCortos = 2;
        const sillasRestantes = Math.max(0, numSillas - sillasLadosCortos);
        const sillasPorLadoLargo = Math.floor(sillasRestantes / 2);
        const margenLateral = 20;
        const margenVertical = 15;
        
        posiciones.push({x: -5, y: 50});
        if (numSillas >= 2) posiciones.push({x: anchoContenedor + 5, y: 50});
        
        if (sillasPorLadoLargo > 0) {
            const distancia = anchoContenedor - (margenLateral * 2);
            const divisor = Math.max(sillasPorLadoLargo - 1, 1);
            
            for (let i = 0; i < sillasPorLadoLargo; i++) {
                const posRelativa = (i * (distancia / divisor));
                const x = margenLateral + posRelativa;
                posiciones.push({x, y: margenVertical});
            }
            
            for (let i = 0; i < sillasPorLadoLargo; i++) {
                const posRelativa = (i * (distancia / divisor));
                const x = margenLateral + posRelativa;
                posiciones.push({x, y: anchoContenedor - margenVertical});
            }
        }
        
        while (posiciones.length > numSillas) posiciones.pop();
        
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

// ===== RENDERIZAR LISTA INVITADOS =====
function renderizarListaInvitados() {
    const guestsList = document.getElementById('guestsList');
    if (!guestsList) return;
    
    guestsList.innerHTML = '';
    
    if (invitados.length === 0) {
        guestsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>No hay invitados</p>
                <small>Agrega invitados con el botón de arriba</small>
            </div>
        `;
        return;
    }
    
    invitados.forEach(invitado => {
        const guestItem = document.createElement('div');
        guestItem.className = 'guest-item';
        guestItem.innerHTML = `
            <strong>${invitado.nombre}</strong>
            <small>${invitado.email || 'Sin email'}</small>
            ${invitado.mesa_id ? `<small>Mesa ${invitado.mesa_id}, Silla ${invitado.silla_numero}</small>` : ''}
            <div class="guest-actions">
                <button class="btn-guest-action" onclick="editarInvitado(${invitado.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-guest-action" onclick="asignarInvitado(${invitado.id})" title="Asignar a mesa">
                    <i class="fas fa-chair"></i>
                </button>
            </div>
            <span class="guest-status ${invitado.estado}">${invitado.estado}</span>
        `;
        guestsList.appendChild(guestItem);
    });
}

// ===== MODAL AGREGAR INVITADO =====
function mostrarModalAgregarInvitado() {
    const modalHTML = `
        <div class="modal active" id="modalAgregarInvitado">
            <div class="modal-overlay" onclick="cerrarModales()"></div>
            <div class="modal-content">
                <button class="modal-close" onclick="cerrarModales()"><i class="fas fa-times"></i></button>
                <h2><i class="fas fa-user-plus"></i> Agregar Invitado</h2>
                
                <form id="formAgregarInvitado" onsubmit="event.preventDefault(); guardarInvitado();">
                    <div class="form-group">
                        <label>Nombre Completo *</label>
                        <input type="text" id="invitadoNombre" required placeholder="Juan Pérez" autofocus>
                    </div>
                    
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="invitadoEmail" placeholder="juan@ejemplo.com">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="tel" id="invitadoTelefono" placeholder="+52 55 1234 5678">
                        </div>
                        
                        <div class="form-group">
                            <label>Estado</label>
                            <select id="invitadoEstado">
                                <option value="pendiente">Pendiente</option>
                                <option value="confirmado">Confirmado</option>
                                <option value="rechazado">Rechazado</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="button-group">
                        <button type="button" class="btn-secondary" onclick="cerrarModales()">
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

// ===== GUARDAR INVITADO =====
async function guardarInvitado() {
    const nombre = document.getElementById('invitadoNombre').value.trim();
    const email = document.getElementById('invitadoEmail').value.trim();
    const telefono = document.getElementById('invitadoTelefono').value.trim();
    const estado = document.getElementById('invitadoEstado').value;
    
    if (!nombre) {
        alert('❌ El nombre es obligatorio');
        return;
    }
    
    if (!currentEvent || !currentEvent.id) {
        alert('❌ No hay evento seleccionado');
        return;
    }
    
    try {
        const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
        const response = await fetch(`${API_BASE}/invitados`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                evento_id: currentEvent.id,
                nombre,
                email,
                telefono,
                estado
            })
        });
        
        if (response.ok) {
            mostrarToast('✅ Invitado agregado exitosamente', 'success');
            cerrarModales();
            await cargarInvitados(currentEvent.id);
        } else {
            mostrarToast('❌ Error al agregar invitado', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('❌ Error al guardar', 'error');
    }
}

// ===== EDITAR INVITADO =====
window.editarInvitado = function(invitadoId) {
    const invitado = invitados.find(i => i.id === invitadoId);
    if (!invitado) return;
    
    mostrarModalAgregarInvitado();
    
    setTimeout(() => {
        document.getElementById('invitadoNombre').value = invitado.nombre;
        document.getElementById('invitadoEmail').value = invitado.email || '';
        document.getElementById('invitadoTelefono').value = invitado.telefono || '';
        document.getElementById('invitadoEstado').value = invitado.estado;
        
        const form = document.getElementById('formAgregarInvitado');
        form.onsubmit = async function(e) {
            e.preventDefault();
            await actualizarInvitado(invitadoId);
        };
        
        document.querySelector('#modalAgregarInvitado h2').innerHTML = '<i class="fas fa-edit"></i> Editar Invitado';
    }, 100);
};

// ===== ACTUALIZAR INVITADO =====
async function actualizarInvitado(invitadoId) {
    const nombre = document.getElementById('invitadoNombre').value.trim();
    const email = document.getElementById('invitadoEmail').value.trim();
    const telefono = document.getElementById('invitadoTelefono').value.trim();
    const estado = document.getElementById('invitadoEstado').value;
    
    try {
        const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
        const response = await fetch(`${API_BASE}/invitados/${invitadoId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, email, telefono, estado })
        });
        
        if (response.ok) {
            mostrarToast('✅ Invitado actualizado', 'success');
            cerrarModales();
            await cargarInvitados(currentEvent.id);
        } else {
            mostrarToast('❌ Error al actualizar', 'error');
        }
    } catch (error) {
        mostrarToast('❌ Error al guardar', 'error');
    }
}

// ===== ASIGNAR INVITADO =====
window.asignarInvitado = function(invitadoId) {
    mostrarToast('💡 Haz click en una silla disponible para asignar', 'info');
};

// ===== MODAL ASIGNAR A SILLA =====
function mostrarModalAsignarInvitado(mesaId, sillaId) {
    const invitadosDisponibles = invitados.filter(i => !i.mesa_id);
    
    if (invitadosDisponibles.length === 0) {
        mostrarToast('❌ No hay invitados disponibles', 'error');
        return;
    }
    
    const modalHTML = `
        <div class="modal active" id="modalAsignarSilla">
            <div class="modal-overlay" onclick="cerrarModales()"></div>
            <div class="modal-content">
                <button class="modal-close" onclick="cerrarModales()"><i class="fas fa-times"></i></button>
                <h2><i class="fas fa-chair"></i> Asignar Invitado</h2>
                
                <form onsubmit="event.preventDefault(); asignarInvitadoASilla(${mesaId}, ${sillaId});">
                    <div class="form-group">
                        <label>Seleccionar Invitado</label>
                        <select id="selectInvitado" required>
                            <option value="">-- Seleccionar --</option>
                            ${invitadosDisponibles.map(i => `
                                <option value="${i.id}">${i.nombre}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="button-group">
                        <button type="button" class="btn-secondary" onclick="cerrarModales()">Cancelar</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-check"></i> Asignar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ===== ASIGNAR INVITADO A SILLA =====
window.asignarInvitadoASilla = async function(mesaId, sillaId) {
    const invitadoId = document.getElementById('selectInvitado').value;
    
    if (!invitadoId) {
        mostrarToast('❌ Selecciona un invitado', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
        const response = await fetch(`${API_BASE}/invitados/${invitadoId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mesa_id: mesaId,
                silla_numero: sillaId
            })
        });
        
        if (response.ok) {
            mostrarToast('✅ Invitado asignado', 'success');
            cerrarModales();
            await cargarInvitados(currentEvent.id);
        } else {
            mostrarToast('❌ Error al asignar', 'error');
        }
    } catch (error) {
        mostrarToast('❌ Error', 'error');
    }
};

// ===== MODAL DISPOSICIÓN =====
function mostrarModalDisposicion() {
    const modalHTML = `
        <div class="modal active" id="modalDisposicion">
            <div class="modal-overlay" onclick="cerrarModales()"></div>
            <div class="modal-content layout-modal">
                <button class="modal-close" onclick="cerrarModales()"><i class="fas fa-times"></i></button>
                <h2><i class="fas fa-th"></i> Cambiar Disposición</h2>
                
                <div class="layout-options">
                    <div class="layout-option selected" onclick="seleccionarLayout('grid')">
                        <i class="fas fa-th"></i>
                        <p>Cuadrícula</p>
                        <small>Disposición en filas y columnas</small>
                    </div>
                    <div class="layout-option" onclick="seleccionarLayout('circle')">
                        <i class="fas fa-circle"></i>
                        <p>Circular</p>
                        <small>Mesas en círculo</small>
                    </div>
                    <div class="layout-option" onclick="seleccionarLayout('custom')">
                        <i class="fas fa-sliders-h"></i>
                        <p>Personalizado</p>
                        <small>Arrastra las mesas</small>
                    </div>
                </div>
                
                <div class="button-group" style="margin-top: 24px;">
                    <button class="btn-secondary" onclick="cerrarModales()">Cancelar</button>
                    <button class="btn-primary" onclick="aplicarDisposicion()">
                        <i class="fas fa-check"></i> Aplicar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.seleccionarLayout = function(tipo) {
    document.querySelectorAll('.layout-option').forEach(opt => opt.classList.remove('selected'));
    event.target.closest('.layout-option').classList.add('selected');
};

window.aplicarDisposicion = function() {
    mostrarToast('✅ Disposición aplicada', 'success');
    cerrarModales();
};

// ===== CREAR MESAS =====
async function crearMesas() {
    const numMesas = parseInt(document.getElementById('numMesas').value);
    const sillasPorMesa = parseInt(document.getElementById('sillasPorMesa').value);
    const forma = document.getElementById('formaMesa').value;
    
    if (!currentEvent || !currentEvent.id) {
        mostrarToast('❌ No hay evento seleccionado', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
        
        // Borrar mesas existentes
        for (const mesa of mesas) {
            await fetch(`${API_BASE}/mesas/${mesa.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
        
        // Crear nuevas mesas
        const promesas = [];
        for (let i = 1; i <= numMesas; i++) {
            promesas.push(
                fetch(`${API_BASE}/mesas`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        evento_id: currentEvent.id,
                        numero: i,
                        nombre: `Mesa ${i}`,
                        capacidad: sillasPorMesa,
                        forma: forma,
                        color: '#8B4513'
                    })
                })
            );
        }
        
        await Promise.all(promesas);
        mostrarToast('✅ Mesas creadas exitosamente', 'success');
        await cargarMesas(currentEvent.id);
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('❌ Error al crear mesas', 'error');
    }
}

// ===== GUARDAR EVENTO =====
async function guardarEvento() {
    const nombre = document.getElementById('eventName').value.trim();
    
    if (!nombre) {
        mostrarToast('❌ El nombre es obligatorio', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
        const response = await fetch(`${API_BASE}/eventos/${currentEvent.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre })
        });
        
        if (response.ok) {
            mostrarToast('✅ Evento guardado', 'success');
            await cargarEvento(currentEvent.id);
        } else {
            mostrarToast('❌ Error al guardar', 'error');
        }
    } catch (error) {
        mostrarToast('❌ Error', 'error');
    }
}

// ===== ELIMINAR EVENTO =====
async function eliminarEvento() {
    if (!confirm('¿Estás seguro de eliminar este evento?')) return;
    
    try {
        const token = localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
        const response = await fetch(`${API_BASE}/eventos/${currentEvent.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            mostrarToast('✅ Evento eliminado', 'success');
            await cargarEventos();
        } else {
            mostrarToast('❌ Error al eliminar', 'error');
        }
    } catch (error) {
        mostrarToast('❌ Error', 'error');
    }
}

// ===== CERRAR MODALES =====
function cerrarModales() {
    document.querySelectorAll('.modal').forEach(modal => modal.remove());
}

// ===== TOAST NOTIFICATIONS =====
function mostrarToast(mensaje, tipo = 'info') {
    const iconos = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `
        <i class="fas ${iconos[tipo]}"></i>
        <span>${mensaje}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.4s ease-in';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ===== ACTUALIZAR ESTADÍSTICAS =====
function actualizarEstadisticas() {
    const totalMesas = mesas.length;
    const totalSillas = mesas.reduce((sum, m) => sum + (m.sillas ? m.sillas.length : 0), 0);
    const ocupadas = invitados.filter(i => i.mesa_id).length;
    const porcentaje = totalSillas > 0 ? Math.round((ocupadas / totalSillas) * 100) : 0;
    
    const elements = {
        statTotalMesas: totalMesas,
        statTotalSillas: totalSillas,
        statSillasOcupadas: ocupadas,
        statPorcentajeOcupacion: porcentaje + '%'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

console.log('✅ Cliente.js cargado - Versión FINAL');
