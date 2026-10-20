import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  genero: string;
  selectedEstilos: string[];
  onToggle: (id: string) => void;
  onComplete: () => void;
}

const StyleSelection = ({ genero, selectedEstilos, onToggle, onComplete }: Props) => {
  const imagenesPorEstilo: any = {
    Masculina: {
      casual: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&h=400&fit=crop',
      formal: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=400&fit=crop',
      streetwear: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=400&h=400&fit=crop',
      sporty: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
      minimalista: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=400&fit=crop',
      grunge: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=400&h=400&fit=crop',
      vintage: 'https://images.unsplash.com/photo-1503910321442-7f2bc984c25d?w=400&h=400&fit=crop',
      preppy: 'https://images.unsplash.com/photo-1593032465175-481ac7f401a0?w=400&h=400&fit=crop',
      boho: 'https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=400&h=400&fit=crop',
      gotico: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop',
      academia: 'https://images.unsplash.com/photo-1519085185758-29178f0d9f6a?w=400&h=400&fit=crop',
      chic: 'https://images.unsplash.com/photo-1550246140-5119ae4790b8?w=400&h=400&fit=crop'
    },
    Femenina: {
      casual: 'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=400&h=400&fit=crop',
      formal: 'https://images.unsplash.com/photo-1485230895905-ec17ba36b5bc?w=400&h=400&fit=crop',
      streetwear: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&h=400&fit=crop',
      sporty: 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=400&h=400&fit=crop',
      minimalista: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=400&fit=crop',
      grunge: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400&h=400&fit=crop',
      vintage: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=400&fit=crop',
      preppy: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop',
      boho: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop',
      gotico: 'https://images.unsplash.com/photo-1596484552834-08f3762884a4?w=400&h=400&fit=crop',
      academia: 'https://images.unsplash.com/photo-1552664199-fd31f7431a55?w=400&h=400&fit=crop',
      chic: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=400&fit=crop'
    }
  };

  const estilosDisponibles = [
    { id: 'casual', label: 'Casual' },
    { id: 'formal', label: 'Formal' },
    { id: 'streetwear', label: 'Streetwear' },
    { id: 'sporty', label: 'Sporty' },
    { id: 'minimalista', label: 'Minimalista' },
    { id: 'grunge', label: 'Grunge' },
    { id: 'vintage', label: 'Vintage' },
    { id: 'preppy', label: 'Preppy' },
    { id: 'boho', label: 'Boho' },
    { id: 'gotico', label: 'Gótico' },
    { id: 'academia', label: 'Academia' },
    { id: 'chic', label: 'Chic' },
  ];

  const currentImages = imagenesPorEstilo[genero] || imagenesPorEstilo.Femenina;

  return (
    <div style={{ animation: 'fadeIn 0.5s', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '10px' }}>Curaduría de Estilos</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '30px' }}>Selecciona los 3 estilos que más resuenan contigo.</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: '20px',
        maxHeight: '55vh',
        overflowY: 'auto',
        padding: '10px',
        marginBottom: '30px',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        backgroundColor: 'rgba(0,0,0,0.2)'
      }}>
        {estilosDisponibles.map((e) => (
          <div
            key={e.id}
            onClick={() => onToggle(e.id)}
            style={{
              position: 'relative',
              cursor: 'pointer',
              borderRadius: '20px',
              overflow: 'hidden',
              border: selectedEstilos.includes(e.id) ? '2px solid var(--accent)' : '1px solid var(--border)',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            }}
          >
            <img
              src={currentImages[e.id]}
              alt={e.label}
              style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', opacity: selectedEstilos.includes(e.id) ? 0.6 : 1 }}
            />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
              padding: '20px 10px 10px',
              color: 'white',
              textAlign: 'center',
            }}>
              <span style={{ fontWeight: 600 }}>{e.label}</span>
            </div>
            {selectedEstilos.includes(e.id) && (
              <div style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--accent)', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '2px' }}>
                <CheckCircle2 size={24} />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        disabled={selectedEstilos.length < 3}
        onClick={onComplete}
        style={{
          padding: '18px 60px',
          backgroundColor: selectedEstilos.length < 3 ? 'var(--surface3)' : 'var(--accent)',
          color: selectedEstilos.length < 3 ? 'var(--muted)' : 'var(--bg)',
          border: 'none',
          borderRadius: '16px',
          fontSize: '1.1rem',
          fontWeight: 700,
          cursor: selectedEstilos.length < 3 ? 'not-allowed' : 'pointer',
          boxShadow: selectedEstilos.length < 3 ? 'none' : '0 10px 20px rgba(200,169,126,0.2)',
          transition: 'all 0.3s ease',
        }}
      >
        Continuar al Armario ({selectedEstilos.length}/3)
      </button>
    </div>
  );
};

export default StyleSelection;
