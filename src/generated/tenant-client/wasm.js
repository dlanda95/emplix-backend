
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.SystemUserTypeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  permissions: 'permissions',
  color: 'color',
  isSystem: 'isSystem',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  provider: 'provider',
  providerId: 'providerId',
  role: 'role',
  firstName: 'firstName',
  lastName: 'lastName',
  isActive: 'isActive',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  systemUserTypeId: 'systemUserTypeId'
};

exports.Prisma.PasswordResetTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tokenHash: 'tokenHash',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.DepartmentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  description: 'description',
  areaType: 'areaType',
  isActive: 'isActive',
  parentId: 'parentId',
  leaderId: 'leaderId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PositionScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  hierarchyLevel: 'hierarchyLevel',
  roleType: 'roleType',
  isActive: 'isActive',
  departmentId: 'departmentId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContractTypeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  hasBenefits: 'hasBenefits',
  isLaboral: 'isLaboral'
};

exports.Prisma.WorkShiftScalarFieldEnum = {
  id: 'id',
  name: 'name',
  isFiscalized: 'isFiscalized',
  startTime: 'startTime',
  endTime: 'endTime',
  breakTime: 'breakTime',
  tolerance: 'tolerance',
  allowsOvertime: 'allowsOvertime'
};

exports.Prisma.SelectionProcessScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  status: 'status',
  openedAt: 'openedAt',
  closedAt: 'closedAt',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  departmentId: 'departmentId',
  positionId: 'positionId'
};

exports.Prisma.SelectionProcessApproverScalarFieldEnum = {
  id: 'id',
  selectionProcessId: 'selectionProcessId',
  employeeId: 'employeeId',
  order: 'order',
  createdAt: 'createdAt'
};

exports.Prisma.EmployeeScalarFieldEnum = {
  id: 'id',
  firstName: 'firstName',
  middleName: 'middleName',
  lastName: 'lastName',
  secondLastName: 'secondLastName',
  birthDate: 'birthDate',
  documentId: 'documentId',
  gender: 'gender',
  maritalStatus: 'maritalStatus',
  nationality: 'nationality',
  academicLevel: 'academicLevel',
  birthCountry: 'birthCountry',
  birthRegion: 'birthRegion',
  birthDistrict: 'birthDistrict',
  licenseNumber: 'licenseNumber',
  documentType: 'documentType',
  onboardingStatus: 'onboardingStatus',
  personalEmail: 'personalEmail',
  phone: 'phone',
  cellPhone: 'cellPhone',
  address: 'address',
  district: 'district',
  province: 'province',
  departmentdirec: 'departmentdirec',
  addressRef: 'addressRef',
  docAddress: 'docAddress',
  docDistrict: 'docDistrict',
  docDepartment: 'docDepartment',
  docAddressRef: 'docAddressRef',
  emergencyName: 'emergencyName',
  emergencyPhone: 'emergencyPhone',
  emergencyRel: 'emergencyRel',
  afpType: 'afpType',
  afpEntity: 'afpEntity',
  afpCommission: 'afpCommission',
  bankEntity: 'bankEntity',
  bankAccount: 'bankAccount',
  bankCci: 'bankCci',
  status: 'status',
  hireDate: 'hireDate',
  userId: 'userId',
  departmentId: 'departmentId',
  positionId: 'positionId',
  supervisorId: 'supervisorId',
  selectionProcessId: 'selectionProcessId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CandidateApprovalScalarFieldEnum = {
  id: 'id',
  selectionProcessId: 'selectionProcessId',
  candidateId: 'candidateId',
  approverId: 'approverId',
  approverType: 'approverType',
  status: 'status',
  comment: 'comment',
  decidedAt: 'decidedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmployeeLaborDataScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  contractTypeId: 'contractTypeId',
  workShiftId: 'workShiftId',
  hierarchyLevel: 'hierarchyLevel',
  startDate: 'startDate',
  endDate: 'endDate',
  salary: 'salary',
  currency: 'currency'
};

exports.Prisma.AttendanceScalarFieldEnum = {
  id: 'id',
  date: 'date',
  checkIn: 'checkIn',
  checkOut: 'checkOut',
  source: 'source',
  status: 'status',
  hoursWorked: 'hoursWorked',
  isManual: 'isManual',
  editedBy: 'editedBy',
  editReason: 'editReason',
  employeeId: 'employeeId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RequestScalarFieldEnum = {
  id: 'id',
  type: 'type',
  status: 'status',
  startDate: 'startDate',
  endDate: 'endDate',
  reason: 'reason',
  data: 'data',
  employeeId: 'employeeId',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KudoScalarFieldEnum = {
  id: 'id',
  message: 'message',
  categoryCode: 'categoryCode',
  senderId: 'senderId',
  receiverId: 'receiverId',
  createdAt: 'createdAt'
};

exports.Prisma.DocumentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  originalName: 'originalName',
  mimeType: 'mimeType',
  size: 'size',
  path: 'path',
  type: 'type',
  isPublic: 'isPublic',
  employeeId: 'employeeId',
  uploadedBy: 'uploadedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EducationScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  level: 'level',
  institution: 'institution',
  program: 'program',
  startYear: 'startYear',
  endYear: 'endYear',
  status: 'status',
  country: 'country',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FamilyMemberScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  firstName: 'firstName',
  lastName: 'lastName',
  relationship: 'relationship',
  documentType: 'documentType',
  documentId: 'documentId',
  birthDate: 'birthDate',
  phone: 'phone',
  isDependent: 'isDependent',
  isHeir: 'isHeir',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HRCandidateAnalysisScalarFieldEnum = {
  id: 'id',
  selectionProcessId: 'selectionProcessId',
  candidateId: 'candidateId',
  professionalSummary: 'professionalSummary',
  strengths: 'strengths',
  improvementAreas: 'improvementAreas',
  interviewResults: 'interviewResults',
  competencyEvaluation: 'competencyEvaluation',
  identifiedRisks: 'identifiedRisks',
  recommendation: 'recommendation',
  recommendationNotes: 'recommendationNotes',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HRAnalysisDocumentScalarFieldEnum = {
  id: 'id',
  analysisId: 'analysisId',
  name: 'name',
  originalName: 'originalName',
  mimeType: 'mimeType',
  size: 'size',
  path: 'path',
  uploadedById: 'uploadedById',
  createdAt: 'createdAt'
};

exports.Prisma.TenantDomainScalarFieldEnum = {
  id: 'id',
  domain: 'domain',
  label: 'label',
  isPrimary: 'isPrimary',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.Provider = exports.$Enums.Provider = {
  LOCAL: 'LOCAL',
  MICROSOFT: 'MICROSOFT',
  GOOGLE: 'GOOGLE'
};

exports.UserRole = exports.$Enums.UserRole = {
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  HR_ANALYST: 'HR_ANALYST',
  AREA_MANAGER: 'AREA_MANAGER',
  EMPLOYEE: 'EMPLOYEE'
};

exports.AreaType = exports.$Enums.AreaType = {
  TRANSVERSAL: 'TRANSVERSAL',
  EMISSIVE: 'EMISSIVE',
  RECEPTIVE: 'RECEPTIVE'
};

exports.RoleType = exports.$Enums.RoleType = {
  OPERATIONAL: 'OPERATIONAL',
  TACTICAL: 'TACTICAL',
  STRATEGIC: 'STRATEGIC'
};

exports.SelectionProcessStatus = exports.$Enums.SelectionProcessStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED'
};

exports.EmployeeStatus = exports.$Enums.EmployeeStatus = {
  SELECTED: 'SELECTED',
  ACTIVE: 'ACTIVE',
  TERMINATED: 'TERMINATED',
  ON_LEAVE: 'ON_LEAVE'
};

exports.AttendanceSource = exports.$Enums.AttendanceSource = {
  BIOMETRIC: 'BIOMETRIC',
  MOBILE_APP: 'MOBILE_APP',
  WEB_PORTAL: 'WEB_PORTAL',
  SYSTEM_AUTO: 'SYSTEM_AUTO',
  MANUAL_HR: 'MANUAL_HR'
};

exports.AttendanceStatus = exports.$Enums.AttendanceStatus = {
  PENDING: 'PENDING',
  PRESENT_ON_TIME: 'PRESENT_ON_TIME',
  LATE: 'LATE',
  ABSENT_JUSTIFIED: 'ABSENT_JUSTIFIED',
  ABSENT_UNJUSTIFIED: 'ABSENT_UNJUSTIFIED',
  VACATION: 'VACATION',
  MEDICAL_LEAVE: 'MEDICAL_LEAVE',
  HOLIDAY: 'HOLIDAY',
  DAY_OFF: 'DAY_OFF'
};

exports.RequestType = exports.$Enums.RequestType = {
  VACATION: 'VACATION',
  PERMIT: 'PERMIT',
  SICK_LEAVE: 'SICK_LEAVE',
  HOME_OFFICE: 'HOME_OFFICE',
  PROFILE_UPDATE: 'PROFILE_UPDATE'
};

exports.RequestStatus = exports.$Enums.RequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

exports.DocumentType = exports.$Enums.DocumentType = {
  AVATAR: 'AVATAR',
  CONTRACT: 'CONTRACT',
  ID_CARD: 'ID_CARD',
  CERTIFICATION: 'CERTIFICATION',
  MEDICAL: 'MEDICAL',
  OTHER: 'OTHER'
};

exports.FamilyRelationship = exports.$Enums.FamilyRelationship = {
  FATHER: 'FATHER',
  MOTHER: 'MOTHER',
  GUARDIAN: 'GUARDIAN',
  SPOUSE: 'SPOUSE',
  PARTNER: 'PARTNER',
  SON: 'SON',
  DAUGHTER: 'DAUGHTER',
  SIBLING: 'SIBLING',
  DEPENDENT: 'DEPENDENT',
  HEIR: 'HEIR',
  OTHER: 'OTHER'
};

exports.HRRecommendation = exports.$Enums.HRRecommendation = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  CONDITIONALLY_APPROVED: 'CONDITIONALLY_APPROVED',
  REJECTED: 'REJECTED'
};

exports.Prisma.ModelName = {
  SystemUserType: 'SystemUserType',
  User: 'User',
  PasswordResetToken: 'PasswordResetToken',
  Department: 'Department',
  Position: 'Position',
  ContractType: 'ContractType',
  WorkShift: 'WorkShift',
  SelectionProcess: 'SelectionProcess',
  SelectionProcessApprover: 'SelectionProcessApprover',
  Employee: 'Employee',
  CandidateApproval: 'CandidateApproval',
  EmployeeLaborData: 'EmployeeLaborData',
  Attendance: 'Attendance',
  Request: 'Request',
  Kudo: 'Kudo',
  Document: 'Document',
  Education: 'Education',
  FamilyMember: 'FamilyMember',
  HRCandidateAnalysis: 'HRCandidateAnalysis',
  HRAnalysisDocument: 'HRAnalysisDocument',
  TenantDomain: 'TenantDomain'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
