// importar las funciones de service

//desempaqueto la request, llamo al servicio y envio la respuesta al cliente

//export async function login(req, res) {
    //const { user, password } = req.body;
    //const result = await loginService(user, password);
    //si result es true -> res.ok
    //si no res.mal
//}

import {
  createUserService,
  getUsersService,
  getUserByIdService,
  updateUserService,
  deleteUserService,
} from "../services/users.service.js";


export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const user = await createUserService({
      name,
      email,
      password,
      role,
    });

    return res.status(201).json({
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
    });
  }
};


export const getUsers = async (req, res) => {
  try {

    const users = await getUsersService();

    return res.status(200).json(users);

  } catch (error) {

    return res.status(400).json({
      message: error.message,
    });

  }
};

export const getUserById = async (req, res) => {
  try {

    const user = await getUserByIdService(req.params.id);

    return res.status(200).json(user);

  } catch (error) {

    return res.status(400).json({
      message: error.message,
    });

  }
};

export const updateUser = async (req, res) => {
  try {

    const user = await updateUserService(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      message: "User updated successfully",
      data: user,
    });

  } catch (error) {

    return res.status(400).json({
      message: error.message,
    });

  }
};

export const deleteUser = async (req, res) => {
  try {

    await deleteUserService(req.params.id);

    return res.status(200).json({
      message: "User deleted successfully",
    });

  } catch (error) {

    return res.status(400).json({
      message: error.message,
    });

  }
};