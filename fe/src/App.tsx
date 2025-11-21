import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/layout';
import { AuthProvider } from './contexts/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Veřejné routy - BEZ layoutu */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Chráněné routy - S layoutem (Sidebar + Header + Footer) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Admin stránka - jen s admin oprávněním */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requirePermission="admin.admin">
                <Layout>
                  <div>
                    <h1 className="text-3xl font-bold mb-4">Admin stránka</h1>
                    <p className="text-gray-600">Toto je administrační panel.</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Users stránka - jen s read právem */}
          <Route
            path="/users"
            element={
              <ProtectedRoute requirePermission="users.read">
                <Layout>
                  <div>
                    <h1 className="text-3xl font-bold mb-4">Uživatelé</h1>
                    <p className="text-gray-600">Seznam uživatelů.</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Tasks stránka */}
          <Route
            path="/tasks"
            element={
              <ProtectedRoute requirePermission="users.read">
                <Layout>
                  <div>
                    <h1 className="text-3xl font-bold mb-4">Úkoly</h1>
                    <p className="text-gray-600">Seznam úkolů.</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Modules stránka */}
          <Route
            path="/modules"
            element={
              <ProtectedRoute requirePermission="users.read">
                <Layout>
                  <div>
                    <h1 className="text-3xl font-bold mb-4">Moduly</h1>
                    <p className="text-gray-600">Správa modulů.</p>
                  </div>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Profil - vidí každý */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Redirect na dashboard nebo login */}
          <Route path="/" element={<Navigate to="/" replace />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
