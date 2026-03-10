import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { ActividadesPage } from "@/pages/actividades";
import { ActividadDetailPage } from "@/pages/actividad-detail";
import { ActividadFormPage } from "@/pages/actividad-form";
import { DocumentosPage } from "@/pages/documentos";
import { DocumentoDetailPage } from "@/pages/documento-detail";
import { DocumentoUploadPage } from "@/pages/documento-upload";
import { OrdenanzasPage } from "@/pages/ordenanzas";
import { BusquedaPage } from "@/pages/busqueda";
import { AdminPage } from "@/pages/admin";
import { UsuariosPage } from "@/pages/usuarios";
import { UsuarioFormPage } from "@/pages/usuario-form";
import { VerificarPage } from "@/pages/verificar";
import { RecuperarPage } from "@/pages/recuperar";
import { HistorialPage } from "@/pages/historial";
import { TareasPage } from "@/pages/tareas";
import { CompartirPage } from "@/pages/compartir";
import { GaleriaPage } from "@/pages/galeria";
import { AlbumDetailPage } from "@/pages/album-detail";
import { AlbumFormPage } from "@/pages/album-form";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verificar" element={<VerificarPage />} />
      <Route path="/recuperar" element={<RecuperarPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="actividades" element={<ActividadesPage />} />
        <Route path="actividades/tareas" element={<TareasPage />} />
        <Route path="actividades/historial" element={<HistorialPage />} />
        <Route path="actividades/nueva" element={<ActividadFormPage />} />
        <Route path="actividades/:id" element={<ActividadDetailPage />} />
        <Route path="actividades/:id/editar" element={<ActividadFormPage />} />
        <Route path="documentos" element={<DocumentosPage />} />
        <Route path="documentos/subir" element={<DocumentoUploadPage />} />
        <Route path="documentos/:id" element={<DocumentoDetailPage />} />
        <Route path="galeria" element={<GaleriaPage />} />
        <Route path="galeria/nuevo" element={<AlbumFormPage />} />
        <Route path="galeria/:id" element={<AlbumDetailPage />} />
        <Route path="galeria/:id/editar" element={<AlbumFormPage />} />
        <Route path="ordenanzas" element={<OrdenanzasPage />} />
        <Route path="compartir" element={<CompartirPage />} />
        <Route path="busqueda" element={<BusquedaPage />} />
        <Route path="busqueda/:conversationId" element={<BusquedaPage />} />
        <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="admin/usuarios" element={<AdminRoute><UsuariosPage /></AdminRoute>} />
        <Route path="admin/usuarios/nuevo" element={<AdminRoute><UsuarioFormPage /></AdminRoute>} />
        <Route path="admin/usuarios/:id/editar" element={<AdminRoute><UsuarioFormPage /></AdminRoute>} />
      </Route>
    </Routes>
  );
}
