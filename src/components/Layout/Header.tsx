import { Link, useLocation } from 'react-router-dom';
import { Trophy, Users, Calendar, BarChart3 } from 'lucide-react';
import { ThemeToggle } from '../Common/ThemeToggle';

export const Header = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Overview', icon: Trophy },
    { path: '/standings', label: 'Standings', icon: Users },
    { path: '/players', label: 'Members', icon: BarChart3 },
    { path: '/matchups', label: 'Matchups', icon: Calendar },
  ];

  return (
    <header className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <Trophy className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FFU</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Fantasy Football Union</p>
              </div>
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === path
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {/* Mobile menu button - you can expand this later */}
            <div className="md:hidden">
              <button className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};