import { pool } from "../../database.js";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

// Crear usuario
export const createUserService = async ({
  name,
  email,
  password,
  role,
}) => {

  // Verificar si el email ya existe
  const existingUser = await pool.query(
    `
    SELECT id
    FROM usuarios
    WHERE email = $1
    `,
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new Error("Email already registered");
  }

  // Encriptar contraseña
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Insertar usuario
  const result = await pool.query(
    `
    INSERT INTO usuarios (
      nombre,
      email,
      password,
      rol
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      id,
      nombre,
      email,
      rol
    `,
    [name, email, passwordHash, role]
  );

  return result.rows[0];
};

// Obtener todos los usuarios
export const getUsersService = async () => {
  const result = await pool.query(`
    SELECT
      id,
      nombre,
      email,
      rol
    FROM usuarios
  `);

  return result.rows;
};

// Obtener un usuario por ID
export const getUserByIdService = async (id) => {
  const result = await pool.query(
    `
    SELECT
      id,
      nombre,
      email,
      rol
    FROM usuarios
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0];
};

// Actualizar usuario
export const updateUserService = async (
  id,
  { name, email, password, role }
) => {

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `
    UPDATE usuarios
    SET
      nombre = $1,
      email = $2,
      password = $3,
      rol = $4
    WHERE id = $5
    RETURNING
      id,
      nombre,
      email,
      rol
    `,
    [name, email, passwordHash, role, id]
  );

  return result.rows[0];
};

// Eliminar usuario
export const deleteUserService = async (id) => {

  const result = await pool.query(
    `
    DELETE FROM usuarios
    WHERE id = $1
    RETURNING id
    `,
    [id]
  );

  return result.rows[0];
};