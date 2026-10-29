import React from 'react';
import {
  Home,
  Package2,
  Sparkles,
  CalendarDays,
  Heart,
  ShoppingBag,
  User,
  Settings,
  LogOut
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  user: any;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, onLogout, user }) => {
  const mainItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, badge: null },
    { id: 'armario', label: 'Mi armario', icon: Package2, badge: null },
    { id: 'generador', label: 'Estilista IA', icon: Sparkles, badge: null },
    { id: 'calendario', label: 'Calendario y Analítica', icon: CalendarDays, badge: null },
    { id: 'favoritos', label: 'Favoritos', icon: Heart, badge: null },
    { id: 'tienda', label: 'Asesor Compras', icon: ShoppingBag, badge: null }
  ];

  const accountItems = [
    { id: 'perfil', label: 'Mi perfil', icon: User },
    { id: 'settings', label: 'Configuración', icon: Settings }
  ];

  const displayUser = {
    nombre: user?.nombre || 'Usuario',
    fotoUrl: user?.fotoUrl
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.brandBlock}>
        <span className={styles.brandDot} />
        <div>
          <div className={styles.brandName}>Atelier IA</div>
          <div className={styles.brandSub}>Armario & Estilismo</div>
        </div>
      </div>

      <div className={styles.sidebarSection}>
        <div className={styles.sectionLabel}>Estudio</div>
        {mainItems.map((item) => (
          <button
            key={item.id}
            className={`${styles.navItem} ${currentPage === item.id ? styles.active : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className={styles.navIcon}>
              <item.icon size={16} />
            </span>
            <span className={styles.label}>{item.label}</span>
            {item.badge && <span className={styles.badge}>{item.badge}</span>}
          </button>
        ))}
      </div>

      <div className={styles.sidebarSection}>
        <div className={styles.sectionLabel}>Cuenta</div>
        {accountItems.map((item) => (
          <button
            key={item.id}
            className={`${styles.navItem} ${currentPage === item.id ? styles.active : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className={styles.navIcon}>
              <item.icon size={16} />
            </span>
            <span className={styles.label}>{item.label}</span>
          </button>
        ))}

        <button
          className={styles.navItem}
          onClick={onLogout}
          style={{ color: 'var(--danger)', marginTop: '8px' }}
        >
          <span className={styles.navIcon}>
            <LogOut size={16} />
          </span>
          <span className={styles.label}>Cerrar Sesión</span>
        </button>
      </div>

      <div className={styles.sidebarFooter}>
        <div className={styles.profileMini} onClick={() => onNavigate('perfil')}>
          <div
            className={styles.avatar}
            style={
              displayUser.fotoUrl
                ? {
                    backgroundImage: `url(${displayUser.fotoUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    fontSize: 0
                  }
                : {}
            }
          >
            {!displayUser.fotoUrl && (displayUser.nombre || 'U').substring(0, 2).toUpperCase()}
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>{displayUser.nombre}</div>
            <div className={styles.profilePlan}>Perfil Sartorial Activo</div>
          </div>
        </div>
      </div>
    </div>
  );
};
