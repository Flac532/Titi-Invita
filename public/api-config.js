// api-config.js - Configuración compartida de API para Titi Invita

// ===== CONFIGURACIÓN BASE =====
const API_CONFIG = {
    // URL base según entorno
    BASE_URL: window.location.origin.includes('localhost') 
        ? 'http://localhost:8080/api' 
        : '/api',
    
    // Timeout para requests
    TIMEOUT: 30000, // 30 segundos
    
    // Configuración de retry
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 segundo
};

// ===== FUNCIONES DE AUTENTICACIÓN =====

/**
 * Obtener el token JWT almacenado
 */
function obtenerToken() {
    return localStorage.getItem('titi_token') || sessionStorage.getItem('titi_token');
}

/**
 * Obtener el usuario actual
 */
function obtenerUsuarioActual() {
    const usuarioStr = localStorage.getItem('titi_usuario_actual');
    if (usuarioStr) {
        try {
            return JSON.parse(usuarioStr);
        } catch (error) {
            console.error('Error parseando usuario:', error);
            return null;
        }
    }
    return null;
}

/**
 * Limpiar sesión y redireccionar a login
 */
function cerrarSesion() {
    localStorage.removeItem('titi_token');
    localStorage.removeItem('titi_sesion');
    localStorage.removeItem('titi_usuario_actual');
    sessionStorage.removeItem('titi_token');
    sessionStorage.removeItem('titi_sesion');
    window.location.href = 'login.html';
}

// ===== CLIENTE API =====

/**
 * Cliente HTTP con autenticación
 */
class APIClient {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
    }
    
    /**
     * Hacer una petición HTTP autenticada
     */
    async fetch(endpoint, options = {}) {
        const token = obtenerToken();
        
        if (!token && !options.skipAuth) {
            throw new Error('No hay token de autenticación');
        }
        
        const url = `${this.baseURL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        };
        
        if (token && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const config = {
            ...options,
            headers,
            signal: options.signal || AbortSignal.timeout(this.timeout)
        };
        
        try {
            const response = await fetch(url, config);
            
            // Si es 401, la sesión expiró
            if (response.status === 401 && !options.skipAuth) {
                console.warn('Token expirado, redirigiendo a login');
                cerrarSesion();
                throw new Error('Sesión expirada');
            }
            
            // Si es 403, no tiene permisos
            if (response.status === 403) {
                throw new Error('No tienes permisos para realizar esta acción');
            }
            
            return response;
            
        } catch (error) {
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                throw new Error('Tiempo de espera agotado. Por favor, intenta nuevamente.');
            }
            throw error;
        }
    }
    
    /**
     * GET request
     */
    async get(endpoint, options = {}) {
        const response = await this.fetch(endpoint, {
            ...options,
            method: 'GET'
        });
        return await response.json();
    }
    
    /**
     * POST request
     */
    async post(endpoint, data, options = {}) {
        const response = await this.fetch(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
        return await response.json();
    }
    
    /**
     * PUT request
     */
    async put(endpoint, data, options = {}) {
        const response = await this.fetch(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return await response.json();
    }
    
    /**
     * DELETE request
     */
    async delete(endpoint, options = {}) {
        const response = await this.fetch(endpoint, {
            ...options,
            method: 'DELETE'
        });
        return await response.json();
    }
}

// Crear instancia global
const apiClient = new APIClient();

// ===== SERVICIOS API =====

/**
 * Servicio de Autenticación
 */
const AuthService = {
    /**
     * Login de usuario
     */
    async login(email, password) {
        return await apiClient.post('/auth/login', { email, password }, { skipAuth: true });
    },
    
    /**
     * Verificar token actual
     */
    async verify() {
        return await apiClient.get('/auth/verify');
    }
};

/**
 * Servicio de Usuarios
 */
const UsuariosService = {
    /**
     * Obtener todos los usuarios (solo admin)
     */
    async getAll() {
        return await apiClient.get('/usuarios');
    },
    
    /**
     * Crear nuevo usuario
     */
    async create(userData) {
        return await apiClient.post('/usuarios', userData);
    },
    
    /**
     * Actualizar usuario
     */
    async update(id, userData) {
        return await apiClient.put(`/usuarios/${id}`, userData);
    },
    
    /**
     * Eliminar usuario
     */
    async delete(id) {
        return await apiClient.delete(`/usuarios/${id}`);
    }
};

/**
 * Servicio de Eventos
 */
const EventosService = {
    /**
     * Obtener todos los eventos (según rol)
     */
    async getAll() {
        return await apiClient.get('/eventos');
    },
    
    /**
     * Obtener eventos del usuario actual
     */
    async getMisEventos() {
        return await apiClient.get('/eventos-usuario');
    },
    
    /**
     * Obtener un evento específico
     */
    async getById(id) {
        return await apiClient.get(`/eventos/${id}`);
    },
    
    /**
     * Crear nuevo evento
     */
    async create(eventoData) {
        return await apiClient.post('/eventos', eventoData);
    },
    
    /**
     * Actualizar evento
     */
    async update(id, eventoData) {
        return await apiClient.put(`/eventos/${id}`, eventoData);
    },
    
    /**
     * Eliminar evento
     */
    async delete(id) {
        return await apiClient.delete(`/eventos/${id}`);
    }
};

/**
 * Servicio de Mesas
 */
const MesasService = {
    /**
     * Obtener mesas de un evento
     */
    async getByEvento(eventoId) {
        return await apiClient.get(`/eventos/${eventoId}/mesas`);
    },
    
    /**
     * Guardar mesas de un evento
     */
    async save(eventoId, mesas) {
        return await apiClient.post(`/eventos/${eventoId}/mesas`, { mesas });
    }
};

/**
 * Servicio de Invitados
 */
const InvitadosService = {
    /**
     * Obtener invitados de un evento
     */
    async getByEvento(eventoId) {
        return await apiClient.get(`/eventos/${eventoId}/invitados`);
    },
    
    /**
     * Crear invitado
     */
    async create(eventoId, invitadoData) {
        return await apiClient.post(`/eventos/${eventoId}/invitados`, invitadoData);
    },
    
    /**
     * Actualizar invitado
     */
    async update(eventoId, invitadoId, invitadoData) {
        return await apiClient.put(`/eventos/${eventoId}/invitados/${invitadoId}`, invitadoData);
    },
    
    /**
     * Eliminar invitado
     */
    async delete(eventoId, invitadoId) {
        return await apiClient.delete(`/eventos/${eventoId}/invitados/${invitadoId}`);
    }
};

/**
 * Servicio de Estadísticas
 */
const EstadisticasService = {
    /**
     * Obtener estadísticas
     */
    async get() {
        return await apiClient.get('/estadisticas');
    }
};

// ===== EXPORTAR =====

// Exponer en window para uso global
window.TitiAPI = {
    config: API_CONFIG,
    client: apiClient,
    auth: AuthService,
    usuarios: UsuariosService,
    eventos: EventosService,
    mesas: MesasService,
    invitados: InvitadosService,
    estadisticas: EstadisticasService,
    // Utilidades
    obtenerToken,
    obtenerUsuarioActual,
    cerrarSesion
};

// Log de inicialización
console.log('✅ API Client inicializado');
console.log('🔗 Base URL:', API_CONFIG.BASE_URL);
