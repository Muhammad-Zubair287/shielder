// ─── Admin Users Module — Shared Types ───────────────────────────────────────

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'STAFF';

export type UserStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION';

export interface UserProfile {
  fullName?: string | null;
  phoneNumber?: string | null;
  companyName?: string | null;
  avatarUrl?: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  profile?: UserProfile | null;
}

export interface UserPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserListResponse {
  success: boolean;
  data: AdminUser[];
  pagination: UserPagination;
}

export interface UserDetailResponse {
  success: boolean;
  data: AdminUser;
}

export interface UserCreatePayload {
  email: string;
  password: string;
  fullName?: string;
  phoneNumber?: string;
  companyName?: string;
}

export interface UserUpdatePayload {
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  companyName?: string;
  status?: UserStatus;
}

export type UserFilters = {
  search: string;
  status: string;
};
