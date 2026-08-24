import client from '../../../api/client';

export interface EmploymentProfile {
  employment_profile_id?: number;
  department_id?:    number | string | null;
  department_name?:  string | null;
  designation_id?:   number | string | null;
  designation_name?: string | null;
  title_id?:         number | string | null;
  title_name?:       string | null;
  bank_id?:          number | string | null;
  bank_name?:        string | null;
  bank_acc?:         string | null;
  pf_number?:        string | null;
  joining_date?:     string | null;
}

export interface EmploymentMasters {
  departments:  { id: number; name: string }[];
  designations: { designation_id: number; designation_name: string }[];
  titles:       { title_id: number; title_name: string }[];
  banks:        { bank_id: number; bank_name: string }[];
}

export const employmentApi = {
  getMasters: async (): Promise<EmploymentMasters> => {
    const [dep, des, tit, bank] = await Promise.all([
      client.get('/v1/hr/masters/departments'),
      client.get('/v1/hr/masters/designations'),
      client.get('/v1/hr/masters/titles'),
      client.get('/v1/hr/masters/banks'),
    ]);
    return {
      departments:  dep.data?.data  ?? [],
      designations: des.data?.data ?? [],
      titles:       tit.data?.data ?? [],
      banks:        bank.data?.data ?? [],
    };
  },

  getProfile: async (params: { user_id?: number; guard_id?: number }): Promise<EmploymentProfile | null> => {
    const { data } = await client.get('/v1/hr/employment-profile', { params });
    return data?.data ?? null;
  },

  saveProfile: async (payload: { user_id?: number; guard_id?: number } & Partial<EmploymentProfile>) => {
    // Normalize empty-string selects/inputs to null — the backend only
    // skips fields that are `undefined`, so an empty string from an
    // unselected dropdown would otherwise be written as '' into an
    // integer column and fail.
    const clean: Record<string, unknown> = { ...payload };
    for (const key of Object.keys(clean)) {
      if (clean[key] === '') clean[key] = null;
    }
    const { data } = await client.post('/v1/hr/employment-profile', { payload: clean });
    return data;
  },
};
