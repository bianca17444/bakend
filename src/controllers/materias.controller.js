import {
  createMateriaService,
  getMateriasService,
  getMateriaByIdService,
  updateMateriaService,
  deleteMateriaService,
} from "../services/materias.service.js";

export const createMateria = async (req, res) => {
  try {

    const materia = await createMateriaService(req.body);

    return res.status(201).json({
      message: "Materia creada correctamente",
      data: materia,
    });

  } catch (error) {

    return res.status(400).json({
      message: error.message,
    });

  }
};

export const getMaterias = async (req, res) => {

  const materias = await getMateriasService();

  res.json(materias);

};

export const getMateriaById = async (req, res) => {

  const materia = await getMateriaByIdService(req.params.id);

  res.json(materia);

};

export const updateMateria = async (req, res) => {

  const materia = await updateMateriaService(
    req.params.id,
    req.body
  );

  res.json({
    message: "Materia modificada correctamente",
    data: materia,
  });

};

export const deleteMateria = async (req, res) => {

  await deleteMateriaService(req.params.id);

  res.json({
    message: "Materia eliminada correctamente",
  });

};