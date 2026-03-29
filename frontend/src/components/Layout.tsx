import React from 'react';
import { SidebarProvider, useSidebar } from './SidebarContext';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
  activePage?: string;
}

const LayoutContent: React.FC<LayoutProps> = ({ children, activePage = 'home' }) => {
  const { sidebarWidth } = useSidebar();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-black via-gray-900 to-[#fccd03]/30">
      <Sidebar activePage={activePage} />
      
      {/* Main Content with dynamic margin */}
      <div 
        className="flex-1 transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <Header />
        {children}
      </div>
      
      <Footer />
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, activePage }) => {
  return (
    <SidebarProvider>
      <LayoutContent activePage={activePage}>
        {children}
      </LayoutContent>
    </SidebarProvider>
  );
};

export default Layout;
