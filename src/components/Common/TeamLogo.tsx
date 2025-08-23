import { useState } from 'react';
import { getTeamLogoFilename, generateTeamAbbreviation } from '../../utils/teamLogos';

interface TeamLogoProps {
  teamName: string;
  abbreviation?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base'
};

export const TeamLogo = ({ 
  teamName, 
  abbreviation, 
  size = 'md', 
  className = '' 
}: TeamLogoProps) => {
  const [imageError, setImageError] = useState(false);
  const logoFilename = getTeamLogoFilename(teamName);
  const basePath = import.meta.env.MODE === 'production' ? '/ffu-app' : '';
  const logoUrl = logoFilename ? `${basePath}/team-logos/${logoFilename}` : null;
  
  // Use provided abbreviation, or generate one from team name
  const displayAbbreviation = abbreviation || generateTeamAbbreviation(teamName);
  
  const baseClasses = `${sizeClasses[size]} rounded-full flex items-center justify-center flex-shrink-0 ${className}`;

  // If no logo available or image failed to load, show abbreviation
  if (!logoUrl || imageError) {
    return (
      <div 
        className={`${baseClasses} bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold border-2 border-gray-300 dark:border-gray-600 transition-colors`}
        title={teamName}
      >
        {displayAbbreviation}
      </div>
    );
  }

  return (
    <div className={`${baseClasses} bg-white dark:bg-gray-800`} title={teamName}>
      <img
        src={logoUrl}
        alt={`${teamName} logo`}
        className="w-full h-full rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 transition-colors"
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
      />
    </div>
  );
};