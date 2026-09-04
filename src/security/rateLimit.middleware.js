import jwt from "jsonwebtoken";
import { config } from "../../config.js";
import { rateLimitConfig, securityConfig } from "../config/rateLimit.config.js";

const JWT_SECRET = config.jwtSecret;

/**
 * Almacenamiento en memoria para rate limiting
 * En producción, considerar usar Redis para aplicaciones distribuidas
 */
class RateLimitStore {
  constructor() {
    this.store = new Map();
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      cleanups: 0,
    };
    
    // Iniciar limpieza automática
    this.startAutoCleanup();
  }

  /**
   * Obtener o crear registro para una clave
   */
  getRecord(key, windowMs) {
    const now = Date.now();
    let record = this.store.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs,
        firstRequestTime: now,
        blocked: false,
      };
      this.store.set(key, record);
    }

    return record;
  }

  /**
   * Incrementar contador
   */
  increment(key, windowMs) {
    const record = this.getRecord(key, windowMs);
    record.count++;
    return record;
  }

  /**
   * Marcar como bloqueado
   */
  block(key) {
    const record = this.store.get(key);
    if (record) {
      record.blocked = true;
    }
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      storedKeys: this.store.size,
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Limpiar almacenamiento automáticamente
   */
  startAutoCleanup() {
    setInterval(() => {
      this.cleanup();
    }, securityConfig.storageCleanupInterval).unref();
  }

  /**
   * Limpiar entradas expiradas
   */
  cleanup() {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.stats.cleanups++;
    }

    // Si hay demasiadas entradas, hacer limpieza agresiva
    if (this.store.size > securityConfig.storageCleanupThreshold) {
      const entries = Array.from(this.store.entries())
        .sort((a, b) => a[1].resetTime - b[1].resetTime)
        .slice(0, Math.floor(this.store.size * 0.2)); // Eliminar 20% más antiguo

      for (const [key] of entries) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Limpiar un registro específico
   */
  clear(key) {
    this.store.delete(key);
  }

  /**
   * Limpiar todo el almacenamiento
   */
  clearAll() {
    this.store.clear();
  }
}

// Instancia global del almacenamiento
const limitStore = new RateLimitStore();

/**
 * Extraer IP del cliente, considerando proxies
 */
function extractClientIp(req) {
  let ip = req.ip 
    || req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.connection.remoteAddress
    || req.socket.remoteAddress
    || "unknown";

  // Limpiar IPv6 mapping de IPv4
  if (ip.startsWith("::ffff:")) {
    ip = ip.slice(7);
  }

  return ip;
}

/**
 * Decodificar JWT del header si está presente
 */
function decodeTokenFromHeader(authHeader) {
  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Función principal de rate limiting
 */
export function rateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000;
  const defaultMax = options.max || 100;
  const roleLimits = options.roleLimits || {};
  const message = options.message || "Demasiadas solicitudes. Por favor, intente más tarde.";
  const skipSuccessfulRequests = options.skipSuccessfulRequests !== false;

  return (req, res, next) => {
    limitStore.stats.totalRequests++;

    const ip = extractClientIp(req);
    let identifier = `ip:${ip}`;
    let role = null;
    let userId = null;

    // Intentar obtener información del usuario autenticado
    if (req.user) {
      identifier = `user:${req.user.id}`;
      role = req.user.rol;
      userId = req.user.id;
    } else {
      // Intentar decodificar token del header
      const authHeader = req.headers.authorization;
      const decoded = decodeTokenFromHeader(authHeader);
      if (decoded) {
        identifier = `user:${decoded.id}`;
        role = decoded.rol;
        userId = decoded.id;
        req.user = decoded; // Almacenar en req para uso posterior
      }
    }

    // Determinar límite según rol
    let limit = defaultMax;
    if (role && roleLimits[role] !== undefined) {
      limit = roleLimits[role];
    }

    // Obtener o crear registro
    const record = limitStore.increment(identifier, windowMs);

    // Calcular información de retry
    const remaining = Math.max(0, limit - record.count);
    const now = Date.now();
    const retryAfterMs = record.resetTime - now;
    const retryAfterSecs = Math.ceil(retryAfterMs / 1000);

    // Establecer headers estándar de rate limit (RFC 6585)
    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

    // Guardar información en req para logging
    req.rateLimit = {
      identifier,
      userId,
      role,
      limit,
      current: record.count,
      remaining,
      resetTime: record.resetTime,
      ip,
    };

    // Verificar si se excedió el límite
    if (record.count > limit) {
      limitStore.stats.blockedRequests++;
      limitStore.block(identifier);

      res.setHeader("Retry-After", retryAfterSecs);

      return res.status(429).json({
        status: 429,
        error: "Too Many Requests",
        message: message.replace("{seconds}", retryAfterSecs),
        retryAfter: retryAfterSecs,
        resetTime: new Date(record.resetTime).toISOString(),
        rateLimit: {
          limit,
          current: record.count,
          remaining: 0,
        },
      });
    }

    // Interceptar res.json para logging opcional
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      res.setHeader("X-RateLimit-Remaining", remaining);
      return originalJson(data);
    };

    next();
  };
}

/**
 * Middleware para registrar información de rate limit
 */
export function rateLimitLogger(req, res, next) {
  if (req.rateLimit) {
    const { identifier, current, limit, remaining } = req.rateLimit;
    
    // Loguear si estamos cerca del límite
    if (remaining < limit * 0.2) { // Cuando quedan menos del 20%
      console.warn(
        `[RATE LIMIT WARNING] ${identifier} - ${current}/${limit} requests ` +
        `(${remaining} remaining)`
      );
    }
  }

  next();
}

/**
 * Middleware para obtener estadísticas de rate limit
 */
export function rateLimitStats(req, res, next) {
  if (req.user?.rol === "admin") {
    // Hacer disponibles las estadísticas para administradores
    res.locals.rateLimitStats = limitStore.getStats();
  }
  next();
}

/**
 * Endpoint para visualizar estadísticas (solo admins)
 */
export function getRateLimitStats(req, res) {
  if (!req.user || req.user.rol !== "admin") {
    return res.status(403).json({
      message: "Solo administradores pueden acceder a estas estadísticas",
    });
  }

  return res.json({
    stats: limitStore.getStats(),
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// LIMITADORES PRECONFIGURADOS
// ============================================

// 1. Auth Limiter: estricto para autenticación
export const authRateLimiter = rateLimiter(rateLimitConfig.auth);

// 2. General Limiter: moderado para lecturas
export const generalRateLimiter = rateLimiter(rateLimitConfig.read);

// 3. Write Limiter: para operaciones de escritura
export const writeRateLimiter = rateLimiter(rateLimitConfig.write);

// 4. Delete Limiter: muy restrictivo para eliminaciones
export const deleteRateLimiter = rateLimiter(rateLimitConfig.delete);

// 5. Public Limiter: para endpoints públicos
export const publicRateLimiter = rateLimiter(rateLimitConfig.public);

/**
 * Factory function para crear limitadores personalizados
 */
export function createRateLimiter(config) {
  return rateLimiter(config);
}

export default {
  rateLimiter,
  authRateLimiter,
  generalRateLimiter,
  writeRateLimiter,
  deleteRateLimiter,
  publicRateLimiter,
  createRateLimiter,
  rateLimitLogger,
  rateLimitStats,
  getRateLimitStats,
};
