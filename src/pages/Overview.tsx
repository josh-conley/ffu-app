import { Users, Calendar, BarChart3, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Overview = () => {
  return (
    <div className="space-y-8">
      {/* Welcome Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 dark:from-red-500 dark:to-red-600 rounded-lg shadow-lg p-12 text-white text-center">
        <div className="max-w-2xl mx-auto">
          {/* <img 
            src={`${import.meta.env.MODE === 'production' ? '/ffu-app' : ''}/league-logos/NationalLogo.png`}
            alt="FFU Logo"
            className="h-36 w-36 object-contain mx-auto mb-6"
          /> */}
          <h1 className="text-5xl font-bold mb-4">Welcome to the FFU</h1>
          <p className="text-xl text-red-100 mb-8">
            Fantasy Football Union - A multi-tier league system featuring Premier, Masters, and National leagues.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 max-w-lg mx-auto">
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
              <div className="font-semibold">Members</div>
            </Link>
            <Link 
              to="/matchups" 
              className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition-colors"
            >
              <Calendar className="h-6 w-6 mx-auto mb-2" />
              <div className="font-semibold">Matchups</div>
            </Link>
            <Link 
              to="/records" 
              className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition-colors"
            >
              <Award className="h-6 w-6 mx-auto mb-2" />
              <div className="font-semibold">Records</div>
            </Link>
          </div>
        </div>
      </div>

      {/* League Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="mx-auto mb-4 w-24 h-24">
            <img 
              src={`${import.meta.env.MODE === 'production' ? '/ffu-app' : ''}/league-logos/PremierLogo.png`}
              alt="Premier League Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Premier League</h3>
          <p className="text-gray-600 dark:text-gray-300">
            The top tier of FFU competition. Elite managers battle for ultimate supremacy.
          </p>
        </div>
        
        <div className="card text-center">
          <div className="mx-auto mb-4 w-24 h-24">
            <img 
              src={`${import.meta.env.MODE === 'production' ? '/ffu-app' : ''}/league-logos/MastersLogo.png`}
              alt="Masters League Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Masters League</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Competitive middle tier where experienced managers hone their skills.
          </p>
        </div>
        
        <div className="card text-center">
          <div className="mx-auto mb-4 w-24 h-24">
            <img 
              src={`${import.meta.env.MODE === 'production' ? '/ffu-app' : ''}/league-logos/NationalLogo.png`}
              alt="National League Logo"
              className="w-full h-full object-contain"
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