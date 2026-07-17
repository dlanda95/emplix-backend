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

// ── Reglas de validación por tipo de documento (Perú) ─────────────────────────
const DOC_RULES = {
  DNI:       { pattern: /^\d{8}$/,             message: 'El DNI debe contener exactamente 8 dígitos numéricos.' },
  CE:        { pattern: /^[A-Za-z0-9]{5,15}$/, message: 'El Carnet de Extranjería debe tener entre 5 y 15 caracteres alfanuméricos.' },
  PASAPORTE: { pattern: /^[A-Za-z0-9]{6,20}$/, message: 'El Pasaporte debe tener entre 6 y 20 caracteres alfanuméricos.' },
  PTP:       { pattern: /^[A-Za-z0-9]{5,15}$/, message: 'El PTP debe tener entre 5 y 15 caracteres alfanuméricos.' },
} as const;

export const createCandidateSchema = z.object({
  firstName:     z.string().min(1, 'El nombre es requerido').max(80),
  lastName:      z.string().min(1, 'El apellido es requerido').max(80),
  middleName:    z.string().max(80).optional(),
  documentType:  z.enum(['DNI', 'CE', 'PASAPORTE', 'PTP'] as const, {
    message: 'Tipo de documento no válido. Use: DNI, CE, PASAPORTE o PTP.',
  }),
  documentId:    z.string().min(1, 'El número de documento es requerido').max(25),
  personalEmail: z.string().email('El correo personal no tiene un formato válido.'),
  hireDate:      dateInRange('La fecha de ingreso'),
  positionId:          z.string().uuid().optional(),
  departmentId:        z.string().uuid().optional(),
  selectionProcessId:  z.string().uuid().optional(),
}).superRefine((data, ctx) => {
  const rule = DOC_RULES[data.documentType as keyof typeof DOC_RULES];
  if (rule && !rule.pattern.test(data.documentId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: rule.message, path: ['documentId'] });
  }
});

export const hrDataSchema = z.object({
  departmentId: z.string().uuid().nullable().optional(),
  positionId:   z.string().uuid().nullable().optional(),
  supervisorId: z.string().uuid().nullable().optional(),
});
