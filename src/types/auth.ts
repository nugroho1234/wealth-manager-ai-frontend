export interface User {
  id: string;  // Backend returns UUID as string
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: UserRole;  // Backend returns role as string, not object
  company_id: string | null;  // Backend returns UUID as string
  company?: Company;
  is_profile_complete: boolean;  // Backend uses this field name
  created_at: string;
  updated_at: string | null;
}

export interface Role {
  id: number;
  name: string;
  permissions: string[];
  hierarchy_level: number;
  description: string | null;
}

export interface Company {
  id: number;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  brand_colors: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface OTPRequest {
  email: string;
}

export interface OTPVerification {
  email: string;
  otp_code: string;
}

export interface OTPResponse {
  message: string;
  expires_in?: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface ApiError {
  detail: string;
  status_code: number;
  error_type?: string;
}

export enum UserRole {
  MASTER = 'MASTER',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  ADVISOR = 'ADVISOR',
  LEADER_1 = 'LEADER_1',
  LEADER_2 = 'LEADER_2',
  SENIOR_PARTNER = 'SENIOR_PARTNER'
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_id?: number;
}