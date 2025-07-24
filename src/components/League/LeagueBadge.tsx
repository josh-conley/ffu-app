import type { LeagueTier } from '../../types';

interface LeagueBadgeProps {
  league: LeagueTier;
  className?: string;
}

export const LeagueBadge = ({ league, className = '' }: LeagueBadgeProps) => {
  const badgeClasses = {
    PREMIER: 'badge badge-premier',
    MASTERS: 'badge badge-masters',
    NATIONAL: 'badge badge-national'
  };

  const leagueNames = {
    PREMIER: 'Premier',
    MASTERS: 'Masters',
    NATIONAL: 'National'
  };

  return (
    <span className={`${badgeClasses[league]} ${className}`}>
      {leagueNames[league]}
    </span>
  );
};