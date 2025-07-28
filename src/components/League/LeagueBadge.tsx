import type { LeagueTier } from '../../types';

interface LeagueBadgeProps {
  league: LeagueTier;
  className?: string;
}

export const LeagueBadge = ({ league, className = '' }: LeagueBadgeProps) => {
  const badgeConfig = {
    PREMIER: {
      classes: 'premier-colors',
      name: 'Premier'
    },
    MASTERS: {
      classes: 'masters-colors',
      name: 'Masters'
    },
    NATIONAL: {
      classes: 'national-colors',
      name: 'National'
    }
  };

  const config = badgeConfig[league];

  return (
    <div className={`inline-flex items-center px-2 py-0.5 font-medium text-xs tracking-wide uppercase angular-cut-small transition-all duration-300 ${config.classes} ${className}`}>
      <span>{config.name}</span>
    </div>
  );
};