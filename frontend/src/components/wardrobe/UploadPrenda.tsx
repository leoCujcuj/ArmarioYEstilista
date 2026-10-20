import React, { useState } from 'react';
import { Upload, Camera, Loader2, X, Lightbulb } from 'lucide-react';
import styles from '../pages/Armario.module.css';

const UploadPrenda = ({ onUploadSuccess }: { onUploadSuccess: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [categoria, setCategoria] = useState('Top');
  const [nombre, setNombre] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async () => {
    if (!file || !nombre.trim()) {
      (window as any).showToast?.('Por favor, indica el nombre exacto de la prenda', 'error');
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append('imagen', file);
    formData.append('categoria', categoria);
    formData.append('nombre', nombre || 'Mi Prenda');

    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    try {
      const response = await fetch(`${API_URL}/api/prendas`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        onUploadSuccess();
      } else {
        const errorData = await response.json();
        (window as any).showToast?.(errorData.error || 'Error al subir', 'error');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ textAlign: 'center', backgroundColor: 'var(--surface2)', borderRadius: '16px', padding: preview ? '10px' : '0', border: '1px solid var(--border)', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <input id="file-input" type="file" hidden accept="image/*" onChange={handleFileChange} />
        {!preview ? (
          <div 
            onClick={() => document.getElementById('file-input')?.click()}
            style={{ width: '100%', height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '10px' }}
          >
            <Camera size={32} color="var(--accent)" />
            <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem' }}>Pulsa para subir foto</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted2)' }}>La IA quitará el fondo automáticamente</p>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%' }}>
            <img src={preview} alt="Preview" style={{ height: '180px', width: '100%', objectFit: 'contain' }} />
            <button 
              onClick={() => { setPreview(null); setFile(null); }}
              style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: '15px' }}>
        <div>
          <label className={styles.label}>Nombre exacto de la prenda</label>
          <input 
            type="text" 
            className={styles.input}
            value={nombre} 
            onChange={(e) => setNombre(e.target.value)} 
            placeholder="Ej: Camisa Lino Blanca Slim Fit"
            required
          />
          <p style={{ fontSize: '0.7rem', color: 'var(--muted2)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Lightbulb size={12} color="var(--accent)" />
            <span>Un nombre preciso (ej: "Chaqueta Cuero Negra") ayuda a la IA a crear mejores outfits.</span>
          </p>
        </div>

        <div>
          <label className={styles.label}>Categoría</label>
          <select 
            className={styles.input}
            value={categoria} 
            onChange={(e) => setCategoria(e.target.value)}
          >
            {['Top', 'Bottom', 'Outerwear', 'Shoes', 'Accessories'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <button 
        onClick={handleSubmit} 
        disabled={!file || loading}
        style={{ 
          width: '100%', 
          padding: '16px', 
          backgroundColor: loading ? 'var(--surface3)' : 'var(--accent)', 
          color: 'var(--bg)', 
          border: 'none', 
          borderRadius: '14px', 
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 700,
          fontSize: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginTop: '10px',
          boxShadow: loading ? 'none' : '0 10px 20px rgba(200, 169, 126, 0.2)'
        }}
      >
        {loading ? <><Loader2 style={{ animation: 'spin 1s linear infinite' }} /> Procesando con IA...</> : 'Guardar en Armario'}
      </button>
    </div>
  );
};

export default UploadPrenda;
