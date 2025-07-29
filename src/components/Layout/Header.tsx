import { Link, useLocation } from 'react-router-dom';
import { Users, Calendar, BarChart3, Award, Menu, X, UserPlus, TrendingUp } from 'lucide-react';
import { ThemeToggle } from '../Common/ThemeToggle';
import { useState } from 'react';

export const Header = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/standings', label: 'Standings', icon: Users },
    { path: '/players', label: 'Members', icon: BarChart3 },
    { path: '/matchups', label: 'Matchups', icon: Calendar },
    { path: '/drafts', label: 'Drafts', icon: UserPlus },
    { path: '/draft-trends', label: 'Trends', icon: TrendingUp },
    { path: '/records', label: 'Records', icon: Award },
  ];

  return (
    <header className="bg-ffu-black shadow-xl border-b-4 border-ffu-red transition-colors relative">
      <div className="absolute inset-0 bg-ffu-black"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-4 group">
              <div className="relative">
                <img 
                  src={`${import.meta.env.MODE === 'production' ? '/ffu-app' : ''}/league-logos/NationalLogo.png`}
                  alt="FFU Logo"
                  className="h-12 w-12 sm:h-16 sm:w-16 object-contain transition-all duration-300"
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-black text-white ffu-text-gradient tracking-wide italic">FFU</h1>
                <p className="text-xs sm:text-sm text-gray-300 font-semibold tracking-wider uppercase">Fantasy Football Union</p>
              </div>
            </Link>
          </div>
          
          <nav className="hidden lg:flex space-x-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-bold transition-all duration-300 relative group angular-cut-16 ${
                  location.pathname === path
                    ? 'bg-ffu-red text-white shadow-lg ffu-shadow'
                    : 'text-gray-300 hover:text-white hover:bg-ffu-red/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="tracking-wide uppercase">{label}</span>
                {location.pathname !== path && (
                  <div className="absolute inset-0 bg-ffu-red opacity-0 group-hover:opacity-10 transition-opacity duration-300 angular-cut-16"></div>
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-300 hover:text-white hover:bg-ffu-red/50 p-3 angular-cut-16 transition-all duration-300"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t-2 border-ffu-red bg-ffu-black">
            <div className="px-4 py-3 space-y-2">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-4 text-base font-bold transition-all duration-300 angular-cut-16 ${
                    location.pathname === path
                      ? 'bg-ffu-red text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-ffu-red/50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="tracking-wide uppercase">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};