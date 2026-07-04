import { UserRole } from '../../generated/tenant-client';

export interface CreateSystemUserDto {
  firstName:  string;
  lastName:   string;
  email:      string;
  role:       UserRole;
  password:   string;
}

export interface UpdateUserRoleDto {
  role: UserRole;
}

export interface UserListItemDto {
  id:         string;
  email:      string;
  role:       string;
  isActive:   boolean;
  createdAt:  string;
  employee: {
    id:         string;
    firstName:  string;
    lastName:   string;
    photoUrl?:  string | null;
    position?:  { name: string } | null;
    department?:{ name: string } | null;
  } | null;
}
