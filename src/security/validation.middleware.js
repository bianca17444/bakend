import { securityConfig } from "../config/rateLimit.config.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validar fortaleza de contraseña según política de seguridad
 */
function validatePasswordStrength(password) {
  const { minLength, requireUppercase, requireNumbers, requireSpecialChars } = 
    securityConfig.passwordPolicy;

  const errors = [];

  if (password.length < minLength) {
    errors.push(`La contraseña debe tener al menos ${minLength} caracteres`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una mayúscula");
  }

  if (requireNumbers && !/\d/.test(password)) {
    errors.push("La contraseña debe contener al menos un número");
  }

  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("La contraseña debe contener al menos un carácter especial (!@#$%^&*)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validar nombre de usuario/perfil
 */
function validateName(name) {
  if (!name || typeof name !== "string") {
    return { isValid: false, error: "El nombre es obligatorio y debe ser un texto" };
  }

  name = name.trim();

  if (name.length < 2) {
    return { isValid: false, error: "El nombre debe tener al menos 2 caracteres" };
  }

  if (name.length > 100) {
    return { isValid: false, error: "El nombre no puede exceder 100 caracteres" };
  }

  // Validar que contenga solo caracteres permitidos
  if (!/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s\-']+$/.test(name)) {
    return { isValid: false, error: "El nombre contiene caracteres no permitidos" };
  }

  return { isValid: true };
}

/**
 * Validar rol de usuario
 */
function validateRole(role) {
  const validRoles = ["alumno", "profesor", "admin"];

  if (!role || !validRoles.includes(role)) {
    return { 
      isValid: false, 
      error: `El rol debe ser uno de: ${validRoles.join(", ")}` 
    };
  }

  return { isValid: true };
}

/**
 * Middleware para validar creación de usuario
 */
export const validateUserCreation = (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Validar nombre
  const nameValidation = validateName(name);
  if (!nameValidation.isValid) {
    return res.status(400).json({ message: nameValidation.error });
  }

  // Validar email
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: "El email no tiene un formato válido" });
  }

  if (email.length > 255) {
    return res.status(400).json({ message: "El email es demasiado largo" });
  }

  // Validar contraseña
  if (!password || typeof password !== "string") {
    return res.status(400).json({ message: "La contraseña es obligatoria" });
  }

  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      message: "La contraseña no cumple con los requisitos de seguridad",
      requirements: passwordValidation.errors,
    });
  }

  // Validar rol
  const roleValidation = validateRole(role);
  if (!roleValidation.isValid) {
    return res.status(400).json({ message: roleValidation.error });
  }

  // Sanitización
  req.body.name = nameValidation.value || name.trim();
  req.body.email = email.trim().toLowerCase();
  req.body.role = role.trim().toLowerCase();

  next();
};

/**
 * Middleware para validar login de usuario
 */
export const validateUserLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ message: "El email es obligatorio" });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "El email no tiene un formato válido" });
  }

  if (!password || typeof password !== "string" || password.trim().length === 0) {
    return res.status(400).json({ message: "La contraseña es obligatoria" });
  }

  // No revelar si el email existe o no (prevenir user enumeration)
  req.body.email = email.trim().toLowerCase();

  next();
};

export const validateUserUpdate = (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ message: "El nombre debe ser un texto válido" });
    }
    req.body.name = name.trim();
  }

  if (email !== undefined) {
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "El email no tiene un formato válido" });
    }
    req.body.email = email.trim().toLowerCase();
  }

  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
    }
  }

  if (role !== undefined) {
    if (!["alumno", "profesor"].includes(role)) {
      return res.status(400).json({ message: "El rol debe ser 'alumno' o 'profesor'" });
    }
    req.body.role = role.trim();
  }

  next();
};

export const validateMateria = (req, res, next) => {
  const { nombre, profesor_id } = req.body;

  if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
    return res.status(400).json({ message: "El nombre de la materia es obligatorio" });
  }

  if (!profesor_id || !uuidRegex.test(profesor_id)) {
    return res.status(400).json({ message: "El profesor_id debe ser un UUID válido" });
  }

  req.body.nombre = nombre.trim();

  next();
};

export const validateCursan = (req, res, next) => {
  const { alumno_id, materia_id } = req.body;

  if (!alumno_id || !uuidRegex.test(alumno_id)) {
    return res.status(400).json({ message: "El alumno_id debe ser un UUID válido" });
  }

  if (!materia_id || !uuidRegex.test(materia_id)) {
    return res.status(400).json({ message: "El materia_id debe ser un UUID válido" });
  }

  next();
};

export const validateDictan = (req, res, next) => {
  const { profesor_id } = req.body;

  if (!profesor_id || !uuidRegex.test(profesor_id)) {
    return res.status(400).json({ message: "El profesor_id debe ser un UUID válido" });
  }

  next();
};
