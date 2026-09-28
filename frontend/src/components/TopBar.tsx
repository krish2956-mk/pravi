import React, { useState } from 'react';
import { Search, ChevronDown, Bell } from 'lucide-react';

interface TopBarProps {
  sidebarWidth: number;
}

const TopBar: React.FC<TopBarProps> = ({ sidebarWidth }) => {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('All Regions');

  return (
    <header
      className="fixed top-0 right-0 z-20 h-14 flex items-center gap-4 px-6 border-b"
      style={{
        left: sidebarWidth,
        background: '#FBFAF7',
        borderColor: '#E2DED5',
        transition: 'left 200ms ease-out',
      }}
    >
      {/* Global Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C99A2]" strokeWidth={1.5} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search asset ID, name, location…"
          className="w-full pl-9 pr-3 py-1.5 text-sm bg-[#F3F1EC] border border-[#E2DED5] rounded-md text-[#14212B] placeholder:text-[#8C99A2] focus:outline-none focus:border-[#0F6B6E] transition-colors duration-150"
        />
      </div>

      {/* Region filter */}
      <div className="relative">
        <select
          value={region}
          onChange={e => setRegion(e.target.value)}
          className="appearance-none pl-3 pr-7 py-1.5 text-sm bg-[#F3F1EC] border border-[#E2DED5] rounded-md text-[#14212B] focus:outline-none focus:border-[#0F6B6E] transition-colors duration-150 cursor-pointer"
        >
          <option>All Regions</option>
          <option>Ahmedabad</option>
          <option>Gandhinagar</option>
          <option>Surat</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5B6B76] pointer-events-none" />
      </div>

      <div className="flex-1" />

      {/* Notifications */}
      <button className="relative w-8 h-8 flex items-center justify-center rounded-md text-[#5B6B76] hover:bg-[#E2DED5] transition-colors duration-150">
        <Bell className="w-4 h-4" strokeWidth={1.5} />
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#E39A12]" />
      </button>

      {/* User menu */}
      <button className="flex items-center gap-2 pl-3 border-l border-[#E2DED5]">
        <div className="w-7 h-7 rounded-md bg-[#0F6B6E] flex items-center justify-center text-white text-xs font-semibold">
          AM
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-medium text-[#14212B]">Arjun Mehta</div>
          <div className="text-xs text-[#8C99A2]">Manager</div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[#5B6B76]" />
      </button>
    </header>
  );
};

export default TopBar;
