import { z } from 'zod';

const AREA_TYPES  = ['TRANSVERSAL', 'EMISSIVE', 'RECEPTIVE'] as const;
const ROLE_TYPES  = ['OPERATIONAL', 'TACTICAL', 'STRATEGIC'] as const;

// ── Áreas / Subáreas ────────────────────────────────────────────────────────

export const areaSchema = z.object({
  name:        z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  code:        z.string().optional().nullable(),
  areaType:    z.enum(AREA_TYPES).optional(),
  isActive:    z.boolean().optional(),
});

export const subareaSchema = z.object({
  name:        z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  areaType:    z.enum(AREA_TYPES).optional(),
  isActive:    z.boolean().optional(),
});

// ── Cargos ──────────────────────────────────────────────────────────────────

export const positionSchema = z.object({
  name:           z.string().min(2, 'El nombre del cargo es requerido'),
  description:    z.string().optional(),
  departmentId:   z.string().uuid('ID de área inválido').optional().nullable(),
  hierarchyLevel: z.number().int().min(1).max(20).optional(),
  roleType:       z.enum(ROLE_TYPES).optional(),
  isActive:       z.boolean().optional(),
});

// Retrocompatibilidad (usado desde candidatos/empleados)
export const departmentSchema = areaSchema;
