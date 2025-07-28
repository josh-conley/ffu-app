import { Users, Calendar, BarChart3, Award } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export const Overview = () => {
  const [showMessage, setShowMessage] = useState(false);

  const handleLeagueClick = () => {
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 2000); // Hide after 2 seconds
  };

  return (
    <div className="space-y-8">
      <div className="bg-red-600 dark:bg-red-500 rounded-lg shadow-lg p-6 sm:p-8 lg:p-12 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Welcome to the FFU</h1>
          <p className="text-base sm:text-lg lg:text-xl text-red-100 mb-8">
            Explore stats, standings, and records across all leagues.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-xlg mx-auto">
            <Link
              to="/standings"
              className="bg-white/10 hover:bg-white/20 rounded-lg p-3 sm:p-4 transition-colors min-h-[80px] flex flex-col justify-center"
            >
              <Users className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />
              <div className="font-semibold text-sm sm:text-base">Standings</div>
            </Link>
            <Link
              to="/players"
              className="bg-white/10 hover:bg-white/20 rounded-lg p-3 sm:p-4 transition-colors min-h-[80px] flex flex-col justify-center"
            >
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />
              <div className="font-semibold text-sm sm:text-base">Members</div>
            </Link>
            <Link
              to="/matchups"
              className="bg-white/10 hover:bg-white/20 rounded-lg p-3 sm:p-4 transition-colors min-h-[80px] flex flex-col justify-center"
            >
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />
              <div className="font-semibold text-sm sm:text-base">Matchups</div>
            </Link>
            <Link
              to="/records"
              className="bg-white/10 hover:bg-white/20 rounded-lg p-3 sm:p-4 transition-colors min-h-[80px] flex flex-col justify-center"
            >
              <Award className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2" />
              <div className="font-semibold text-sm sm:text-base">Records</div>
            </Link>
          </div>
        </div>
      </div>

      {/* League Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="card text-center cursor-pointer" onClick={handleLeagueClick}>
          <div className="mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24">
            <img
              src={`${import.meta.env.MODE === 'production' ? '/ffu-app' : ''}/league-logos/PremierLogo.png`}
              alt="Premier League Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Premier League</h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            {/* Premier League description */}
          </p>
        </div>

        <div className="card text-center cursor-pointer" onClick={handleLeagueClick}>
          <div className="mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24">
            <img
              src={`${import.meta.env.MODE === 'production' ? '/ffu-app' : ''}/league-logos/MastersLogo.png`}
              alt="Masters League Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Masters League</h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            {/* Masters League description */}
          </p>
        </div>

        <div className="card text-center cursor-pointer" onClick={handleLeagueClick}>
          <div className="mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24">
            <img
              src={`${import.meta.env.MODE === 'production' ? '/ffu-app' : ''}/league-logos/NationalLogo.png`}
              alt="National League Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">National League</h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
            {/* National League description */}
          </p>
        </div>
      </div>

      {showMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-gray-900 text-white px-6 py-4 rounded shadow-lg">
            More coming soon!
          </div>
        </div>
      )}
    </div>
  );
};