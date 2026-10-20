import React, { useState, useEffect } from 'react';
import { Sparkles, Info, X, Wallet, Edit2, Check, LayoutGrid, Shirt, Footprints, Watch, Store, Loader2, Layers, DollarSign, Heart, CheckCircle2, Trash2, RefreshCw, PlusCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { Tag } from '../common/Tag';
import styles from './Tienda.module.css';

const showToast = (msg: string, type?: any) => (window as any).showToast?.(msg, type);

interface Product {
  _id?: string;
  nombre: string;
  tipoPrenda?: string;
  color?: string;
  marca: string;
  precio?: number;
  precioBase?: number;
  categoria: string;
  img?: string;
  imageUrl?: string;
  porque: string;
  combinaCon?: string[];
  prioridad?: string;
  comprado?: boolean;
  fechaCompra?: string;
}

interface TiendaProps {
  user: any;
}

export const Tienda: React.FC<TiendaProps> = ({ user: initialUser }) => {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'recomendaciones' | 'wishlist' | 'comprados'>('recomendaciones');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [user] = useState<any>(initialUser);

  const [budget, setBudget] = useState<number>(user?.presupuesto || 1000);
  const [spent, setSpent] = useState<number>(user?.gastado || 0);
  const [editingBudget, setEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(budget.toString());

  // Estados para modal de compra
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [addToWardrobe, setAddToWardrobe] = useState<boolean>(true);
  const [processingAction, setProcessingAction] = useState<boolean>(false);

  // Estados para filtros de precio
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2500);

  const getCurrency = () => {
    const loc = (user?.direccion || '').toLowerCase();
    if (loc.includes('guatemala')) return 'Q';
    if (loc.includes('espana') || loc.includes('españa') || loc.includes('madrid')) return '€';
    return '$';
  };
  const symbol = getCurrency();

  const fetchProducts = async (forceRefresh = false) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const res = await fetch(
        `${API_URL}/api/tienda/productos?categoria=${activeCategory}&minPrice=${minPrice}&maxPrice=${maxPrice}${forceRefresh ? '&refresh=true' : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        setCatalog(await res.json());
      }
    } catch (e) {
      showToast('Error al analizar sugerencias de compra', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const res = await fetch(`${API_URL}/api/tienda/wishlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setWishlist(await res.json());
      }
    } catch (e) {}
  };

  const handleSaveBudget = async () => {
    const val = parseFloat(tempBudget);
    if (isNaN(val) || val < 0) return;
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const res = await fetch(`${API_URL}/api/usuario/presupuesto`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ presupuesto: val })
      });
      if (res.ok) {
        setBudget(val);
        setEditingBudget(false);
        showToast('Presupuesto actualizado', 'success');
      }
    } catch (e) {}
  };

  const handleResetSpent = async () => {
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const res = await fetch(`${API_URL}/api/usuario/presupuesto`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gastado: 0 })
      });
      if (res.ok) {
        setSpent(0);
        showToast('Contador de gasto reiniciado', 'info');
      }
    } catch (e) {}
  };

  const handleAddToWishlist = async (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProcessingAction(true);
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    try {
      const res = await fetch(`${API_URL}/api/tienda/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(prod)
      });
      if (res.ok) {
        showToast('Guardado en tu Lista de Deseos', 'success');
        await fetchWishlist();
      }
    } catch (err) {
      showToast('Error al guardar en Lista de Deseos', 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRemoveWishlist = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const res = await fetch(`${API_URL}/api/tienda/wishlist/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setWishlist(prev => prev.filter(item => item._id !== id));
        if (selectedProduct?._id === id) setSelectedProduct(null);
        showToast('Eliminado de la lista', 'info');
      }
    } catch (err) {
      showToast('Error al eliminar', 'error');
    }
  };

  const handleRegisterPurchase = async () => {
    if (!selectedProduct) return;
    setProcessingAction(true);
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const finalPrice = parseFloat(purchasePrice) || selectedProduct.precio || selectedProduct.precioBase || 0;

    try {
      const res = await fetch(`${API_URL}/api/tienda/comprar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productoId: selectedProduct._id,
          nombre: selectedProduct.nombre,
          tipoPrenda: selectedProduct.tipoPrenda,
          color: selectedProduct.color,
          marca: selectedProduct.marca,
          precio: finalPrice,
          categoria: selectedProduct.categoria,
          img: selectedProduct.img || selectedProduct.imageUrl,
          porque: selectedProduct.porque,
          combinaCon: selectedProduct.combinaCon,
          agregarAlArmario: addToWardrobe
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSpent(data.gastado);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        await fetchWishlist();
        setSelectedProduct(null);
        showToast(
          addToWardrobe
            ? 'Compra registrada y prenda añadida a tu Armario Digital'
            : 'Compra registrada en tu presupuesto',
          'success'
        );
      } else {
        showToast('No se pudo registrar la compra', 'error');
      }
    } catch (err) {
      showToast('Error al registrar compra', 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  const openProductModal = (prod: Product) => {
    setSelectedProduct(prod);
    setPurchasePrice(String(prod.precio ?? prod.precioBase ?? 0));
    setAddToWardrobe(true);
  };

  useEffect(() => {
    fetchProducts();
    fetchWishlist();
  }, [activeCategory]);

  const categories = [
    { id: 'Todas', icon: <LayoutGrid size={18} /> },
    { id: 'Top', icon: <Shirt size={18} /> },
    { id: 'Bottom', icon: <Shirt size={18} /> },
    { id: 'Outerwear', icon: <Layers size={18} /> },
    { id: 'Shoes', icon: <Footprints size={18} /> },
    { id: 'Accessories', icon: <Watch size={18} /> }
  ];

  const wishlistPending = wishlist.filter(w => !w.comprado);
  const purchasedItems = wishlist.filter(w => w.comprado);
  const isSavedInWishlist = (nombre: string) => wishlistPending.some(w => w.nombre === nombre);

  const displayedList =
    activeTab === 'recomendaciones'
      ? catalog
      : activeTab === 'wishlist'
      ? wishlistPending
      : purchasedItems;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1 className={styles.pageTitle}>Asesor de Compras IA</h1>
          <p className={styles.pageSubtitle}>Piezas clave que faltan en tu armario, dónde encontrarlas y con qué prendas tuyas combinan</p>
        </div>

        <div className={styles.budgetLuxury}>
          <div className={styles.budgetHead} style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={14} className={styles.accentIcon} />
              <span className={styles.budgetLabel}>PRESUPUESTO DISPONIBLE</span>
            </div>
            {spent > 0 && (
              <button
                onClick={handleResetSpent}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.65rem', cursor: 'pointer', textDecoration: 'underline' }}
                title="Reiniciar gasto acumulado"
              >
                Reiniciar gasto ({symbol}{spent})
              </button>
            )}
          </div>
          <div className={styles.budgetMain}>
            {editingBudget ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
                <input
                  style={{ background: '#000', color: '#fff', border: '1px solid var(--accent)', borderRadius: '8px', padding: '6px 10px', width: '140px' }}
                  value={tempBudget}
                  onChange={e => setTempBudget(e.target.value)}
                  autoFocus
                />
                <button className={styles.budgetEditBtn} onClick={handleSaveBudget}><Check size={14} /></button>
              </div>
            ) : (
              <>
                <span className={styles.budgetValue}>{symbol}{Math.max(0, budget - spent)}</span>
                <button className={styles.budgetEditBtn} onClick={() => { setTempBudget(budget.toString()); setEditingBudget(true); }}><Edit2 size={14} /></button>
              </>
            )}
          </div>
          <div className={styles.luxuryProgress}>
            <div className={styles.luxuryFill} style={{ width: `${Math.min((spent / Math.max(budget, 1)) * 100, 100)}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem', color: 'var(--muted)' }}>
            <span>Gastado: {symbol}{spent}</span>
            <span>Meta: {symbol}{budget}</span>
          </div>
        </div>
      </header>

      {/* PESTAÑAS DE NAVEGACIÓN DE LA TIENDA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className={`${styles.filterBtn} ${activeTab === 'recomendaciones' ? styles.active : ''}`}
            onClick={() => setActiveTab('recomendaciones')}
          >
            <Sparkles size={15} /> Recomendaciones IA ({catalog.length})
          </button>
          <button
            className={`${styles.filterBtn} ${activeTab === 'wishlist' ? styles.active : ''}`}
            onClick={() => setActiveTab('wishlist')}
          >
            <Heart size={15} /> Lista de Deseos ({wishlistPending.length})
          </button>
          <button
            className={`${styles.filterBtn} ${activeTab === 'comprados' ? styles.active : ''}`}
            onClick={() => setActiveTab('comprados')}
          >
            <CheckCircle2 size={15} /> Compras Registradas ({purchasedItems.length})
          </button>
        </div>

        {activeTab === 'recomendaciones' && (
          <Button
            size="sm"
            variant="outline"
            icon={<RefreshCw size={14} />}
            onClick={() => fetchProducts(true)}
            disabled={loading}
          >
            Nuevas sugerencias
          </Button>
        )}
      </div>

      {activeTab === 'recomendaciones' && (
        <div className={styles.filterSection}>
          <div className={styles.filterLuxury}>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`${styles.filterBtn} ${activeCategory === cat.id ? styles.active : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.icon} <span>{cat.id}</span>
              </button>
            ))}
          </div>

          <div className={styles.priceControls}>
            <div className={styles.priceGroup}>
              <label><DollarSign size={10} /> Precio Mínimo Estimado: {symbol}{minPrice}</label>
              <input
                type="range"
                min="0"
                max="1000"
                step="25"
                value={minPrice}
                onChange={e => setMinPrice(parseInt(e.target.value))}
                onMouseUp={() => fetchProducts()}
              />
            </div>
            <div className={styles.priceGroup}>
              <label><DollarSign size={10} /> Precio Máximo Estimado: {symbol}{maxPrice}</label>
              <input
                type="range"
                min="50"
                max="5000"
                step="50"
                value={maxPrice}
                onChange={e => setMaxPrice(parseInt(e.target.value))}
                onMouseUp={() => fetchProducts()}
              />
            </div>
          </div>
        </div>
      )}

      {loading && activeTab === 'recomendaciones' ? (
        <div className={styles.loaderArea}>
          <Loader2 className={styles.spinningLoader} size={40} />
          <p>Analizando los huecos de tu armario, tu morfología y combinaciones potenciales...</p>
        </div>
      ) : (
        <div className={styles.storeGrid}>
          {displayedList.map((prod, idx) => {
            const saved = isSavedInWishlist(prod.nombre);
            const priceVal = prod.precio ?? prod.precioBase ?? 0;
            const imgSrc = prod.img || prod.imageUrl || 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=700&q=80';

            return (
              <div key={prod._id || idx} className={styles.luxuryCard} onClick={() => openProductModal(prod)} style={{ display: 'flex', flexDirection: 'column' }}>
                <div className={styles.cardImage} style={{ position: 'relative' }}>
                  <img
                    src={imgSrc}
                    alt={prod.nombre}
                    onError={(e: any) => { e.target.src = 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=700&q=80'; }}
                  />
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px' }}>
                    {activeTab === 'recomendaciones' && (
                      <button
                        onClick={(e) => handleAddToWishlist(prod, e)}
                        title={saved ? 'Ya en Lista de Deseos' : 'Guardar en Lista de Deseos'}
                        style={{
                          background: saved ? 'var(--accent)' : 'rgba(0,0,0,0.75)',
                          color: saved ? '#000' : '#fff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Heart size={15} fill={saved ? '#000' : 'none'} />
                      </button>
                    )}
                    {activeTab !== 'recomendaciones' && prod._id && (
                      <button
                        onClick={(e) => handleRemoveWishlist(prod._id!, e)}
                        title="Eliminar"
                        style={{
                          background: 'rgba(192, 97, 74, 0.85)',
                          color: '#fff',
                          border: 'none',
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.cardBody} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span className={styles.brandName} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Store size={12} /> {prod.marca || 'Tiendas sugeridas'}
                      </span>
                      <Tag variant="gold">{prod.categoria}</Tag>
                    </div>

                    <h3 className={styles.prodName} style={{ marginBottom: '8px' }}>{prod.nombre}</h3>

                    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: '1.4', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {prod.porque}
                    </p>

                    {prod.combinaCon && prod.combinaCon.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '5px' }}>
                          Combina con tu armario:
                        </div>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {prod.combinaCon.slice(0, 3).map((item, i) => (
                            <span
                              key={i}
                              style={{ fontSize: '0.68rem', background: 'rgba(200, 169, 126, 0.12)', border: '1px solid rgba(200, 169, 126, 0.25)', color: '#f0ece4', padding: '3px 8px', borderRadius: '6px' }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className={styles.prodPrice}>Est. {symbol}{priceVal}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700 }}>
                      {prod.comprado ? 'ADQUIRIDO' : 'VER FICHA Y COMBINACIONES'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {displayedList.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
              {activeTab === 'wishlist'
                ? 'Aún no tienes prendas guardadas en tu Lista de Deseos.'
                : activeTab === 'comprados'
                ? 'Aún no has registrado compras.'
                : 'No se encontraron sugerencias en este rango. Amplía los filtros o pulsa Nuevas sugerencias.'}
            </div>
          )}
        </div>
      )}

      {/* MODAL DETALLADO DE COMPRA E IMPACTO EN EL ARMARIO (SIN LINKS EXTERNOS) */}
      {selectedProduct && (
        <div className={styles.modalOverlay} onClick={() => setSelectedProduct(null)}>
          <div className={styles.modalBody} onClick={e => e.stopPropagation()}>
            <button className={styles.modalX} onClick={() => setSelectedProduct(null)}><X size={20} /></button>
            <div className={styles.modalGrid}>
              <div className={styles.modalImgWrap}>
                <img
                  src={selectedProduct.img || selectedProduct.imageUrl || 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=700&q=80'}
                  alt={selectedProduct.nombre}
                />
              </div>
              <div className={styles.modalContent}>
                <Tag variant="gold">FICHA DE ESTILISMO Y COMPRA</Tag>
                <h2 className={styles.modalTitle}>{selectedProduct.nombre}</h2>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '10px 0 16px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent)', background: 'rgba(200, 169, 126, 0.1)', padding: '5px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Store size={14} /> <strong>Dónde buscarla:</strong> {selectedProduct.marca}
                  </div>
                  {selectedProduct.color && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text)', background: 'rgba(255,255,255,0.06)', padding: '5px 10px', borderRadius: '8px' }}>
                      Color: {selectedProduct.color}
                    </div>
                  )}
                </div>

                <div className={styles.iaInsight} style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontWeight: 700, fontSize: '0.75rem', marginBottom: '6px' }}>
                    <Info size={14} /> POR QUÉ TE FAVORECE
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: '1.5', color: 'var(--text)' }}>
                    {selectedProduct.porque}
                  </p>
                </div>

                {selectedProduct.combinaCon && selectedProduct.combinaCon.length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Prendas de tu armario con las que combina:
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {selectedProduct.combinaCon.map((prendaNombre, idx) => (
                        <span
                          key={idx}
                          style={{ fontSize: '0.78rem', background: '#141414', border: '1px solid rgba(200, 169, 126, 0.35)', color: '#fff', padding: '5px 10px', borderRadius: '8px' }}
                        >
                          {prendaNombre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedProduct.comprado ? (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Precio de compra ({symbol}):</label>
                      <input
                        type="number"
                        value={purchasePrice}
                        onChange={e => setPurchasePrice(e.target.value)}
                        style={{ background: '#000', color: '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', width: '120px', fontSize: '0.9rem' }}
                      />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={addToWardrobe}
                        onChange={e => setAddToWardrobe(e.target.checked)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      Añadir automáticamente a Mi Armario Digital al registrar la compra
                    </label>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <Button
                        variant="primary"
                        icon={<PlusCircle size={16} />}
                        onClick={handleRegisterPurchase}
                        disabled={processingAction}
                        style={{ flex: 1 }}
                      >
                        {processingAction ? 'Procesando...' : 'Registrar Compra'}
                      </Button>

                      {!isSavedInWishlist(selectedProduct.nombre) && (
                        <Button
                          variant="outline"
                          icon={<Heart size={16} />}
                          onClick={() => handleAddToWishlist(selectedProduct)}
                          disabled={processingAction}
                        >
                          Guardar en Deseos
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(90, 158, 110, 0.15)', color: '#7ec994', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} /> Compra registrada por {symbol}{selectedProduct.precioBase || selectedProduct.precio}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
