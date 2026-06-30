import { Router } from "express";

import {
  getCursan,
  createCursan,
  deleteCursan,
} from "../controllers/cursan.controller.js";

const router = Router();

router.get("/", getCursan);

router.post("/", createCursan);

router.delete("/:id", deleteCursan);

export default router;