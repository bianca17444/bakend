import { pool } from "../../database.js";

// Crear materia
export const createMateriaService = async ({ nombre, profesor_id }) => {
  const result = await pool.query(
    `
    INSERT INTO materias (
      nombre,
      profesor_id
    )
    VALUES ($1, $2)
    RETURNING *
    `,
    [nombre, profesor_id]
  );

  return result.rows[0];
};

// Listar todas las materias
export const getMateriasService = async () => {
  const result = await pool.query(`
    SELECT m.*, u.nombre as profesor_nombre, u.email as profesor_email
    FROM materias m
    JOIN usuarios u ON m.profesor_id = u.id
    ORDER BY m.nombre
  `);

  return result.rows;
};

// Listar una materia
export const getMateriaByIdService = async (id) => {
  const result = await pool.query(
    `
    SELECT *
    FROM materias
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0];
};

// Modificar materia
export const updateMateriaService = async (
  id,
  { nombre, profesor_id }
) => {

  const result = await pool.query(
    `
    UPDATE materias
    SET
      nombre = $1,
      profesor_id = $2
    WHERE id = $3
    RETURNING *
    `,
    [nombre, profesor_id, id]
  );

  return result.rows[0];
};

// Eliminar materia
export const deleteMateriaService = async (id) => {
  await pool.query(`DELETE FROM alumno_materia WHERE materia_id = $1`, [id]);

  const result = await pool.query(
    `
    DELETE FROM materias
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
};