import React from 'react';
import { User, UserCheck, Users } from 'lucide-react';

interface Props {
  onSelect: (genero: string) => void;
}

const GenderSelection = ({ onSelect }: Props) => {
  const options = [
    { id: 'Masculina', label: 'Moda Masculina', icon: <User size={40} /> },
    { id: 'Femenina', label: 'Moda Femenina', icon: <UserCheck size={40} /> },
    { id: 'Neutra', label: 'Moda Neutra', icon: <Users size={40} /> },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.5s', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2.5rem', color: 'var(--accent)', marginBottom: '10px' }}>
        Define tu Identidad
      </h2>
      <p style={{ color: 'var(--muted)', fontSize: '1.1rem', marginBottom: '40px' }}>
        Personalizaremos tu experiencia según tu preferencia de vestimenta.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '25px', flexWrap: 'wrap' }}>
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            style={{
              width: '200px',
              height: '200px',
              cursor: 'pointer',
              borderRadius: '24px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '15px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.backgroundColor = 'var(--surface2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.backgroundColor = 'var(--surface)';
            }}
          >
            <div style={{ color: 'var(--accent)' }}>{opt.icon}</div>
            <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text)' }}>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default GenderSelection;
