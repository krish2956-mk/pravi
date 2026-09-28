// Shared badge components: ConditionBadge and StatusBadge
// Text + icon always — never color alone
import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Wrench, Trash2, Circle } from 'lucide-react';
import type { ConditionKey, StatusKey } from '../tokens';

const conditionConfig: Record<ConditionKey, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  excellent: { label: 'Excellent', color: 'text-[#2E7D5B]', bg: 'bg-[#2E7D5B]/10', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  good:      { label: 'Good',      color: 'text-[#8BA63A]', bg: 'bg-[#8BA63A]/10', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  fair:      { label: 'Fair',      color: 'text-[#E3B02F]', bg: 'bg-[#E3B02F]/10', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  poor:      { label: 'Poor',      color: 'text-[#D9682B]', bg: 'bg-[#D9682B]/10', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  critical:  { label: 'Critical',  color: 'text-[#B3261E]', bg: 'bg-[#B3261E]/10', icon: <XCircle className="w-3.5 h-3.5" /> },
};

const statusConfig: Record<StatusKey, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  planned:           { label: 'Planned',           color: 'text-[#7A8794]', bg: 'bg-[#7A8794]/10', icon: <Clock className="w-3.5 h-3.5" /> },
  inService:         { label: 'In Service',         color: 'text-[#0F6B6E]', bg: 'bg-[#0F6B6E]/10', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  underMaintenance:  { label: 'Under Maintenance',  color: 'text-[#E39A12]', bg: 'bg-[#E39A12]/10', icon: <Wrench className="w-3.5 h-3.5" /> },
  decommissioned:    { label: 'Decommissioned',     color: 'text-[#5B6B76]', bg: 'bg-[#5B6B76]/10', icon: <XCircle className="w-3.5 h-3.5" /> },
  disposed:          { label: 'Disposed',           color: 'text-[#A9B2B9]', bg: 'bg-[#A9B2B9]/10', icon: <Trash2 className="w-3.5 h-3.5" /> },
};

interface ConditionBadgeProps { condition: ConditionKey; size?: 'sm' | 'md' }
export const ConditionBadge: React.FC<ConditionBadgeProps> = ({ condition, size = 'md' }) => {
  const cfg = conditionConfig[condition];
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md font-medium ${px} ${cfg.color} ${cfg.bg}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

interface StatusBadgeProps { status: StatusKey; size?: 'sm' | 'md' }
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const cfg = statusConfig[status];
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md font-medium ${px} ${cfg.color} ${cfg.bg}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};
