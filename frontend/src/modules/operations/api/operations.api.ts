import api, { type PaginatedResult } from '../../../api/client';

export interface LineItem {
  line_id?:     number;
  description:  string;
  unit:         string;
  quantity:     number;
  unit_price:   number;
  line_total?:  number;
}

export interface Invoice {
  invoice_id:     number;
  invoice_number: string;
  client_id:      number;
  client_name?:   string;
  client_code?:   string;
  client_address?: string | null;
  client_phone?:  string | null;
  client_email?:  string | null;
  issued_date:    string;
  due_date:       string | null;
  status:         'invoiced' | 'approved' | 'paid' | 'cancelled';
  notes:          string | null;
  subtotal:       number;
  wht_enabled:    boolean | number;
  wht_rate:       number;
  wht_amount:     number;
  vat_enabled:    boolean | number;
  vat_rate:       number;
  vat_amount:     number;
  total_amount:   number;
  cancellation_reason?: string | null;
  created_at:     string;
  items?:         LineItem[];
}

export interface Expense {
  expense_id:     number;
  expense_number: string;
  client_id:      number | null;
  client_name?:   string;
  client_code?:   string;
  expense_date:   string;
  notes:          string | null;
  total_amount:   number;
  created_at:     string;
  items?:         LineItem[];
}

export interface PaymentRecord {
  payment_id:     number;
  invoice_id:     number;
  invoice_number: string;
  client_id:      number;
  client_name:    string;
  amount:         number;
  paid_at:        string;
  evidence_path:  string | null;
  evidence_name:  string | null;
  notes:          string | null;
}

export interface InvoiceFilters {
  page?: number; limit?: number;
  status?: string; client_id?: number; date_from?: string; date_to?: string; search?: string;
}
export interface ExpenseFilters {
  page?: number; limit?: number;
  client_id?: number; date_from?: string; date_to?: string; search?: string;
}
export interface PaymentFilters {
  invoice_id?: number; date_from?: string; date_to?: string;
}

export const invoicesApi = {
  list:     (params?: InvoiceFilters)              => api.get<PaginatedResult<Invoice>>('/v1/invoices', { params }),
  getById:  (id: number)                           => api.get<Invoice>(`/v1/invoices/${id}`),
  create:   (body: Partial<Invoice> & { line_items: LineItem[] }) => api.post<Invoice>('/v1/invoices', body),
  update:   (id: number, body: Partial<Invoice> & { line_items?: LineItem[] }) => api.patch<Invoice>(`/v1/invoices/${id}`, body),
  approve:  (id: number)                           => api.post<Invoice>(`/v1/invoices/${id}/approve`),
  cancel:   (id: number, reason?: string)          => api.post<Invoice>(`/v1/invoices/${id}/cancel`, { reason }),
  recordPayment: (id: number, formData: FormData)  => api.post<Invoice>(`/v1/invoices/${id}/payments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const expensesApi = {
  list:    (params?: ExpenseFilters)                => api.get<PaginatedResult<Expense>>('/v1/expenses', { params }),
  getById: (id: number)                             => api.get<Expense>(`/v1/expenses/${id}`),
  create:  (body: Partial<Expense> & { line_items: LineItem[] }) => api.post<Expense>('/v1/expenses', body),
  update:  (id: number, body: Partial<Expense> & { line_items?: LineItem[] }) => api.patch<Expense>(`/v1/expenses/${id}`, body),
  remove:  (id: number)                             => api.delete(`/v1/expenses/${id}`),
};

export const paymentsApi = {
  list: (params?: PaymentFilters) => api.get<PaymentRecord[]>('/v1/payments', { params }),
};
