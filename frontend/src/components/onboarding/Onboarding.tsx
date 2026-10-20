import React, { useState } from 'react';
import GenderSelection from './GenderSelection';
import GoalSelection from './GoalSelection';
import StyleSelection from './StyleSelection';

const Onboarding = ({ onComplete }: { onComplete: (data: any) => void }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    genero: '',
    objetivo: '',
    estilos: [] as string[]
  });

  const handleGenderSelect = (genero: string) => {
    setFormData({ ...formData, genero });
    setStep(2);
  };

  const handleGoalSelect = (objetivo: string) => {
    setFormData({ ...formData, objetivo });
    setStep(3);
  };

  const handleStyleToggle = (id: string) => {
    setFormData(prev => ({
      ...prev,
      estilos: prev.estilos.includes(id) 
        ? prev.estilos.filter(e => e !== id) 
        : [...prev.estilos, id]
    }));
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '40px 20px',
      backgroundColor: 'var(--bg)',
      backgroundImage: 'radial-gradient(circle at center, var(--surface2) 0%, var(--bg) 70%)'
    }}>
      <div style={{ width: '100%', maxWidth: '1000px' }}>
        {step === 1 && <GenderSelection onSelect={handleGenderSelect} />}
        {step === 2 && <GoalSelection onSelect={handleGoalSelect} />}
        {step === 3 && (
          <StyleSelection 
            genero={formData.genero} 
            selectedEstilos={formData.estilos} 
            onToggle={handleStyleToggle} 
            onComplete={() => onComplete(formData)}
          />
        )}
      </div>
    </div>
  );
};

export default Onboarding;
