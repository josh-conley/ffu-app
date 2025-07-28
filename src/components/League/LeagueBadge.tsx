import type { LeagueTier } from '../../types';

interface LeagueBadgeProps {
  league: LeagueTier;
  className?: string;
}

export const LeagueBadge = ({ league, className = '' }: LeagueBadgeProps) => {
  const badgeConfig = {
    PREMIER: {
      classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      name: 'Premier'
    },
    MASTERS: {
      classes: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      name: 'Masters'
    },
    NATIONAL: {
      classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
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