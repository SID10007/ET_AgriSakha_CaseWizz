import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black/80 backdrop-blur-md border-t border-white/10 text-white py-4 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-[#fccd03] font-bold">AgriSakha</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-400 text-sm">
              Voice Assisted Rural Empowerment Platform
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <a
              href="#"
              className="text-gray-400 hover:text-[#fccd03] transition-colors text-sm"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-[#fccd03] transition-colors text-sm"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-[#fccd03] transition-colors text-sm"
            >
              Contact
            </a>
            <span className="text-gray-400 text-sm">
              &copy; 2024 AgriSakha
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
