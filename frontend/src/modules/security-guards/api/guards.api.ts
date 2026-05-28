import api, { type PaginatedResult } from '../../../api/client';

export interface GuardEducation {
  education_id?:    number;
  level:            string;
  institution_name: string;
  year_completed:   string | number | null;
  attachment_url?:  string | null;
  _file?:           File | null;   // local pending upload
  _preview?:        string | null; // local object URL preview
}

export interface GuardSkill {
  skill_id?:      number;
  skill_name:     string;
  skill_level?:   'beginner'|'intermediate'|'advanced'|'expert' | null;
  attachment_url?: string | null;
  _file?:          File | null;
  _preview?:       string | null;
}

export interface SecurityGuard {
  guard_id:              number;
  employee_id:           string | null;
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
  guard_status:          'active'|'inactive'|'suspended'|'on_leave';
  notes:                 string | null;
  created_at:            string;
  education?:            GuardEducation[];
  skills?:               GuardSkill[];
  current_assignment?:   { client_name: string; site_name: string; shift: string } | null;
  assignments?:          any[];
}

export interface GuardFilters {
  page?: number; limit?: number;
  guard_status?: string; gender?: string; search?: string;
}

export const resolvePhotoUrl = (photo_url: string | null | undefined): string | null => {
  if (!photo_url) return null;
  if (photo_url.startsWith('http')) return photo_url;
  const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api').replace(/\/api$/, '');
  return `${base}${photo_url}`;
};

export const resolveFileUrl = resolvePhotoUrl;

export const isImage = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return /\.(jpe?g|png|webp)$/i.test(url);
};

export const guardsApi = {
  list:    (params?: GuardFilters) =>
    api.get<PaginatedResult<SecurityGuard>>('/v1/security-guards', { params }),
  getById: (id: number) =>
    api.get<SecurityGuard>(`/v1/security-guards/${id}`),
  create:  (body: Record<string,any>) =>
    api.post<SecurityGuard>('/v1/security-guards', body),
  update:  (id: number, body: Record<string,any>) =>
    api.patch<SecurityGuard>(`/v1/security-guards/${id}`, body),
  uploadPhoto: (guardId: number, file: File) => {
    const fd = new FormData();
    fd.append('photo', file);
    return api.post<SecurityGuard>(`/v1/security-guards/${guardId}/photo`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getEducationLevels: () =>
    api.get<string[]>('/v1/security-guards/meta/education-levels'),
  saveEducation: (guardId: number, records: Omit<GuardEducation, '_file'|'_preview'>[]) => {
    const fd = new FormData();
    fd.append('records', JSON.stringify(records));
    return api.post<GuardEducation[]>(`/v1/security-guards/${guardId}/education`, fd);
  },
  uploadEducationAttachment: (educationId: number, file: File) => {
    const fd = new FormData();
    fd.append('attachment', file);
    return api.post<{ attachment_url: string }>(`/v1/security-guards/education/${educationId}/attachment`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  saveSkills: (guardId: number, records: Omit<GuardSkill, '_file'|'_preview'>[]) => {
    const fd = new FormData();
    fd.append('records', JSON.stringify(records));
    return api.post<GuardSkill[]>(`/v1/security-guards/${guardId}/skills`, fd);
  },
  uploadSkillAttachment: (skillId: number, file: File) => {
    const fd = new FormData();
    fd.append('attachment', file);
    return api.post<{ attachment_url: string }>(`/v1/security-guards/skills/${skillId}/attachment`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
