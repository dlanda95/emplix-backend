import { z } from 'zod';

const dateInRange = (label: string, allowFuture = true) =>
  z.string()
    .min(1, `${label} es requerida`)
    .refine(val => {
      const d = new Date(val);
      if (isNaN(d.getTime())) return false;
      const y = d.getFullYear();
      return y >= 1900 && y <= 2100;
    }, `${label}: el año debe estar entre 1900 y 2100`)
    .refine(val => {
      if (allowFuture) return true;
      return new Date(val) <= new Date();
    }, `${label} no puede ser una fecha futura`);

export const createEmployeeSchema = z.object({
  email:         z.string().email('Email inválido'),
  firstName:     z.string().min(1, 'El nombre es requerido'),
  lastName:      z.string().min(1, 'El apellido es requerido'),
  documentId:    z.string().optional(),
  hireDate:      dateInRange('La fecha de ingreso'),
  birthDate:     dateInRange('La fecha de nacimiento', false).optional(),
  departmentId:  z.string().uuid().optional(),
  positionId:    z.string().uuid().optional(),
  supervisorId:  z.string().uuid().optional(),
  contractTypeId:z.string().uuid().optional(),
  workShiftId:   z.string().uuid().optional(),
  salary:        z.number().min(0).optional(),
  grantAccess:   z.boolean().optional(),
});

export const updateAssignmentSchema = z.object({
  departmentId:  z.string().uuid().nullable().optional(),
  positionId:    z.string().uuid().nullable().optional(),
  supervisorId:  z.string().uuid().nullable().optional(),
  contractType:  z.string().optional(),
  workShiftId:   z.string().uuid().nullable().optional(),
  salary:        z.number().min(0).optional(),
  startDate:     dateInRange('La fecha de inicio').optional(),
});
