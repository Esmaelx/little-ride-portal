import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute, AppLayout } from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Drivers from './pages/Drivers';
import DriverDetails from './pages/DriverDetails';
import NewDriver from './pages/NewDriver';
import Approvals from './pages/Approvals';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';

function App() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-container" style={{ height: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/login"
                element={
                    isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
                }
            />

            {/* Protected Routes */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <AppLayout>
                            <Dashboard />
                        </AppLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/drivers"
                element={
                    <ProtectedRoute>
                        <AppLayout>
                            <Drivers />
                        </AppLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/drivers/new"
                element={
                    <ProtectedRoute allowedRoles={['sales_agent']}>
                        <AppLayout>
                            <NewDriver />
                        </AppLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/drivers/:id"
                element={
                    <ProtectedRoute>
                        <AppLayout>
                            <DriverDetails />
                        </AppLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/approvals"
                element={
                    <ProtectedRoute allowedRoles={['operations', 'admin']}>
                        <AppLayout>
                            <Approvals />
                        </AppLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/users"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AppLayout>
                            <Users />
                        </AppLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/audit"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <AppLayout>
                            <AuditLogs />
                        </AppLayout>
                    </ProtectedRoute>
                }
            />

            {/* Default redirect */}
            <Route
                path="/"
                element={<Navigate to="/dashboard" replace />}
            />

            {/* 404 */}
            <Route
                path="*"
                element={
                    isAuthenticated ? (
                        <AppLayout>
                            <div className="empty-state" style={{ marginTop: '100px' }}>
                                <h2>Page Not Found</h2>
                                <p className="text-muted">The page you're looking for doesn't exist.</p>
                            </div>
                        </AppLayout>
                    ) : (
                        <Navigate to="/login" replace />
                    )
                }
            />
        </Routes>
    );
}

export default App;
