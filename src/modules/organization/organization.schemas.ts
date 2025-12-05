import { z } from 'zod';

// Esquema para Departamentos
export const departmentSchema = z.object({
  name: z.string().min(2, { message: "El nombre del departamento debe tener al menos 2 caracteres" }),
  description: z.string().optional()
});

// Esquema para Cargos/Posiciones
export const positionSchema = z.object({
  name: z.string().min(2, { message: "El nombre del cargo debe tener al menos 2 caracteres" }),
  description: z.string().optional()
});