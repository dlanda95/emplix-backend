import { PrismaClient } from '../../generated/tenant-client';
import { AppError } from '../../shared/middlewares/error.middleware';

// Campos que un candidato (SELECTED) puede actualizar directamente durante el onboarding.
// No requiere aprobación de RRHH — es la carga inicial de su expediente.
const ONBOARDING_FIELDS = new Set([
  'firstName', 'middleName', 'lastName', 'secondLastName',
  'documentType', 'documentId',
  'birthDate', 'gender', 'maritalStatus', 'nationality', 'academicLevel',
  'birthCountry', 'birthRegion', 'birthDistrict',
  'licenseNumber',
  'address', 'district', 'province', 'departmentdirec', 'addressRef',
  'docAddress', 'docDistrict', 'docDepartment', 'docAddressRef',
  'personalEmail', 'phone', 'cellPhone',
  'emergencyName', 'emergencyPhone', 'emergencyRel',
  'afpType', 'afpEntity', 'afpCommission',
  'bankEntity', 'bankAccount', 'bankCci',
]);

export class OnboardingService {

  async getProfile(userId: string, db: PrismaClient) {
    const employee = await db.employee.findUnique({
      where:   { userId },
      include: {
        position:     { select: { name: true } },
        department:   { select: { name: true } },
        familyMembers:true,
        educations:   true,
        documents:    { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!employee) throw new AppError('Perfil de onboarding no encontrado.', 404);
    if (employee.status !== 'SELECTED') throw new AppError('Acceso denegado.', 403, 'NOT_CANDIDATE');
    return employee;
  }

  async saveData(userId: string, data: Record<string, unknown>, db: PrismaClient) {
    const employee = await db.employee.findUnique({ where: { userId } });
    if (!employee) throw new AppError('Empleado no encontrado.', 404);
    if (employee.status !== 'SELECTED') throw new AppError('Acceso denegado.', 403, 'NOT_CANDIDATE');
    if (employee.onboardingStatus === 'DOCS_SUBMITTED') {
      throw new AppError('Ya has enviado tu documentación. No puedes modificarla.', 400, 'ALREADY_SUBMITTED');
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!ONBOARDING_FIELDS.has(key)) continue;

      if (key === 'birthDate') {
        if (typeof value === 'string' && value.trim() !== '') {
          const d = new Date(value);
          patch[key] = isNaN(d.getTime()) ? null : d;
        } else {
          patch[key] = null;
        }
        continue;
      }

      // Strings vacíos → null (evita guardar "" en BD)
      patch[key] = (value === '' || value === undefined) ? null : value;
    }

    if (Object.keys(patch).length === 0) throw new AppError('Sin campos válidos.', 400);

    return db.employee.update({
      where:   { userId },
      data:    patch,
      include: { position: true, department: true },
    });
  }

  async submit(userId: string, db: PrismaClient) {
    const employee = await db.employee.findUnique({ where: { userId } });
    if (!employee) throw new AppError('Empleado no encontrado.', 404);
    if (employee.status !== 'SELECTED') throw new AppError('Acceso denegado.', 403, 'NOT_CANDIDATE');
    if (employee.onboardingStatus === 'DOCS_SUBMITTED') {
      throw new AppError('La documentación ya fue enviada.', 400, 'ALREADY_SUBMITTED');
    }

    // Validar campos mínimos obligatorios
    const required: (keyof typeof employee)[] = ['firstName', 'lastName', 'documentId', 'documentType'];
    const missing = required.filter(f => !employee[f]);
    if (missing.length > 0) {
      throw new AppError(`Faltan datos obligatorios: ${missing.join(', ')}.`, 400, 'MISSING_REQUIRED_FIELDS');
    }

    return db.employee.update({
      where: { userId },
      data:  { onboardingStatus: 'DOCS_SUBMITTED' },
    });
  }
}
