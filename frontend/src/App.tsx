import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn, isAdmin } from './api/client';
import { Layout } from './components/Layout';
import { WhatsNew } from './components/WhatsNew';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { ActiveWorkoutPage } from './pages/ActiveWorkoutPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { TemplatePage } from './pages/TemplatePage';
import { HistoryPage } from './pages/HistoryPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BriefingPage } from './pages/BriefingPage';
import { BetaPage } from './pages/BetaPage';
import { JoinPage } from './pages/JoinPage';
import { InvitesPage } from './pages/InvitesPage';
import { SettingsPage } from './pages/SettingsPage';
import { WhatsNewPage } from './pages/WhatsNewPage';
import { AdminPage } from './pages/AdminPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

export function App() {
  const loggedIn = isLoggedIn();
  return (
    <BrowserRouter>
      {loggedIn && <WhatsNew />}
      <Routes>
        <Route path="/beta" element={<BetaPage />} />
        <Route path="/primer" element={<BriefingPage />} />
        <Route path="/join/:code" element={<JoinPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/workout" element={<ProtectedRoute><ActiveWorkoutPage /></ProtectedRoute>} />
        <Route path="/exercises" element={<ProtectedRoute><ExercisesPage /></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
        <Route path="/templates/:id" element={<ProtectedRoute><TemplatePage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/sessions/:id" element={<ProtectedRoute><SessionDetailPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/settings/invites" element={<ProtectedRoute><InvitesPage /></ProtectedRoute>} />
        <Route path="/whats-new" element={<ProtectedRoute><WhatsNewPage /></ProtectedRoute>} />
        {isAdmin() && <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />}
      </Routes>
    </BrowserRouter>
  );
}
