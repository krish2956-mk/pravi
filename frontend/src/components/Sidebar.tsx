import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Map,
  ClipboardCheck,
  Wrench,
  BarChart2,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

const navItems = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/assets',      icon: Layers,           label: 'Assets' },
  { to: '/map',         icon: Map,              label: 'Map' },
  { to: '/inspections', icon: ClipboardCheck,   label: 'Inspections' },
  { to: '/work-orders', icon: Wrench,           label: 'Work Orders' },
  { to: '/reports',     icon: BarChart2,         label: 'Reports' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  return (
    <aside
      className="flex flex-col h-screen fixed left-0 top-0 z-30 transition-all duration-200 ease-out"
      style={{
        width: collapsed ? 56 : 224,
        background: '#0E2A30',
      }}
    >
      {/* Wordmark / Logo area */}
      <div className="flex items-center h-14 px-3 border-b border-white/5 shrink-0">
        <div
          className="flex items-center gap-2.5 overflow-hidden"
          style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease-out', pointerEvents: collapsed ? 'none' : 'auto' }}
        >
          <div className="w-5 h-5 rounded bg-[#0F6B6E] shrink-0" />
          <span className="text-sm font-semibold tracking-tight text-white whitespace-nowrap">
            InfraAsset
          </span>
        </div>
        {collapsed && <div className="w-5 h-5 rounded bg-[#0F6B6E] mx-auto" />}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-hidden">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 mx-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-[#163F47] text-white'
                  : 'text-[#C9D6D8] hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Settings + Toggle */}
      <div className="shrink-0 pb-4 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 mx-2 rounded-md text-sm font-medium transition-colors duration-150 ${
              isActive ? 'bg-[#163F47] text-white' : 'text-[#C9D6D8] hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <Settings className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          {!collapsed && <span className="truncate">Settings</span>}
        </NavLink>

        <button
          onClick={onToggle}
          className="flex items-center gap-3 px-3 py-2 mx-2 rounded-md text-sm font-medium text-[#C9D6D8] hover:bg-white/5 hover:text-white transition-colors duration-150 w-[calc(100%-16px)]"
        >
          {collapsed
            ? <ChevronsRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            : <><ChevronsLeft className="w-4 h-4 shrink-0" strokeWidth={1.5} /><span className="truncate">Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
