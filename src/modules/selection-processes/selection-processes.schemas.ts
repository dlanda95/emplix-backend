import { z } from 'zod';

export const createSelectionProcessSchema = z.object({
  description:  z.string().max(500).optional(),
  departmentId: z.string().uuid('Debe seleccionar un área válida'),
  positionId:   z.string().uuid('Debe seleccionar el puesto al que se postula'),
  approverIds:  z.array(z.string().uuid())
    .min(1, 'Debe agregar al menos 1 aprobador')
    .max(5, 'Máximo 5 aprobadores permitidos'),
});

export const updateSelectionProcessSchema = z.object({
  description:  z.string().max(500).nullable().optional(),
  status:       z.enum(['OPEN', 'CLOSED', 'CANCELLED']).optional(),
  departmentId: z.string().uuid().optional(),
  positionId:   z.string().uuid().optional(),
  approverIds:  z.array(z.string().uuid()).min(1).max(5).optional(),
});

export const listSelectionProcessesSchema = z.object({
  page:   z.coerce.number().min(1).default(1),
  limit:  z.coerce.number().min(1).max(100).default(25),
  status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']).optional(),
  search: z.string().optional(),
});
