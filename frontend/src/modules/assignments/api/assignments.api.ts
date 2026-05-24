import api, { type PaginatedResult } from '../../../api/client';

export interface Assignment {
  assignment_id: number;
  guard_id:      number;
  client_id:     number;
  site_id:       number;
  guard_name:    string;
  guard_phone:   string;
  client_name:   string;
  site_name:     string;
  shift:         string;
  start_date:    string;
  end_date:      string | null;
  status:        'active' | 'completed' | 'cancelled';
  notes:         string | null;
  created_at:    string;
  history?:      { action: string; changed_by_name: string; changed_at: string; notes: string }[];
}

export interface AssignmentFilters {
  page?: number; limit?: number;
  guard_id?: number; client_id?: number; site_id?: number; status?: string; search?: string;
}

export const assignmentsApi = {
  list:    (params?: AssignmentFilters) => api.get<PaginatedResult<Assignment>>('/v1/assignments', { params }),
  getById: (id: number)                 => api.get<Assignment>(`/v1/assignments/${id}`),
  create:  (body: {
    guard_id: number; client_id: number; site_id: number;
    shift: string; start_date: string; end_date?: string; notes?: string;
  })                                    => api.post<Assignment>('/v1/assignments', body),
  end:     (id: number, notes?: string) => api.patch<Assignment>(`/v1/assignments/${id}/end`, { notes }),
  cancel:  (id: number, notes?: string) => api.patch<Assignment>(`/v1/assignments/${id}/cancel`, { notes }),
};
