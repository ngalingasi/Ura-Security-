import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './auth/components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import { ROUTES } from './routes/routes';

// ── Auth pages (eager — small, needed immediately) ───────────────────────────
import SignIn         from './auth/pages/SignIn';
import ForgotPassword from './auth/pages/ForgotPassword';
import ResetPassword  from './auth/pages/ResetPassword';
import ChangePassword from './auth/pages/ChangePassword';

// ── App pages (lazy-loaded) ──────────────────────────────────────────────────
const DashboardHome    = lazy(() => import('./layouts/DashboardHome'));
const ProfilePage      = lazy(() => import('./users/pages/ProfilePage'));
const UsersPage        = lazy(() => import('./users/pages/UsersPage'));
const ClientsPage      = lazy(() => import('./modules/clients/pages/ClientsPage'));
const InvoicesPage       = lazy(() => import('./modules/operations/pages/InvoicesPage'));
const InvoiceFormPage    = lazy(() => import('./modules/operations/pages/InvoiceFormPage'));
const InvoiceDetailPage  = lazy(() => import('./modules/operations/pages/InvoiceDetailPage'));
const ExpensesPage       = lazy(() => import('./modules/operations/pages/ExpensesPage'));
const ExpenseFormPage    = lazy(() => import('./modules/operations/pages/ExpenseFormPage'));
const ExpenseDetailPage  = lazy(() => import('./modules/operations/pages/ExpenseDetailPage'));
const PaymentRecordsPage = lazy(() => import('./modules/operations/pages/PaymentRecordsPage'));
const CatalogItemsPage   = lazy(() => import('./modules/operations/pages/CatalogItemsPage'));
const PostSitesPage    = lazy(() => import('./modules/post-sites/pages/PostSitesPage'));
const SecurityGuardsPage = lazy(() => import('./modules/security-guards/pages/SecurityGuardsPage'));
const AssignPostSitePage = lazy(() => import('./modules/assignments/pages/AssignPostSitePage'));

// ── HR (ported from Vibarua/Bandari) ─────────────────────────────────────────
const HrDepartmentsPage = lazy(() => import('./modules/hr/pages/DepartmentsPage'));
const HrReferenceDataPage = lazy(() => import('./modules/hr/pages/ReferenceDataPage'));
const HrAttendanceDaily   = lazy(() => import('./modules/hr/pages/AttendancePage').then(m => ({ default: () => <m.default mode="daily" /> })));
const HrAttendanceMonthly = lazy(() => import('./modules/hr/pages/AttendancePage').then(m => ({ default: () => <m.default mode="monthly" /> })));
const HrLeaveTypesPage = lazy(() => import('./modules/hr/pages/LeavesPage').then(m => ({ default: () => <m.default tab="types" /> })));
const HrLeaveAppsPage  = lazy(() => import('./modules/hr/pages/LeavesPage').then(m => ({ default: () => <m.default tab="applications" /> })));

// ── Payroll (ported from Vibarua/Bandari) ────────────────────────────────────
const PayrollScalesPage = lazy(() => import('./modules/payroll/pages/PayrollPage').then(m => ({ default: () => <m.default tab="scales" /> })));
const PayrollAssignPage = lazy(() => import('./modules/payroll/pages/PayrollPage').then(m => ({ default: () => <m.default tab="assign" /> })));
const PayrollListPage   = lazy(() => import('./modules/payroll/pages/PayrollPage').then(m => ({ default: () => <m.default tab="list" /> })));
const PayrollSlipsPage  = lazy(() => import('./modules/payroll/pages/PayrollPage').then(m => ({ default: () => <m.default tab="slips" /> })));
const PayrollReportPage = lazy(() => import('./modules/payroll/pages/PayrollPage').then(m => ({ default: () => <m.default tab="report" /> })));

// ── Simple loading fallback ────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public ── */}
            <Route path={ROUTES.SIGN_IN}         element={<SignIn />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
            <Route path={ROUTES.RESET_PASSWORD}  element={<ResetPassword />} />

            {/* ── Force password change ── */}
            <Route element={<ProtectedRoute />}>
              <Route path={ROUTES.CHANGE_PASSWORD} element={<ChangePassword />} />
            </Route>

            {/* ── Authenticated app ── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={
                  <Suspense fallback={<PageLoader />}><DashboardHome /></Suspense>
                } />

                <Route path={ROUTES.PROFILE} element={
                  <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>
                } />

                {/* Users — admin+ */}
                <Route element={<ProtectedRoute allowedRoles={['admin','manager','super_admin']} />}>
                  <Route path={ROUTES.USERS} element={
                    <Suspense fallback={<PageLoader />}><UsersPage /></Suspense>
                  } />
                </Route>

                {/* Clients */}
                <Route path={ROUTES.CLIENTS} element={
                  <Suspense fallback={<PageLoader />}><ClientsPage /></Suspense>
                } />
                <Route path={ROUTES.POST_SITES} element={
                  <Suspense fallback={<PageLoader />}><PostSitesPage /></Suspense>
                } />

                {/* Billing — Invoices, Expenses, Payments */}
                <Route path={ROUTES.INVOICES} element={
                  <Suspense fallback={<PageLoader />}><InvoicesPage /></Suspense>
                } />
                <Route path={ROUTES.INVOICE_NEW} element={
                  <Suspense fallback={<PageLoader />}><InvoiceFormPage /></Suspense>
                } />
                <Route path={ROUTES.INVOICE_EDIT} element={
                  <Suspense fallback={<PageLoader />}><InvoiceFormPage /></Suspense>
                } />
                <Route path={ROUTES.INVOICE_DETAIL} element={
                  <Suspense fallback={<PageLoader />}><InvoiceDetailPage /></Suspense>
                } />
                <Route path={ROUTES.EXPENSES} element={
                  <Suspense fallback={<PageLoader />}><ExpensesPage /></Suspense>
                } />
                <Route path={ROUTES.EXPENSE_NEW} element={
                  <Suspense fallback={<PageLoader />}><ExpenseFormPage /></Suspense>
                } />
                <Route path={ROUTES.EXPENSE_EDIT} element={
                  <Suspense fallback={<PageLoader />}><ExpenseFormPage /></Suspense>
                } />
                <Route path={ROUTES.EXPENSE_DETAIL} element={
                  <Suspense fallback={<PageLoader />}><ExpenseDetailPage /></Suspense>
                } />
                <Route path={ROUTES.PAYMENT_RECORDS} element={
                  <Suspense fallback={<PageLoader />}><PaymentRecordsPage /></Suspense>
                } />
                <Route path={ROUTES.CATALOG_ITEMS} element={
                  <Suspense fallback={<PageLoader />}><CatalogItemsPage /></Suspense>
                } />

                {/* Security Team */}
                <Route path={ROUTES.SECURITY_GUARDS} element={
                  <Suspense fallback={<PageLoader />}><SecurityGuardsPage /></Suspense>
                } />
                <Route path={ROUTES.ASSIGN_POST_SITE} element={
                  <Suspense fallback={<PageLoader />}><AssignPostSitePage /></Suspense>
                } />

                {/* HR — admin/manager+ */}
                <Route element={<ProtectedRoute allowedRoles={['admin','manager','super_admin']} />}>
                  <Route path={ROUTES.HR_ATTENDANCE_DAILY} element={
                    <Suspense fallback={<PageLoader />}><HrAttendanceDaily /></Suspense>
                  } />
                  <Route path={ROUTES.HR_ATTENDANCE_MONTHLY} element={
                    <Suspense fallback={<PageLoader />}><HrAttendanceMonthly /></Suspense>
                  } />
                  <Route path={ROUTES.PAYROLL_SCALES} element={
                    <Suspense fallback={<PageLoader />}><PayrollScalesPage /></Suspense>
                  } />
                  <Route path={ROUTES.PAYROLL_ASSIGN} element={
                    <Suspense fallback={<PageLoader />}><PayrollAssignPage /></Suspense>
                  } />
                  <Route path={ROUTES.PAYROLL_LIST} element={
                    <Suspense fallback={<PageLoader />}><PayrollListPage /></Suspense>
                  } />
                  <Route path={ROUTES.PAYROLL_SLIPS} element={
                    <Suspense fallback={<PageLoader />}><PayrollSlipsPage /></Suspense>
                  } />
                  <Route path={ROUTES.PAYROLL_REPORT} element={
                    <Suspense fallback={<PageLoader />}><PayrollReportPage /></Suspense>
                  } />
                </Route>

                {/* Leaves — everyone can view/apply */}
                <Route path={ROUTES.HR_LEAVE_TYPES} element={
                  <Suspense fallback={<PageLoader />}><HrLeaveTypesPage /></Suspense>
                } />
                <Route path={ROUTES.HR_LEAVE_APPS} element={
                  <Suspense fallback={<PageLoader />}><HrLeaveAppsPage /></Suspense>
                } />

                {/* HR Setup — admin+ */}
                <Route element={<ProtectedRoute allowedRoles={['admin','super_admin']} />}>
                  <Route path={ROUTES.HR_DEPARTMENTS} element={
                    <Suspense fallback={<PageLoader />}><HrDepartmentsPage /></Suspense>
                  } />
                  <Route path={ROUTES.HR_REFERENCE_DATA} element={
                    <Suspense fallback={<PageLoader />}><HrReferenceDataPage /></Suspense>
                  } />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
