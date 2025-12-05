import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/layout';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { CompaniesPage } from "./pages/CompaniesPage";
import { DashboardPage } from './pages/DashboardPage';
import { DealsKanbanPage } from './pages/DealsKanbanPage';
import { DealsPage } from './pages/DealsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { LeadsKanbanPage } from "./pages/KanbanPage";
import { LeadsPage } from './pages/LeadsPage';
import { LoginPage } from './pages/LoginPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProfilePage } from './pages/ProfilePage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { UsersPage } from './pages/UsersPage';
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
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
                  <UsersPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/deals"
            element={
              <ProtectedRoute requirePermission="users.read">
                <Layout>
                  <DealsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
            <Route
            path="/deals/kanban"
            element={
              <ProtectedRoute requirePermission="users.read">
                <Layout>
                  <DealsKanbanPage />
                </Layout>
              </ProtectedRoute>
            }
          />
            <Route
            path="/products"
            element={
              <ProtectedRoute requirePermission="users.read">
                <Layout>
                  <ProductsPage />
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

          <Route
            path="/leads/table"
            element={
              <ProtectedRoute requirePermission="users.read">
                <Layout>
                  <LeadsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads/kanban"
            element={
              <ProtectedRoute requirePermission="users.read">
                <Layout>
                  <LeadsKanbanPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoices"
            element={
              <ProtectedRoute requirePermission="users.read">
                <Layout>
                < InvoicesPage />
                 </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/companies"
            element={
              <ProtectedRoute requirePermission="users.read">
                <Layout>
                < CompaniesPage />
                 </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute requirePermission="users.read">
                <Layout>
                < DocumentsPage />
                 </Layout>
              </ProtectedRoute>
            }
          />

          // Pro vytvoření nového leadu s předvyplněným klientem
          <Route
            path="/leads/create"
            element={
              <ProtectedRoute requirePermission="users.read">
                <Layout>
                  <LeadsPage />
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
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
