import { Router } from "express";

import {
  getDictan,
  updateDictan,
} from "../controllers/dictan.controller.js";
import { verifyToken, requireRole } from "../security/auth.middleware.js";
import { generalRateLimiter, writeRateLimiter } from "../security/rateLimit.middleware.js";
import { validateDictan } from "../security/validation.middleware.js";

const router = Router();

// Consultar qué profesor dicta cada materia (solo estudiantes y profesores autenticados)
router.get("/", verifyToken, generalRateLimiter, getDictan);

// Cambiar profesor de una materia (solo admins, con validación y límite de escritura)
router.put("/:id", verifyToken, requireRole(["admin"]), writeRateLimiter, validateDictan, updateDictan);

export default router;
