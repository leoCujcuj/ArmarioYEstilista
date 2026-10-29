import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Plus,
  X,
  Edit3,
  Trash2,
  Save,
  LayoutGrid,
  StretchHorizontal,
  Camera,
  Loader2,
  PackageOpen
} from 'lucide-react';
import { Button } from '../common/Button';
import { Tag } from '../common/Tag';
import styles from './Armario.module.css';
import UploadPrenda from '../wardrobe/UploadPrenda';
import Swal from 'sweetalert2';
import {
  PrendaItem,
  OCASIONES_DISPONIBLES,
  TEMPORADAS_DISPONIBLES,
  TONOS_ESTACIONALES,
  ETIQUETAS_CATEGORIA,
  optimizarImagenUrl
} from '../../types/armario';

type ViewMode = 'compact' | 'detailed';

const showToast = (msg: string, type?: 'success' | 'error' | 'info') =>
  (window as unknown as { showToast?: (m: string, t?: string) => void }).showToast?.(msg, type);

export const Armario: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('todo');
  const [marcaFilter, setMarcaFilter] = useState('todas');
  const [temporadaFilter, setTemporadaFilter] = useState('todas');
  const [ocasionFilter, setOcasionFilter] = useState('todas');
  const [searchQuery, setSearchQuery] = useState('');

  const [prendas, setPrendas] = useState<PrendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [editingPrenda, setEditingPrenda] = useState<PrendaItem | null>(null);
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
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data: PrendaItem[] = await response.json();
        setPrendas(data);
      }
    } catch (error) {
      showToast('Error al cargar el armario', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrendas();
  }, []);

  // Lista dinámica de marcas únicas registradas por el usuario
  const marcasDisponibles = useMemo(() => {
    const set = new Set<string>();
    prendas.forEach((p) => {
      const m = (p.marca || '').trim();
      if (m) set.add(m);
    });
    return Array.from(set).sort();
  }, [prendas]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrenda) return;
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const payload = {
        ...editingPrenda,
        marca: (editingPrenda.marca || '').trim() || 'Sin marca',
        ocasiones:
          Array.isArray(editingPrenda.ocasiones) && editingPrenda.ocasiones.length > 0
            ? editingPrenda.ocasiones
            : ['Casual']
      };
      const response = await fetch(`${API_URL}/api/prendas/${editingPrenda._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setEditingPrenda(null);
        showToast('Metadatos de prenda actualizados', 'success');
        fetchPrendas();
      }
    } catch (error) {
      showToast('Error al actualizar la prenda', 'error');
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
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const updatedPrenda: PrendaItem = await response.json();
        setEditingPrenda(updatedPrenda);
        showToast('Imagen procesada y actualizada', 'success');
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
      text: 'Se retirará de tu inventario digital.',
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
        const response = await fetch(`${API_URL}/api/prendas/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
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

  const toggleEditOcasion = (occ: string) => {
    if (!editingPrenda) return;
    const actuales = Array.isArray(editingPrenda.ocasiones) ? editingPrenda.ocasiones : ['Casual'];
    const nuevas = actuales.includes(occ)
      ? actuales.length > 1
        ? actuales.filter((o) => o !== occ)
        : actuales
      : [...actuales, occ];
    setEditingPrenda({ ...editingPrenda, ocasiones: nuevas });
  };

  const hayFiltrosExtra =
    marcaFilter !== 'todas' || temporadaFilter !== 'todas' || ocasionFilter !== 'todas' || searchQuery.trim() !== '';

  const filteredPrendas = prendas.filter((p) => {
    if (activeFilter !== 'todo' && p.categoria !== activeFilter) return false;
    if (marcaFilter !== 'todas' && (p.marca || 'Sin marca') !== marcaFilter) return false;
    if (temporadaFilter !== 'todas' && (p.temporada || 'Todo el año') !== temporadaFilter) return false;
    if (ocasionFilter !== 'todas') {
      const listaOcc = Array.isArray(p.ocasiones) ? p.ocasiones : [];
      if (!listaOcc.includes(ocasionFilter)) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const fullText = `
      ${p.nombre || ''}
      ${p.marca || ''}
      ${p.categoria || ''}
      ${p.color_principal || ''}
      ${p.color_secundario || ''}
      ${p.material || ''}
      ${p.temporada || ''}
      ${p.estilo || ''}
      ${(p.ocasiones || []).join(' ')}
      ${(p.tags_ia || []).join(' ')}
    `.toLowerCase();

    return fullText.includes(q);
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitles}>
          <span className={styles.overline}>Inventario Sartorial</span>
          <h1 className={styles.pageTitle}>Mi Armario Digital</h1>
          <span className={styles.pageSub}>
            {prendas.length} {prendas.length === 1 ? 'pieza catalogada' : 'piezas catalogadas'} con atributos de marca, colorimetría y ocasión
          </span>
        </div>

        <div className={styles.controls}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'compact' ? styles.active : ''}`}
              onClick={() => setViewMode('compact')}
              title="Cuadrícula compacta"
            >
              <LayoutGrid size={17} />
            </button>
            <button
              className={`${styles.toggleBtn} ${viewMode === 'detailed' ? styles.active : ''}`}
              onClick={() => setViewMode('detailed')}
              title="Tarjetas detalladas"
            >
              <StretchHorizontal size={17} />
            </button>
          </div>
          <Button icon={<Plus size={17} />} onClick={() => setShowUpload(true)}>
            Añadir Prenda
          </Button>
        </div>
      </header>

      {/* Barra de búsqueda y filtros por Marca, Estación y Ocasión */}
      <div className={styles.toolbarCard}>
        <div className={styles.searchRow}>
          <div className={styles.searchBar}>
            <Search size={17} color="var(--muted)" />
            <input
              type="text"
              placeholder="Buscar por nombre, marca, tela, color u ocasión..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <X
                size={15}
                color="var(--muted)"
                style={{ cursor: 'pointer' }}
                onClick={() => setSearchQuery('')}
              />
            )}
          </div>

          <div className={styles.metaFilterGroup}>
            <select
              className={styles.filterSelect}
              value={marcaFilter}
              onChange={(e) => setMarcaFilter(e.target.value)}
              aria-label="Filtrar por marca"
            >
              <option value="todas">Todas las marcas</option>
              {marcasDisponibles.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              className={styles.filterSelect}
              value={ocasionFilter}
              onChange={(e) => setOcasionFilter(e.target.value)}
              aria-label="Filtrar por ocasión"
            >
              <option value="todas">Todas las ocasiones</option>
              {OCASIONES_DISPONIBLES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <select
              className={styles.filterSelect}
              value={temporadaFilter}
              onChange={(e) => setTemporadaFilter(e.target.value)}
              aria-label="Filtrar por estación"
            >
              <option value="todas">Cualquier estación</option>
              {TEMPORADAS_DISPONIBLES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {hayFiltrosExtra && (
              <button
                type="button"
                className={styles.resetFilterBtn}
                onClick={() => {
                  setMarcaFilter('todas');
                  setOcasionFilter('todas');
                  setTemporadaFilter('todas');
                  setSearchQuery('');
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        <div className={styles.filterBar}>
          {filters.map((f) => {
            const count = f === 'todo' ? prendas.length : prendas.filter((p) => p.categoria === f).length;
            return (
              <button
                key={f}
                className={`${styles.filterChip} ${activeFilter === f ? styles.active : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                <span>{f === 'todo' ? 'Todas' : ETIQUETAS_CATEGORIA[f] || f}</span>
                <span className={styles.chipCount}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className={`${styles.closetGrid} ${styles[viewMode]}`}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className={styles.skeletonCard}>
              <div className="skeletonShimmer" style={{ height: viewMode === 'compact' ? '150px' : '230px' }} />
              <div className="skeletonShimmer" style={{ height: '14px', width: '45%' }} />
              <div className="skeletonShimmer" style={{ height: '18px', width: '80%' }} />
              <div className="skeletonShimmer" style={{ height: '14px', width: '60%' }} />
            </div>
          ))}
        </div>
      ) : filteredPrendas.length === 0 ? (
        <div className={styles.emptyState}>
          <PackageOpen size={42} color="var(--accent)" />
          <h3>{prendas.length === 0 ? 'Tu armario digital está listo para empezar' : 'Sin coincidencias con estos filtros'}</h3>
          <p>
            {prendas.length === 0
              ? 'Agrega prendas mediante cámara, galería, importador web o el catálogo rápido de básicos.'
              : 'Prueba limpiando los filtros activos de marca, ocasión o búsqueda.'}
          </p>
          {prendas.length === 0 && (
            <Button icon={<Plus size={16} />} onClick={() => setShowUpload(true)}>
              Digitalizar primera prenda
            </Button>
          )}
        </div>
      ) : (
        <div className={`${styles.closetGrid} ${styles[viewMode]}`}>
          {filteredPrendas.map((prenda) => {
            const usos = prenda.contadorUsos || 0;
            return (
              <article key={prenda._id} className={styles.prendaCard}>
                <div className={styles.imageContainer}>
                  <span className={`${styles.wearBadge} ${usos > 0 ? styles.wearBadgeActive : ''}`}>
                    {usos > 0 ? `${usos} ${usos === 1 ? 'uso' : 'usos'}` : 'Sin estrenar'}
                  </span>

                  <img
                    src={optimizarImagenUrl(prenda.url_imagen_limpia, 420) || prenda.url_imagen_limpia}
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
                    <button
                      type="button"
                      onClick={() => setEditingPrenda(prenda)}
                      className={styles.actionBtn}
                      title="Editar metadatos"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(prenda._id)}
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      title="Eliminar prenda"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className={styles.info}>
                  <div className={styles.brandRow}>
                    <span className={styles.brandLabel}>{prenda.marca || 'Sin marca'}</span>
                    <div className={styles.swatchesPair}>
                      {prenda.color_hex && (
                        <span
                          className={styles.colorDot}
                          style={{ background: prenda.color_hex }}
                          title={`Color primario: ${prenda.color_principal || prenda.color_hex}`}
                        />
                      )}
                      {prenda.color_secundario_hex && prenda.color_secundario && (
                        <span
                          className={styles.colorDot}
                          style={{ background: prenda.color_secundario_hex }}
                          title={`Color secundario: ${prenda.color_secundario}`}
                        />
                      )}
                    </div>
                  </div>

                  <div className={styles.name}>{prenda.nombre}</div>

                  <div className={styles.meta}>
                    <span>
                      {prenda.categoria}
                      {prenda.corte_silueta ? ` · ${prenda.corte_silueta}` : ''}
                    </span>
                    <Tag variant="gold">{prenda.temporada || 'Todo el año'}</Tag>
                  </div>

                  {viewMode === 'detailed' && (
                    <>
                      <div className={styles.attributePills}>
                        {prenda.material && <span className={styles.attrPill}>{prenda.material}</span>}
                        {prenda.color_principal && <span className={styles.attrPill}>{prenda.color_principal}</span>}
                        {(prenda.ocasiones || []).slice(0, 2).map((occ) => (
                          <span key={occ} className={styles.attrPill}>{occ}</span>
                        ))}
                      </div>
                      {prenda.descripcion && <p className={styles.description}>{prenda.descripcion}</p>}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL DE EDICIÓN COMPLETA DE METADATA (Módulo C) */}
      {editingPrenda && (
        <div className={styles.modalOverlay} onClick={() => setEditingPrenda(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Ficha Técnica de Prenda</h3>
              <button
                type="button"
                className={styles.closeIconBtn}
                onClick={() => setEditingPrenda(null)}
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  position: 'relative',
                  textAlign: 'center',
                  backgroundColor: 'var(--surface2)',
                  borderRadius: '14px',
                  padding: '14px',
                  minHeight: '155px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border)'
                }}
              >
                {uploadingImage ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                    <Loader2 size={28} className="spin" />
                    <span style={{ fontSize: '0.8rem' }}>Limpiando fondo con IA...</span>
                  </div>
                ) : (
                  <>
                    <img
                      src={editingPrenda.url_imagen_limpia}
                      style={{ height: '130px', objectFit: 'contain' }}
                      alt={editingPrenda.nombre}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        background: 'var(--accent)',
                        color: 'var(--bg)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Reemplazar fotografía"
                    >
                      <Camera size={17} />
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

              <div className={styles.row2}>
                <div>
                  <label className={styles.label}>Nombre</label>
                  <input
                    className={styles.input}
                    value={editingPrenda.nombre || ''}
                    onChange={(e) => setEditingPrenda({ ...editingPrenda, nombre: e.target.value })}
                    placeholder="Nombre de la prenda"
                    required
                  />
                </div>
                <div>
                  <label className={styles.label}>Marca</label>
                  <input
                    className={styles.input}
                    value={editingPrenda.marca || ''}
                    onChange={(e) => setEditingPrenda({ ...editingPrenda, marca: e.target.value })}
                    placeholder="Ej: Zara, H&M, Levi's..."
                  />
                </div>
              </div>

              <div className={styles.row2}>
                <div>
                  <label className={styles.label}>Categoría</label>
                  <select
                    className={styles.input}
                    value={editingPrenda.categoria}
                    onChange={(e) => setEditingPrenda({ ...editingPrenda, categoria: e.target.value })}
                  >
                    {filters.filter((f) => f !== 'todo').map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={styles.label}>Corte / Silueta</label>
                  <input
                    className={styles.input}
                    value={editingPrenda.corte_silueta || ''}
                    onChange={(e) => setEditingPrenda({ ...editingPrenda, corte_silueta: e.target.value })}
                    placeholder="Recto, Slim Fit, Oversize..."
                  />
                </div>
              </div>

              <div className={styles.row2}>
                <div>
                  <label className={styles.label}>Color Primario + HEX</label>
                  <div className={styles.colorEditRow}>
                    <input
                      type="color"
                      className={styles.hexPicker}
                      value={editingPrenda.color_hex || '#222222'}
                      onChange={(e) => setEditingPrenda({ ...editingPrenda, color_hex: e.target.value })}
                    />
                    <input
                      className={styles.input}
                      value={editingPrenda.color_principal || ''}
                      onChange={(e) => setEditingPrenda({ ...editingPrenda, color_principal: e.target.value })}
                      placeholder="Color primario"
                    />
                  </div>
                </div>
                <div>
                  <label className={styles.label}>Color Secundario + HEX</label>
                  <div className={styles.colorEditRow}>
                    <input
                      type="color"
                      className={styles.hexPicker}
                      value={editingPrenda.color_secundario_hex || '#888888'}
                      onChange={(e) => setEditingPrenda({ ...editingPrenda, color_secundario_hex: e.target.value })}
                    />
                    <input
                      className={styles.input}
                      value={editingPrenda.color_secundario || ''}
                      onChange={(e) => setEditingPrenda({ ...editingPrenda, color_secundario: e.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.row2}>
                <div>
                  <label className={styles.label}>Tono Estacional</label>
                  <select
                    className={styles.input}
                    value={editingPrenda.tono_estacional || 'Neutro'}
                    onChange={(e) => setEditingPrenda({ ...editingPrenda, tono_estacional: e.target.value })}
                  >
                    {TONOS_ESTACIONALES.map((tono) => (
                      <option key={tono} value={tono}>{tono}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={styles.label}>Tipo de Tela</label>
                  <input
                    className={styles.input}
                    value={editingPrenda.material || ''}
                    onChange={(e) => setEditingPrenda({ ...editingPrenda, material: e.target.value })}
                    placeholder="Algodón, Lino, Denim, Lana..."
                  />
                </div>
              </div>

              <div>
                <label className={styles.label}>Estación del Año</label>
                <select
                  className={styles.input}
                  value={editingPrenda.temporada || 'Todo el año'}
                  onChange={(e) => setEditingPrenda({ ...editingPrenda, temporada: e.target.value })}
                >
                  {TEMPORADAS_DISPONIBLES.map((temp) => (
                    <option key={temp} value={temp}>{temp}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={styles.label}>Ocasiones de Uso</label>
                <div className={styles.occChipsWrap}>
                  {OCASIONES_DISPONIBLES.map((occ) => {
                    const active = (editingPrenda.ocasiones || ['Casual']).includes(occ);
                    return (
                      <button
                        type="button"
                        key={occ}
                        className={`${styles.occChip} ${active ? styles.occChipActive : ''}`}
                        onClick={() => toggleEditOcasion(occ)}
                      >
                        {occ}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={styles.label}>Notas / Descripción</label>
                <textarea
                  className={styles.input}
                  style={{ height: '66px', resize: 'none' }}
                  value={editingPrenda.descripcion || ''}
                  onChange={(e) => setEditingPrenda({ ...editingPrenda, descripcion: e.target.value })}
                  placeholder="Descripción o notas de ajuste"
                />
              </div>

              <Button type="submit" icon={<Save size={17} />} disabled={uploadingImage}>
                Guardar Ficha Técnica
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ALTA EN 4 VÍAS (Módulo B) */}
      {showUpload && (
        <div className={styles.modalOverlay} onClick={() => setShowUpload(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.overline}>Digitalización de Prendas</span>
                <h3 className={styles.modalTitle}>Agregar a Mi Armario</h3>
              </div>
              <button
                type="button"
                className={styles.closeIconBtn}
                onClick={() => setShowUpload(false)}
              >
                <X size={17} />
              </button>
            </div>
            <UploadPrenda
              onBasicAdded={() => {
                fetchPrendas();
              }}
              onUploadSuccess={() => {
                setShowUpload(false);
                fetchPrendas();
                showToast('Armario actualizado correctamente', 'success');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
