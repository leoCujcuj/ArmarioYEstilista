import React, { useState, useEffect } from 'react'
import './styles/globals.css'
import { MainLayout, Login, Onboarding } from './components'
import { CheckCircle, AlertCircle, Info } from 'lucide-react'
import toastStyles from './components/common/Toast.module.css'

type AppStatus = 'login' | 'onboarding' | 'authenticated';
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

function App() {
  const [status, setStatus] = useState<AppStatus>('login');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Función global para mostrar toasts
  const showToast = (message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000); // 5 segundos
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setStatus('login');
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.error("Error refreshing user", e);
    }
  };

  // Exponer showToast globalmente
  useEffect(() => {
    (window as any).showToast = showToast;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr && userStr !== 'null' && userStr !== 'undefined') {
      try {
        const localUser = JSON.parse(userStr);
        if (localUser) {
          setUser(localUser);
          // Re-validar con el servidor en segundo plano
          refreshUser().then((serverUser) => {
            if (serverUser) {
              if (!serverUser.biometria || !serverUser.biometria.genero) {
                setStatus('onboarding');
              } else {
                setStatus('authenticated');
              }
            }
          });
          
          if (!localUser.biometria || !localUser.biometria.genero) {
            setStatus('onboarding');
          } else {
            setStatus('authenticated');
          }
        } else {
          setStatus('login');
        }
      } catch (e) {
        console.error("Error parsing user from storage", e);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setStatus('login');
      }
    } else {
      setStatus('login');
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
    showToast(`Bienvenido de nuevo, ${userData.nombre}`);
    if (!userData.biometria || !userData.biometria.genero) {
      setStatus('onboarding');
    } else {
      setStatus('authenticated');
    }
  };

  const handleOnboardingComplete = async (data: any) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/auth/onboarding`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const biometria = await response.json();
        const updatedUser = { ...user, biometria };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        showToast('Perfil configurado correctamente');
        setStatus('authenticated');
      }
    } catch (error) {
      showToast('Error al guardar preferencias', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setStatus('login');
    showToast('Sesión cerrada', 'info');
  };

  if (loading) return null;

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {status === 'login' && (
        <Login onLogin={handleLogin} />
      )}
      
      {status === 'onboarding' && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}
      
      {status === 'authenticated' && (
        <MainLayout onLogout={handleLogout} user={user} refreshUser={refreshUser} />
      )}

      {/* Contenedor de Toasts */}
      <div className={toastStyles.toastContainer}>
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`${toastStyles.toast} ${toastStyles[toast.type]}`}
            onClick={() => removeToast(toast.id)}
            style={{ cursor: 'pointer' }}
          >
            <span className={toastStyles.icon}>
              {toast.type === 'success' && <CheckCircle size={20} />}
              {toast.type === 'error' && <AlertCircle size={20} />}
              {toast.type === 'info' && <Info size={20} />}
            </span>
            <span className={toastStyles.message}>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
