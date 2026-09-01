import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import { FullPageLoader } from './components/AsyncState';
import { AppShell } from './layouts/AppShell';

const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() =>
  import('./pages/RegisterPage').then((module) => ({ default: module.RegisterPage })),
);
const ExchangePage = lazy(() =>
  import('./pages/ExchangePage').then((module) => ({ default: module.ExchangePage })),
);
const TenantSelectionPage = lazy(() =>
  import('./pages/TenantSelectionPage').then((module) => ({ default: module.TenantSelectionPage })),
);
const OnboardingPage = lazy(() =>
  import('./pages/OnboardingPage').then((module) => ({ default: module.OnboardingPage })),
);
const InvitationPage = lazy(() =>
  import('./pages/InvitationPage').then((module) => ({ default: module.InvitationPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const ProjectsPage = lazy(() =>
  import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })),
);
const KanbanPage = lazy(() =>
  import('./pages/KanbanPage').then((module) => ({ default: module.KanbanPage })),
);
const MembersPage = lazy(() =>
  import('./pages/MembersPage').then((module) => ({ default: module.MembersPage })),
);
const ResourcesPage = lazy(() =>
  import('./pages/ResourcesPage').then((module) => ({ default: module.ResourcesPage })),
);
const NotificationsPage = lazy(() =>
  import('./pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })),
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);

export function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/exchange" element={<ExchangePage />} />
        <Route path="/invitations/:token" element={<InvitationPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/select-tenant" element={<TenantSelectionPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>
        <Route element={<RequireAuth tenant />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/kanban" element={<KanbanPage />} />
            <Route path="/kanban/:boardId" element={<KanbanPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Route>
        <Route element={<RequireAuth systemAdministrator />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
