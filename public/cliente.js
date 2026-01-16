// cliente.js - Sistema de mesas completo para cliente

// ===== VARIABLES GLOBALES =====
let eventosCliente = [];
let eventoActual = null;
let mesas = [];
let invitados = [];
let sillaSeleccionada = null;
let zoomLevel = 1;
let usuario = null;

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
const mesasContainer = document.getElementById('mesasContainer');
const newEventBtn = document.getElementById('newEventBtn');
const newEventModal = document.getElementById('newEventModal');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const searchGuests = document.getElementById('searchGuests');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const resetViewBtn = document.getElementById('resetViewBtn');
const showNamesCheckbox = document.getElementById('showNames');
const autoSaveCheckbox = document.getElementById('autoSave');

// Estadísticas
const statTotalMesas = document.getElementById('statTotalMesas');
const statTotalSillas = document.getElementById('statTotalSillas');
const statSillasOcupadas = document.getElementById('statSillasOcupadas');
const statPorcentajeOcupacion = document.getElementById('statPorcentajeOcupacion');
const ocupacionBar = document.getElementById('ocupacionBar');

// Lista de invitados
const guestsList = document.getElementById('guestsList');
const guestSearch = document.getElementById('guestSearch');
const guestFilter = document.getElementById('guestFilter');
const addGuestBtn = document.getElementById('addGuestBtn');
const guestDetails = document.getElementById('guestDetails');

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Cargar usuario actual
    usuario = window.titiAuth?.obtenerUsuarioActual();
    
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }
    
    // Configurar UI con datos del usuario
    userAvatar.textContent = usuario.avatar || usuario.nombre.substring(0, 2).toUpperCase();
    userName.textContent = usuario.nombre;
    userRole.textContent = usuario.rol === 'admin' ? 'Administrador' : 'Cliente';
    
    // Cargar datos iniciales
    cargarEventosUsuario();
    cargarInvitadosDemo();
    configurarFechaHora();
    
    // Configurar event listeners
    configurarEventListeners();
    
    // Crear mesas por defecto
    crearMesas();
});

// ===== FUNCIONES PRINCIPALES =====

// 1. Cargar eventos del usuario
function cargarEventosUsuario() {
    // Datos de demo - en producción vendrían de la API
    eventosCliente = [
        {
            id: 1,
            nombre: 'Boda de Ana y Carlos',
            descripcion: 'Celebración en jardín botánico',
            fecha: '2024-06-15',
            hora: '18:00',
            ubicacion: 'Jardín Botánico',
            estado: 'activo',
            mesas: 8,
            sillasPorMesa: 8,
            formaMesa: 'rectangular',
            configuracion: {}
        },
        {
            id: 2,
            nombre: 'Conferencia Tech 2024',
            descripcion: 'Conferencia anual de tecnología',
            fecha: '2024-07-20',
            hora: '09:00',
            ubicacion: 'Centro de Convenciones',
            estado: 'activo',
            mesas: 12,
            sillasPorMesa: 6,
            formaMesa: 'circular',
            configuracion: {}
        },
        {
            id: 3,
            nombre: 'Fiesta de Graduación',
            descripcion: 'Celebración de graduación universitaria',
            fecha: '2024-08-10',
            hora: '20:00',
            ubicacion: 'Salón de Eventos',
            estado: 'borrador',
            mesas: 6,
            sillasPorMesa: 10,
            formaMesa: 'rectangular',
            configuracion: {}
        }
    ];
    
    // Llenar selector de eventos
    eventSelector.innerHTML = '<option value="">Seleccionar Evento...</option>';
    eventosCliente.forEach(evento => {
        const option = document.createElement('option');
        option.value = evento.id;
        option.textContent = evento.nombre;
        if (evento.estado === 'borrador') {
            option.textContent += ' (Borrador)';
        }
        eventSelector.appendChild(option);
    });
    
    // Seleccionar primer evento por defecto
    if (eventosCliente.length > 0) {
        eventSelector.value = eventosCliente[0].id;
        cargarEvento(eventosCliente[0].id);
    }
}

// 2. Cargar un evento específico
function cargarEvento(eventoId) {
    const evento = eventosCliente.find(e => e.id == eventoId);
    if (!evento) return;
    
    eventoActual = evento;
    currentEventName.textContent = evento.nombre;
    
    // Llenar formulario con datos del evento
    eventNameInput.value = evento.nombre;
    eventDescriptionInput.value = evento.descripcion || '';
    eventDateInput.value = evento.fecha;
    eventTimeInput.value = evento.hora;
    numMesasInput.value = evento.mesas;
    sillasPorMesaInput.value = evento.sillasPorMesa;
    formaMesaSelect.value = evento.formaMesa;
    
    // Cargar configuración si existe
    if (evento.configuracion && evento.configuracion.mesas) {
        mesas = evento.configuracion.mesas;
        renderizarMesas();
    } else {
        crearMesas();
    }
    
    // Actualizar estadísticas
    actualizarEstadisticas();
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

// 4. Renderizar mesa visual (adaptado de final.html)
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

// 5. Calcular posiciones de sillas (de final.html)
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

// 6. Renderizar todas las mesas
function renderizarMesas() {
    mesasContainer.innerHTML = '';
    mesas.forEach(mesa => {
        crearMesaVisual(mesa);
    });
}

// 7. Editar nombre de mesa
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

// 8. Seleccionar silla
function seleccionarSilla(mesaId, sillaId) {
    sillaSeleccionada = { mesaId, sillaId };
    mostrarModalSilla(mesaId, sillaId);
}

// 9. Mostrar modal para silla
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

// 10. Actualizar silla
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

// 11. Actualizar estadísticas
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

// 12. Guardar configuración del evento
function guardarConfiguracionEvento() {
    if (!eventoActual) return;
    
    eventoActual.configuracion = {
        mesas: JSON.parse(JSON.stringify(mesas)),
        fechaActualizacion: new Date().toISOString()
    };
    
    eventoActual.mesas = mesas.length;
    eventoActual.sillasPorMesa = mesas.length > 0 ? mesas[0].sillas.length : 0;
    eventoActual.formaMesa = mesas.length > 0 ? mesas[0].forma : 'rectangular';
    
    // En producción, aquí harías fetch a la API
    console.log('Guardando evento:', eventoActual);
    
    // Simular guardado
    if (autoSaveCheckbox.checked) {
        localStorage.setItem(`titi_evento_${eventoActual.id}`, JSON.stringify(eventoActual));
        mostrarMensaje('Cambios guardados automáticamente', 'info');
    }
}

// 13. Cargar invitados de demo
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

// 14. Actualizar lista de invitados
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

// 15. Mostrar detalles de invitado
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

// 16. Funciones auxiliares de invitados
function editarInvitado(invitadoId) {
    mostrarMensaje('Funcionalidad de editar invitado en desarrollo', 'info');
}

function asignarInvitado(invitadoId) {
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
}

// 17. Configurar fecha y hora
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

// 18. Configurar event listeners
function configurarEventListeners() {
    // Selector de evento
    eventSelector.addEventListener('change', function() {
        if (this.value) {
            cargarEvento(parseInt(this.value));
        }
    });
    
    // Botón crear mesas
    btnCrearMesas.addEventListener('click', crearMesas);
    
    // Botón guardar evento
    btnGuardarEvento.addEventListener('click', function() {
        guardarEvento();
    });
    
    // Botón nuevo evento
    newEventBtn.addEventListener('click', function() {
        document.getElementById('newEventModal').style.display = 'flex';
    });
    
    // Cerrar modal nuevo evento
    document.querySelector('#newEventModal .modal-close').addEventListener('click', function() {
        document.getElementById('newEventModal').style.display = 'none';
    });
    
    document.querySelector('#newEventModal .modal-cancel').addEventListener('click', function() {
        document.getElementById('newEventModal').style.display = 'none';
    });
    
    // Crear evento
    document.getElementById('createEventBtn').addEventListener('click', function() {
        crearNuevoEvento();
    });
    
    // Cerrar sesión
    logoutBtn.addEventListener('click', function() {
        window.titiAuth.logout();
    });
    
    // Zoom
    zoomInBtn.addEventListener('click', function() {
        if (zoomLevel < 2) {
            zoomLevel += 0.1;
            aplicarZoom();
        }
    });
    
    zoomOutBtn.addEventListener('click', function() {
        if (zoomLevel > 0.5) {
            zoomLevel -= 0.1;
            aplicarZoom();
        }
    });
    
    resetViewBtn.addEventListener('click', function() {
        zoomLevel = 1;
        aplicarZoom();
    });
    
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
    
    // Shortcuts de teclado
    document.addEventListener('keydown', function(e) {
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

// 19. Aplicar zoom
function aplicarZoom() {
    document.querySelectorAll('.mesa').forEach(mesa => {
        mesa.style.transform = `scale(${zoomLevel})`;
    });
}

// 20. Buscar en mesas
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

// 21. Guardar evento
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
        }
    }
    
    mostrarMensaje(`Evento "${eventoActual.nombre}" guardado correctamente`, 'success');
}

// 22. Crear nuevo evento
function crearNuevoEvento() {
    const nombre = document.getElementById('newEventName').value;
    const fecha = document.getElementById('newEventDate').value;
    const hora = document.getElementById('newEventTime').value;
    const ubicacion = document.getElementById('newEventLocation').value;
    const tipo = document.getElementById('newEventType').value;
    const usarPlantilla = document.getElementById('useTemplate').checked;
    
    if (!nombre || !fecha) {
        mostrarMensaje('Nombre y fecha son obligatorios', 'error');
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
        estado: 'borrador',
        mesas: usarPlantilla ? 8 : 1,
        sillasPorMesa: usarPlantilla ? 8 : 6,
        formaMesa: 'rectangular',
        configuracion: {}
    };
    
    eventosCliente.push(nuevoEvento);
    
    // Agregar al selector
    const option = document.createElement('option');
    option.value = nuevoEvento.id;
    option.textContent = nuevoEvento.nombre + ' (Borrador)';
    eventSelector.appendChild(option);
    
    // Seleccionar el nuevo evento
    eventSelector.value = nuevoEvento.id;
    cargarEvento(nuevoEvento.id);
    
    // Cerrar modal
    document.getElementById('newEventModal').style.display = 'none';
    
    // Resetear formulario
    document.getElementById('newEventForm').reset();
    
    mostrarMensaje(`Nuevo evento "${nombre}" creado`, 'success');
}

// 23. Agregar invitado
function agregarInvitado() {
    const nombre = prompt('Nombre del invitado:');
    if (!nombre) return;
    
    const email = prompt('Email (opcional):');
    const telefono = prompt('Teléfono (opcional):');
    
    const nuevoInvitado = {
        id: invitados.length + 1,
        nombre: nombre,
        email: email || null,
        telefono: telefono || null,
        estado: 'pendiente',
        idMesa: null,
        idSilla: null
    };
    
    invitados.push(nuevoInvitado);
    actualizarListaInvitados();
    
    mostrarMensaje(`Invitado "${nombre}" agregado`, 'success');
}

// 24. Mostrar mensaje
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
// Necesarias para que funcionen los onclick en el HTML
window.editarInvitado = editarInvitado;
window.asignarInvitado = asignarInvitado;
window.cerrarModal = cerrarModal;