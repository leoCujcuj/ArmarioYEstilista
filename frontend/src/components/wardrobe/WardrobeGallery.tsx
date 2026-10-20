import React, { useEffect, useState } from 'react';
import { Shirt, Trash2, Filter } from 'lucide-react';

interface Prenda {
  _id: string;
  url_imagen_limpia: string;
  categoria: string;
  color_principal?: string;
}

const WardrobeGallery = ({ usuarioId }: { usuarioId: number }) => {
  const [prendas, setPrendas] = useState<Prenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetch(`http://localhost:3000/api/prendas/${usuarioId}`)
      .then(res => res.json())
      .then(data => {
        setPrendas(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  }, [usuarioId]);

  const filteredPrendas = filter === 'All' 
    ? prendas 
    : prendas.filter(p => p.categoria === filter);

  const categorias = ['All', 'Top', 'Bottom', 'Outerwear', 'Shoes', 'Accessories'];

  return (
    <div style={{ padding: '30px', backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <Shirt color="#007bff" /> Tu Armario Virtual
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          {categorias.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: filter === c ? '#007bff' : '#f0f0f0',
                color: filter === c ? 'white' : '#666',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p>Cargando armario...</p>
      ) : filteredPrendas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#aaa', border: '2px dashed #eee', borderRadius: '20px' }}>
          <p>Aún no hay prendas en esta categoría.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
          gap: '20px' 
        }}>
          {filteredPrendas.map((prenda) => (
            <div 
              key={prenda._id}
              style={{
                position: 'relative',
                borderRadius: '15px',
                overflow: 'hidden',
                backgroundColor: '#f9f9f9',
                border: '1px solid #eee',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <img 
                src={prenda.url_imagen_limpia} 
                alt="Prenda" 
                style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', padding: '10px' }} 
              />
              <div style={{
                padding: '10px',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#007bff',
                textAlign: 'center',
                backgroundColor: 'white'
              }}>
                {prenda.categoria.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WardrobeGallery;
