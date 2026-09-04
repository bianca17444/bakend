// importar las funciones de service
//desempaqueto la request, llamo al servicio y envio la respuesta al cliente

import {
  createUserService,
  getUsersService,
  getUserByIdService,
  updateUserService,
  deleteUserService,
  loginUserService,
} from "../services/users.service.js";
import { createToken } from "../security/jwt.js";

/**
 * Login de usuario con manejo de brute force y tokens JWT
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Intentar autenticación
    const user = await loginUserService(email, password);
    
    // Limpiar intentos fallidos si el login fue exitoso
    if (res.clearLoginAttempts) {
      res.clearLoginAttempts();
    }

    const token = createToken(user);

    // No exponer datos sensibles en la respuesta
    return res.status(200).json({
      status: 200,
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        name: user.nombre || user.name,
        nombre: user.nombre || user.name,
        email: user.email,
        rol: user.rol,
        role: user.rol,
      },
    });
  } catch (error) {
    // Registrar intento fallido para protección contra brute force
    if (res.recordFailedLogin) {
      res.recordFailedLogin();
    }

    console.warn(`[LOGIN FAILED] ${req.body.email} - ${error.message}`);

    // No revelar si el usuario existe o si la contraseña es incorrecta
    // Esto previene user enumeration attacks
    return res.status(401).json({
      status: 401,
      error: "Unauthorized",
      message: "Email o contraseña incorrectos",
    });
  }
};

/**
 * Crear un nuevo usuario
 */
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const user = await createUserService({
      name,
      email,
      password,
      role,
    });

    console.info(`[USER CREATED] ${email} - Role: ${role}`);

    return res.status(201).json({
      status: 201,
      message: "Usuario registrado exitosamente",
      data: {
        id: user.id,
        name: user.nombre || user.name,
        nombre: user.nombre || user.name,
        email: user.email,
        rol: user.rol,
        role: user.rol,
      },
      user: {
        id: user.id,
        name: user.nombre || user.name,
        nombre: user.nombre || user.name,
        email: user.email,
        rol: user.rol,
        role: user.rol,
      },
    });
  } catch (error) {
    console.error(`[USER CREATION ERROR] ${error.message}`);

    // Manejar errores específicos
    if (error.message.includes("already exists")) {
      return res.status(409).json({
        status: 409,
        error: "Conflict",
        message: "El email ya está registrado",
      });
    }

    return res.status(400).json({
      status: 400,
      error: "Bad Request",
      message: error.message,
    });
  }
};

/**
 * Obtener todos los usuarios (solo para profesores y admins)
 */
export const getUsers = async (req, res) => {
  try {
    const users = await getUsersService();

    return res.status(200).json({
      status: 200,
      data: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        rol: user.rol,
        createdAt: user.created_at,
      })),
    });
  } catch (error) {
    console.error(`[GET USERS ERROR] ${error.message}`);

    return res.status(400).json({
      status: 400,
      error: "Bad Request",
      message: error.message,
    });
  }
};

/**
 * Obtener un usuario por ID
 */
export const getUserById = async (req, res) => {
  try {
    const user = await getUserByIdService(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 404,
        error: "Not Found",
        message: "Usuario no encontrado",
      });
    }

    return res.status(200).json({
      status: 200,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        rol: user.rol,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error(`[GET USER ERROR] ${error.message}`);

    return res.status(400).json({
      status: 400,
      error: "Bad Request",
      message: error.message,
    });
  }
};

/**
 * Actualizar un usuario
 */
export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await updateUserService(userId, req.body);

    if (!user) {
      return res.status(404).json({
        status: 404,
        error: "Not Found",
        message: "Usuario no encontrado",
      });
    }

    console.info(`[USER UPDATED] ${userId} by ${req.user?.id || "unknown"}`);

    return res.status(200).json({
      status: 200,
      message: "Usuario actualizado exitosamente",
      data: {
        id: user.id,
        name: user.nombre || user.name,
        nombre: user.nombre || user.name,
        email: user.email,
        rol: user.rol,
        role: user.rol,
      },
      user: {
        id: user.id,
        name: user.nombre || user.name,
        nombre: user.nombre || user.name,
        email: user.email,
        rol: user.rol,
        role: user.rol,
      },
    });
  } catch (error) {
    console.error(`[UPDATE USER ERROR] ${error.message}`);

    return res.status(400).json({
      status: 400,
      error: "Bad Request",
      message: error.message,
    });
  }
};

/**
 * Eliminar un usuario (solo admins)
 */
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevenir auto-eliminación
    if (userId === req.user.id && req.user.rol !== "admin") {
      return res.status(403).json({
        status: 403,
        error: "Forbidden",
        message: "No puedes eliminar tu propia cuenta",
      });
    }

    const result = await deleteUserService(userId);

    if (!result) {
      return res.status(404).json({
        status: 404,
        error: "Not Found",
        message: "Usuario no encontrado",
      });
    }

    console.warn(`[USER DELETED] ${userId} by ${req.user?.id || "unknown"}`);

    return res.status(200).json({
      status: 200,
      message: "Usuario eliminado exitosamente",
    });
  } catch (error) {
    console.error(`[DELETE USER ERROR] ${error.message}`);

    return res.status(400).json({
      status: 400,
      error: "Bad Request",
      message: error.message,
    });
  }
};