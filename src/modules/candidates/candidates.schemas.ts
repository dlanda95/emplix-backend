import { z } from 'zod';

const dateInRange = (label: string) =>
  z.string()
    .min(1, `${label} es requerida`)
    .refine(val => {
      const d = new Date(val);
      if (isNaN(d.getTime())) return false;
      const y = d.getFullYear();
      return y >= 1900 && y <= 2100;
    }, `${label}: el año debe estar entre 1900 y 2100`);

export const createCandidateSchema = z.object({
  firstName:    z.string().min(1, 'El nombre es requerido'),
  lastName:     z.string().min(1, 'El apellido es requerido'),
  middleName:   z.string().optional(),
  documentType: z.enum(['DNI', 'CE', 'PASSPORT']),
  documentId:   z.string().min(1, 'El número de documento es requerido'),
  hireDate:     dateInRange('La fecha de ingreso'),
  positionId:   z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

export const hrDataSchema = z.object({
  departmentId: z.string().uuid().nullable().optional(),
  positionId:   z.string().uuid().nullable().optional(),
  supervisorId: z.string().uuid().nullable().optional(),
});
