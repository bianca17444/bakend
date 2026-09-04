import {
  getCursanService,
  createCursanService,
  deleteCursanService,
} from "../services/cursan.service.js";

export const getCursan = async (req, res) => {
  try {

    const cursan = await getCursanService();

    return res.status(200).json(cursan);

  } catch (error) {

    return res.status(400).json({
      message: error.message,
    });

  }
};

export const createCursan = async (req, res) => {
  try {

    const cursan = await createCursanService(req.body);

    return res.status(201).json({
      message: "Alumno inscripto correctamente",
      data: cursan,
    });

  } catch (error) {

    return res.status(400).json({
      message: error.message,
    });

  }
};

export const deleteCursan = async (req, res) => {
  try {

    await deleteCursanService(req.params.id);

    return res.status(200).json({
      message: "Inscripción eliminada correctamente",
    });

  } catch (error) {

    return res.status(400).json({
      message: error.message,
    });

  }
};