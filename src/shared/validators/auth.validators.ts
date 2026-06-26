import { z } from 'zod';

export const loginSchema = z.object({
  // Acepta correo corporativo o número de documento (candidatos)
  email: z.string().min(1, { message: "El usuario es requerido" }),
  password: z.string().min(1, { message: "La contraseña es requerida" })
});

export const registerSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  firstName: z.string().min(2, { message: "El nombre es muy corto" }),
  lastName: z.string().min(2, { message: "El apellido es muy corto" }),
  // Campos opcionales si los hubiera
  middleName: z.string().optional(),
  secondLastName: z.string().optional()
});