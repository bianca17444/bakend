import { Router } from "express";

import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
} from "../controllers/users.controller.js";

import { verifyToken, requireRole, checkBruteForce } from "../security/auth.middleware.js";
import { authRateLimiter, generalRateLimiter, writeRateLimiter, deleteRateLimiter } from "../security/rateLimit.middleware.js";
import {
  validateUserCreation,
  validateUserLogin,
  validateUserUpdate,
} from "../security/validation.middleware.js";

const router = Router();

// Middleware para validar que el usuario sea el dueño del recurso o un profesor
const verifyOwnerOrTeacher = (req, res, next) => {
  if (req.user.rol === "profesor" || req.user.rol === "admin" || req.user.id === req.params.id) {
    return next();
  }
  return res.status(403).json({
    status: 403,
    error: "Forbidden",
    message: "Acceso denegado: no estás autorizado a acceder o modificar este perfil",
  });
};

// ============================================
// RUTAS PÚBLICAS
// ============================================

// Crear/Registrar usuario (público, con límite estricto y validación)
router.post("/", authRateLimiter, validateUserCreation, createUser);

// Login de usuario (público, con límite estricto, brute force check y validación)
router.post("/login", authRateLimiter, checkBruteForce, validateUserLogin, loginUser);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================

// Listar todos los usuarios (solo profesores y admin)
router.get("/", verifyToken, requireRole(["profesor", "admin"]), generalRateLimiter, getUsers);

// Obtener un usuario por ID (profesor/admin o dueño de la cuenta)
router.get("/:id", verifyToken, verifyOwnerOrTeacher, generalRateLimiter, getUserById);

// Modificar usuario (profesor/admin o dueño de la cuenta, con validación)
router.put("/:id", verifyToken, verifyOwnerOrTeacher, writeRateLimiter, validateUserUpdate, updateUser);

// Eliminar usuario (solo admin)
router.delete("/:id", verifyToken, requireRole(["admin"]), deleteRateLimiter, deleteUser);

export default router;