import React from 'react';
import { Target, Search, ShoppingBag, Sparkles } from 'lucide-react';

interface Props {
  onSelect: (objetivo: string) => void;
}

const GoalSelection = ({ onSelect }: Props) => {
  const goals = [
    { label: 'Vestir mejor a diario', desc: 'Mejora tu presencia cotidiana.', icon: <Sparkles /> },
    { label: 'Encontrar mi estilo personal', desc: 'Descubre qué te hace único.', icon: <Search /> },
    { label: 'Comprar de forma inteligente', desc: 'Evita compras innecesarias.', icon: <ShoppingBag /> },
    { label: 'Maximizar mi armario actual', desc: 'Crea más con lo que ya tienes.', icon: <Target /> },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.5s', maxWidth: '600px', margin: 'auto', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '10px' }}>¿Cuál es tu misión?</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '30px' }}>Esto nos ayudará a priorizar tus recomendaciones.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {goals.map((goal) => (
          <button
            key={goal.label}
            onClick={() => onSelect(goal.label)}
            style={{
              padding: '20px 25px',
              cursor: 'pointer',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.backgroundColor = 'var(--surface2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.backgroundColor = 'var(--surface)';
            }}
          >
            <div style={{ 
              backgroundColor: 'var(--surface3)', 
              color: 'var(--accent)', 
              padding: '12px', 
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {goal.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>{goal.label}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{goal.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default GoalSelection;
