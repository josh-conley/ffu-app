import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Overview } from './pages/Overview';
import { Standings } from './pages/Standings';
import { PlayerStats } from './pages/PlayerStats';
import { Matchups } from './pages/Matchups';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="standings" element={<Standings />} />
            <Route path="players" element={<PlayerStats />} />
            <Route path="matchups" element={<Matchups />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;