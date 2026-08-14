/**
 * Middleware de Seguridad de Headers HTTP
 * Configura headers de seguridad para prevenir ataques comunes
 */

import { securityConfig } from "../config/rateLimit.config.js";

/**
 * Middleware para establecer headers de seguridad
 */
export function securityHeaders(req, res, next) {
  // Prevenir sniffing de tipo de contenido
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevenir clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevenir XSS
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Content-Security-Policy", "default-src 'self'");

  // HSTS (solo en producción con HTTPS)
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy (Feature Policy)
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()"
  );

  next();
}

/**
 * Middleware para prevenir CSRF
 * Valida tokens CSRF en operaciones que modifican datos
 */
export function csrfProtection(req, res, next) {
  // CSRF solo aplica a cambios de estado (POST, PUT, DELETE)
  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    const csrfToken = req.headers["x-csrf-token"];
    
    // En desarrollo, permitir sin token. En producción, requerir
    if (process.env.NODE_ENV === "production") {
      if (!csrfToken) {
        return res.status(403).json({
          message: "CSRF token requerido",
        });
      }

      // Aquí irá validación de token CSRF (requiere implementación adicional)
      // Por ahora, solo verificamos que esté presente
    }
  }

  next();
}

/**
 * Middleware para sanitizar y validar entrada
 * Previene inyección de código
 */
export function sanitizeInput(req, res, next) {
  // Sanitizar body
  if (req.body && typeof req.body === "object") {
    sanitizeObject(req.body);
  }

  // Sanitizar query strings
  if (req.query && typeof req.query === "object") {
    sanitizeObject(req.query);
  }

  // Sanitizar parámetros de ruta
  if (req.params && typeof req.params === "object") {
    sanitizeObject(req.params);
  }

  next();
}

/**
 * Sanitizar objetos recursivamente
 */
function sanitizeObject(obj) {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (typeof value === "string") {
        // Remover caracteres peligrosos
        obj[key] = value
          .replace(/[<>\"'`]/g, "") // Remover caracteres HTML
          .trim();
      } else if (typeof value === "object" && value !== null) {
        sanitizeObject(value);
      }
    }
  }
}

/**
 * Middleware para validar Content-Type
 */
export function validateContentType(req, res, next) {
  // Solo validar en peticiones que tienen body
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const contentType = req.headers["content-type"];

    if (!contentType || !contentType.includes("application/json")) {
      return res.status(400).json({
        message: "Content-Type debe ser application/json",
      });
    }
  }

  next();
}

/**
 * Middleware para logging de seguridad
 */
export function securityLogging(req, res, next) {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const isError = statusCode >= 400;
    const userId = req.user?.id || "anonymous";
    const ip = req.ip;

    // Loguear intentos bloqueados, errores de seguridad, etc.
    if (isError && [401, 403, 429].includes(statusCode)) {
      console.warn(
        `[SECURITY] ${ip} ${userId} - ${req.method} ${req.path} - ` +
        `Status: ${statusCode} - Duration: ${duration}ms`
      );
    }

    // Loguear operaciones sensibles
    if (["PUT", "DELETE", "POST"].includes(req.method)) {
      console.info(
        `[AUDIT] ${ip} ${userId} - ${req.method} ${req.path} - ` +
        `Status: ${statusCode} - Duration: ${duration}ms`
      );
    }
  });

  next();
}

/**
 * Middleware para prevenir información expuesta
 */
export function hideServerInfo(req, res, next) {
  // Remover headers que exponen información del servidor
  res.removeHeader("X-Powered-By");
  res.removeHeader("Server");

  next();
}

/**
 * Middleware para limpieza de errores (no exponer detalles técnicos)
 */
export function secureErrorHandler(err, req, res, next) {
  console.error("[ERROR]", err);

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  const response = {
    status: statusCode,
    error: err.name || "Error",
    message: err.message || "Algo salió mal",
  };

  // En producción, no exponer detalles técnicos
  if (isProduction && statusCode === 500) {
    response.message = "Error interno del servidor";
  }

  // Nunca exponer stack trace en producción
  if (!isProduction && process.env.DEBUG === "true") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Middleware para detectar y bloquear patrones de ataque comunes
 */
export function detectAttackPatterns(req, res, next) {
  const path = req.path;
  const query = JSON.stringify(req.query);
  const body = JSON.stringify(req.body || {});

  // Patrones comunes de inyección SQL
  const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|SCRIPT)\b)/i;

  // Patrones de XSS
  const xssPatterns = /(<script|javascript:|onerror|onclick)/i;

  const data = `${path} ${query} ${body}`;

  if (sqlPatterns.test(data) || xssPatterns.test(data)) {
    console.warn(`[ATTACK DETECTED] ${req.ip} - Potential attack attempt`);
    return res.status(400).json({
      message: "Solicitud contiene patrones no permitidos",
    });
  }

  next();
}

export default {
  securityHeaders,
  csrfProtection,
  sanitizeInput,
  validateContentType,
  securityLogging,
  hideServerInfo,
  secureErrorHandler,
  detectAttackPatterns,
};
