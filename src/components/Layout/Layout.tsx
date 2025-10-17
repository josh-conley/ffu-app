import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col transition-colors">
      <Header />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <footer className="bg-white border-t border-gray-200 mt-12 transition-colors footer-custom">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © 2025 Fantasy Football Union. Built with Sleeper API and Claude Code.
          </p>
        </div>
      </footer>
    </div>
  );
};