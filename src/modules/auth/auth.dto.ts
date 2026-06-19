export interface LoginDto {
  email:    string;
  password: string;
}

export interface RegisterDto {
  email:          string;
  password:       string;
  firstName:      string;
  middleName?:    string;
  lastName:       string;
  secondLastName?: string;
}

export interface AuthUserDto {
  id:        string;
  email:     string;
  role:      string;
  firstName: string;
  lastName:  string;
  tenantId:  string;
}

export interface AuthResponseDto {
  user:  AuthUserDto;
  token: string;
}
