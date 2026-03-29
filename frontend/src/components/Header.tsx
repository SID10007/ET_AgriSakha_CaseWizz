import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SignInModal from './SignInModal';
import SignUpModal from './SignUpModal';

const Header: React.FC = () => {
  const { user, isAuthenticated, signOut } = useAuth();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);

  const handleSignOut = () => {
    signOut();
  };

  return (
    <>
      <nav className="sticky top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-8">
              <span className="text-3xl font-extrabold text-[#fccd03] font-sans">
                <img src="/logo.png" alt="AgriSakha Logo" className="h-42 w-48 inline-block align-middle" />
              </span>
              <div className="hidden md:flex space-x-8">
                <a href="#" className="text-white hover:text-[#fccd03] transition-colors font-medium">Home</a>
                <a href="#" className="text-white hover:text-[#fccd03] transition-colors font-medium">Product</a>
                <a href="#" className="text-white hover:text-[#fccd03] transition-colors font-medium">Features</a>
                <a href="#" className="text-white hover:text-[#fccd03] transition-colors font-medium">About</a>
              </div>
            </div>
            
            {/* Authentication Section */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-[#fccd03] font-medium">Welcome, {user?.name.split(' ')[0]}</span>
                  <button 
                    onClick={handleSignOut}
                    className="bg-[#fccd03] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#e3b902] transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setShowSignIn(true)}
                    className="text-white hover:text-[#fccd03] transition-colors px-4 py-2"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => setShowSignUp(true)}
                    className="bg-[#fccd03] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#e3b902] transition-colors"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Sign In Modal */}
      {showSignIn && (
        <SignInModal
          onClose={() => setShowSignIn(false)}
          onSwitchToSignUp={() => {
            setShowSignIn(false);
            setShowSignUp(true);
          }}
        />
      )}

      {/* Sign Up Modal */}
      {showSignUp && (
        <SignUpModal
          onClose={() => setShowSignUp(false)}
          onSwitchToSignIn={() => {
            setShowSignUp(false);
            setShowSignIn(true);
          }}
        />
      )}
    </>
  );
};

export default Header;
