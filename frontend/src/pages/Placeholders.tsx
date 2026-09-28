import React from 'react';
import { FileX } from 'lucide-react';
import { COLORS } from '../tokens';

// Placeholder pages shown as empty states
const PlaceholderPage: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center">
    <div className="w-12 h-12 rounded-[10px] flex items-center justify-center mb-4" style={{ background: COLORS.line }}>
      <FileX className="w-6 h-6" style={{ color: COLORS.inkFaint }} strokeWidth={1.5} />
    </div>
    <h2 className="text-xl font-semibold" style={{ color: COLORS.ink }}>{title}</h2>
    <p className="text-sm mt-2 max-w-xs" style={{ color: COLORS.inkMuted }}>{description}</p>
    <p className="text-xs mt-4 font-mono px-3 py-1.5 rounded" style={{ background: COLORS.canvas, color: COLORS.inkFaint }}>Coming in Phase 2</p>
  </div>
);

export const AssetsPage = () => (
  <PlaceholderPage title="Asset Registry" description="Browse, search, filter and register infrastructure assets. Bulk CSV import supported." />
);

export const MapPage = () => (
  <PlaceholderPage title="Map View" description="Interactive MapLibre GL map with clustered, condition-coded markers across the region." />
);

export const InspectionsPage = () => (
  <PlaceholderPage title="Inspections" description="Condition scores, findings, photos, and inspector-assigned inspection schedules." />
);

export const WorkOrdersPage = () => (
  <PlaceholderPage title="Work Orders" description="Preventive, corrective, and emergency work orders with full workflow tracking." />
);

export const ReportsPage = () => (
  <PlaceholderPage title="Reports" description="Export PDF and CSV reports on condition trends, costs, and maintenance history." />
);

export const SettingsPage = () => (
  <PlaceholderPage title="Settings" description="Configure asset types, regions, user roles, and notification preferences." />
);
