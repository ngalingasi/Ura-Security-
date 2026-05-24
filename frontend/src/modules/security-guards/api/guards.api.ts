import api, { type PaginatedResult } from '../../../api/client';

export interface SecurityGuard {
  guard_id:              number;
  full_name:             string;
  phone:                 string;
  email:                 string | null;
  national_id:           string;
  address:               string | null;
  gender:                'male' | 'female';
  date_of_birth:         string | null;
  next_of_kin_name:      string | null;
  next_of_kin_phone:     string | null;
  next_of_kin_relation:  string | null;
  emergency_contact:     string | null;
  employment_date:       string | null;
  photo_url:             string | null;
  guard_status:          'active' | 'inactive' | 'suspended' | 'on_leave';
  notes:                 string | null;
  created_at:            string;
  current_assignment?:   { client_name: string; site_name: string; shift: string } | null;
  assignments?:          any[];
}

export interface GuardFilters {
  page?: number; limit?: number;
  guard_status?: string; gender?: string; search?: string;
}

export const guardsApi = {
  list:    (params?: GuardFilters)                    => api.get<PaginatedResult<SecurityGuard>>('/v1/security-guards', { params }),
  getById: (id: number)                               => api.get<SecurityGuard>(`/v1/security-guards/${id}`),
  create:  (body: Partial<SecurityGuard>)             => api.post<SecurityGuard>('/v1/security-guards', body),
  update:  (id: number, body: Partial<SecurityGuard>) => api.patch<SecurityGuard>(`/v1/security-guards/${id}`, body),
};
