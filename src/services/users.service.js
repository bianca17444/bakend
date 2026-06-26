import { pool } from "../../database.js";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

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