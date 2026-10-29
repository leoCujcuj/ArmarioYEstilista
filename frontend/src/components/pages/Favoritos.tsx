import React, { useState, useEffect, useMemo } from 'react';
import {
  Trash2,
  Heart,
  Sparkles,
  Shirt,
  Calendar,
  LayoutGrid,
  StretchHorizontal,
  CheckCircle2
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { AssignCalendarModal } from '../common/AssignCalendarModal';
import { LookItem, optimizarImagenUrl } from '../../types/armario';
import styles from './Favoritos.module.css';

const showToast = (msg: string, type?: 'success' | 'error' | 'info') =>
  (window as unknown as { showToast?: (m: string, t?: string) => void }).showToast?.(msg, type);

export const Favoritos: React.FC = () => {
  const [looks, setLooks] = useState<LookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [occFilter, setOccFilter] = useState<string>('Todas');
  const [lookToAssign, setLookToAssign] = useState<LookItem | null>(null);
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
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data: LookItem[] = await res.json();
        setLooks(data);
      }
    } catch (e) {
      showToast('Error al cargar favoritos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const markAsUsedToday = async (look: LookItem) => {
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const response = await fetch(`${API_URL}/api/calendario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          prendasIds: look.prendas.map((p) => p._id),
          lookId: look._id,
          ocasion: look.ocasion || 'Casual',
          estado: 'usado'
        })
      });
      if (response.ok) {
        showToast('Outfit registrado hoy en tu Calendario OOTD', 'success');
      }
    } catch (e) {
      showToast('Error al registrar uso', 'error');
    }
  };

  const deleteLook = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar de favoritos?',
      text: 'Esta combinación se quitará de tu colección guardada.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c9644e',
      cancelButtonColor: '#222228',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#111114',
      color: '#f3efe8',
      backdrop: 'rgba(0,0,0,0.82)'
    });

    if (result.isConfirmed) {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      try {
        const res = await fetch(`${API_URL}/api/looks/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setLooks((prev) => prev.filter((l) => l._id !== id));
          showToast('Combinación eliminada de favoritos', 'info');
        }
      } catch (e) {
        showToast('Error al eliminar', 'error');
      }
    }
  };

  useEffect(() => {
    fetchLooks();
  }, []);

  const ocasionesEnFavoritos = useMemo(() => {
    const set = new Set<string>(['Todas']);
    looks.forEach((l) => {
      if (l.ocasion) set.add(l.ocasion);
    });
    return Array.from(set);
  }, [looks]);

  const looksFiltrados = useMemo(() => {
    if (occFilter === 'Todas') return looks;
    return looks.filter((l) => l.ocasion === occFilter);
  }, [looks, occFilter]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className="skeletonShimmer" style={{ height: '42px', width: '280px', marginBottom: '24px' }} />
        <div className={`${styles.looksGrid} ${styles.detailed}`}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeletonShimmer" style={{ height: '320px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <span className={styles.overline}>Archivo de Combinaciones</span>
          <h1 className={styles.pageTitle}>Colección de Favoritos</h1>
          <div className={styles.pageSubtitle}>
            Tus outfits curados listos para asignar a fechas del calendario
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'compact' ? styles.active : ''}`}
              onClick={() => setViewMode('compact')}
              title="Vista Compacta"
            >
              <LayoutGrid size={17} />
            </button>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'detailed' ? styles.active : ''}`}
              onClick={() => setViewMode('detailed')}
              title="Vista Detallada"
            >
              <StretchHorizontal size={17} />
            </button>
          </div>
        </div>
      </div>

      {looks.length > 0 && (
        <div className={styles.occFilterRow}>
          {ocasionesEnFavoritos.map((occ) => (
            <button
              type="button"
              key={occ}
              className={`${styles.occChip} ${occFilter === occ ? styles.occChipActive : ''}`}
              onClick={() => setOccFilter(occ)}
            >
              {occ}
            </button>
          ))}
        </div>
      )}

      {looksFiltrados.length === 0 ? (
        <div className={styles.empty}>
          <Heart size={44} color="var(--accent)" style={{ marginBottom: '16px' }} />
          <h3>Tu colección está vacía</h3>
          <p>Genera o arma tus primeros outfits en el Estilista IA para guardarlos y agendarlos aquí.</p>
        </div>
      ) : (
        <div className={`${styles.looksGrid} ${styles[viewMode]}`}>
          {looksFiltrados.map((look) => (
            <Card key={look._id} className={styles.lookCard}>
              <div className={styles.lookHeader}>
                <div className={styles.lookBadge}>{look.ocasion || 'Casual'}</div>
                <button className={styles.deleteBtn} onClick={() => deleteLook(look._id)} title="Eliminar favorito">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className={styles.lookItems}>
                {(look.prendas || []).map((prenda) => (
                  <div key={prenda._id} className={styles.miniItem}>
                    <img
                      src={optimizarImagenUrl(prenda.url_imagen_limpia, 220)}
                      alt={prenda.nombre}
                      title={`${prenda.nombre}${prenda.marca && prenda.marca !== 'Sin marca' ? ` · ${prenda.marca}` : ''}`}
                    />
                  </div>
                ))}
              </div>

              <div className={styles.lookInfo}>
                <div className={styles.lookDate}>
                  <Calendar size={12} />
                  <span>
                    {look.createdAt
                      ? new Date(look.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
                      : 'Guardado'}
                  </span>
                </div>

                {look.explicacion && <p className={styles.lookDesc}>{look.explicacion}</p>}

                <div className={styles.lookTags}>
                  <span className={styles.tag}>
                    <Shirt size={11} /> {look.prendas?.length || 0} piezas
                  </span>
                  {look.score?.color ? (
                    <span className={styles.tag}>
                      <Sparkles size={11} /> {look.score.color}% armonía
                    </span>
                  ) : null}
                </div>

                <div className={styles.actionRow}>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Calendar size={14} />}
                    onClick={() => setLookToAssign(look)}
                  >
                    Asignar Fecha
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<CheckCircle2 size={14} />}
                    onClick={() => markAsUsedToday(look)}
                    style={{ borderColor: 'rgba(94, 168, 116, 0.45)', color: '#82ce98' }}
                  >
                    Usado hoy
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de asignación directa a fecha del calendario */}
      <AssignCalendarModal
        isOpen={Boolean(lookToAssign)}
        onClose={() => setLookToAssign(null)}
        prendas={lookToAssign?.prendas || []}
        lookId={lookToAssign?._id || null}
        defaultOcasion={lookToAssign?.ocasion || 'Casual'}
      />
    </div>
  );
};
