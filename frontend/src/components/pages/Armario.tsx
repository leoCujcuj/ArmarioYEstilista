import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Edit3, Trash2, Save, LayoutGrid, StretchHorizontal, Camera, Loader2 } from 'lucide-react';
import { Button } from '../common/Button';
import { Tag } from '../common/Tag';
import styles from './Armario.module.css';
import UploadPrenda from '../wardrobe/UploadPrenda';
import Swal from 'sweetalert2';

type ViewMode = 'compact' | 'detailed';

const showToast = (msg: string, type?: any) => (window as any).showToast?.(msg, type);

export const Armario: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('todo');
  const [searchQuery, setSearchQuery] = useState('');
  const [prendas, setPrendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [editingPrenda, setEditingPrenda] = useState<any | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('closetViewMode') as ViewMode) || 'detailed';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const filters = ['todo', 'Top', 'Bottom', 'Outerwear', 'Shoes', 'Accessories'];

  useEffect(() => {
    localStorage.setItem('closetViewMode', viewMode);
  }, [viewMode]);

  const fetchPrendas = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const response = await fetch(`${API_URL}/api/prendas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPrendas(data);
      }
    } catch (error) {
      showToast('Error al cargar el armario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getOptimizedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('res.cloudinary.com') && !url.includes('upload/w_')) {
      return url.replace('/upload/', '/upload/w_400,q_auto,f_auto/');
    }
    return url;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const response = await fetch(`${API_URL}/api/prendas/${editingPrenda._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(editingPrenda)
      });
      if (response.ok) {
        setEditingPrenda(null);
        showToast('Prenda actualizada');
        fetchPrendas();
      }
    } catch (error) {
      showToast('Error al actualizar', 'error');
    }
  };

  const handleImageUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPrenda) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('imagen', file);

    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    try {
      const response = await fetch(`${API_URL}/api/prendas/${editingPrenda._id}/imagen`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const updatedPrenda = await response.json();
        setEditingPrenda(updatedPrenda);
        showToast('Imagen actualizada con éxito');
        fetchPrendas();
      } else {
        showToast('Error al procesar la imagen', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar prenda?',
      text: "Esta acción no se puede deshacer.",
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
        const response = await fetch(`${API_URL}/api/prendas/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          showToast('Prenda eliminada', 'info');
          fetchPrendas();
        }
      } catch (error) {
        showToast('Error al eliminar', 'error');
      }
    }
  };

  useEffect(() => {
    fetchPrendas();
  }, []);

  const filteredPrendas = prendas.filter(p => {
    const matchesCategory = activeFilter === 'todo' || p.categoria === activeFilter;
    if (!matchesCategory) return false;
    
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const searchString = `
      ${p.nombre || ''} 
      ${p.categoria || ''} 
      ${p.color_principal || ''} 
      ${p.estilo || ''} 
      ${(p.tags_ia || []).join(' ')}
    `.toLowerCase();
    
    return searchString.includes(query);
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.pageTitle}>Mi Armario Digital</div>
        <div className={styles.controls}>
          <div className={styles.viewToggle}>
            <button className={`${styles.toggleBtn} ${viewMode === 'compact' ? styles.active : ''}`} onClick={() => setViewMode('compact')}><LayoutGrid size={18} /></button>
            <button className={`${styles.toggleBtn} ${viewMode === 'detailed' ? styles.active : ''}`} onClick={() => setViewMode('detailed')}><StretchHorizontal size={18} /></button>
          </div>
          <Button icon={<Plus size={18} />} onClick={() => setShowUpload(true)}>Añadir</Button>
        </div>
      </header>

      <div className={styles.searchBar}>
        <Search size={18} color="var(--muted)" />
        <input 
          type="text" 
          placeholder="Buscar (ej: camisa, lino, formal, negro)..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.filterBar}>
        {filters.map((f) => (
          <button key={f} className={`${styles.filterChip} ${activeFilter === f ? styles.active : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--muted)' }}>Organizando prendas...</div>
      ) : (
        <div className={`${styles.closetGrid} ${styles[viewMode]}`}>
          {filteredPrendas.map((prenda) => (
            <div key={prenda._id} className={styles.prendaCard}>
              <div className={styles.imageContainer}>
                <img 
                  src={getOptimizedUrl(prenda.url_imagen_limpia) || prenda.url_imagen_limpia} 
                  alt={prenda.nombre} 
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src !== prenda.url_imagen_limpia && prenda.url_imagen_limpia) {
                      target.src = prenda.url_imagen_limpia;
                    }
                  }}
                />
                <div className={styles.actionsOverlay}>
                  <button onClick={() => setEditingPrenda(prenda)} className={styles.actionBtn}><Edit3 size={16} /></button>
                  <button onClick={() => handleDelete(prenda._id)} className={`${styles.actionBtn} ${styles.deleteBtn}`}><Trash2 size={16} /></button>
                </div>
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{prenda.nombre}</div>
                <div className={styles.meta}>
                  <span>{prenda.categoria}{prenda.corte_silueta ? ` · ${prenda.corte_silueta}` : ''}</span>
                  <Tag variant="gold">{prenda.estilo || 'Básico'}</Tag>
                </div>
                {(prenda.color_principal || prenda.material) && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    {prenda.color_hex && (
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: prenda.color_hex, border: '1px solid rgba(255,255,255,0.3)', display: 'inline-block' }} />
                    )}
                    <span>{[prenda.color_principal, prenda.material].filter(v => v && v !== 'No especificado').join(' · ')}</span>
                  </div>
                )}
                {prenda.descripcion && <p className={styles.description}>{prenda.descripcion}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingPrenda && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--accent)', fontSize: '1.5rem' }}>Editar Prenda</h3>
              <X onClick={() => setEditingPrenda(null)} style={{ cursor: 'pointer' }} />
            </div>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ position: 'relative', textAlign: 'center', backgroundColor: 'var(--surface2)', borderRadius: '16px', padding: '15px', minHeight: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {uploadingImage ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: 'var(--accent)' }}>
                    <Loader2 size={32} className="spin" />
                    <span style={{ fontSize: '0.8rem' }}>IA Procesando...</span>
                  </div>
                ) : (
                  <>
                    <img src={editingPrenda.url_imagen_limpia} style={{ height: '140px', objectFit: 'contain' }} alt="P" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
                    >
                      <Camera size={18} />
                    </button>
                  </>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleImageUpdate}
                />
              </div>

              <input className={styles.input} value={editingPrenda.nombre} onChange={e => setEditingPrenda({...editingPrenda, nombre: e.target.value})} placeholder="Nombre de la prenda" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select className={styles.input} value={editingPrenda.categoria} onChange={e => setEditingPrenda({...editingPrenda, categoria: e.target.value})}>
                  {filters.filter(f => f !== 'todo').map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <input className={styles.input} value={editingPrenda.corte_silueta || ''} onChange={e => setEditingPrenda({...editingPrenda, corte_silueta: e.target.value})} placeholder="Corte (Recto, Slim, Oversize...)" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input className={styles.input} value={editingPrenda.color_principal || ''} onChange={e => setEditingPrenda({...editingPrenda, color_principal: e.target.value})} placeholder="Color principal" />
                <input className={styles.input} value={editingPrenda.material || ''} onChange={e => setEditingPrenda({...editingPrenda, material: e.target.value})} placeholder="Material (Algodón, Denim...)" />
              </div>
              <textarea className={styles.input} style={{ height: '70px' }} value={editingPrenda.descripcion || ''} onChange={e => setEditingPrenda({...editingPrenda, descripcion: e.target.value})} placeholder="Descripción" />

              <Button type="submit" icon={<Save size={18} />} disabled={uploadingImage}>Guardar Cambios</Button>
            </form>
          </div>
        </div>
      )}

      {showUpload && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--accent)', fontSize: '1.5rem' }}>Nueva Prenda</h3>
              <X onClick={() => setShowUpload(false)} style={{ cursor: 'pointer' }} />
            </div>
            <UploadPrenda onUploadSuccess={() => { setShowUpload(false); fetchPrendas(); showToast('Prenda añadida con éxito'); }} />
          </div>
        </div>
      )}
    </div>
  );
};
