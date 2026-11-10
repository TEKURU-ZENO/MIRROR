import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { InspectionPage } from '@/pages/InspectionPage';
import { EvidenceVaultPage } from '@/pages/EvidenceVaultPage';
import { KnowledgeGraphPage } from '@/pages/KnowledgeGraphPage';
import { SpikePage } from '@/pages/SpikePage';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/inspection/:id?" element={<InspectionPage />} />
        <Route path="/vault" element={<EvidenceVaultPage />} />
        <Route path="/graph" element={<KnowledgeGraphPage />} />
        {/* Day 1: Firebase spike validation page — remove before production */}
        <Route path="/spike" element={<SpikePage />} />
      </Routes>
    </AppShell>
  );
}
