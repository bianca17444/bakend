import {
  getDictanService,
  updateDictanService,
} from "../services/dictan.service.js";

export const getDictan = async (req, res) => {
  try {

    const dictan = await getDictanService();

    return res.status(200).json(dictan);

  } catch (error) {

    return res.status(400).json({
      message: error.message,
    });

  }
};

export const updateDictan = async (req, res) => {
  try {

    const { profesor_id } = req.body;

    const materia = await updateDictanService(
      req.params.id,
      profesor_id
    );

    return res.status(200).json({
      message: "Profesor asignado correctamente",
      data: materia,
    });

  } catch (error) {

    return res.status(400).json({
      message: error.message,
    });

  }
};