import { Router } from "express";

import {
  createMateria,
  getMaterias,
  getMateriaById,
  updateMateria,
  deleteMateria,
} from "../controllers/materias.controller.js";
import { verifyToken, requireRole } from "../security/auth.middleware.js";
import { generalRateLimiter, writeRateLimiter, deleteRateLimiter } from "../security/rateLimit.middleware.js";
import { validateMateria } from "../security/validation.middleware.js";

const router = Router();

// Consultar todas las materias (estudiantes y profesores autenticados)
router.get("/", verifyToken, generalRateLimiter, getMaterias);

// Consultar una materia por ID (estudiantes y profesores autenticados)
router.get("/:id", verifyToken, generalRateLimiter, getMateriaById);

// Crear materia (solo profesores y admins, con validación y límite de escritura)
router.post("/", verifyToken, requireRole(["profesor", "admin"]), writeRateLimiter, validateMateria, createMateria);

// Modificar materia (solo profesores y admins, con validación y límite de escritura)
router.put("/:id", verifyToken, requireRole(["profesor", "admin"]), writeRateLimiter, validateMateria, updateMateria);

// Eliminar materia (solo admins, con límite de eliminación)
router.delete("/:id", verifyToken, requireRole(["admin"]), deleteRateLimiter, deleteMateria);

export default router;