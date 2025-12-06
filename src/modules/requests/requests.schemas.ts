
import { z } from 'zod';

// Esquema para el payload de datos del perfil (JSON)
const profileDataSchema = z.object({
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  secondLastName: z.string().optional(),
  birthDate: z.string().optional(), // Recibimos string ISO
  personalEmail: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional()
});

// Esquema principal para crear una solicitud
export const createRequestSchema = z.object({
  type: z.enum(['VACATION', 'PERMIT', 'SICK_LEAVE', 'HOME_OFFICE', 'PROFILE_UPDATE']),
  reason: z.string().optional(),
  startDate: z.string().datetime().optional(), // Para vacaciones/permisos
  endDate: z.string().datetime().optional(),
  // 'data' es el JSON con los cambios de perfil
  data: profileDataSchema.optional()
});