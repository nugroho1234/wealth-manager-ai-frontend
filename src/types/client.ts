/**
 * Client Management Types
 *
 * TypeScript interfaces for client and policy management
 */

export enum Gender {
  MALE = "Male",
  FEMALE = "Female",
  OTHER = "Other",
  PREFER_NOT_TO_SAY = "Prefer not to say"
}

export enum PremiumPeriod {
  MONTHLY = "monthly",
  YEARLY = "yearly",
  ONE_TIME = "one_time"
}

export enum PolicyStatus {
  ACTIVE = "active",
  LAPSED = "lapsed",
  EXPIRED = "expired",
  PENDING = "pending"
}

export interface Client {
  client_id: string;
  user_id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string; // ISO date string
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gender?: Gender | null;
  occupation?: string | null;
  national_id?: string | null;
  preferred_language?: string;
  tags?: string[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
  last_interaction_at?: string | null;
}

export interface ClientWithPolicies extends Client {
  total_policies: number;
  active_policies: number;
  total_monthly_premium?: number | null;
  total_yearly_premium?: number | null;
  total_coverage?: number | null;
}

export interface ClientListItem {
  client_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  date_of_birth: string;
  tags?: string[];
  total_policies: number;
  active_policies: number;
  total_monthly_premium?: number | null;
  created_at: string;
  last_interaction_at?: string | null;
}

export interface ClientCreateData {
  first_name: string;
  last_name: string;
  date_of_birth: string; // ISO date string
  email?: string;
  phone?: string;
  address?: string;
  gender?: Gender;
  occupation?: string;
  national_id?: string;
  preferred_language?: string;
  tags?: string[];
  notes?: string;
}

export interface ClientUpdateData {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  email?: string;
  phone?: string;
  address?: string;
  gender?: Gender;
  occupation?: string;
  national_id?: string;
  preferred_language?: string;
  tags?: string[];
  notes?: string;
}

export interface ClientPolicy {
  policy_id: string;
  client_id: string;
  insurance_id: string;
  policy_number?: string | null;
  active_date: string; // ISO date string
  renewal_date?: string | null;
  expiry_date?: string | null;
  premium_amount?: number | null;
  premium_period: PremiumPeriod;
  currency?: string;
  coverage_amount?: number | null;
  policy_status: PolicyStatus;
  policy_document_url?: string | null;
  policy_document_filename?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface ClientPolicyWithInsurance extends ClientPolicy {
  insurance_name: string;
  provider: string;
  category?: string | null;
  insurances?: {
    insurance_name: string;
    provider: string;
    category?: string | null;
  };
}

export interface ClientPolicyCreateData {
  insurance_id: string;
  policy_number?: string;
  active_date: string;
  renewal_date?: string;
  expiry_date?: string;
  premium_amount?: number;
  premium_period: PremiumPeriod;
  currency?: string;
  coverage_amount?: number;
  policy_status?: PolicyStatus;
}

export interface ClientPolicyUpdateData {
  insurance_id?: string;
  policy_number?: string;
  active_date?: string;
  renewal_date?: string;
  expiry_date?: string;
  premium_amount?: number;
  premium_period?: PremiumPeriod;
  currency?: string;
  coverage_amount?: number;
  policy_status?: PolicyStatus;
}

export interface ClientSearchParams {
  search?: string;
  tags?: string;
  has_policies?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ClientListResponse {
  success: boolean;
  message: string;
  data: {
    clients: ClientListItem[];
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ClientResponse {
  success: boolean;
  message: string;
  data: ClientWithPolicies;
}

export interface PolicyListResponse {
  success: boolean;
  message: string;
  data: {
    policies: ClientPolicyWithInsurance[];
  };
}

export interface PolicyResponse {
  success: boolean;
  message: string;
  data: ClientPolicy;
}

export interface PolicyDocumentUploadResponse {
  success: boolean;
  message: string;
  data: {
    policy_id: string;
    policy_document_url: string;
    policy_document_filename: string;
  };
}
