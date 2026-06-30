import { Router } from "express";

import {
  getDictan,
  updateDictan,
} from "../controllers/dictan.controller.js";

const router = Router();

router.get("/", getDictan);

router.put("/:id", updateDictan);

export default router;


