import React, { useEffect } from 'react';
import { useError } from '../contexts/ErrorContext';
import { XCircleIcon } from './IconComponents';

const ErrorToast: React.FC = () => {
  const { error, setError } = useError();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 8000); // Auto-dismiss after 8 seconds
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  if (!error) {
    return null;
  }

  return (
    <div className="fixed top-5 right-5 max-w-sm w-full bg-red-500 text-white p-4 rounded-lg shadow-lg z-50 animate-fade-in-scale">
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          <XCircleIcon className="w-6 h-6" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-semibold">Error</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
        <button
          onClick={() => setError(null)}
          className="ml-4 -mr-1 -mt-1 p-1 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ErrorToast;
