export interface PermissionSet {
  canRead:          boolean;
  canCreate:        boolean;
  canEdit:          boolean;
  canDelete:        boolean;
  canApprove:       boolean;
  canManageConfig:  boolean;
  canManageUsers:   boolean;
}

export const DEFAULT_PERMISSIONS: PermissionSet = {
  canRead:         false,
  canCreate:       false,
  canEdit:         false,
  canDelete:       false,
  canApprove:      false,
  canManageConfig: false,
  canManageUsers:  false,
};

export const SYSTEM_TYPE_DEFAULTS: Record<string, PermissionSet> = {
  admin: {
    canRead: true, canCreate: true, canEdit: true, canDelete: true,
    canApprove: true, canManageConfig: true, canManageUsers: true,
  },
  reader: {
    canRead: true, canCreate: false, canEdit: false, canDelete: false,
    canApprove: false, canManageConfig: false, canManageUsers: false,
  },
  support: {
    canRead: true, canCreate: false, canEdit: true, canDelete: false,
    canApprove: true, canManageConfig: true, canManageUsers: false,
  },
};

export interface CreateSystemUserTypeDto {
  name:        string;
  slug:        string;
  description?: string;
  permissions: PermissionSet;
  color?:      string;
}

export interface UpdateSystemUserTypeDto {
  name?:        string;
  description?: string;
  permissions?: PermissionSet;
  color?:       string;
  isActive?:    boolean;
}
