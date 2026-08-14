import jwt from "jsonwebtoken";
import { config } from "../../config.js";
import { securityConfig } from "../config/rateLimit.config.js";

const JWT_SECRET = config.jwtSecret;

/**
 * Almacenamiento de intentos fallidos de login para detección de fuerza bruta
 */
const loginAttempts = new Map();

/**
 * Registrar intento fallido de login
 */
function recordFailedLogin(identifier) {
  const now = Date.now();
  const record = loginAttempts.get(identifier) || { attempts: 0, lastAttempt: now };

  if (now - record.lastAttempt > securityConfig.lockoutDuration) {
    // Resetear si pasó el tiempo de bloqueo
    record.attempts = 1;
  } else {
    record.attempts++;
  }

  record.lastAttempt = now;
  loginAttempts.set(identifier, record);

  return record;
}

/**
 * Verificar si una cuenta está bloqueada
 */
function isAccountLocked(identifier) {
  const record = loginAttempts.get(identifier);

  if (!record) {
    return false;
  }

  const now = Date.now();
  const timeSinceLast = now - record.lastAttempt;

  // Si pasó el tiempo de bloqueo, desbloquear
  if (timeSinceLast > securityConfig.lockoutDuration) {
    loginAttempts.delete(identifier);
    return false;
  }

  // Verificar si se alcanzó el máximo de intentos
  return record.attempts >= securityConfig.maxLoginAttempts;
}

/**
 * Resetear intentos fallidos después de login exitoso
 */
function clearLoginAttempts(identifier) {
  loginAttempts.delete(identifier);
}

/**
 * Limpieza automática de intentos fallidos antiguos
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of loginAttempts.entries()) {
    if (now - value.lastAttempt > securityConfig.lockoutDuration * 2) {
      loginAttempts.delete(key);
    }
  }
}, securityConfig.lockoutDuration).unref();

/**
 * Verificar token JWT
 */
export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        status: 401,
        error: "Unauthorized",
        message: "Token requerido"
      });
    }

    const [type, token] = authHeader.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({
        status: 401,
        error: "Unauthorized",
        message: "Formato de token inválido. Use 'Bearer <token>'"
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    const statusCode = error.name === "TokenExpiredError" ? 401 : 401;
    const message = error.name === "TokenExpiredError" 
      ? "Token expirado"
      : "Token inválido";

    return res.status(statusCode).json({
      status: statusCode,
      error: "Unauthorized",
      message
    });
  }
}

/**
 * Middleware para requerir un rol específico
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 401,
        error: "Unauthorized",
        message: "Autenticación requerida"
      });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        status: 403,
        error: "Forbidden",
        message: "Acceso denegado: permisos insuficientes para esta acción"
      });
    }

    next();
  };
}

/**
 * Middleware para validar que el usuario sea el dueño del recurso o tenga rol suficiente
 */
export function requireOwnerOrRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 401,
        error: "Unauthorized",
        message: "Autenticación requerida"
      });
    }

    const isOwner = req.user.id === req.params.id || req.user.id === req.params.userId;
    const hasRole = allowedRoles.includes(req.user.rol);

    if (!isOwner && !hasRole) {
      return res.status(403).json({
        status: 403,
        error: "Forbidden",
        message: "No tienes permiso para acceder a este recurso"
      });
    }

    next();
  };
}

/**
 * Middleware para registrar intento de login fallido y proteger contra fuerza bruta
 */
export function checkBruteForce(req, res, next) {
  const identifier = req.body.email?.toLowerCase() || req.ip;

  if (isAccountLocked(identifier)) {
    const record = loginAttempts.get(identifier);
    const timeSinceLast = Date.now() - record.lastAttempt;
    const remainingTime = Math.ceil((securityConfig.lockoutDuration - timeSinceLast) / 1000);

    console.warn(`[BRUTE FORCE DETECTED] Account ${identifier} locked for ${remainingTime}s`);

    return res.status(429).json({
      status: 429,
      error: "Too Many Requests",
      message: `Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo en ${remainingTime} segundos`,
      retryAfter: remainingTime,
    });
  }

  // Almacenar función para registrar intentos fallidos
  res.recordFailedLogin = () => recordFailedLogin(identifier);
  res.clearLoginAttempts = () => clearLoginAttempts(identifier);

  next();
}

export default {
  verifyToken,
  requireRole,
  requireOwnerOrRole,
  checkBruteForce,
};