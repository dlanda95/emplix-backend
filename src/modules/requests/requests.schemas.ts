import { z } from 'zod';

const profileDataSchema = z.object({
  // Datos personales
  firstName:      z.string().optional(),
  middleName:     z.string().optional(),
  lastName:       z.string().optional(),
  secondLastName: z.string().optional(),
  birthDate:      z.string().optional(),
  gender:         z.string().optional(),
  maritalStatus:  z.string().optional(),
  nationality:    z.string().optional(),
  academicLevel:  z.string().optional(),
  birthCountry:   z.string().optional(),
  birthRegion:    z.string().optional(),
  birthDistrict:  z.string().optional(),
  licenseNumber:  z.string().optional(),
  documentType:   z.string().optional(),
  documentId:     z.string().optional(),
  personalEmail:  z.union([z.email(), z.literal('')]).optional(),
  phone:          z.string().optional(),
  emergencyName:  z.string().optional(),
  emergencyPhone: z.string().optional(),
  // Dirección del documento de identidad
  docAddress:     z.string().optional(),
  docDistrict:    z.string().optional(),
  docDepartment:  z.string().optional(),
  docAddressRef:  z.string().optional(),
  // Domicilio actual
  address:         z.string().optional(),
  district:        z.string().optional(),
  province:        z.string().optional(),
  departmentdirec: z.string().optional(),
  addressRef:      z.string().optional(),
  // Financiero
  afpType:       z.string().optional(),
  afpEntity:     z.string().optional(),
  afpCommission: z.string().optional(),
  bankEntity:    z.string().optional(),
  bankAccount:   z.string().optional(),
  bankCci:       z.string().optional(),
  // Snapshot de valores anteriores (referencia para RRHH, ignorado al aplicar)
  _previous:     z.record(z.string(), z.unknown()).optional(),
});

export const createRequestSchema = z.object({
  type:      z.enum(['VACATION', 'PERMIT', 'SICK_LEAVE', 'HOME_OFFICE', 'PROFILE_UPDATE']),
  reason:    z.string().optional(),
  startDate: z.string().optional(),
  endDate:   z.string().optional(),
  data:      profileDataSchema.optional(),
});
