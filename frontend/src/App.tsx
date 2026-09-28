import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import {
  AssetsPage, MapPage, InspectionsPage,
  WorkOrdersPage, ReportsPage, SettingsPage
} from './pages/Placeholders';
import { COLORS } from './tokens';

const SIDEBAR_EXPANDED = 224;
const SIDEBAR_COLLAPSED = 56;

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const sw = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ background: COLORS.canvas }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
        <TopBar sidebarWidth={sw} />

        {/* Main content shifts with sidebar */}
        <main
          className="pt-14 min-h-screen transition-all duration-200 ease-out"
          style={{ marginLeft: sw }}
        >
          <div className="px-8 py-6 max-w-screen-2xl">
            <Routes>
              <Route path="/"            element={<Dashboard />} />
              <Route path="/assets"      element={<AssetsPage />} />
              <Route path="/map"         element={<MapPage />} />
              <Route path="/inspections" element={<InspectionsPage />} />
              <Route path="/work-orders" element={<WorkOrdersPage />} />
              <Route path="/reports"     element={<ReportsPage />} />
              <Route path="/settings"    element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
