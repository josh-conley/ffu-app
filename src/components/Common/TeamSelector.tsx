import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { TeamLogo } from './TeamLogo';
import type { LeagueTier } from '../../types';

interface TeamOption {
  teamName: string;
  abbreviation: string;
  userId?: string;
  league?: LeagueTier | 'PAST';
}

interface GroupedTeams {
  PREMIER?: TeamOption[];
  MASTERS?: TeamOption[];
  NATIONAL?: TeamOption[];
  PAST?: TeamOption[];
  [key: string]: TeamOption[] | undefined;
}

interface TeamSelectorProps {
  value: string;
  onChange: (value: string) => void;
  groupedTeams?: GroupedTeams;
  allTeamsLabel?: string;
  placeholder?: string;
  className?: string;
  label?: string;
  compact?: boolean; // For smaller contexts like sidebar
}

export const TeamSelector = ({
  value,
  onChange,
  groupedTeams,
  allTeamsLabel = 'All Teams',
  placeholder = 'Select Team',
  className = '',
  label,
  compact = false
}: TeamSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get selected team info
  const selectedTeam = Object.values(groupedTeams || {})
    .flat()
    .find(team => team?.teamName === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (teamName: string) => {
    onChange(teamName);
    setIsOpen(false);
  };

  const getGroupLabel = (key: string): string => {
    const labels: Record<string, string> = {
      PREMIER: 'Premier League',
      MASTERS: 'Masters League',
      NATIONAL: 'National League',
      PAST: 'Past Members'
    };
    return labels[key] || key;
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className={`block font-heading font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide ${compact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
          {label}
        </label>
      )}
      <div ref={dropdownRef} className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`block w-full text-left bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-ffu-red focus:border-ffu-red hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200 ${compact ? 'pl-2 pr-8 py-1 text-xs' : 'pl-3 pr-10 py-2 text-sm'} ${className}`}
        >
          <div className="flex items-center space-x-2">
            {selectedTeam && (
              <TeamLogo
                teamName={selectedTeam.teamName}
                abbreviation={selectedTeam.abbreviation}
                size={compact ? 'xs' : 'sm'}
              />
            )}
            <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium truncate`}>
              {value === 'ALL' ? allTeamsLabel : selectedTeam?.teamName || placeholder}
            </span>
          </div>
        </button>

        {/* Chevron Icon */}
        <div className={`absolute inset-y-0 right-0 flex items-center pointer-events-none ${compact ? 'pr-2' : 'pr-2'}`}>
          <ChevronDown className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className={`absolute z-[9999] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-80 overflow-y-auto ${compact ? 'text-xs' : 'text-sm'}`}>
            {/* All Teams Option */}
            <button
              type="button"
              onClick={() => handleSelect('ALL')}
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                value === 'ALL' ? 'bg-gray-100 dark:bg-gray-700 font-semibold' : ''
              }`}
            >
              {allTeamsLabel}
            </button>

            {/* Grouped Teams */}
            {groupedTeams && Object.entries(groupedTeams).map(([groupKey, teams]) => {
              if (!teams || teams.length === 0) return null;

              return (
                <div key={groupKey}>
                  {/* Group Header */}
                  <div className={`px-3 py-1.5 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-semibold ${compact ? 'text-xs' : 'text-xs'} uppercase tracking-wide border-t border-b border-gray-200 dark:border-gray-700`}>
                    {getGroupLabel(groupKey)}
                  </div>

                  {/* Group Options */}
                  {teams.map((team) => (
                    <button
                      key={team.teamName}
                      type="button"
                      onClick={() => handleSelect(team.teamName)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2 ${
                        value === team.teamName ? 'bg-gray-100 dark:bg-gray-700 font-semibold' : ''
                      }`}
                    >
                      <TeamLogo
                        teamName={team.teamName}
                        abbreviation={team.abbreviation}
                        size={compact ? 'xs' : 'sm'}
                      />
                      <span className="truncate">{team.teamName}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
