import { UserRole } from '../../generated/tenant-client';

export type TimelineEventType =
  | 'contratacion'
  | 'cambio-area'
  | 'cambio-puesto'
  | 'promocion'
  | 'cambio-contrato'
  | 'estado-actual';

export interface TimelineEventDetail {
  label: string;
  value: string;
}

export interface TimelineEventDto {
  id:           string;
  type:         TimelineEventType;
  date:         string;
  title:        string;
  description?: string;
  icon:         string;
  isCurrent:    boolean;
  details:      TimelineEventDetail[];
}

export interface CreateEmployeeDto {
  email:         string;
  firstName:     string;
  lastName:      string;
  documentId?:   string;
  hireDate:      string | Date;
  role?:         UserRole;
  birthDate?:    string | Date;
  departmentId?: string;
  positionId?:   string;
  supervisorId?: string;
}

export interface AssignAdminDataDto {
  departmentId?:  string;
  positionId?:    string;
  supervisorId?:  string;
  contractType?:  string;
  workShiftId?:   string;
  salary?:        number;
  startDate?:     string | Date;
}

export interface EmployeeResponseDto {
  id:        string;
  firstName: string;
  lastName:  string;
  photoUrl?: string | null;
}
