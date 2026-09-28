import React from 'react';

// Table row skeleton
export const SkeletonRow: React.FC<{ cols: number }> = ({ cols }) => (
  <tr className="border-b border-[#E2DED5]">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="py-2.5 px-4">
        <div className="h-4 rounded bg-[#E2DED5] animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
      </td>
    ))}
  </tr>
);

// Generic block skeleton
export const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded bg-[#E2DED5] animate-pulse ${className}`} />
);

// KPI strip skeleton
export const KpiSkeleton: React.FC = () => (
  <div className="bg-[#FBFAF7] rounded-[10px] px-6 py-4 flex divide-x divide-[#E2DED5]">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex-1 px-6 first:pl-0 last:pr-0 space-y-2">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-8 w-16" />
        <SkeletonBlock className="h-3 w-12" />
      </div>
    ))}
  </div>
);

// Chart skeleton
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 200 }) => (
  <div className="w-full rounded bg-[#E2DED5] animate-pulse" style={{ height }} />
);
