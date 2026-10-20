import React, { useState } from 'react';

const UploadPrenda = ({ usuarioId }: { usuarioId: number }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [categoria, setCategoria] = useState('Top');
  const [uploadSuccess, setUploadComplete] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setUploadComplete(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('imagen', file);
    formData.append('categoria', categoria);
    formData.append('usuario_id', usuarioId.toString());

    try {
      const response = await fetch('http://localhost:3000/api/prendas', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadComplete(true);
        setFile(null);
        setPreview(null);
        alert('¡Prenda subida con éxito! El fondo ha sido eliminado.');
      } else {
        alert('Error al subir la prenda.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', maxWidth: '500px', margin: '20px auto' }}>
      <h3>Subir Prenda al Armario</h3>
      <div style={{ marginBottom: '15px' }}>
        <label>Categoría: </label>
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ padding: '5px', borderRadius: '5px' }}>
          {['Top', 'Bottom', 'Outerwear', 'Shoes', 'Accessories'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <input type="file" accept="image/*" onChange={handleFileChange} style={{ marginBottom: '15px' }} />

      {preview && (
        <div style={{ marginBottom: '15px' }}>
          <p>Previsualización:</p>
          <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '10px' }} />
        </div>
      )}

      <button 
        onClick={handleSubmit} 
        disabled={!file || loading}
        style={{ 
          width: '100%', 
          padding: '12px', 
          backgroundColor: loading ? '#ccc' : '#28a745', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold'
        }}
      >
        {loading ? 'Procesando con IA...' : 'Subir y Quitar Fondo'}
      </button>

      {uploadSuccess && <p style={{ color: 'green', marginTop: '10px' }}>¡Prenda añadida correctamente!</p>}
    </div>
  );
};

export default UploadPrenda;
