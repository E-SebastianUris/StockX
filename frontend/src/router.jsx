import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';
import ProductosPage from './pages/productos/ProductosPage';
import CategoriasPage from './pages/categorias/CategoriasPage';
import ProveedoresPage from './pages/proveedores/ProveedoresPage';
import VentasPage from './pages/ventas/VentasPage';
import MovimientosPage from './pages/movimientos/MovimientosPage';
import DashboardPage from './pages/dashboard/DashboardPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/productos" replace />,
      },
      {
        path: 'productos',
        element: <ProductosPage />,
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute requiredRole="ADMIN">
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'categorias',
        element: (
          <ProtectedRoute requiredRole="ADMIN">
            <CategoriasPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'proveedores',
        element: (
          <ProtectedRoute requiredRole="ADMIN">
            <ProveedoresPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'ventas',
        element: <VentasPage />,
      },
      {
        path: 'movimientos',
        element: <MovimientosPage />,
      },
      {
        path: '*',
        element: <Navigate to="/productos" replace />,
      },
    ],
  },
]);

