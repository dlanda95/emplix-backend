import { z } from 'zod';

// z.str() acepta string | null | undefined — los campos del perfil llegan como null desde el frontend
const str = z.string().nullish();

const profileDataSchema = z.object({
  // Datos personales
  firstName:      str,
  middleName:     str,
  lastName:       str,
  secondLastName: str,
  birthDate:      str,
  gender:         str,
  maritalStatus:  str,
  nationality:    str,
  academicLevel:  str,
  birthCountry:   str,
  birthRegion:    str,
  birthDistrict:  str,
  licenseNumber:  str,
  documentType:   str,
  documentId:     str,
  personalEmail:  z.union([z.email(), z.literal(''), z.null()]).optional(),
  phone:          str,
  emergencyName:  str,
  emergencyPhone: str,
  // Dirección del documento de identidad
  docAddress:     str,
  docDistrict:    str,
  docDepartment:  str,
  docAddressRef:  str,
  // Domicilio actual
  address:         str,
  district:        str,
  province:        str,
  departmentdirec: str,
  addressRef:      str,
  // Financiero
  afpType:       str,
  afpEntity:     str,
  afpCommission: str,
  bankEntity:    str,
  bankAccount:   str,
  bankCci:       str,
  // Snapshot de valores anteriores (referencia para RRHH, ignorado al aplicar)
  _previous: z.record(z.string(), z.unknown()).optional(),
});

export const createRequestSchema = z.object({
  type:      z.enum(['VACATION', 'PERMIT', 'SICK_LEAVE', 'HOME_OFFICE', 'PROFILE_UPDATE']),
  reason:    z.string().nullish(),
  startDate: z.string().nullish(),
  endDate:   z.string().nullish(),
  data:      profileDataSchema.optional(),
});
