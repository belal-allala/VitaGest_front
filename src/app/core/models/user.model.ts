export type UserRole = 'ROLE_ADMIN' | 'ROLE_PHARMACIEN' | 'ROLE_EMPLOYEE';

export interface Role {
  id?: number;
  nom: string;
}

export interface User {
  id?: number;
  username: string;
  email: string;
  role: Role;
  isActive?: boolean;
  password?: string;
}
