export type UserRole = 'ROLE_ADMIN' | 'ROLE_PHARMACIEN' | 'ROLE_EMPLOYEE';

export interface Role {
  id?: number;
  nom: string;
}

export interface User {
  id?: number;
  email: string;
  username: string;
  password?: string;
  role?: UserRole | Role | string;
  roles?: Role[];
  isActive: boolean;
}
