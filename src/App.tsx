import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Overview } from './pages/Overview';
import { Standings } from './pages/Standings';
import { Members } from './pages/Members';
import { Matchups } from './pages/Matchups';
import { Draft } from './pages/Draft';
import { DraftFunFacts } from './pages/DraftFunFacts';
import { Records } from './pages/Records';
import { AllTimeStats } from './pages/AllTimeStats';
import { H2HMatrix } from './pages/H2HMatrix';
import { SecretDak } from './pages/SecretDak';
import { PlayoffMachine } from './pages/PlayoffMachine';
import { ThemeProvider } from './contexts/ThemeContext';
import { TeamProfileModalProvider, useTeamProfileModal } from './contexts/TeamProfileModalContext';
import { TeamProfileModal } from './components/Common/TeamProfileModal';

const AppContent = () => {
  const { isOpen, teamUserId, teamName, closeTeamProfile } = useTeamProfileModal();

  return (
    <Router basename={'/'}>
      <div className="relative min-h-screen">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="standings" element={<Standings />} />
            <Route path="playoff-machine" element={<PlayoffMachine />} />
            <Route path="members" element={<Members />} />
            <Route path="matchups" element={<Matchups />} />
            <Route path="drafts" element={<Draft />} />
            <Route path="draft-fun-facts" element={<DraftFunFacts />} />
            <Route path="records" element={<Records />} />
            <Route path="stats" element={<AllTimeStats />} />
            <Route path="h2h-matrix" element={<H2HMatrix />} />
            <Route path="secret-dak" element={<SecretDak />} />
          </Route>
        </Routes>
        
        {/* Global Team Profile Modal */}
        {teamUserId && (
          <TeamProfileModal
            isOpen={isOpen}
            onClose={closeTeamProfile}
            teamUserId={teamUserId}
            teamName={teamName || undefined}
          />
        )}
      </div>
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider>
      <TeamProfileModalProvider>
        <AppContent />
      </TeamProfileModalProvider>
    </ThemeProvider>
  );
}

export default App;