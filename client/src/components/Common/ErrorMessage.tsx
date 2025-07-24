import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  error: string;
  className?: string;
}

export const ErrorMessage = ({ error, className = '' }: ErrorMessageProps) => {
  return (
    <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 transition-colors ${className}`}>
      <div className="flex">
        <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    </div>
  );
};