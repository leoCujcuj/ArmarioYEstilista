import React, { useState, useEffect } from 'react';
import { Home, Package2, Sparkles, ShoppingBag, Heart, User, Cloud, Bell, X, LogOut, Settings as SettingsIcon, PanelRight } from 'lucide-react';
import styles from './Topbar.module.css';

interface TopbarProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
  user: any;
  rightPanelOpen?: boolean;
  onToggleRightPanel?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ currentPage, onNavigate, user, rightPanelOpen, onToggleRightPanel }) => {
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: '¡Bienvenido! Completa tu perfil para mejores recomendaciones.', time: 'Reciente' },
    { id: 2, text: 'Nueva tendencia "Minimalismo" añadida a la tienda.', time: 'Hace 1 hora' }
  ]);
  const [hasNew, setHasNew] = useState(true);

  const handleOpenNotif = () => {
    setShowNotif(!showNotif);
    setHasNew(false);
  };

  const removeNotif = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  return (
    <div className={styles.topbar}>
      <div className={styles.logo}>
        <div className={styles.logoDot}></div>
        Armario
      </div>

      <div className={styles.topbarRight}>
        <div style={{ position: 'relative' }}>
          <button 
            className={`${styles.notifBtn} ${rightPanelOpen ? styles.activeToggle : ''}`} 
            onClick={onToggleRightPanel}
            title={rightPanelOpen ? "Ocultar panel" : "Mostrar panel"}
          >
            <PanelRight size={18} />
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <button className={styles.notifBtn} onClick={handleOpenNotif}>
            <Bell size={18} />
            {hasNew && notifications.length > 0 && <div className={styles.notifBadge}></div>}
          </button>
          
          {showNotif && (
            <div className={styles.dropdown} style={{ right: 0, width: '280px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent)' }}>Notificaciones</h4>
                {notifications.length > 0 && (
                  <button onClick={() => setNotifications([])} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.7rem', cursor: 'pointer' }}>Limpiar todo</button>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifications.length > 0 ? notifications.map(n => (
                  <div key={n.id} style={{ position: 'relative', background: 'var(--surface2)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '0.8rem', paddingRight: '20px', lineHeight: '1.4' }}>{n.text}</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted2)' }}>{n.time}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeNotif(n.id); }}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)', fontSize: '0.8rem' }}>No tienes notificaciones pendientes.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <div 
            className={styles.avatar} 
            onClick={() => setShowProfile(!showProfile)} 
            style={{ 
              cursor: 'pointer',
              backgroundImage: user?.fotoUrl ? `url(${user.fotoUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: user?.fotoUrl ? 0 : '0.8rem',
              fontWeight: 600
            }}
          >
            {!user?.fotoUrl && (user?.nombre?.substring(0, 2).toUpperCase() || 'U')}
          </div>
          
          {showProfile && (
            <div className={styles.dropdown} style={{ right: 0, width: '180px' }}>
              <div style={{ padding: '5px 10px 12px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.nombre}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{user?.email}</div>
              </div>
              <button 
                onClick={() => { setShowProfile(false); onNavigate?.('perfil'); }}
                className={styles.dropdownItem}
              >
                <User size={14} /> Mi Perfil
              </button>
              <button 
                onClick={() => { setShowProfile(false); onNavigate?.('settings'); }}
                className={styles.dropdownItem}
              >
                <SettingsIcon size={14} /> Configuración
              </button>
              <button 
                onClick={handleLogout}
                className={styles.dropdownItem}
                style={{ color: 'var(--danger)', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}
              >
                <LogOut size={14} /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
