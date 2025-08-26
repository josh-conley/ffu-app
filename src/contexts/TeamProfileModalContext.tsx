import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface TeamProfileModalContextType {
  isOpen: boolean;
  teamUserId: string | null;
  teamName: string | null;
  openTeamProfile: (userId: string, teamName?: string) => void;
  closeTeamProfile: () => void;
}

const TeamProfileModalContext = createContext<TeamProfileModalContextType | undefined>(undefined);

interface TeamProfileModalProviderProps {
  children: ReactNode;
}

export const TeamProfileModalProvider = ({ children }: TeamProfileModalProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [teamUserId, setTeamUserId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);

  const openTeamProfile = (userId: string, name?: string) => {
    setTeamUserId(userId);
    setTeamName(name || null);
    setIsOpen(true);
  };

  const closeTeamProfile = () => {
    setIsOpen(false);
    setTeamUserId(null);
    setTeamName(null);
  };

  return (
    <TeamProfileModalContext.Provider
      value={{
        isOpen,
        teamUserId,
        teamName,
        openTeamProfile,
        closeTeamProfile,
      }}
    >
      {children}
    </TeamProfileModalContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTeamProfileModal = () => {
  const context = useContext(TeamProfileModalContext);
  if (context === undefined) {
    throw new Error('useTeamProfileModal must be used within a TeamProfileModalProvider');
  }
  return context;
};