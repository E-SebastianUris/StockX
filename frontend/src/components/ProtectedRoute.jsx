import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.rol !== requiredRole) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-12 bg-white rounded-lg shadow border border-red-200 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Acceso restringido</h2>
        <p className="text-gray-600 text-sm mb-4">
          Esta sección requiere permisos de <strong>{requiredRole}</strong>.
        </p>
        <Navigate to="/productos" replace />
      </div>
    );
  }

  return children;
}

