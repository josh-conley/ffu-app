import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Overview } from './pages/Overview';
import { Standings } from './pages/Standings';
import { PlayerStats } from './pages/PlayerStats';
import { Matchups } from './pages/Matchups';
import { Draft } from './pages/Draft';
import { Records } from './pages/Records';
import { SecretDak } from './pages/SecretDak';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router basename={'/'}>
        <div className="relative min-h-screen">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Overview />} />
              <Route path="standings" element={<Standings />} />
              <Route path="players" element={<PlayerStats />} />
              <Route path="matchups" element={<Matchups />} />
              <Route path="drafts" element={<Draft />} />
              <Route path="records" element={<Records />} />
              <Route path="secret-dak" element={<SecretDak />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;