import React, { useState, useEffect } from 'react';
import { Trash2, Heart, Sparkles, Shirt, Calendar, LayoutGrid, StretchHorizontal, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import styles from './Favoritos.module.css';

const showToast = (msg: string, type?: any) => (window as any).showToast?.(msg, type);

export const Favoritos: React.FC = () => {
  const [looks, setLooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>(() => {
    return (localStorage.getItem('favsViewMode') as 'compact' | 'detailed') || 'detailed';
  });

  useEffect(() => {
    localStorage.setItem('favsViewMode', viewMode);
  }, [viewMode]);

  const fetchLooks = async () => {
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const res = await fetch(`${API_URL}/api/looks/saved`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLooks(data);
      }
    } catch (e) {
      showToast('Error al cargar favoritos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const markAsUsed = async (look: any) => {
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const response = await fetch(`${API_URL}/api/uso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          prendasIds: look.prendas.map((p: any) => p._id),
          lookId: look._id,
          fecha: new Date()
        })
      });
      if (response.ok) {
        Swal.fire({
          title: '¡Look registrado!',
          text: 'Se ha guardado en tu historial de uso. ¡Que tengas un gran día!',
          icon: 'success',
          background: '#1a1a1a',
          color: '#ffffff',
          confirmButtonColor: '#c8a97e'
        });
      }
    } catch (e) {
      showToast('Error al registrar uso', 'error');
    }
  };

  const deleteLook = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar de favoritos?',
      text: "Esta propuesta se quitará de tu colección personal.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c0614a',
      cancelButtonColor: '#222222',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#111111',
      color: '#f0ece4',
      backdrop: 'rgba(0,0,0,0.8)'
    });

    if (result.isConfirmed) {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      try {
        const res = await fetch(`${API_URL}/api/looks/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setLooks(prev => prev.filter(l => l._id !== id));
          Swal.fire({
            title: 'Eliminado',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
            background: '#111111',
            color: '#f0ece4'
          });
        }
      } catch (e) {
        showToast('Error al eliminar', 'error');
      }
    }
  };

  useEffect(() => { fetchLooks(); }, []);

  if (loading) return <div className={styles.loading}>Organizando tus favoritos...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Colección de Favoritos</div>
          <div className={styles.pageSubtitle}>Tus combinaciones inteligentes guardadas</div>
        </div>
        
        <div className={styles.controls}>
          <div className={styles.viewToggle}>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'compact' ? styles.active : ''}`}
              onClick={() => setViewMode('compact')}
              title="Vista Compacta"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'detailed' ? styles.active : ''}`}
              onClick={() => setViewMode('detailed')}
              title="Vista Detallada"
            >
              <StretchHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>

      {looks.length === 0 ? (
        <div className={styles.empty}>
          <Heart size={48} color="var(--muted)" style={{ marginBottom: '20px' }} />
          <h3>Tu colección está vacía</h3>
          <p>Explora el generador para guardar tus primeros looks.</p>
        </div>
      ) : (
        <div className={`${styles.looksGrid} ${styles[viewMode]}`}>
          {looks.map((look) => (
            <Card key={look._id} className={styles.lookCard}>
              <div className={styles.lookHeader}>
                <div className={styles.lookBadge}>{look.ocasion || 'Estilo'}</div>
                <button className={styles.deleteBtn} onClick={() => deleteLook(look._id)}>
                  <Trash2 size={18} />
                </button>
              </div>

              <div className={styles.lookItems}>
                {look.prendas && look.prendas.map((prenda: any) => (
                  <div key={prenda._id} className={styles.miniItem}>
                    <img 
                      src={prenda.url_imagen_limpia} 
                      alt={prenda.nombre} 
                      title={prenda.nombre}
                      onError={(e: any) => e.target.src = 'https://via.placeholder.com/150?text=Prenda'}
                    />
                  </div>
                ))}
              </div>

              <div className={styles.lookInfo}>
                <div className={styles.lookDate}>
                  <Calendar size={12} /> {new Date(look.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                </div>
                <p className={styles.lookDesc}>{look.explicacion}</p>
                <div className={styles.lookTags}>
                  <span className={styles.tag}><Shirt size={10} /> {look.prendas?.length || 0} piezas</span>
                  <span className={styles.tag}><Sparkles size={10} /> IA Select</span>
                </div>

                <div style={{ marginTop: '15px' }}>
                  <Button 
                    size="sm" 
                    icon={<CheckCircle2 size={14} />} 
                    onClick={() => markAsUsed(look)}
                    style={{ width: '100%', backgroundColor: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', border: '1px solid rgba(46, 204, 113, 0.3)' }}
                  >
                    Marcar como usado hoy
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
