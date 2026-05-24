import api, { type PaginatedResult } from '../../../api/client';

export interface Client {
  client_id:          number;
  name:               string;
  contact_person:     string;
  email:              string | null;
  phone:              string;
  address:            string | null;
  region:             string;
  contract_number:    string | null;
  service_type:       string;
  guards_required:    number;
  contract_start:     string;
  contract_end:       string | null;
  emergency_name:     string | null;
  emergency_phone:    string | null;
  emergency_relation: string | null;
  status:             'active' | 'inactive' | 'pending' | 'expired';
  notes:              string | null;
  created_at:         string;
  sites?:             { site_id: number; name: string; status: string }[];
}

export interface ClientMeta {
  regions:       { region_id: number; name: string }[];
  service_types: { type_id: number; name: string }[];
}

export interface ClientFilters {
  page?: number; limit?: number;
  status?: string; region?: string; service_type?: string; search?: string;
}

export const clientsApi = {
  getMeta:    ()                              => api.get<ClientMeta>('/v1/clients/meta'),
  list:       (params?: ClientFilters)        => api.get<PaginatedResult<Client>>('/v1/clients', { params }),
  getById:    (id: number)                    => api.get<Client>(`/v1/clients/${id}`),
  create:     (body: Partial<Client>)         => api.post<Client>('/v1/clients', body),
  update:     (id: number, body: Partial<Client>) => api.patch<Client>(`/v1/clients/${id}`, body),
  deactivate: (id: number)                    => api.delete(`/v1/clients/${id}`),
  getSites:   (clientId: number)              => api.get(`/v1/clients/${clientId}/sites`),
};
