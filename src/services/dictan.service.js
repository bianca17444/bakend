import { pool } from "../../database.js";

// Listar qué profesor dicta cada materia
export const getDictanService = async () => {

  const result = await pool.query(`
    SELECT
      materias.id,
      materias.nombre AS materia,
      usuarios.nombre AS profesor
    FROM materias
    INNER JOIN usuarios
      ON materias.profesor_id = usuarios.id
    ORDER BY materias.nombre
  `);

  return result.rows;
};

// Cambiar el profesor de una materia
export const updateDictanService = async (id, profesor_id) => {

  const result = await pool.query(
    `
    UPDATE materias
    SET profesor_id = $1
    WHERE id = $2
    RETURNING *
    `,
    [profesor_id, id]
  );

  return result.rows[0];
};