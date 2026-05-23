// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  user_id:              number;
  full_name:            string;
  username:             string;
  email:                string | null;
  mobile?:              string | null;
  gender?:              string | null;
  avatar?:              string | null;
  role:                 'viewer' | 'user' | 'manager' | 'admin' | 'super_admin';
  status:               'active' | 'inactive';
  must_change_password: number;
}

export interface TokenPair  { token: string; expires: string; }
export interface AuthTokens { access: TokenPair; refresh: TokenPair; }
export interface AuthResponse { user: User; tokens: AuthTokens; }

// Both 'email' and 'sms' channels are supported
export interface OtpChannel { type: 'email' | 'sms'; display: string; label: string; }

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  results:      T[];
  page:         number;
  limit:        number;
  totalPages:   number;
  totalResults: number;
}

// ── Skills ────────────────────────────────────────────────────────────────────
export interface Skill {
  skill_id: number;
  name:     string;
  category: string;
}

// ── User Record (for user management) ────────────────────────────────────────
export interface UserRecord {
  user_id:               number;
  full_name:             string;
  username:              string;
  email?:                string | null;
  mobile?:               string | null;
  gender?:               string | null;
  avatar?:               string | null;
  role:                  'viewer' | 'user' | 'manager' | 'admin' | 'super_admin';
  status:                'active' | 'inactive';
  must_change_password?: number;
  last_password_changed?: string | null;
  created_at?:           string;
  skills?:               Skill[];
}

// ── API Error ─────────────────────────────────────────────────────────────────
export interface ApiErrorResponse {
  message: string;
  errors?:  Record<string, string[]>;
  status?:  number;
}
