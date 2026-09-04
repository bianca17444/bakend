//import express from "express";
//import cors from "cors";
//import morgan from "morgan";
// userRoute <. viene de route/users.route.js

import express from "express";
import cors from "cors";
import morgan from "morgan";

// Importar middleware de seguridad
import {
  securityHeaders,
  csrfProtection,
  sanitizeInput,
  validateContentType,
  securityLogging,
  hideServerInfo,
  secureErrorHandler,
  detectAttackPatterns,
} from "./src/security/headers.middleware.js";
import { rateLimitStats, getRateLimitStats } from "./src/security/rateLimit.middleware.js";

// Importar rutas
import healthRoutes from "./src/router/health.route.js";
import userRoutes from "./src/router/users.route.js";
import materiasRoutes from "./src/router/materias.route.js";
import cursanRoutes from "./src/router/cursan.route.js";
import dictanRoutes from "./src/router/dictan.route.js";

const app = express();

app.set("trust proxy", 1);

// ============================================
// MIDDLEWARE DE SEGURIDAD GENERAL (aplicar primero)
// ============================================

// Remover headers que exponen información
app.use(hideServerInfo);

// Establecer headers de seguridad
app.use(securityHeaders);

// Logging de seguridad
app.use(securityLogging);

// CORS configurado
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
}));

// Morgan para logging de peticiones HTTP
app.use(morgan("dev"));

// Validar Content-Type
app.use(validateContentType);

// Parsear JSON con límite de tamaño
app.use(express.json({ limit: "10kb" })); // Limitar tamaño de payload

// Detectar patrones de ataque
app.use(detectAttackPatterns);

// Sanitizar entrada
app.use(sanitizeInput);

// CSRF Protection
app.use(csrfProtection);

// Middleware para estadísticas de rate limit (disponible en locals)
app.use(rateLimitStats);

// ============================================
// RUTAS
// ============================================

app.use("/", healthRoutes);
app.use("/users", userRoutes);
app.use("/materias", materiasRoutes);
app.use("/cursan", cursanRoutes);
app.use("/dictan", dictanRoutes);

// Ruta para estadísticas de rate limit (solo admin)
app.get("/api/admin/rate-limit-stats", getRateLimitStats);

// ============================================
// MANEJO DE ERRORES
// ============================================

// Ruta 404
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: "Not Found",
    message: "La ruta solicitada no existe",
    path: req.path,
  });
});

// Error handler (debe ser el último middleware)
app.use(secureErrorHandler);

export default app;