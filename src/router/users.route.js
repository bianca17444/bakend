// importar route de expres
//  crear el objeto route

//Router.get('/users', getAllUsers);
//Router.post('/users', createUser);
//Roiter.put('/users/:id', updateUser(id));
//Router.delete('/users/:id', deleteUser(id));

import { Router } from "express";
import { createUser } from "../controllers/users.controller.js";

const router = Router();

router.post("/", createUser);

export default router;