import React, { useState } from 'react';
import { Menu, X, Home, Package2, Sparkles, CalendarDays, Heart } from 'lucide-react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { RightPanel } from './RightPanel';
import { Dashboard } from '../pages/Dashboard';
import { Armario } from '../pages/Armario';
import { Generador } from '../pages/Generador';
import { Calendario } from '../pages/Calendario';
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
      case 'dashboard':
        return <Dashboard onNavigate={navigateTo} />;
      case 'armario':
        return <Armario />;
      case 'generador':
        return <Generador />;
      case 'calendario':
        return <Calendario />;
      case 'tienda':
        return <Tienda user={user} />;
      case 'favoritos':
        return <Favoritos />;
      case 'perfil':
        return <Perfil user={user} refreshUser={refreshUser} />;
      case 'settings':
        return <Settings user={user} refreshUser={refreshUser} />;
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  const mobileNavItems = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'armario', label: 'Armario', icon: Package2 },
    { id: 'generador', label: 'Estilista', icon: Sparkles },
    { id: 'calendario', label: 'Calendario', icon: CalendarDays },
    { id: 'favoritos', label: 'Favoritos', icon: Heart }
  ];

  return (
    <div className={`${styles.layout} ${!rightPanelOpen ? styles.rightPanelClosed : ''}`}>
      {(sidebarOpen || (rightPanelOpen && window.innerWidth < 1024)) && (
        <div
          className={styles.mobileOverlay}
          onClick={() => {
            setSidebarOpen(false);
            setRightPanelOpen(false);
          }}
        />
      )}

      <button
        className={styles.mobileToggle}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Abrir menú lateral"
      >
        {sidebarOpen ? <X size={19} /> : <Menu size={19} />}
      </button>

      <aside className={`${styles.sidebarWrapper} ${sidebarOpen ? styles.open : ''}`}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={(p) => {
            navigateTo(p);
            setSidebarOpen(false);
          }}
          onLogout={onLogout}
          user={user}
        />
      </aside>

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

      <aside className={`${styles.rightPanelWrapper} ${rightPanelOpen ? styles.open : ''}`}>
        <RightPanel
          onNavigate={(p) => {
            navigateTo(p);
            setRightPanelOpen(false);
          }}
        />
      </aside>

      {/* Navegación inferior Mobile-First para acceso rápido a Armario y Calendario */}
      <nav className={styles.mobileBottomBar} aria-label="Navegación principal móvil">
        {mobileNavItems.map((item) => {
          const active = currentPage === item.id;
          return (
            <button
              type="button"
              key={item.id}
              className={`${styles.mobileTabBtn} ${active ? styles.mobileTabActive : ''}`}
              onClick={() => navigateTo(item.id)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <Chatbot />
    </div>
  );
};
