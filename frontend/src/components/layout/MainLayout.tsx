import React, { useState } from 'react';
import { Menu, X, PanelRight } from 'lucide-react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { RightPanel } from './RightPanel';
import { Dashboard } from '../pages/Dashboard';
import { Armario } from '../pages/Armario';
import { Generador } from '../pages/Generador';
import { Favoritos } from '../pages/Favoritos';
import { Tienda } from '../pages/Tienda';
import { Perfil } from '../pages/Perfil';
import { Settings } from '../pages/Settings';
import { Chatbot } from '../common/Chatbot';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  user: any;
  onLogout: () => void;
  refreshUser: () => Promise<any>;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ user, onLogout, refreshUser }) => {
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('lastSection') || 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  const navigateTo = (page: string) => {
    setCurrentPage(page);
    localStorage.setItem('lastSection', page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'armario': return <Armario />;
      case 'generador': return <Generador />;
      case 'tienda': return <Tienda user={user} />;
      case 'favoritos': return <Favoritos />;
      case 'perfil': return <Perfil user={user} refreshUser={refreshUser} />;
      case 'settings': return <Settings user={user} refreshUser={refreshUser} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className={`${styles.layout} ${!rightPanelOpen ? styles.rightPanelClosed : ''}`}>
      {/* Overlay Global */}
      {(sidebarOpen || (rightPanelOpen && window.innerWidth < 1024)) && (
        <div 
          className={styles.mobileOverlay} 
          onClick={() => { setSidebarOpen(false); setRightPanelOpen(false); }} 
        />
      )}

      {/* Botones Móviles */}
      <button className={styles.mobileToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`${styles.sidebarWrapper} ${sidebarOpen ? styles.open : ''}`}>
        <Sidebar 
          currentPage={currentPage} 
          onNavigate={(p) => { navigateTo(p); setSidebarOpen(false); }} 
          onLogout={onLogout} 
          user={user} 
        />
      </aside>

      {/* Main Content */}
      <div className={styles.mainContainer}>
        <Topbar 
          user={user} 
          currentPage={currentPage}
          onNavigate={(page) => navigateTo(page)}
          rightPanelOpen={rightPanelOpen} 
          onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)} 
        />
        <main className={styles.content}>{renderPage()}</main>
      </div>

      {/* Right Panel */}
      <aside className={`${styles.rightPanelWrapper} ${rightPanelOpen ? styles.open : ''}`}>
        <RightPanel onNavigate={(p) => { navigateTo(p); setRightPanelOpen(false); }} />
      </aside>
      <Chatbot />
    </div>
  );
};
