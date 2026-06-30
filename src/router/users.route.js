// importar route de expres
//  crear el objeto route

//Router.get('/users', getAllUsers);
//Router.post('/users', createUser);
//Roiter.put('/users/:id', updateUser(id));
//Router.delete('/users/:id', deleteUser(id));

import { Router } from "express";

import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/users.controller.js";

const router = Router();

router.get("/", getUsers);

router.get("/:id", getUserById);

router.post("/", createUser);

router.put("/:id", updateUser);

router.delete("/:id", deleteUser);

export default router;