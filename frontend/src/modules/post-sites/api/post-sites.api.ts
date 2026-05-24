import api, { type PaginatedResult } from '../../../api/client';

export interface PostSite {
  site_id:         number;
  client_id:       number;
  client_name:     string;
  name:            string;
  location:        string;
  guards_required: number;
  shift_details:   string | null;
  supervisor_name: string | null;
  risk_level:      'low' | 'medium' | 'high';
  instructions:    string | null;
  status:          'active' | 'inactive';
  created_at:      string;
  active_assignments?: any[];
}

export interface PostSiteFilters {
  page?: number; limit?: number;
  client_id?: number; risk_level?: string; status?: string; search?: string;
}

export const postSitesApi = {
  list:       (params?: PostSiteFilters)           => api.get<PaginatedResult<PostSite>>('/v1/post-sites', { params }),
  getById:    (id: number)                         => api.get<PostSite>(`/v1/post-sites/${id}`),
  create:     (body: Partial<PostSite>)            => api.post<PostSite>('/v1/post-sites', body),
  update:     (id: number, body: Partial<PostSite>) => api.patch<PostSite>(`/v1/post-sites/${id}`, body),
  deactivate: (id: number)                         => api.delete(`/v1/post-sites/${id}`),
};
