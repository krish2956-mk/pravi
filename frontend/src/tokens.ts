// Central location for all design system tokens — mirrors index.css and DESIGN.md

export const COLORS = {
  canvas: '#F3F1EC',
  surface: '#FBFAF7',
  surfaceRaised: '#FFFFFF',
  ink: '#14212B',
  inkMuted: '#5B6B76',
  inkFaint: '#8C99A2',
  line: '#E2DED5',
  sidebar: '#0E2A30',
  sidebarText: '#C9D6D8',
  sidebarActive: '#163F47',
  primary: '#0F6B6E',
  primaryHover: '#0B5558',
  attention: '#E39A12',
  condition: {
    excellent: '#2E7D5B',
    good: '#8BA63A',
    fair: '#E3B02F',
    poor: '#D9682B',
    critical: '#B3261E',
  },
  status: {
    planned: '#7A8794',
    inService: '#0F6B6E',
    underMaintenance: '#E39A12',
    decommissioned: '#5B6B76',
    disposed: '#A9B2B9',
  },
} as const;

export const CONDITION_LABELS = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'] as const;
export type ConditionKey = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
export type StatusKey = 'planned' | 'inService' | 'underMaintenance' | 'decommissioned' | 'disposed';
