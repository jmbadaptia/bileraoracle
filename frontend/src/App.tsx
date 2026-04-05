import { Routes, Route, Navigate, useParams } from "react-router";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { ActividadesUnifiedPage } from "@/pages/actividades-unified";
import { ActividadDetailPage } from "@/pages/actividad-detail";
import { ActividadFormPage } from "@/pages/actividad-form";
import { DocumentosPage } from "@/pages/documentos";
import { DocumentoDetailPage } from "@/pages/documento-detail";
import { DocumentoUploadPage } from "@/pages/documento-upload";
import { DocumentosNubePage } from "@/pages/documentos-nube";
import { AdminPage } from "@/pages/admin";
import { UsuariosPage } from "@/pages/usuarios";
import { UsuarioFormPage } from "@/pages/usuario-form";
import { HistorialPage } from "@/pages/historial";
import { CalendarioPage } from "@/pages/calendario";
import { GaleriaPage } from "@/pages/galeria";
import { AlbumDetailPage } from "@/pages/album-detail";
import { AlbumFormPage } from "@/pages/album-form";
import { ContactosPage } from "@/pages/contactos";
import { ContactoDetailPage } from "@/pages/contacto-detail";
import { ContactoFormPage } from "@/pages/contacto-form";
import { SociosPage } from "@/pages/socios";
import { SocioDetailPage } from "@/pages/socio-detail";
import { SocioFormPage } from "@/pages/socio-form";
import { MiembrosPage } from "@/pages/miembros";
import { MiembroDetailPage } from "@/pages/miembro-detail";
import { GruposPage } from "@/pages/grupos";
import { GrupoDetailPage } from "@/pages/grupo-detail";
import { GrupoFormPage } from "@/pages/grupo-form";
import { AsistentePage } from "@/pages/asistente";
import { EspaciosPage } from "@/pages/espacios";
import { EspacioFormPage } from "@/pages/espacio-form";
import { EspacioDetailPage } from "@/pages/espacio-detail";
import { ReservaFormPage } from "@/pages/reserva-form";
import { ReservasCalendarPage } from "@/pages/reservas-calendar";
import { GuiaPage } from "@/pages/guia";
import { RecuperarPage } from "@/pages/recuperar";
import { VerificarPage } from "@/pages/verificar";
import { RegistroPage } from "@/pages/registro";
import { OnboardingPage } from "@/pages/onboarding";
import { PlanPage } from "@/pages/plan";
import { AiUsagePage } from "@/pages/ai-usage";
import { InscribirsePage } from "@/pages/inscribirse";
import { InscripcionFormPage } from "@/pages/inscripcion-form";
import { InscripcionDetailPage } from "@/pages/inscripcion-detail";
import { TareasPage } from "@/pages/tareas";
import { TareaFormPage } from "@/pages/tarea-form";
import { ReunionesPage } from "@/pages/reuniones";
import { ReunionFormPage } from "@/pages/reunion-form";

function AsistenteWrapper() {
  return <AsistentePage />;
}

function InscripcionRedirect({ edit }: { edit?: boolean }) {
  const { id } = useParams();
  const path = edit ? `/actividades/curso/${id}/editar` : `/actividades/curso/${id}`;
  return <Navigate to={path} replace />;
}

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
      <Route path="/recuperar" element={<RecuperarPage />} />
      <Route path="/verificar" element={<VerificarPage />} />
      <Route path="/registro" element={<RegistroPage />} />
      <Route path="/inscribirse/:activityId" element={<InscribirsePage />} />
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="calendario" element={<CalendarioPage />} />
        <Route path="actividades" element={<ActividadesUnifiedPage />} />
        <Route path="actividades/historial" element={<HistorialPage />} />
        <Route path="actividades/nueva" element={<ActividadFormPage />} />
        <Route path="actividades/curso/nuevo" element={<InscripcionFormPage />} />
        <Route path="actividades/curso/:id" element={<InscripcionDetailPage />} />
        <Route path="actividades/curso/:id/editar" element={<InscripcionFormPage />} />
        <Route path="actividades/:id" element={<ActividadDetailPage />} />
        <Route path="actividades/:id/editar" element={<ActividadFormPage />} />
        <Route path="tareas" element={<TareasPage />} />
        <Route path="tareas/nueva" element={<TareaFormPage />} />
        <Route path="tareas/:id" element={<ActividadDetailPage />} />
        <Route path="tareas/:id/editar" element={<TareaFormPage />} />
        <Route path="reuniones" element={<ReunionesPage />} />
        <Route path="reuniones/nueva" element={<ReunionFormPage />} />
        <Route path="reuniones/:id" element={<ActividadDetailPage />} />
        <Route path="reuniones/:id/editar" element={<ReunionFormPage />} />
        <Route path="documentos" element={<DocumentosPage />} />
        <Route path="documentos/subir" element={<DocumentoUploadPage />} />
        <Route path="documentos/nube" element={<DocumentosNubePage />} />
        <Route path="documentos/:id" element={<DocumentoDetailPage />} />
        <Route path="espacios" element={<EspaciosPage />} />
        <Route path="espacios/nuevo" element={<AdminRoute><EspacioFormPage /></AdminRoute>} />
        <Route path="espacios/:id" element={<EspacioDetailPage />} />
        <Route path="espacios/:id/editar" element={<AdminRoute><EspacioFormPage /></AdminRoute>} />
        <Route path="reservas" element={<ReservasCalendarPage />} />
        <Route path="reservas/nueva" element={<ReservaFormPage />} />
        <Route path="galeria" element={<GaleriaPage />} />
        <Route path="galeria/nuevo" element={<AlbumFormPage />} />
        <Route path="galeria/:id" element={<AlbumDetailPage />} />
        <Route path="galeria/:id/editar" element={<AlbumFormPage />} />
        <Route path="miembros" element={<MiembrosPage />} />
        <Route path="miembros/:id" element={<MiembroDetailPage />} />
        <Route path="grupos" element={<GruposPage />} />
        <Route path="grupos/nuevo" element={<AdminRoute><GrupoFormPage /></AdminRoute>} />
        <Route path="grupos/:id" element={<GrupoDetailPage />} />
        <Route path="contactos" element={<ContactosPage />} />
        <Route path="contactos/nuevo" element={<ContactoFormPage />} />
        <Route path="contactos/:id" element={<ContactoDetailPage />} />
        <Route path="contactos/:id/editar" element={<ContactoFormPage />} />
        <Route path="socios" element={<SociosPage />} />
        <Route path="socios/nuevo" element={<SocioFormPage />} />
        <Route path="socios/:id" element={<SocioDetailPage />} />
        <Route path="socios/:id/editar" element={<SocioFormPage />} />
        <Route path="inscripciones" element={<Navigate to="/actividades?inscripciones=1" replace />} />
        <Route path="inscripciones/nueva" element={<Navigate to="/actividades/curso/nuevo" replace />} />
        <Route path="inscripciones/:id" element={<InscripcionRedirect />} />
        <Route path="inscripciones/:id/editar" element={<InscripcionRedirect edit />} />
        <Route path="guia" element={<GuiaPage />} />
        <Route path="asistente" element={<AsistenteWrapper />} />
        <Route path="asistente/:conversationId" element={<AsistenteWrapper />} />
        <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="admin/usuarios" element={<AdminRoute><UsuariosPage /></AdminRoute>} />
        <Route path="admin/usuarios/nuevo" element={<AdminRoute><UsuarioFormPage /></AdminRoute>} />
        <Route path="admin/usuarios/:id/editar" element={<AdminRoute><UsuarioFormPage /></AdminRoute>} />
        <Route path="admin/plan" element={<AdminRoute><PlanPage /></AdminRoute>} />
        <Route path="admin/ai-usage" element={<AdminRoute><AiUsagePage /></AdminRoute>} />
      </Route>
    </Routes>
  );
}
