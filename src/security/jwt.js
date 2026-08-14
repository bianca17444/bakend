import jwt from "jsonwebtoken";
import { config } from "../../config.js";

const JWT_SECRET = config.jwtSecret;

export function createToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      rol: usuario.rol
    },
    JWT_SECRET,
    {
      expiresIn: "2h"
    }
  );
}