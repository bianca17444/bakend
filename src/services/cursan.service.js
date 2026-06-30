import { pool } from "../../database.js";

// Listar todas las inscripciones
export const getCursanService = async () => {
  const result = await pool.query(`
    SELECT *
    FROM alumno_materia
    ORDER BY id
  `);

  return result.rows;
};

// Inscribir un alumno en una materia
export const createCursanService = async ({
  alumno_id,
  materia_id,
}) => {

  const result = await pool.query(
    `
    INSERT INTO alumno_materia (
      alumno_id,
      materia_id
    )
    VALUES ($1, $2)
    RETURNING *
    `,
    [alumno_id, materia_id]
  );

  return result.rows[0];
};

// Eliminar inscripción
export const deleteCursanService = async (id) => {

  const result = await pool.query(
    `
    DELETE FROM alumno_materia
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
};