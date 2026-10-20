import React, { useState, useEffect } from 'react';
import { Globe, Sparkles, Lock, MapPin, Save } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import styles from './Perfil.module.css';

const showToast = (msg: string, type?: any) => (window as any).showToast?.(msg, type);

interface SettingsProps {
  user: any;
  refreshUser: () => Promise<any>;
}

export const Settings: React.FC<SettingsProps> = ({ user, refreshUser }) => {
  const [formData, setFormData] = useState({
    idioma: user?.settings?.idioma || 'es',
    atrevimiento: user?.settings?.atrevimiento || 50,
    direccion: user?.direccion || ''
  });

  const [passwords, setPasswords] = useState({
    actual: '',
    nueva: '',
    confirmar: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        idioma: user.settings?.idioma || 'es',
        atrevimiento: user.settings?.atrevimiento || 50,
        direccion: user.direccion || ''
      });
    }
  }, [user]);

  const handleChangePassword = async () => {
    if (!passwords.actual || !passwords.nueva || !passwords.confirmar) {
      showToast('Por favor completa todos los campos de contraseña', 'info');
      return;
    }

    if (passwords.nueva.length < 6) {
      showToast('La nueva contraseña debe tener al menos 6 caracteres', 'info');
      return;
    }

    if (passwords.nueva !== passwords.confirmar) {
      showToast('La nueva contraseña y su confirmación no coinciden', 'error');
      return;
    }

    setChangingPassword(true);
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    try {
      const res = await fetch(`${API_URL}/api/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          passwordActual: passwords.actual,
          passwordNuevo: passwords.nueva
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Contraseña actualizada con éxito', 'success');
        setPasswords({ actual: '', nueva: '', confirmar: '' });
      } else {
        showToast(data.error || 'Error al cambiar la contraseña', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al cambiar la contraseña', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          direccion: formData.direccion,
          settings: { 
            idioma: formData.idioma, 
            atrevimiento: formData.atrevimiento 
          } 
        })
      });
      if (response.ok) {
        showToast('Configuración guardada correctamente');
        // Guardamos en localStorage para el motor de clima
        localStorage.setItem('weatherCity', formData.direccion);
        await refreshUser();
        // Disparamos evento para que el RightPanel se entere
        window.dispatchEvent(new Event('locationUpdated'));
      }
    } catch (e) {
      showToast('Error al guardar', 'error');
    }
  };

  if (!user) return <div style={{ padding: '50px', textAlign: 'center', color: 'var(--muted)' }}>Cargando...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>Configuración</div>
      <div className={styles.pageSubtitle}>Gestiona tus preferencias globales y ubicación</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px', marginTop: '30px' }}>
        
        {/* Ubicación y Mercado */}
        <Card style={{ padding: '24px', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(200, 169, 126, 0.1)', padding: '10px', borderRadius: '12px', color: 'var(--accent)' }}>
              <MapPin size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: 'var(--text)' }}>Ubicación</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>Define tu ciudad para clima y moneda.</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <label className={styles.labelSmall}>Ciudad, País</label>
             <input 
                className={styles.input} 
                style={{ background: '#000000', marginBottom: 0 }}
                value={formData.direccion}
                onChange={e => setFormData({...formData, direccion: e.target.value})}
                placeholder="Ej: Madrid, España"
             />
             <p style={{ fontSize: '0.7rem', color: 'var(--muted2)' }}>Esto actualizará el clima y la divisa de la tienda automáticamente.</p>
          </div>
        </Card>

        {/* IA y Estilo */}
        <Card style={{ padding: '24px', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(200, 169, 126, 0.1)', padding: '10px', borderRadius: '12px', color: 'var(--accent)' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: 'var(--text)' }}>Motor de IA</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>Atrevimiento de las propuestas.</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.85rem' }}>
            <span>Clásico</span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{formData.atrevimiento}%</span>
            <span>Atrevido</span>
          </div>
          <input 
            type="range" 
            style={{ width: '100%', accentColor: 'var(--accent)' }}
            value={formData.atrevimiento}
            onChange={e => setFormData({...formData, atrevimiento: parseInt(e.target.value)})}
          />
        </Card>

        {/* Idioma */}
        <Card style={{ padding: '24px', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(74, 126, 181, 0.1)', padding: '10px', borderRadius: '12px', color: 'var(--info)' }}>
              <Globe size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: 'var(--text)' }}>Idioma</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>Interfaz del sistema.</p>
            </div>
          </div>
          <select 
            className={styles.input} 
            style={{ background: '#000000' }}
            value={formData.idioma}
            onChange={e => setFormData({...formData, idioma: e.target.value})}
          >
            <option value="es">Español</option>
            <option value="en">English (Beta)</option>
          </select>
        </Card>

        {/* Seguridad y Cambio de Contraseña */}
        <Card style={{ padding: '24px', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(200, 169, 126, 0.1)', padding: '10px', borderRadius: '12px', color: 'var(--accent)' }}>
              <Lock size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: 'var(--text)' }}>Seguridad</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>Actualiza tu contraseña de acceso.</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input 
              type="password"
              className={styles.input}
              style={{ background: '#000000', marginBottom: 0 }}
              placeholder="Contraseña actual"
              value={passwords.actual}
              onChange={e => setPasswords({ ...passwords, actual: e.target.value })}
            />
            <input 
              type="password"
              className={styles.input}
              style={{ background: '#000000', marginBottom: 0 }}
              placeholder="Nueva contraseña (mínimo 6 caracteres)"
              value={passwords.nueva}
              onChange={e => setPasswords({ ...passwords, nueva: e.target.value })}
            />
            <input 
              type="password"
              className={styles.input}
              style={{ background: '#000000', marginBottom: 0 }}
              placeholder="Confirmar nueva contraseña"
              value={passwords.confirmar}
              onChange={e => setPasswords({ ...passwords, confirmar: e.target.value })}
            />
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleChangePassword} 
              disabled={changingPassword}
              style={{ marginTop: '5px', width: '100%', justifyContent: 'center' }}
            >
              {changingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
            </Button>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
         <Button icon={<Save size={18} />} onClick={handleSave}>Guardar Cambios Globales</Button>
      </div>
    </div>
  );
};
