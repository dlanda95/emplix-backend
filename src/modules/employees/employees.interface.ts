import { SystemRole ,ContractType} from '@prisma/client';

// DTO para Crear Empleado
export interface CreateEmployeeDTO {
  email: string;
  firstName: string;
  lastName: string;
  documentId: string;
  hireDate: string | Date;
  role?: SystemRole;
  birthDate?: string | Date;
  departmentId?: string;
  positionId?: string;
  supervisorId?: string;
}

// DTO para Asignación Administrativa
export interface AssignAdminDataDTO {
  departmentId?: string;
  positionId?: string;
  supervisorId?: string;

 contractType?: string; // Ahora es un UUID (string), no el Enum
  workShiftId?: string;
  salary?: number;
  startDate?: string | Date; // Vigencia de estas condiciones
}

// Interfaz de Respuesta (Lo que devuelve el API)
export interface EmployeeResponse {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  // ... otros campos que quieras exponer
}



// DTO para Subir Documentos
export interface UploadDocumentDTO {
  type: string; // 'CONTRACT', 'ID_CARD', etc.
}