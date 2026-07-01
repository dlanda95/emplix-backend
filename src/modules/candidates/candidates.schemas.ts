import { z } from 'zod';

export const createCandidateSchema = z.object({
  firstName:    z.string().min(1, 'El nombre es requerido'),
  lastName:     z.string().min(1, 'El apellido es requerido'),
  middleName:   z.string().optional(),
  documentType: z.enum(['DNI', 'CE', 'PASSPORT']),
  documentId:   z.string().min(1, 'El número de documento es requerido'),
  hireDate:     z.string().min(1, 'La fecha de ingreso es requerida'),
  positionId:   z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

export const hrDataSchema = z.object({
  departmentId: z.string().uuid().nullable().optional(),
  positionId:   z.string().uuid().nullable().optional(),
  supervisorId: z.string().uuid().nullable().optional(),
});
