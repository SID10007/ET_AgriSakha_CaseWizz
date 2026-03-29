import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSidebar } from './SidebarContext';

interface SidebarProps {
  activePage?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage = 'home' }) => {
  const { isCollapsed, toggleSidebar } = useSidebar();

  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠', href: '/' },
    { id: 'rural-financial-news', label: 'Financial News', icon: '📰', href: '/rural-financial-news' },
    { id: 'budget-assistant', label: 'Budget Assistant', icon: '💰', href: '/budget-assistant' },
    { id: 'loan-assistant', label: 'Loan Assistant', icon: '💳', href: '/loan-assistant' },
    { id: 'agri-assistant', label: 'Agricultural Advisor', icon: '📈', href: '/agri-assistant' },
    { id: 'community', label: 'Community', icon: '💬', href: 'http://localhost:8080/' },
  ];

  return (
    <div 
      className={`fixed top-0 left-0 h-screen bg-gradient-to-b from-black to-gray-900 border-r border-white/10 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-21 cursor-pointer' : 'w-64'
      }`}
      style={{ borderRadius: '0 1rem 1rem 0' }}
      onClick={isCollapsed ? toggleSidebar : undefined}
    >
      {/* Top Section with Logo and Toggle Button */}
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        {/* Logo */}
        <div className="flex items-center">
          <div className="w-10 h-10 bg-[#fccd03] rounded-full flex items-center justify-center">
            <span className="text-black text-lg font-bold">A</span>
          </div>
          {!isCollapsed && (
            <span className="ml-3 text-[#fccd03] font-bold text-lg">Features</span>
          )}
        </div>
        
        {/* Toggle Button */}
        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-all duration-200"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <div className="p-4">        
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className={`group relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                activePage === item.id
                  ? 'bg-white text-gray-800 shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {!isCollapsed && (
                <span className="font-medium">{item.label}</span>
              )}
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </a>
          ))}
        </nav>
      </div>

      {/* Collapsed State Toggle Button */}
      {isCollapsed && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-all duration-200"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
