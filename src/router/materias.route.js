import { Router } from "express";

import {
  createMateria,
  getMaterias,
  getMateriaById,
  updateMateria,
  deleteMateria,
} from "../controllers/materias.controller.js";

const router = Router();

router.get("/", getMaterias);

router.get("/:id", getMateriaById);

router.post("/", createMateria);

router.put("/:id", updateMateria);

router.delete("/:id", deleteMateria);

export default router;