// cliente.js - Sistema de mesas completo para cliente con 3 roles

// ===== CONFIGURACIÓN API =====
const API_BASE = typeof API_URL !== 'undefined' ? API_URL : '/api';

function getToken() {
    return localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
    };
}

// ===== VARIABLES GLOBALES =====
let eventosCliente = [];
let eventoActual = null;
let mesas = [];
let invitados = [];
let sillaSeleccionada = null;
let zoomLevel = 1;
let usuario = null;
let limiteEventos = null;
let historial = [];
let configuracionDisposicion = { columnas: 4, filas: 2, espaciado: 70 };

// Paleta de colores de zona
const COLORES_ZONA = [
    { nombre: 'Marrón',      valor: '#8B4513' },
    { nombre: 'Dorado',      valor: '#B8860B' },
    { nombre: 'Verde oscuro',valor: '#2E7D32' },
    { nombre: 'Azul marino', valor: '#1565C0' },
    { nombre: 'Borgoña',     valor: '#880E4F' },
    { nombre: 'Teal',        valor: '#00695C' },
    { nombre: 'Naranja',     valor: '#E65100' },
    { nombre: 'Gris',        valor: '#546E7A' }
];

// ===== ELEMENTOS DOM =====
const eventSelector            = document.getElementById('eventSelector');
const currentEventName         = document.getElementById('currentEventName');
const eventNameInput           = document.getElementById('eventName');
const eventDateInput           = document.getElementById('eventDate');
const eventTimeInput           = document.getElementById('eventTime');
const eventDescriptionInput    = document.getElementById('eventDescription');
const numMesasInput            = document.getElementById('numMesas');
const sillasPorMesaInput       = document.getElementById('sillasPorMesa');
const formaMesaSelect          = document.getElementById('formaMesa');
const btnCrearMesas            = document.getElementById('btnCrearMesas');
const btnGuardarEvento         = document.getElementById('btnGuardarEvento');
const btnEliminarEvento        = document.getElementById('btnEliminarEvento');
const mesasContainer           = document.getElementById('mesasContainer');
const newEventBtn              = document.getElementById('newEventBtn');
const newEventModal            = document.getElementById('newEventModal');
const logoutBtn                = document.getElementById('logoutBtn');
const userAvatar               = document.getElementById('userAvatar');
const userName                 = document.getElementById('userName');
const userRole                 = document.getElementById('userRole');
const roleBadge                = document.getElementById('roleBadge');
const eventLimitInfo           = document.getElementById('eventLimitInfo');
const limitText                = document.getElementById('limitText');
const searchGuests             = document.getElementById('searchGuests');
const zoomInBtn                = document.getElementById('zoomInBtn');
const zoomOutBtn               = document.getElementById('zoomOutBtn');
const resetViewBtn             = document.getElementById('resetViewBtn');
const showNamesCheckbox        = document.getElementById('showNames');
const autoSaveCheckbox         = document.getElementById('autoSave');
const numColumnasInput         = document.getElementById('numColumnas');
const numFilasInput            = document.getElementById('numFilas');
const espaciadoInput           = document.getElementById('espaciado');
const statTotalMesas           = document.getElementById('statTotalMesas');
const statTotalSillas          = document.getElementById('statTotalSillas');
const statSillasOcupadas       = document.getElementById('statSillasOcupadas');
const statPorcentajeOcupacion  = document.getElementById('statPorcentajeOcupacion');
const ocupacionBar             = document.getElementById('ocupacionBar');
const totalEventsCount         = document.getElementById('totalEventsCount');
const activeEventsCount        = document.getElementById('activeEventsCount');
const draftEventsCount         = document.getElementById('draftEventsCount');
const guestsList               = document.getElementById('guestsList');
const guestSearch              = document.getElementById('guestSearch');
const guestFilter              = document.getElementById('guestFilter');
const addGuestBtn              = document.getElementById('addGuestBtn');
const guestDetails             = document.getElementById('guestDetails');

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async function() {
    const usuarioStr = localStorage.getItem('titi_usuario_actual') || sessionStorage.getItem('titi_usuario_actual');
    if (!usuarioStr) { window.location.href = 'login.html'; return; }
    try { usuario = JSON.parse(usuarioStr); } catch (e) { window.location.href = 'login.html'; return; }
    if (!usuario) { window.location.href = 'login.html'; return; }

    inicializarInterfazUsuario();
    configurarLimiteEventos();
    await cargarEventosUsuario();
    cargarInvitadosDemo();
    configurarFechaHora();
    configurarEventListeners();

    // Fullscreen
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', function() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().then(() => {
                    fullscreenBtn.querySelector('i').classList.replace('fa-expand','fa-compress');
                    fullscreenBtn.title = 'Salir Pantalla Completa';
                });
            } else {
                document.exitFullscreen().then(() => {
                    fullscreenBtn.querySelector('i').classList.replace('fa-compress','fa-expand');
                    fullscreenBtn.title = 'Pantalla Completa';
                });
            }
        });
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                fullscreenBtn.querySelector('i').classList.replace('fa-compress','fa-expand');
                fullscreenBtn.title = 'Pantalla Completa';
            }
        });
    }

    verificarLimiteEventos();
    setTimeout(() => { if (!mesasContainer || mesasContainer.children.length === 0) crearMesas(); }, 2000);
});

// ============================================================
// HISTORIAL
// ============================================================
function registrarHistorial(texto) {
    historial.unshift({ texto, hora: new Date() });
    if (historial.length > 40) historial.pop();
    renderizarHistorial();
}
function renderizarHistorial() {
    const lista = document.getElementById('historialLista');
    if (!lista) return;
    if (historial.length === 0) { lista.innerHTML = '<div class="historial-empty">No hay cambios aún</div>'; return; }
    lista.innerHTML = historial.map(item => {
        const h = item.hora.getHours().toString().padStart(2,'0');
        const m = item.hora.getMinutes().toString().padStart(2,'0');
        return `<div class="historial-item"><span class="historial-hora">${h}:${m}</span><span class="historial-texto">${item.texto}</span></div>`;
    }).join('');
}

// ============================================================
// USUARIO / LÍMITES
// ============================================================
function inicializarInterfazUsuario() {
    userAvatar.textContent = usuario.avatar || usuario.nombre.substring(0,2).toUpperCase();
    userName.textContent   = usuario.nombre;
    const roleNames = { admin:'Administrador', cliente:'Cliente', organizador:'Organizador' };
    userRole.textContent   = roleNames[usuario.rol] || usuario.rol;
    roleBadge.textContent  = usuario.rol.toUpperCase();
    roleBadge.className    = `role-badge ${usuario.rol}`;
    limiteEventos          = usuario.limite_eventos;
}
function configurarLimiteEventos() {
    if (limiteEventos === 1) {
        eventLimitInfo.style.display = 'flex';
        limitText.textContent = 'Límite: 1 evento activo';
        const lw = document.getElementById('eventLimitWarning');
        if (lw) lw.style.display = 'block';
    }
}
function verificarLimiteEventos() {
    if (limiteEventos !== 1) return;
    const activos = eventosCliente.filter(e => e.estado === 'activo').length;
    if (newEventBtn) newEventBtn.style.display = activos >= limiteEventos ? 'none' : 'block';
    if (activos >= limiteEventos) {
        const crearBtn = document.getElementById('createEventBtn');
        if (crearBtn) crearBtn.onclick = () => { mostrarMensaje('Cliente solo puede tener 1 evento activo.','error'); cerrarModal(newEventModal); return false; };
    }
}

// ============================================================
// EVENTOS – CRUD
// ============================================================
async function cargarEventosUsuario() {
    try {
        mostrarMensaje('Cargando eventos...','info');
        const res = await fetch(`${API_BASE}/eventos-usuario`, { headers: getAuthHeaders() });
        if (!res.ok) { eventosCliente = []; await crearEventoAutomatico(); return; }
        const data   = await res.json();
        eventosCliente = data.eventos || data || [];
        actualizarEstadisticasEventos();
        actualizarSelectorEventos();
        if (eventosCliente.length > 0) { eventSelector.value = eventosCliente[0].id; await cargarEvento(eventosCliente[0].id); }
        else await crearEventoAutomatico();
    } catch (e) { console.error(e); eventosCliente = []; await crearEventoAutomatico(); }
}

async function crearEventoAutomatico() {
    try {
        const res = await fetch(`${API_BASE}/eventos`, {
            method:'POST', headers: getAuthHeaders(),
            body: JSON.stringify({ nombre:'Mi Evento', descripcion:'Mi primer evento', fecha_evento: new Date().toISOString().split('T')[0], ubicacion:'', estado:'borrador' })
        });
        if (res.ok) {
            const data = await res.json();
            const ev   = data.evento || data;
            eventosCliente = [ev]; eventoActual = ev;
            actualizarSelectorEventos();
            eventSelector.value = ev.id;
            eventNameInput.value = ev.nombre;
            eventDescriptionInput.value = ev.descripcion || '';
            eventDateInput.value = ev.fecha_evento || '';
            crearMesas();
            mostrarMensaje('Evento creado automáticamente','success');
        } else crearMesas();
    } catch (e) { crearMesas(); }
}

function actualizarSelectorEventos() {
    eventSelector.innerHTML = '<option value="">Seleccionar Evento...</option>';
    eventosCliente.forEach(ev => {
        const o = document.createElement('option');
        o.value = ev.id;
        o.textContent = ev.nombre + (ev.estado === 'borrador' ? ' (Borrador)' : '');
        eventSelector.appendChild(o);
    });
}
function actualizarEstadisticasEventos() {
    totalEventsCount.textContent  = eventosCliente.length;
    activeEventsCount.textContent = eventosCliente.filter(e => e.estado === 'activo').length;
    if (draftEventsCount) draftEventsCount.textContent = eventosCliente.filter(e => e.estado === 'borrador').length;
}

async function cargarEvento(eventoId) {
    const evento = eventosCliente.find(e => e.id == eventoId);
    if (!evento) return;
    eventoActual = evento;
    currentEventName.textContent     = evento.nombre;
    eventNameInput.value             = evento.nombre || '';
    eventDescriptionInput.value      = evento.descripcion || '';
    eventDateInput.value             = evento.fecha_evento || evento.fecha || '';
    eventTimeInput.value             = evento.hora_evento || evento.hora  || '';
    numMesasInput.value              = evento.num_mesas || evento.mesas || 8;
    sillasPorMesaInput.value         = evento.sillas_por_mesa || evento.sillasPorMesa || 8;
    formaMesaSelect.value            = evento.forma_mesa || evento.formaMesa || 'rectangular';

    try {
        const res = await fetch(`${API_BASE}/eventos/${eventoId}/mesas`, { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            if (data.mesas && data.mesas.length > 0) {
                mesas = data.mesas.map(m => ({
                    id: m.id, nombre: m.nombre, forma: m.forma,
                    color: m.color || '#8B4513',
                    sillas: typeof m.sillas === 'string' ? JSON.parse(m.sillas) : (m.sillas || [])
                }));
                renderizarMesas();
            } else crearMesas();
        } else crearMesas();
    } catch (e) { crearMesas(); }
    actualizarEstadisticas();
}

function crearNuevoEvento() {
    if (limiteEventos === 1 && eventosCliente.filter(e => e.estado === 'activo').length >= 1) {
        mostrarMensaje('Cliente solo puede tener 1 evento activo.','error');
        document.getElementById('newEventModal').style.display = 'none';
        return;
    }
    const nombre = document.getElementById('newEventName').value;
    const fecha  = document.getElementById('newEventDate').value;
    if (!nombre || !fecha) { mostrarMensaje('Nombre y fecha son obligatorios','error'); return; }

    const nuevoEvento = {
        id: eventosCliente.length + 1, nombre, estado:'borrador',
        descripcion: `Evento de tipo ${document.getElementById('newEventType').value}`,
        fecha, hora: document.getElementById('newEventTime').value || '18:00',
        ubicacion: document.getElementById('newEventLocation').value,
        mesas: document.getElementById('useTemplate').checked ? 8 : 1,
        sillasPorMesa: document.getElementById('useTemplate').checked ? 8 : 6,
        formaMesa:'rectangular', configuracion:{}
    };
    eventosCliente.push(nuevoEvento);
    actualizarSelectorEventos();
    eventSelector.value = nuevoEvento.id;
    cargarEvento(nuevoEvento.id);
    document.getElementById('newEventModal').style.display = 'none';
    document.getElementById('newEventForm').reset();
    actualizarEstadisticasEventos();
    registrarHistorial(`Evento "${nombre}" creado`);
    mostrarMensaje(`Nuevo evento "${nombre}" creado`,'success');
    verificarLimiteEventos();
}

function eliminarEvento() {
    if (!eventoActual) { mostrarMensaje('No hay evento seleccionado','error'); return; }
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-confirm" style="max-width:440px;">
            <div class="modal-confirm-icon"><i class="fas fa-trash-alt"></i></div>
            <h3 class="modal-confirm-title">¿Eliminar evento?</h3>
            <p class="modal-confirm-msg">Estás a punto de eliminar <strong>"${eventoActual.nombre}"</strong>. Esta acción no puede ser revertida y se eliminará toda la información del evento.</p>
            <div class="modal-confirm-actions">
                <button class="btn-confirm-cancel" id="btnConfirmCancel">Cancelar</button>
                <button class="btn-confirm-delete" id="btnConfirmDelete">Sí, eliminar</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    const cerrar = () => { modal.style.display='none'; setTimeout(() => modal.remove(),300); };
    modal.querySelector('#btnConfirmCancel').onclick = cerrar;
    modal.onclick = e => { if (e.target===modal) cerrar(); };
    modal.querySelector('#btnConfirmDelete').onclick = async () => {
        cerrar();
        try {
            const res = await fetch(`${API_BASE}/eventos/${eventoActual.id}`, { method:'DELETE', headers: getAuthHeaders() });
            if (res.ok) {
                registrarHistorial(`Evento "${eventoActual.nombre}" eliminado`);
                eventosCliente = eventosCliente.filter(e => e.id !== eventoActual.id);
                eventoActual = null;
                actualizarSelectorEventos(); actualizarEstadisticasEventos();
                if (eventosCliente.length > 0) { eventSelector.value = eventosCliente[0].id; await cargarEvento(eventosCliente[0].id); }
                else { mesasContainer.innerHTML=''; mesas=[]; eventNameInput.value=''; eventDescriptionInput.value=''; await crearEventoAutomatico(); }
                mostrarMensaje('Evento eliminado exitosamente','success');
                verificarLimiteEventos();
            } else { const err = await res.json().catch(()=>({})); mostrarMensaje(err.error||'Error eliminando evento','error'); }
        } catch (e) { mostrarMensaje('Error de conexión al eliminar','error'); }
    };
}

// ============================================================
// MESAS – CREAR / RENDER
// ============================================================
function crearMesas() {
    const num    = parseInt(numMesasInput.value);
    const sillas = parseInt(sillasPorMesaInput.value);
    const forma  = formaMesaSelect.value;
    if (num < 1 || num > 50)      { mostrarMensaje('Mesas entre 1 y 50','error'); return; }
    if (sillas < 1 || sillas > 12){ mostrarMensaje('Sillas entre 1 y 12','error'); return; }

    mesasContainer.innerHTML = '';
    mesas = [];
    const col = parseInt(numColumnasInput.value)||4;
    const esp = parseInt(espaciadoInput.value)||70;
    configuracionDisposicion = { columnas:col, filas:parseInt(numFilasInput.value)||2, espaciado:esp };
    mesasContainer.style.gap = `${esp}px`;
    mesasContainer.style.gridTemplateColumns = `repeat(${col}, 1fr)`;

    for (let i = 0; i < num; i++) {
        const mesa = { id:i+1, nombre:`Mesa ${i+1}`, forma, color:'#8B4513', sillas:[] };
        for (let j = 0; j < sillas; j++) mesa.sillas.push({ id:j+1, estado:'sin-asignar', nombre:'', invitadoId:null });
        mesas.push(mesa);
        crearMesaVisual(mesa);
    }
    actualizarEstadisticas();
    mostrarMensaje(`${num} mesas creadas con éxito`,'success');
    registrarHistorial(`Se crearon ${num} mesas (${sillas} sillas c/u)`);
}

function crearMesaVisual(mesa) {
    const el = document.createElement('div');
    el.className = 'mesa' + (esMesaLlena(mesa) ? ' mesa-llena' : '');
    el.dataset.id = mesa.id;
    el.style.transform = `scale(${zoomLevel})`;
    el.style.transition = 'transform 0.3s ease';
    el.style.setProperty('--mesa-color', mesa.color || '#8B4513');

    // ── header: nombre | contador | botón-color ──
    const header = document.createElement('div');
    header.className = 'mesa-header';

    const info = document.createElement('div');
    info.className = 'mesa-info';
    info.textContent = mesa.nombre;
    info.addEventListener('click', () => editarNombreMesa(mesa.id, info));
    header.appendChild(info);

    const contador = document.createElement('div');
    contador.className = 'mesa-contador';
    contador.id = `contador-${mesa.id}`;
    actualizarContadorDOM(contador, mesa);
    header.appendChild(contador);

    const btnColor = document.createElement('button');
    btnColor.className = 'btn-color-mesa';
    btnColor.title = 'Color de zona';
    btnColor.style.background = mesa.color || '#8B4513';
    btnColor.addEventListener('click', e => { e.stopPropagation(); mostrarPickerColor(mesa.id, btnColor); });
    header.appendChild(btnColor);

    el.appendChild(header);

    // ── mesa gráfica (drop target) ──
    const grafica = document.createElement('div');
    grafica.className = `mesa-grafica mesa-${mesa.forma}`;
    grafica.textContent = mesa.nombre;
    grafica.style.backgroundColor = mesa.color || '#8B4513';
    grafica.addEventListener('dragover',  e => { e.preventDefault(); grafica.classList.add('drop-target'); });
    grafica.addEventListener('dragleave', () => grafica.classList.remove('drop-target'));
    grafica.addEventListener('drop',      e => { e.preventDefault(); grafica.classList.remove('drop-target'); handleDrop(e, mesa.id, null); });
    el.appendChild(grafica);

    // ── sillas ──
    const sillasEl = document.createElement('div');
    sillasEl.className = `sillas-container ${mesa.forma}-sillas`;
    const posiciones = calcularPosicionesSillas(mesa.sillas.length, mesa.forma);
    mesa.sillas.forEach((silla, idx) => sillasEl.appendChild(crearSillaElement(mesa, silla, idx, posiciones)));
    el.appendChild(sillasEl);

    mesasContainer.appendChild(el);
}

function crearSillaElement(mesa, silla, idx, posiciones) {
    const el = document.createElement('div');
    el.className  = `silla estado-${silla.estado}`;
    el.dataset.mesaId  = mesa.id;
    el.dataset.sillaId = silla.id;
    el.textContent = silla.id;
    el.draggable   = true;
    if (silla.nombre && showNamesCheckbox.checked) el.setAttribute('title', silla.nombre);

    // posición + rotación
    const pos = posiciones[idx];
    el.style.left = `calc(${pos.x}% - 16px)`;
    el.style.top  = `calc(${pos.y}% - 21px)`;
    if (mesa.forma === 'rectangular' || mesa.forma === 'cuadrada') {
        if      (pos.y < 25)  el.style.transform = 'rotate(180deg)';
        else if (pos.y > 75)  el.style.transform = 'rotate(0deg)';
        else if (pos.x < 25)  el.style.transform = 'rotate(90deg)';
        else if (pos.x > 75)  el.style.transform = 'rotate(270deg)';
    } else {
        el.style.transform = `rotate(${Math.atan2(50-pos.y, 50-pos.x)*(180/Math.PI)+90}deg)`;
    }

    // ── events ──
    el.addEventListener('click',     e => { e.stopPropagation(); seleccionarSilla(mesa.id, silla.id); });
    el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', JSON.stringify({ mesaId:mesa.id, sillaId:silla.id })); el.classList.add('dragging'); });
    el.addEventListener('dragend',   () => el.classList.remove('dragging'));
    el.addEventListener('dragover',  e => { e.preventDefault(); el.classList.add('drop-target-silla'); });
    el.addEventListener('dragleave', () => el.classList.remove('drop-target-silla'));
    el.addEventListener('drop',      e => { e.preventDefault(); el.classList.remove('drop-target-silla'); handleDrop(e, mesa.id, silla.id); });

    // touch (mobile)
    el.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        el.classList.add('dragging');
        window._touchDrag = { mesaId:mesa.id, sillaId:silla.id };
    }, { passive:false });
    el.addEventListener('touchmove', e => e.preventDefault(), { passive:false });
    el.addEventListener('touchend',  e => {
        e.preventDefault();
        el.classList.remove('dragging');
        if (!window._touchDrag) return;
        const t = e.changedTouches[0];
        const target = document.elementFromPoint(t.clientX, t.clientY);
        if (target) {
            const sillaDrop = target.closest('.silla');
            const mesaDrop  = target.closest('.mesa');
            if (sillaDrop && sillaDrop !== el)
                swapSillas(window._touchDrag.mesaId, window._touchDrag.sillaId, parseInt(sillaDrop.dataset.mesaId), parseInt(sillaDrop.dataset.sillaId));
            else if (mesaDrop && !sillaDrop)
                moveInvitadoToMesa(window._touchDrag.mesaId, window._touchDrag.sillaId, parseInt(mesaDrop.dataset.id));
        }
        window._touchDrag = null;
    });

    return el;
}

// ============================================================
// CONTADOR PER MESA  +  MESA LLENA
// ============================================================
function esMesaLlena(mesa) { return mesa.sillas.length > 0 && mesa.sillas.every(s => s.estado !== 'sin-asignar'); }

function actualizarContadorDOM(el, mesa) {
    const ocu = mesa.sillas.filter(s => s.estado !== 'sin-asignar').length;
    el.textContent = `${ocu}/${mesa.sillas.length}`;
    el.className   = 'mesa-contador' + (ocu === mesa.sillas.length ? ' llena' : '');
}
function actualizarContadorMesa(mesaId) {
    const mesa  = mesas.find(m => m.id === parseInt(mesaId));
    if (!mesa) return;
    const el    = document.getElementById(`contador-${mesaId}`);
    if (el) actualizarContadorDOM(el, mesa);
    const mesaEl = document.querySelector(`.mesa[data-id="${mesaId}"]`);
    if (mesaEl) mesaEl.classList.toggle('mesa-llena', esMesaLlena(mesa));
}

// ============================================================
// COLOR DE ZONA
// ============================================================
function mostrarPickerColor(mesaId, btnRef) {
    document.querySelectorAll('.color-picker-popup').forEach(p => p.remove());
    const popup = document.createElement('div');
    popup.className = 'color-picker-popup';
    popup.innerHTML = COLORES_ZONA.map(c =>
        `<button class="color-swatch" title="${c.nombre}" style="background:${c.valor};" data-valor="${c.valor}"></button>`
    ).join('');
    btnRef.parentElement.style.position = 'relative';
    btnRef.parentElement.appendChild(popup);

    popup.querySelectorAll('.color-swatch').forEach(sw => {
        sw.addEventListener('click', e => {
            e.stopPropagation();
            const color = sw.dataset.valor;
            const mesa  = mesas.find(m => m.id === mesaId);
            if (mesa) {
                mesa.color = color;
                const mesaEl  = document.querySelector(`.mesa[data-id="${mesaId}"]`);
                if (mesaEl) {
                    mesaEl.style.setProperty('--mesa-color', color);
                    const g = mesaEl.querySelector('.mesa-grafica');
                    if (g) g.style.backgroundColor = color;
                }
                btnRef.style.background = color;
                registrarHistorial(`Color de ${mesa.nombre} cambiado`);
                guardarConfiguracionEvento();
            }
            popup.remove();
        });
    });
    setTimeout(() => {
        const close = e => { if (!popup.contains(e.target) && e.target !== btnRef) { popup.remove(); document.removeEventListener('click', close); } };
        document.addEventListener('click', close);
    }, 60);
}

// ============================================================
// DRAG & DROP
// ============================================================
function handleDrop(e, targetMesaId, targetSillaId) {
    let data;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch(x) { return; }
    if (!data) return;
    if (targetSillaId !== null && targetSillaId !== undefined) swapSillas(data.mesaId, data.sillaId, targetMesaId, targetSillaId);
    else moveInvitadoToMesa(data.mesaId, data.sillaId, targetMesaId);
}

function swapSillas(mAid, sAid, mBid, sBid) {
    const mesaA = mesas.find(m => m.id === parseInt(mAid));
    const mesaB = mesas.find(m => m.id === parseInt(mBid));
    if (!mesaA || !mesaB) return;
    const sillaA = mesaA.sillas.find(s => s.id === parseInt(sAid));
    const sillaB = mesaB.sillas.find(s => s.id === parseInt(sBid));
    if (!sillaA || !sillaB) return;

    // swap
    const tmp = { estado: sillaA.estado, nombre: sillaA.nombre, invitadoId: sillaA.invitadoId };
    sillaA.estado = sillaB.estado; sillaA.nombre = sillaB.nombre; sillaA.invitadoId = sillaB.invitadoId;
    sillaB.estado = tmp.estado;    sillaB.nombre = tmp.nombre;    sillaB.invitadoId = tmp.invitadoId;

    // sync invitados array
    if (sillaA.invitadoId) { const inv = invitados.find(i => i.id === sillaA.invitadoId); if (inv) { inv.idMesa=mesaA.id; inv.idSilla=sillaA.id; } }
    if (sillaB.invitadoId) { const inv = invitados.find(i => i.id === sillaB.invitadoId); if (inv) { inv.idMesa=mesaB.id; inv.idSilla=sillaB.id; } }

    renderizarMesas();
    animarSilla(mAid, sAid); animarSilla(mBid, sBid);
    actualizarContadorMesa(mAid); actualizarContadorMesa(mBid);
    actualizarEstadisticas(); actualizarListaInvitados(); guardarConfiguracionEvento();
    registrarHistorial(`Intercambio: ${sillaA.nombre||'vacía'} ↔ ${sillaB.nombre||'vacía'}`);
    mostrarMensaje('Invitados intercambiados','success');
}

function moveInvitadoToMesa(orMesaId, orSillaId, destMesaId) {
    const mOr   = mesas.find(m => m.id === parseInt(orMesaId));
    const mDest = mesas.find(m => m.id === parseInt(destMesaId));
    if (!mOr || !mDest) return;
    const sOr = mOr.sillas.find(s => s.id === parseInt(orSillaId));
    if (!sOr || sOr.estado === 'sin-asignar') return;
    const libre = mDest.sillas.find(s => s.estado === 'sin-asignar');
    if (!libre) { mostrarMensaje(`${mDest.nombre} está llena`,'error'); return; }

    libre.estado = sOr.estado; libre.nombre = sOr.nombre; libre.invitadoId = sOr.invitadoId;
    const inv = invitados.find(i => i.id === sOr.invitadoId);
    if (inv) { inv.idMesa = mDest.id; inv.idSilla = libre.id; }
    sOr.estado = 'sin-asignar'; sOr.nombre = ''; sOr.invitadoId = null;

    renderizarMesas();
    animarSilla(destMesaId, libre.id);
    actualizarContadorMesa(orMesaId); actualizarContadorMesa(destMesaId);
    actualizarEstadisticas(); actualizarListaInvitados(); guardarConfiguracionEvento();
    registrarHistorial(`${libre.nombre} movido a ${mDest.nombre}`);
    mostrarMensaje(`Invitado movido a ${mDest.nombre}`,'success');
}

// ============================================================
// ANIMACIÓN SILLA
// ============================================================
function animarSilla(mesaId, sillaId) {
    requestAnimationFrame(() => {
        const el = document.querySelector(`.silla[data-mesa-id="${mesaId}"][data-silla-id="${sillaId}"]`);
        if (el) { el.classList.add('silla-cambio'); el.addEventListener('animationend', () => el.classList.remove('silla-cambio'), { once:true }); }
    });
}

// ============================================================
// POSICIONES DE SILLAS
// ============================================================
function calcularPosicionesSillas(numSillas, forma) {
    const pos = [];
    if (forma === 'rectangular' || forma === 'cuadrada') {
        const mL=20, mV=15, rest=Math.max(0,numSillas-2), perLado=Math.floor(rest/2), impar=rest%2, dist=100-mL*2, div=Math.max(perLado-1,1);
        pos.push({x:-5,y:50});
        if (numSillas>=2) pos.push({x:105,y:50});
        for (let i=0;i<perLado;i++) pos.push({x:mL+i*(dist/div), y:mV});
        for (let i=0;i<perLado;i++) pos.push({x:mL+i*(dist/div), y:100-mV});
        if (impar>0) pos.push({x:50,y:mV});
        while (pos.length > numSillas) pos.pop();
    } else {
        for (let i=0;i<numSillas;i++) { const a=(2*Math.PI/numSillas)*i; pos.push({x:50+75*Math.cos(a), y:50+75*Math.sin(a)}); }
    }
    return pos;
}

function renderizarMesas() { mesasContainer.innerHTML=''; mesas.forEach(m => crearMesaVisual(m)); }

// ============================================================
// EDITAR NOMBRE MESA
// ============================================================
function editarNombreMesa(mesaId, infoEl) {
    const mesa = mesas.find(m => m.id === mesaId);
    if (!mesa) return;
    const input = document.createElement('input');
    input.type  = 'text';
    input.value = mesa.nombre;
    input.style.cssText = 'width:100%;padding:4px 6px;border:1px solid #4CAF50;border-radius:4px;text-align:center;font-weight:bold;font-size:0.82rem;';
    infoEl.innerHTML = '';
    infoEl.appendChild(input);
    input.focus();
    const guardar = () => {
        mesa.nombre = input.value || `Mesa ${mesaId}`;
        infoEl.textContent = mesa.nombre;
        const g = document.querySelector(`.mesa[data-id="${mesaId}"] .mesa-grafica`);
        if (g) g.textContent = mesa.nombre;
        guardarConfiguracionEvento();
        registrarHistorial(`Mesa renombrada a "${mesa.nombre}"`);
    };
    input.addEventListener('blur', guardar);
    input.addEventListener('keypress', e => { if (e.key==='Enter') guardar(); });
}

// ============================================================
// MODAL SILLA
// ============================================================
function seleccionarSilla(mesaId, sillaId) { mostrarModalSilla(mesaId, sillaId); }

function mostrarModalSilla(mesaId, sillaId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:400px;">
            <div class="modal-header"><h3>Asignar Invitado a Silla</h3><button class="modal-close">&times;</button></div>
            <div class="modal-body">
                <p style="color:#666;margin-bottom:10px;">Mesa ${mesaId}, Silla ${sillaId}</p>
                <div class="form-group">
                    <label>Seleccionar Invitado:</label>
                    <select id="selectInvitadoSilla" style="width:100%;padding:10px;margin:8px 0;border:1px solid #ddd;border-radius:5px;">
                        <option value="">-- Sin asignar --</option>
                        ${invitados.map(i => `<option value="${i.id}">${i.nombre}${i.email?' ('+i.email+')':''}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Estado:</label>
                    <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;">
                        <button class="estado-btn estado-sin-asignar" data-estado="sin-asignar">Sin Asignar</button>
                        <button class="estado-btn estado-asignado"    data-estado="asignado">Asignado</button>
                        <button class="estado-btn estado-confirmado"  data-estado="confirmado">Confirmado</button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" id="cancelarSilla">Cancelar</button>
                <button class="btn-primary"   id="guardarSilla">Guardar</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';

    const mesa  = mesas.find(m => m.id === parseInt(mesaId));
    const silla = mesa?.sillas.find(s => s.id === parseInt(sillaId));
    if (silla) {
        modal.querySelector('#selectInvitadoSilla').value = silla.invitadoId || '';
        modal.querySelectorAll('.estado-btn').forEach(b => { if (b.dataset.estado===silla.estado) b.style.boxShadow='0 0 0 2px #333'; });
    }

    modal.querySelector('.modal-close').onclick  = () => cerrarModal(modal);
    modal.querySelector('#cancelarSilla').onclick = () => cerrarModal(modal);
    modal.querySelectorAll('.estado-btn').forEach(b => {
        b.onclick = function() { modal.querySelectorAll('.estado-btn').forEach(x => x.style.boxShadow=''); this.style.boxShadow='0 0 0 2px #333'; };
    });
    modal.querySelector('#guardarSilla').onclick = () => {
        const invId  = modal.querySelector('#selectInvitadoSilla').value ? parseInt(modal.querySelector('#selectInvitadoSilla').value) : null;
        const eBtn   = modal.querySelector('.estado-btn[style*="box-shadow"]');
        actualizarSilla(mesaId, sillaId, invId, eBtn ? eBtn.dataset.estado : 'sin-asignar');
        cerrarModal(modal);
    };
    modal.onclick = e => { if (e.target===modal) cerrarModal(modal); };
}

function cerrarModal(modal) { if (!modal) return; modal.style.display='none'; setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); },300); }

// ============================================================
// ACTUALIZAR SILLA
// ============================================================
function actualizarSilla(mesaId, sillaId, invitadoId, nuevoEstado) {
    const mesa  = mesas.find(m => m.id === parseInt(mesaId));
    if (!mesa) return;
    const silla = mesa.sillas.find(s => s.id === parseInt(sillaId));
    if (!silla) return;

    const nombreAntes = silla.nombre;
    silla.estado     = nuevoEstado;
    silla.invitadoId = invitadoId;

    let inv = null;
    if (invitadoId) { inv = invitados.find(i => i.id === invitadoId); silla.nombre = inv ? inv.nombre : ''; }
    else silla.nombre = '';

    // update DOM silla
    const sillaEl = document.querySelector(`.silla[data-mesa-id="${mesaId}"][data-silla-id="${sillaId}"]`);
    if (sillaEl) {
        sillaEl.className = `silla estado-${nuevoEstado}`;
        sillaEl.draggable = true;
        if (silla.nombre && showNamesCheckbox.checked) sillaEl.setAttribute('title', silla.nombre);
        else sillaEl.removeAttribute('title');
    }
    if (inv) { inv.idMesa = parseInt(mesaId); inv.idSilla = parseInt(sillaId); inv.estado = nuevoEstado; }

    animarSilla(mesaId, sillaId);
    actualizarContadorMesa(mesaId);
    actualizarEstadisticas();
    actualizarListaInvitados();
    guardarConfiguracionEvento();

    if (silla.nombre && nuevoEstado !== 'sin-asignar') registrarHistorial(`${silla.nombre} → ${mesa.nombre}, Silla ${sillaId} (${nuevoEstado})`);
    else if (nombreAntes) registrarHistorial(`${nombreAntes} removido de ${mesa.nombre}`);

    mostrarMensaje(`Silla ${sillaId} de ${mesa.nombre} actualizada`,'success');
}

// ============================================================
// ESTADÍSTICAS
// ============================================================
function actualizarEstadisticas() {
    let total=0, ocu=0;
    mesas.forEach(m => { total += m.sillas.length; m.sillas.forEach(s => { if (s.estado!=='sin-asignar') ocu++; }); });
    const pct = total > 0 ? Math.round(ocu/total*100) : 0;
    statTotalMesas.textContent         = mesas.length;
    statTotalSillas.textContent        = total;
    statSillasOcupadas.textContent     = ocu;
    statPorcentajeOcupacion.textContent= `${pct}%`;
    ocupacionBar.style.width           = `${pct}%`;
}

// ============================================================
// GUARDAR
// ============================================================
async function guardarConfiguracionEvento() {
    if (!eventoActual || !getToken()) return;
    eventoActual.configuracion = { mesas: JSON.parse(JSON.stringify(mesas)), disposicion: configuracionDisposicion, fechaActualizacion: new Date().toISOString() };
    eventoActual.mesas          = mesas.length;
    eventoActual.sillasPorMesa  = mesas.length ? mesas[0].sillas.length : 0;
    eventoActual.formaMesa      = mesas.length ? mesas[0].forma : 'rectangular';
    try {
        const mRes = await fetch(`${API_BASE}/eventos/${eventoActual.id}/mesas`, { method:'PUT', headers:getAuthHeaders(), body:JSON.stringify({mesas}) });
        if (mRes.status===401) { mostrarMensaje('Sesión expirada.','error'); setTimeout(()=>{ window.location.href='login.html'; },2000); return; }
        if (!mRes.ok) { let e='Error guardando mesas'; try { const j=await mRes.json(); e=j.error||e; } catch(x){} mostrarMensaje(e,'error'); return; }
        const eRes = await fetch(`${API_BASE}/eventos/${eventoActual.id}`, {
            method:'PUT', headers:getAuthHeaders(),
            body:JSON.stringify({ nombre:eventoActual.nombre, descripcion:eventoActual.descripcion, fecha_evento:eventoActual.fecha_evento||eventoActual.fecha, ubicacion:eventoActual.ubicacion, estado:eventoActual.estado, configuracion:eventoActual.configuracion })
        });
        if (eRes.ok) mostrarMensaje('Cambios guardados ✓','success');
        else mostrarMensaje('Error guardando evento','error');
    } catch (e) { mostrarMensaje('Error de conexión al guardar','error'); }
}

async function guardarEvento() {
    if (!eventoActual) { mostrarMensaje('No hay evento seleccionado','error'); return; }
    eventoActual.nombre       = eventNameInput.value || 'Evento sin nombre';
    eventoActual.descripcion  = eventDescriptionInput.value;
    eventoActual.fecha_evento = eventDateInput.value;
    eventoActual.hora_evento  = eventTimeInput.value;
    eventoActual.num_mesas    = parseInt(numMesasInput.value);
    eventoActual.sillas_por_mesa = parseInt(sillasPorMesaInput.value);
    eventoActual.forma_mesa   = formaMesaSelect.value;
    await guardarConfiguracionEvento();
    currentEventName.textContent = eventoActual.nombre;
    const opt = eventSelector.querySelector(`option[value="${eventoActual.id}"]`);
    if (opt) opt.textContent = eventoActual.nombre + (eventoActual.estado==='borrador'?' (Borrador)': eventoActual.estado==='completado'?' (Completado)':'');
}

// ============================================================
// INVITADOS
// ============================================================
function cargarInvitadosDemo() {
    invitados = [
        { id:1, nombre:'Ana López',        email:'ana@email.com',     telefono:'555-0101', estado:'confirmado', idMesa:1, idSilla:1 },
        { id:2, nombre:'Carlos Ruiz',      email:'carlos@email.com',  telefono:'555-0102', estado:'confirmado', idMesa:1, idSilla:2 },
        { id:3, nombre:'María González',   email:'maria@email.com',   telefono:'555-0103', estado:'asignado',   idMesa:2, idSilla:1 },
        { id:4, nombre:'Pedro Hernández',  email:'pedro@email.com',   telefono:'555-0104', estado:'pendiente' },
        { id:5, nombre:'Laura Martínez',   email:'laura@email.com',   telefono:'555-0105', estado:'pendiente' },
        { id:6, nombre:'Roberto Sánchez',  email:'roberto@email.com', telefono:'555-0106', estado:'asignado'  },
        { id:7, nombre:'Sofía Castro',     email:'sofia@email.com',   telefono:'555-0107', estado:'pendiente' },
        { id:8, nombre:'David Ramírez',    email:'david@email.com',   telefono:'555-0108', estado:'pendiente' }
    ];
    actualizarListaInvitados();
}

function actualizarListaInvitados() {
    const q = guestSearch.value.toLowerCase(), f = guestFilter.value;
    const filtrados = invitados.filter(i => {
        const ms = i.nombre.toLowerCase().includes(q) || (i.email&&i.email.toLowerCase().includes(q));
        const mf = f==='all' || (f==='assigned'&&i.idMesa) || (f==='unassigned'&&!i.idMesa) || (f==='confirmed'&&i.estado==='confirmado');
        return ms && mf;
    });
    guestsList.innerHTML = filtrados.map(i => `
        <div class="guest-item" data-id="${i.id}">
            <div class="guest-item-header"><div class="guest-name">${i.nombre}</div><div class="guest-status status-${i.estado}">${i.estado}</div></div>
            <div class="guest-details"><span>${i.email||'Sin email'}</span><span>${i.idMesa?`Mesa ${i.idMesa}, Silla ${i.idSilla}`:'Sin asignar'}</span></div>
        </div>`).join('');
    document.querySelectorAll('.guest-item').forEach(item => item.addEventListener('click', function() { mostrarDetallesInvitado(parseInt(this.dataset.id)); }));
}

function mostrarDetallesInvitado(id) {
    const i = invitados.find(x => x.id===id);
    if (!i) return;
    guestDetails.innerHTML = `
        <div class="guest-detail-view">
            <div class="guest-detail-header">
                <div class="guest-detail-avatar">${i.nombre[0].toUpperCase()}</div>
                <div class="guest-detail-info"><h4>${i.nombre}</h4><p>${i.email||'Sin email'}</p></div>
            </div>
            <div class="guest-detail-content">
                <div class="detail-row"><span class="detail-label">Teléfono:</span><span class="detail-value">${i.telefono||'No especificado'}</span></div>
                <div class="detail-row"><span class="detail-label">Estado:</span><span class="detail-value"><span class="guest-status status-${i.estado}">${i.estado}</span></span></div>
                <div class="detail-row"><span class="detail-label">Asignación:</span><span class="detail-value">${i.idMesa?`Mesa ${i.idMesa}, Silla ${i.idSilla}`:'Sin asignar'}</span></div>
            </div>
            <div style="margin-top:16px;display:flex;gap:10px;">
                <button class="btn-secondary btn-small" onclick="editarInvitado(${i.id})"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn-secondary btn-small" onclick="asignarInvitado(${i.id})"><i class="fas fa-chair"></i> Asignar</button>
            </div>
        </div>`;
}

function configurarFechaHora() {
    const m = new Date(); m.setDate(m.getDate()+1);
    if (!eventDateInput.value) eventDateInput.value = m.toISOString().split('T')[0];
    if (!eventTimeInput.value) eventTimeInput.value = '18:00';
}

// ============================================================
// BÚSQUEDA + AUTO-SCROLL
// ============================================================
function buscarEnMesas(termino) {
    document.querySelectorAll('.silla').forEach(s => s.style.boxShadow='');
    if (!termino) return;
    const q = termino.toLowerCase();
    let encontrado = null;
    document.querySelectorAll('.silla').forEach(s => {
        if ((s.getAttribute('title')||'').toLowerCase().includes(q)) {
            s.style.boxShadow = '0 0 0 3px #FFD700, 0 0 14px rgba(255,215,0,0.7)';
            if (!encontrado) encontrado = s;
        }
    });
    if (encontrado) {
        const mesa = encontrado.closest('.mesa');
        if (mesa) mesa.scrollIntoView({ behavior:'smooth', block:'center', inline:'center' });
    }
}

// ============================================================
// AGREGAR INVITADO
// ============================================================
function agregarInvitado() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-agregar-invitado" style="max-width:460px;">
            <div class="modal-header"><h3><i class="fas fa-user-plus"></i> Agregar Invitado</h3><button class="modal-close">&times;</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Nombre completo <span style="color:#e53935;">*</span></label><input type="text" id="ai-nombre" placeholder="Ej: Ana López" autocomplete="off"></div>
                <div class="form-group"><label>Correo electrónico</label><input type="email" id="ai-email" placeholder="ana@correo.com" autocomplete="off"></div>
                <div class="form-group"><label>Teléfono</label><input type="tel" id="ai-telefono" placeholder="Ej: 55 1234 5678" autocomplete="off"></div>
                <div class="form-group">
                    <label>Estado de confirmación</label>
                    <div class="estado-radio-group">
                        <label class="estado-radio" data-estado="pendiente"><input type="radio" name="ai-estado" value="pendiente" checked><span class="estado-radio-label"><i class="fas fa-clock"></i> Pendiente</span></label>
                        <label class="estado-radio" data-estado="confirmado"><input type="radio" name="ai-estado" value="confirmado"><span class="estado-radio-label"><i class="fas fa-check-circle"></i> Confirmado</span></label>
                    </div>
                </div>
                <div id="ai-error" class="form-error" style="display:none;"></div>
            </div>
            <div class="modal-footer"><button class="btn-secondary modal-cancel-ai">Cancelar</button><button class="btn-primary btn-guardar-ai"><i class="fas fa-plus"></i> Agregar</button></div>
        </div>`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    modal.querySelector('#ai-nombre').focus();
    const cerrar = () => { modal.style.display='none'; setTimeout(()=>modal.remove(),300); };
    modal.querySelector('.modal-close').onclick    = cerrar;
    modal.querySelector('.modal-cancel-ai').onclick= cerrar;
    modal.onclick = e => { if (e.target===modal) cerrar(); };
    modal.querySelector('.btn-guardar-ai').onclick = () => {
        const nombre   = modal.querySelector('#ai-nombre').value.trim();
        const email    = modal.querySelector('#ai-email').value.trim();
        const telefono = modal.querySelector('#ai-telefono').value.trim();
        const estado   = modal.querySelector('input[name="ai-estado"]:checked').value;
        const errDiv   = modal.querySelector('#ai-error');
        if (!nombre) { errDiv.textContent='El nombre es obligatorio.'; errDiv.style.display='block'; modal.querySelector('#ai-nombre').focus(); return; }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errDiv.textContent='El correo no es válido.'; errDiv.style.display='block'; return; }
        invitados.push({ id: invitados.length ? Math.max(...invitados.map(i=>i.id))+1 : 1, nombre, email:email||null, telefono:telefono||null, estado, idMesa:null, idSilla:null });
        actualizarListaInvitados();
        registrarHistorial(`Invitado "${nombre}" agregado`);
        mostrarMensaje(`Invitado "${nombre}" agregado`,'success');
        cerrar();
    };
}

// ============================================================
// REPORTE
// ============================================================
function mostrarReporte() {
    const totalInv  = invitados.length;
    const asignados = invitados.filter(i=>i.idMesa).length;
    const confirmados = invitados.filter(i=>i.estado==='confirmado').length;
    const totalSillas = mesas.reduce((a,m)=>a+m.sillas.length,0);
    const ocupadas    = mesas.reduce((a,m)=>a+m.sillas.filter(s=>s.estado!=='sin-asignar').length,0);

    const mesasHTML = mesas.map(mesa => {
        const asig  = mesa.sillas.filter(s => s.estado!=='sin-asignar');
        const libres = mesa.sillas.length - asig.length;
        return `<div class="reporte-mesa">
            <div class="reporte-mesa-header" style="border-left-color:${mesa.color||'#8B4513'};">
                <span class="reporte-mesa-nombre">${mesa.nombre}</span>
                <span class="reporte-mesa-stats">${asig.length}/${mesa.sillas.length} ocupadas</span>
            </div>
            ${asig.length ? `<ul class="reporte-invitados-lista">${asig.map(s=>`<li class="reporte-inv-item"><span class="reporte-inv-nombre">${s.nombre}</span><span class="reporte-inv-estado status-${s.estado}">${s.estado}</span></li>`).join('')}</ul>` : '<p class="reporte-sin-invitados">Sin invitados asignados</p>'}
            ${libres ? `<p class="reporte-libres">${libres} silla${libres>1?'s':''} libre${libres>1?'s':''}</p>` : ''}
        </div>`;
    }).join('');

    const sinAsignar = invitados.filter(i=>!i.idMesa);
    const sinAsignarHTML = sinAsignar.length ? `<div class="reporte-mesa reporte-sin-asignar">
        <div class="reporte-mesa-header" style="border-left-color:#9E9E9E;"><span class="reporte-mesa-nombre">⚠ Sin asignar</span><span class="reporte-mesa-stats">${sinAsignar.length}</span></div>
        <ul class="reporte-invitados-lista">${sinAsignar.map(i=>`<li class="reporte-inv-item"><span class="reporte-inv-nombre">${i.nombre}</span><span class="reporte-inv-estado status-${i.estado}">${i.estado}</span></li>`).join('')}</ul>
    </div>` : '';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-reporte" style="max-width:680px;max-height:88vh;">
            <div class="modal-header reporte-header">
                <h3><i class="fas fa-file-alt"></i> Reporte del Evento</h3>
                <div class="reporte-header-btns">
                    <button class="btn-primary btn-small btn-imprimir" id="btnImprimir"><i class="fas fa-print"></i> Imprimir</button>
                    <button class="modal-close">&times;</button>
                </div>
            </div>
            <div class="modal-body reporte-body" id="contenidoReporte">
                <div class="reporte-titulo">
                    <h2>${eventoActual?eventoActual.nombre:'Evento'}</h2>
                    <p class="reporte-fecha">${eventoActual&&eventoActual.fecha_evento?eventoActual.fecha_evento:''} ${eventoActual&&eventoActual.hora_evento?'— '+eventoActual.hora_evento:''}</p>
                </div>
                <div class="reporte-resumen">
                    <div class="reporte-res-item"><span class="reporte-res-num">${totalInv}</span><span class="reporte-res-label">Invitados</span></div>
                    <div class="reporte-res-item"><span class="reporte-res-num">${asignados}</span><span class="reporte-res-label">Asignados</span></div>
                    <div class="reporte-res-item"><span class="reporte-res-num">${confirmados}</span><span class="reporte-res-label">Confirmados</span></div>
                    <div class="reporte-res-item"><span class="reporte-res-num">${ocupadas}/${totalSillas}</span><span class="reporte-res-label">Sillas</span></div>
                </div>
                <div class="reporte-mesas">${mesasHTML}</div>
                ${sinAsignarHTML}
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    modal.querySelector('.modal-close').onclick = () => cerrarModal(modal);
    modal.onclick = e => { if (e.target===modal) cerrarModal(modal); };
    modal.querySelector('#btnImprimir').onclick = () => {
        const clone = document.createElement('div');
        clone.id = 'print-reporte';
        clone.innerHTML = document.getElementById('contenidoReporte').innerHTML;
        document.body.appendChild(clone);
        window.print();
        clone.remove();
    };
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function configurarEventListeners() {
    eventSelector.addEventListener('change', async function() { if (this.value) await cargarEvento(parseInt(this.value)); });
    btnCrearMesas.addEventListener('click', crearMesas);
    btnGuardarEvento.addEventListener('click', guardarEvento);
    if (btnEliminarEvento) btnEliminarEvento.addEventListener('click', eliminarEvento);

    newEventBtn.addEventListener('click', () => { document.getElementById('newEventModal').style.display='flex'; });
    document.querySelector('#newEventModal .modal-close').addEventListener('click', () => { document.getElementById('newEventModal').style.display='none'; });
    document.querySelector('#newEventModal .modal-cancel').addEventListener('click', () => { document.getElementById('newEventModal').style.display='none'; });
    document.getElementById('createEventBtn').addEventListener('click', crearNuevoEvento);

    logoutBtn.addEventListener('click', () => {
        ['titi_token','titi_sesion','titi_usuario_actual'].forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
        window.location.href = 'login.html';
    });

    zoomInBtn.addEventListener('click',  e => { e.preventDefault(); if (zoomLevel<2)   { zoomLevel+=0.1; aplicarZoom(); } });
    zoomOutBtn.addEventListener('click', e => { e.preventDefault(); if (zoomLevel>0.5)  { zoomLevel-=0.1; aplicarZoom(); } });
    resetViewBtn.addEventListener('click',e => { e.preventDefault(); zoomLevel=1; aplicarZoom(); });

    showNamesCheckbox.addEventListener('change', renderizarMesas);
    guestSearch.addEventListener('input', actualizarListaInvitados);
    guestFilter.addEventListener('change', actualizarListaInvitados);
    addGuestBtn.addEventListener('click', agregarInvitado);
    searchGuests.addEventListener('input', function() { buscarEnMesas(this.value); });
    autoSaveCheckbox.addEventListener('change', function() { mostrarMensaje(`Guardado automático ${this.checked?'activado':'desactivado'}`,'info'); });

    numColumnasInput.addEventListener('change', actualizarDisposicion);
    numFilasInput.addEventListener('change', actualizarDisposicion);
    espaciadoInput.addEventListener('change', actualizarDisposicion);

    const reporteBtn = document.getElementById('reporteBtn');
    if (reporteBtn) reporteBtn.addEventListener('click', mostrarReporte);

    // permitir escritura en inputs
    [eventNameInput,eventDateInput,eventTimeInput,eventDescriptionInput,numMesasInput,sillasPorMesaInput,searchGuests,guestSearch,numColumnasInput,numFilasInput,espaciadoInput]
        .forEach(inp => { if (inp) inp.addEventListener('keydown', e => e.stopPropagation()); });

    // shortcuts teclado
    document.addEventListener('keydown', e => {
        const a = document.activeElement;
        if (a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.tagName==='SELECT') return;
        if (e.ctrlKey && e.key==='s') { e.preventDefault(); guardarEvento(); }
        if (e.key==='+'||e.key==='=') { e.preventDefault(); if (zoomLevel<2) { zoomLevel+=0.1; aplicarZoom(); } }
        if (e.key==='-')              { e.preventDefault(); if (zoomLevel>0.5){ zoomLevel-=0.1; aplicarZoom(); } }
        if (e.key==='0')              { e.preventDefault(); zoomLevel=1; aplicarZoom(); }
    });
}

function aplicarZoom() { document.querySelectorAll('.mesa').forEach(m => m.style.transform=`scale(${zoomLevel})`); }

function actualizarDisposicion() {
    const col=parseInt(numColumnasInput.value)||4, esp=parseInt(espaciadoInput.value)||70;
    configuracionDisposicion = { columnas:col, filas:parseInt(numFilasInput.value)||2, espaciado:esp };
    mesasContainer.style.gap = `${esp}px`;
    mesasContainer.style.gridTemplateColumns = `repeat(${col}, 1fr)`;
    if (mesas.length) renderizarMesas();
    mostrarMensaje(`Disposición: ${col}×${configuracionDisposicion.filas}`,'info');
}

// ============================================================
// TOAST
// ============================================================
function mostrarMensaje(msg, tipo='info') {
    const t = document.getElementById('messageToast');
    if (!t) return;
    t.textContent = msg;
    t.className   = `toast ${tipo} show`;
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ============================================================
// GLOBALES (llamadas desde innerHTML onclick)
// ============================================================
window.editarInvitado = function(invitadoId) {
    const inv = invitados.find(i => i.id === invitadoId);
    if (!inv) return;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-agregar-invitado" style="max-width:460px;">
            <div class="modal-header"><h3><i class="fas fa-edit"></i> Editar Invitado</h3><button class="modal-close">&times;</button></div>
            <div class="modal-body">
                <div class="form-group"><label>Nombre completo <span style="color:#e53935;">*</span></label><input type="text" id="ei-nombre" value="${inv.nombre}" autocomplete="off"></div>
                <div class="form-group"><label>Correo electrónico</label><input type="email" id="ei-email" value="${inv.email||''}" placeholder="correo@ejemplo.com" autocomplete="off"></div>
                <div class="form-group"><label>Teléfono</label><input type="tel" id="ei-telefono" value="${inv.telefono||''}" placeholder="Ej: 55 1234 5678" autocomplete="off"></div>
                <div class="form-group">
                    <label>Estado de confirmación</label>
                    <div class="estado-radio-group">
                        <label class="estado-radio"><input type="radio" name="ei-estado" value="pendiente" ${inv.estado==='pendiente'?'checked':''}><span class="estado-radio-label"><i class="fas fa-clock"></i> Pendiente</span></label>
                        <label class="estado-radio"><input type="radio" name="ei-estado" value="asignado"  ${inv.estado==='asignado' ?'checked':''}><span class="estado-radio-label"><i class="fas fa-chair"></i> Asignado</span></label>
                        <label class="estado-radio"><input type="radio" name="ei-estado" value="confirmado" ${inv.estado==='confirmado'?'checked':''}><span class="estado-radio-label"><i class="fas fa-check-circle"></i> Confirmado</span></label>
                    </div>
                </div>
                <div id="ei-error" class="form-error" style="display:none;"></div>
            </div>
            <div class="modal-footer"><button class="btn-secondary modal-cancel-ei">Cancelar</button><button class="btn-primary btn-guardar-ei"><i class="fas fa-save"></i> Guardar cambios</button></div>
        </div>`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    const cerrar = () => { modal.style.display='none'; setTimeout(()=>modal.remove(),300); };
    modal.querySelector('.modal-close').onclick     = cerrar;
    modal.querySelector('.modal-cancel-ei').onclick = cerrar;
    modal.onclick = e => { if (e.target===modal) cerrar(); };
    modal.querySelector('.btn-guardar-ei').onclick = () => {
        const nombre   = modal.querySelector('#ei-nombre').value.trim();
        const email    = modal.querySelector('#ei-email').value.trim();
        const telefono = modal.querySelector('#ei-telefono').value.trim();
        const estado   = modal.querySelector('input[name="ei-estado"]:checked').value;
        const errDiv   = modal.querySelector('#ei-error');
        if (!nombre) { errDiv.textContent='El nombre es obligatorio.'; errDiv.style.display='block'; return; }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errDiv.textContent='El correo no es válido.'; errDiv.style.display='block'; return; }
        inv.nombre=nombre; inv.email=email||null; inv.telefono=telefono||null; inv.estado=estado;
        actualizarListaInvitados();
        mostrarDetallesInvitado(invitadoId);
        registrarHistorial(`Invitado "${nombre}" editado`);
        mostrarMensaje('Invitado actualizado','success');
        cerrar();
    };
};

window.asignarInvitado = function(invitadoId) {
    const inv = invitados.find(i => i.id === invitadoId);
    if (!inv) return;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px;">
            <div class="modal-header"><h3>Asignar ${inv.nombre}</h3><button class="modal-close">&times;</button></div>
            <div class="modal-body">
                <p style="color:#666;margin-bottom:10px;">Selecciona una silla libre:</p>
                <div style="max-height:300px;overflow-y:auto;">
                    ${mesas.map(mesa=>`<div style="margin-bottom:14px;"><strong style="font-size:0.9rem;">${mesa.nombre}</strong>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
                            ${mesa.sillas.map(s=>`<button class="silla-asignacion ${s.estado!=='sin-asignar'?'ocupada':''}" data-mesa="${mesa.id}" data-silla="${s.id}" style="padding:7px 10px;border:1px solid #ddd;border-radius:4px;background:${s.estado==='sin-asignar'?'#f0f0f0':'#ffebee'};font-size:0.82rem;">Silla ${s.id}${s.nombre?' ('+s.nombre+')':''}</button>`).join('')}
                        </div></div>`).join('')}
                </div>
            </div>
            <div class="modal-footer"><button class="btn-secondary" onclick="cerrarModal(this.closest('.modal'))">Cancelar</button></div>
        </div>`;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    modal.querySelectorAll('.silla-asignacion:not(.ocupada)').forEach(btn => {
        btn.addEventListener('click', function() { actualizarSilla(parseInt(this.dataset.mesa), parseInt(this.dataset.silla), invitadoId, 'asignado'); cerrarModal(modal); });
    });
    modal.querySelector('.modal-close').onclick = () => cerrarModal(modal);
    modal.onclick = e => { if (e.target===modal) cerrarModal(modal); };
};

window.cerrarModal = cerrarModal;
