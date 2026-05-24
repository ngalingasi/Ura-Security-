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
const PostSitesPage    = lazy(() => import('./modules/post-sites/pages/PostSitesPage'));
const SecurityGuardsPage = lazy(() => import('./modules/security-guards/pages/SecurityGuardsPage'));
const AssignPostSitePage = lazy(() => import('./modules/assignments/pages/AssignPostSitePage'));

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

                {/* Security Team */}
                <Route path={ROUTES.SECURITY_GUARDS} element={
                  <Suspense fallback={<PageLoader />}><SecurityGuardsPage /></Suspense>
                } />
                <Route path={ROUTES.ASSIGN_POST_SITE} element={
                  <Suspense fallback={<PageLoader />}><AssignPostSitePage /></Suspense>
                } />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
