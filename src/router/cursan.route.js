import { Router } from "express";

import {
  getCursan,
  createCursan,
  deleteCursan,
} from "../controllers/cursan.controller.js";
import { verifyToken, requireRole } from "../security/auth.middleware.js";
import { generalRateLimiter, writeRateLimiter, deleteRateLimiter } from "../security/rateLimit.middleware.js";
import { validateCursan } from "../security/validation.middleware.js";
import { pool } from "../../database.js";

const router = Router();

// Middleware para validar que el usuario pueda inscribir
const verifyEnrollmentPermission = (req, res, next) => {
  if (req.user.rol === "profesor" || req.user.rol === "admin" || req.user.id === req.body.alumno_id) {
    return next();
  }
  return res.status(403).json({
    status: 403,
    error: "Forbidden",
    message: "Acceso denegado: no estás autorizado a inscribir a otro alumno",
  });
};

// Middleware para validar que el usuario pueda eliminar la inscripción (profesor o el mismo alumno)
const verifyDeletionPermission = async (req, res, next) => {
  if (req.user.rol === "profesor" || req.user.rol === "admin") {
    return next();
  }
  try {
    const result = await pool.query(
      "SELECT alumno_id FROM alumno_materia WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        status: 404,
        error: "Not Found",
        message: "Inscripción no encontrada" 
      });
    }
    if (result.rows[0].alumno_id === req.user.id) {
      return next();
    }
    return res.status(403).json({
      status: 403,
      error: "Forbidden",
      message: "Acceso denegado: no estás autorizado a eliminar esta inscripción",
    });
  } catch (error) {
    return res.status(500).json({ 
      status: 500,
      error: "Internal Server Error",
      message: error.message 
    });
  }
};

// Listar inscripciones (solo profesores y admins)
router.get("/", verifyToken, requireRole(["profesor", "admin"]), generalRateLimiter, getCursan);

// Inscribir alumno en una materia (profesor/admin o el propio alumno)
router.post("/", verifyToken, verifyEnrollmentPermission, writeRateLimiter, validateCursan, createCursan);

// Eliminar inscripción (profesor/admin o el propio alumno)
router.delete("/:id", verifyToken, verifyDeletionPermission, deleteRateLimiter, deleteCursan);

export default router;