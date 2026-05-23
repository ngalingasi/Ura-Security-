import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './auth/components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import DashboardHome from './layouts/DashboardHome';
import SignIn from './auth/pages/SignIn';
import ForgotPassword from './auth/pages/ForgotPassword';
import ResetPassword from './auth/pages/ResetPassword';
import ChangePassword from './auth/pages/ChangePassword';
import ProfilePage from './users/pages/ProfilePage';
import UsersPage from './users/pages/UsersPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/signin"          element={<SignIn />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />

            {/* Force password change */}
            <Route element={<ProtectedRoute />}>
              <Route path="/change-password" element={<ChangePassword />} />
            </Route>

            {/* Authenticated app */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="/profile" element={<ProfilePage />} />
                {/* Users — admin/manager/super_admin only */}
                <Route element={<ProtectedRoute allowedRoles={['admin', 'manager', 'super_admin']} />}>
                  <Route path="/users" element={<UsersPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
