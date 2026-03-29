
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, MessageSquare, Globe } from 'lucide-react';
import { Button } from "@/components/ui/button";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 w-full py-4 px-6 transition-all duration-300 bg-black  ${
      isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm ' : 'bg-transparent '
    }`}>
      <div className="container mx-auto ">
        <div className="flex items-center justify-between ">
          <Link to="/" className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <span className="text-xl text-white font-semibold">AgriSakha.</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-1">
            <Link to="/">
              <Button 
                variant={location.pathname === '/' ? "default" : "ghost"} 
                className="btn-transition text-white"
              >
                Home
              </Button>
            </Link>
            <Link to="/ask">
              <Button 
                variant={location.pathname === '/ask' ? "default" : "ghost"} 
                className="btn-transition"
              >
                Ask Question
              </Button>
            </Link>
            {/* <Link to="/about">
              <Button 
                variant={location.pathname === '/about' ? "default" : "ghost"} 
                className="btn-transition"
              >
                About
              </Button>
            </Link> */}
          </nav>
          
          <div className="flex items-center space-x-2">
            <Link to="/search">
              <Button variant="ghost" size="icon" className="btn-transition rounded-full">
                <Search className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="translate-btn btn-transition rounded-full">
              <Globe className="h-4 w-4 text-white" />
              <span>Translate</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
