/**
 * Main Application Routing Shell for Yojana Sahayak
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { Navbar } from './components/common/Navbar';
import { CitizenLayout } from './components/common/CitizenLayout';
import { AdminLayout } from './components/common/AdminLayout';
import { RobotCompanion } from './components/assistant/RobotCompanion';

// Centre Locator
import { CentreLocator } from './features/centre-locator';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { PublicSchemesPage } from './pages/public/PublicSchemesPage';
import { PublicSchemeDetailPage } from './pages/public/PublicSchemeDetailPage';

// Citizen Pages
import { CitizenDashboardPage } from './pages/citizen/CitizenDashboardPage';
import { ChatPage } from './pages/citizen/ChatPage';
import { ComparePage } from './pages/citizen/ComparePage';
import { CitizenDiscoverPage } from './pages/citizen/CitizenDiscoverPage';
import { EligibilityQuestionnairePage } from './pages/citizen/EligibilityQuestionnairePage';
import { RecommendationsPage } from './pages/citizen/RecommendationsPage';
import { CitizenSchemeDetailPage } from './pages/citizen/CitizenSchemeDetailPage';
import { SavedSchemesPage } from './pages/citizen/SavedSchemesPage';
import { CitizenProfilePage } from './pages/citizen/CitizenProfilePage';
import { SettingsPage } from './pages/citizen/SettingsPage';

// Admin Pages
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminSourcesPage } from './pages/admin/AdminSourcesPage';
import { AdminDiscoveryPage } from './pages/admin/AdminDiscoveryPage';
import { AdminReviewQueuePage } from './pages/admin/AdminReviewQueuePage';
import { AdminDocumentsPage } from './pages/admin/AdminDocumentsPage';
import { AdminRulesPage } from './pages/admin/AdminRulesPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';
import { AdminFreshnessPage } from './pages/admin/AdminFreshnessPage';

export function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AdminAuthProvider>
          <BrowserRouter>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />

            <div style={{ flex: 1 }}>
              <Routes>
                {/* Public Direct Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/schemes" element={<PublicSchemesPage />} />
                <Route path="/schemes/:schemeId" element={<PublicSchemeDetailPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/centre-locator" element={<CentreLocator />} />
                <Route path="/compare" element={<ComparePage />} />

                {/* Citizen Portal Routes */}
                <Route path="/app" element={<CitizenLayout />}>
                  <Route index element={<CitizenDashboardPage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="centre-locator" element={<CentreLocator />} />
                  <Route path="compare" element={<ComparePage />} />
                  <Route path="discover" element={<CitizenDiscoverPage />} />
                  <Route path="eligibility" element={<EligibilityQuestionnairePage />} />
                  <Route path="recommendations" element={<RecommendationsPage />} />
                  <Route path="schemes/:schemeId" element={<CitizenSchemeDetailPage />} />
                  <Route path="saved" element={<SavedSchemesPage />} />
                  <Route path="profile" element={<CitizenProfilePage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* Protected Admin Console Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="sources" element={<AdminSourcesPage />} />
                  <Route path="discovery" element={<AdminDiscoveryPage />} />
                  <Route path="review-queue" element={<AdminReviewQueuePage />} />
                  <Route path="documents" element={<AdminDocumentsPage />} />
                  <Route path="rules" element={<AdminRulesPage />} />
                  <Route path="audit" element={<AdminAuditPage />} />
                  <Route path="freshness" element={<AdminFreshnessPage />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>

            {/* Global Friendly Voice Assistant */}
            <RobotCompanion />
          </div>
        </BrowserRouter>
        </AdminAuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
