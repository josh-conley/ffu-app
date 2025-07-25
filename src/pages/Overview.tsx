import { Trophy, Users, Calendar, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Overview = () => {
  return (
    <div className="space-y-8">
      {/* Welcome Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-500 dark:to-primary-600 rounded-lg shadow-lg p-12 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <Trophy className="h-16 w-16 text-yellow-300 mx-auto mb-6" />
          <h1 className="text-5xl font-bold mb-4">Welcome to FFU</h1>
          <p className="text-xl text-primary-100 mb-8">
            Fantasy Football Union - A multi-tier league system featuring Premier, Masters, and National leagues.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
            <Link 
              to="/standings" 
              className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition-colors"
            >
              <Users className="h-6 w-6 mx-auto mb-2" />
              <div className="font-semibold">Standings</div>
            </Link>
            <Link 
              to="/players" 
              className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition-colors"
            >
              <BarChart3 className="h-6 w-6 mx-auto mb-2" />
              <div className="font-semibold">Player Stats</div>
            </Link>
            <Link 
              to="/matchups" 
              className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition-colors"
            >
              <Calendar className="h-6 w-6 mx-auto mb-2" />
              <div className="font-semibold">Matchups</div>
            </Link>
          </div>
        </div>
      </div>

      {/* League Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="mx-auto mb-4 w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-xl p-3 transition-colors">
            <img 
              src={`${import.meta.env.MODE === 'production' ? '/ffu-app' : ''}/league-logos/Premier-Light.png`}
              alt="Premier League Logo"
              className="w-full h-full object-contain dark:hidden"
            />
            <img 
              src={`${import.meta.env.MODE === 'production' ? '/ffu-app' : ''}/league-logos/Premier-Dark.png`}
              alt="Premier League Logo"
              className="w-full h-full object-contain hidden dark:block"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Premier League</h3>
          <p className="text-gray-600 dark:text-gray-300">
            The top tier of FFU competition. Elite managers battle for ultimate supremacy.
          </p>
        </div>
        
        <div className="card text-center">
          <div className="mx-auto mb-4 w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-xl p-3 transition-colors">
            <img 
              src={`${import.meta.env.MODE === 'production' ? '/ffu-app' : ''}/league-logos/Masters-Light.png`}
              alt="Masters League Logo"
              className="w-full h-full object-contain dark:hidden"
            />
            <img 
              src={`${import.meta.env.MODE === 'production' ? '/ffu-app' : ''}/league-logos/Masters-Dark.png`}
              alt="Masters League Logo"
              className="w-full h-full object-contain hidden dark:block"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Masters League</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Competitive middle tier where experienced managers hone their skills.
          </p>
        </div>
        
        <div className="card text-center">
          <div className="mx-auto mb-4 w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-xl p-3 transition-colors">
            <img 
              src={`${import.meta.env.MODE === 'production' ? '/ffu-app' : ''}/league-logos/National-Light.png`}
              alt="National League Logo"
              className="w-full h-full object-contain dark:hidden"
            />
            <img 
              src={`${import.meta.env.MODE === 'production' ? '/ffu-app' : ''}/league-logos/National-Dark.png`}
              alt="National League Logo"
              className="w-full h-full object-contain hidden dark:block"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">National League</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Entry level competition perfect for newcomers and developing managers.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="card text-center bg-gray-50 dark:bg-gray-800/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Explore the FFU ecosystem
        </h3>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Track league standings, view weekly matchups, and follow the championship races across all three tiers. 
          Use the navigation above to dive into the data.
        </p>
      </div>
    </div>
  );
};