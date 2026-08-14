/**
 * Configuración centralizada de Rate Limiting
 * Define diferentes estrategias de limitación según el tipo de endpoint y rol de usuario
 */

export const rateLimitConfig = {
  // ============================================
  // LIMITADORES GLOBALES (por IP/Usuario)
  // ============================================
  
  // Endpoints de autenticación: registro, login, recuperación de contraseña
  // Muy restrictivo para prevenir fuerza bruta
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos máximo
    skipSuccessfulRequests: false, // Contar todos los intentos
    message: "Demasiados intentos de autenticación. Intente de nuevo en {seconds} segundos."
  },

  // Endpoints de lectura/consultas (GET)
  // Moderado, permite más para usuarios autenticados
  read: {
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100, // 100 peticiones por minuto por defecto
    roleLimits: {
      admin: 500,      // Administradores: muy alto
      profesor: 200,   // Profesores: alto
      alumno: 100,     // Estudiantes: moderado
    },
    message: "Demasiadas solicitudes. Intente de nuevo en {seconds} segundos."
  },

  // Endpoints de escritura (POST, PUT, DELETE)
  // Restrictivo para evitar abuso
  write: {
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // 30 operaciones por minuto por defecto
    roleLimits: {
      admin: 150,      // Administradores: alto
      profesor: 60,    // Profesores: moderado
      alumno: 20,      // Estudiantes: bajo
    },
    message: "Demasiadas operaciones de escritura. Intente de nuevo en {seconds} segundos."
  },

  // Endpoints de eliminación (DELETE)
  // Muy restrictivo
  delete: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 10, // 10 eliminaciones máximo
    roleLimits: {
      admin: 50,
      profesor: 20,
      alumno: 5,
    },
    message: "Demasiadas operaciones de eliminación. Intente de nuevo en {seconds} segundos."
  },

  // Endpoints públicos (sin autenticación)
  // Restrictivo para usuarios no autenticados
  public: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 20, // 20 peticiones por 5 minutos
    message: "Límite de solicitudes alcanzado. Intente de nuevo en {seconds} segundos."
  },

  // ============================================
  // LIMITADORES POR ENDPOINT ESPECÍFICO
  // ============================================
  
  endpoints: {
    // Autenticación
    "POST /users/login": {
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: "Demasiados intentos de login. Intente de nuevo en {seconds} segundos."
    },
    "POST /users": {
      windowMs: 60 * 60 * 1000, // 1 hora
      max: 3, // Solo 3 registros por hora desde la misma IP
      message: "Demasiados registros. Intente de nuevo en {seconds} segundos."
    },
    
    // Operaciones sensibles de usuarios
    "DELETE /users/:id": {
      windowMs: 24 * 60 * 60 * 1000, // 24 horas
      max: 5,
      roleLimits: {
        admin: 50,
        profesor: 10,
      },
      message: "Límite de eliminaciones de usuarios alcanzado."
    },
    
    // Lectura de usuarios
    "GET /users": {
      windowMs: 1 * 60 * 1000,
      max: 200, // Más permisivo para profesores listando estudiantes
      roleLimits: {
        admin: 500,
        profesor: 200,
      },
    },
    
    // Operaciones en materias
    "POST /materias": {
      windowMs: 1 * 60 * 1000,
      max: 20,
      roleLimits: {
        admin: 100,
        profesor: 20,
      },
    },
    "PUT /materias/:id": {
      windowMs: 1 * 60 * 1000,
      max: 20,
    },
    "DELETE /materias/:id": {
      windowMs: 5 * 60 * 1000,
      max: 5,
      roleLimits: {
        admin: 50,
      },
    },
    
    // Operaciones en cursan (inscripción a materias)
    "POST /cursan": {
      windowMs: 60 * 60 * 1000, // 1 hora
      max: 20, // Máximo 20 inscripciones por hora
      roleLimits: {
        alumno: 20,
        profesor: 50,
        admin: 200,
      },
    },
    "DELETE /cursan/:id": {
      windowMs: 60 * 60 * 1000,
      max: 10,
    },
  }
};

/**
 * Obtener configuración para un endpoint específico o genérica
 * @param {string} method - Método HTTP (GET, POST, PUT, DELETE)
 * @param {string} path - Ruta del endpoint
 * @returns {Object} Configuración de rate limit
 */
export function getRateLimitConfig(method, path) {
  // Buscar configuración específica del endpoint
  const endpointKey = `${method} ${path}`;
  if (rateLimitConfig.endpoints[endpointKey]) {
    return rateLimitConfig.endpoints[endpointKey];
  }

  // Fallback a configuración genérica por método
  switch (method) {
    case "GET":
      return rateLimitConfig.read;
    case "POST":
    case "PUT":
      return rateLimitConfig.write;
    case "DELETE":
      return rateLimitConfig.delete;
    default:
      return rateLimitConfig.read;
  }
}

/**
 * Configuración de seguridad general
 */
export const securityConfig = {
  // Tiempo de expiración de sesión (en ms)
  sessionTimeout: 30 * 60 * 1000, // 30 minutos

  // Intentos fallidos antes de bloquear cuenta
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutos

  // Validación de contraseña
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },

  // Validación de tokens JWT
  jwt: {
    expiresIn: "24h",
    algorithm: "HS256",
  },

  // Headers de seguridad
  securityHeaders: {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  },

  // Limpieza de almacenamiento
  storageCleanupInterval: 5 * 60 * 1000, // 5 minutos
  storageCleanupThreshold: 10000, // Limpiar si hay más de 10k entradas
};

export default rateLimitConfig;
