
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl mb-6">Oops! Page not found</p>
        <Link 
          to="/" 
          className="bg-purple hover:bg-purple-light text-white font-bold py-2 px-6 rounded-full"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
