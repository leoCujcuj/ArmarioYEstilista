import React, { useState, useEffect } from 'react';
import { Camera, Edit2, X, Image as ImageIcon, Plus, CheckCircle2, Circle, Loader2, Shirt, MoveHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import styles from './Perfil.module.css';

const showToast = (msg: string, type?: any) => (window as any).showToast?.(msg, type);

interface PerfilProps {
  user: any;
  refreshUser: () => Promise<any>;
}

export const Perfil: React.FC<PerfilProps> = ({ user, refreshUser }) => {
  const [editing, setEditing] = useState(false);
  const [loadingBio, setLoadingBio] = useState(false);
  const [loadingBody, setLoadingBody] = useState(false);
  const [newStyle, setNewStyle] = useState('');
  const [prendasCount, setPrendasCount] = useState(0);
  const [formData, setFormData] = useState({ 
    nombre: '', edad: '', direccion: '', fotoUrl: '', 
    fotoCaraUrl: '', fotoCuerpoUrl: '',
    hombros: '', cadera: '', altura: '',
    colorimetria: '', genero: 'Neutra', morfologia: '',
    formaCara: '', tipoPelo: '',
    galeriaInspiracion: [] as string[],
    estilos: [] as string[]
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre || '',
        edad: user.edad?.toString() || '',
        direccion: user.direccion || '',
        fotoUrl: user.fotoUrl || '',
        fotoCaraUrl: user.fotoCaraUrl || '',
        fotoCuerpoUrl: user.fotoCuerpoUrl || '',
        hombros: user.biometria?.medidas?.hombros || '',
        cadera: user.biometria?.medidas?.cadera || '',
        altura: user.biometria?.medidas?.altura || '',
        colorimetria: user.biometria?.colorimetria || '',
        formaCara: user.biometria?.formaCara || '',
        tipoPelo: user.biometria?.tipoPelo || '',
        genero: user.biometria?.genero || 'Neutra',
        morfologia: user.biometria?.morfologia || '',
        galeriaInspiracion: user.galeriaInspiracion || [],
        estilos: user.biometria?.estilos || []
      });
      fetchPrendasCount();
    }
  }, [user]);

  const fetchPrendasCount = async () => {
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const response = await fetch(`${API_URL}/api/prendas`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();
        setPrendasCount(data.length);
      }
    } catch (e) {}
  };

  const handleUpdateProfile = async (overrides?: any) => {
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    if (overrides?.fotoCaraUrl) setLoadingBio(true);
    if (overrides?.fotoCuerpoUrl) setLoadingBody(true);

    const biometriaUpdate = {
      biometria: {
        genero: overrides?.genero || formData.genero,
        estilos: (overrides?.estilos || formData.estilos).map((s: string) => s.toUpperCase()),
        colorimetria: overrides?.colorimetria || formData.colorimetria,
        formaCara: overrides?.formaCara || formData.formaCara,
        tipoPelo: overrides?.tipoPelo || formData.tipoPelo,
        morfologia: overrides?.morfologia || formData.morfologia,
        medidas: {
          hombros: overrides?.hombros || formData.hombros,
          cadera: overrides?.cadera || formData.cadera,
          altura: overrides?.altura || formData.altura
        }
      }
    };
    
    const dataToSend = { 
      ...formData, 
      ...overrides, 
      edad: parseInt(overrides?.edad || formData.edad) || user.edad,
      ...biometriaUpdate 
    };

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(dataToSend)
      });
      if (response.ok) {
        await refreshUser();
        if (!overrides?.fotoCaraUrl && !overrides?.fotoCuerpoUrl) {
           showToast('Perfil actualizado');
           setEditing(false);
        }
      }
    } catch (error) {
      showToast('Error al actualizar', 'error');
    } finally {
      setLoadingBio(false);
      setLoadingBody(false);
    }
  };

  const uploadBase64 = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('Imagen muy pesada', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFormData(prev => ({ ...prev, [field]: result }));
        if (field === 'inspiration') {
           const newGal = [...formData.galeriaInspiracion, result];
           handleUpdateProfile({ galeriaInspiracion: newGal });
        } else {
           handleUpdateProfile({ [field]: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addStyle = () => {
    if (!newStyle.trim()) return;
    const updated = [...formData.estilos, newStyle.trim().toUpperCase()];
    setFormData({ ...formData, estilos: updated });
    handleUpdateProfile({ estilos: updated });
    setNewStyle('');
  };

  const removeStyle = (style: string) => {
    const updated = formData.estilos.filter(s => s !== style);
    setFormData({ ...formData, estilos: updated });
    handleUpdateProfile({ estilos: updated });
  };

  const removeInspiration = (index: number) => {
    const newGal = formData.galeriaInspiracion.filter((_, i) => i !== index);
    setFormData({...formData, galeriaInspiracion: newGal});
    handleUpdateProfile({ galeriaInspiracion: newGal });
  };

  if (!user) return null;

  const checks = [
    { label: '5 prendas', done: prendasCount >= 5 },
    { label: 'Fotos IA', done: !!user.fotoCaraUrl && !!user.fotoCuerpoUrl },
    { label: 'Perfil Facial', done: !!user.biometria?.formaCara && !!user.biometria?.tipoPelo },
    { label: '3+ Estilos', done: (user.biometria?.estilos?.length || 0) >= 3 }
  ];
  const progressPercent = Math.round((checks.filter(c => c.done).length / checks.length) * 100);

  const inputStyle = {
    background: '#000000',
    color: '#ffffff',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '0.85rem',
    width: '100%',
    outline: 'none'
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>Mi Identidad Digital</div>
      
      <Card style={{ marginBottom: '30px', padding: '24px', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>Nivel de Personalización</span>
          <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{progressPercent}%</span>
        </div>
        <div style={{ height: '6px', background: 'var(--surface3)', borderRadius: '10px', overflow: 'hidden', marginBottom: '15px' }}>
          <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent)', transition: 'width 1s' }}></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
           {checks.map(c => (
             <div key={c.label} style={{ fontSize: '0.7rem', color: c.done ? 'var(--success)' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
               {c.done ? <CheckCircle2 size={12} /> : <Circle size={12} opacity={0.3} />} {c.label}
             </div>
           ))}
        </div>
      </Card>

      <div className={styles.profileHero}>
        <div className={styles.avatarLg} style={user.fotoUrl ? { backgroundImage: `url(${user.fotoUrl})`, backgroundSize: 'cover' } : {}} onClick={() => document.getElementById('foto-up')?.click()}>
          {!user.fotoUrl && (user.nombre || 'U').substring(0, 2).toUpperCase()}
        </div>
        <input id="foto-up" type="file" hidden onChange={(e) => uploadBase64(e, 'fotoUrl')} />
        <div className={styles.profileInfoBlock}>
          {editing ? (
             <div style={{ display: 'grid', gap: '10px', width: '320px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input style={inputStyle} value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Nombre" />
                  <input style={{...inputStyle, width: '80px'}} type="number" value={formData.edad} onChange={e => setFormData({...formData, edad: e.target.value})} placeholder="Edad" />
                </div>
                <select style={inputStyle} value={formData.genero} onChange={e => setFormData({...formData, genero: e.target.value})}>
                  <option value="Neutra">Preferencia: Neutra</option>
                  <option value="Masculina">Preferencia: Masculina</option>
                  <option value="Femenina">Preferencia: Femenina</option>
                </select>
                <div style={{ display: 'flex', gap: '10px' }}><Button size="sm" onClick={() => handleUpdateProfile()}>Guardar</Button><Button size="sm" variant="ghost" onClick={() => setEditing(false)}>X</Button></div>
             </div>
          ) : (
            <>
              <div className={styles.profileName}>{user.nombre} <span style={{ fontSize: '1rem', color: 'var(--muted)', fontWeight: 400 }}>· {user.edad} años</span></div>
              <div className={styles.profileEmail}><Shirt size={12} style={{ marginRight: '5px' }} /> Moda {user.biometria?.genero || 'Neutra'} · {user.direccion || 'Ubicación pendiente'}</div>
              <Button size="sm" variant="outline" icon={<Edit2 size={12} />} style={{ marginTop: '10px' }} onClick={() => setEditing(true)}>Editar datos</Button>
            </>
          )}
        </div>
      </div>

      <div className={styles.bioGrid}>
        {/* CARD COLORIMETRÍA (Oro) */}
        <Card style={{ flex: 1, padding: '24px', borderRadius: '24px', background: 'linear-gradient(145deg, rgba(200, 169, 126, 0.1) 0%, rgba(10, 10, 10, 1) 100%)', border: '1px solid rgba(200, 169, 126, 0.3)' }}>
          <div className={styles.bioCardTitle}>Análisis Facial (IA) <Camera size={14} style={{ float: 'right', cursor: 'pointer', color: 'var(--accent)' }} onClick={() => document.getElementById('cara-up')?.click()} /></div>
          <div style={{ height: '140px', background: 'rgba(200, 169, 126, 0.05)', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', border: '1px dashed rgba(200, 169, 126, 0.2)' }}>
            {user.fotoCaraUrl ? <img src={user.fotoCaraUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon color="rgba(200, 169, 126, 0.5)" />}
          </div>
          
          <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
            <div style={{ padding: '8px', background: '#000', borderRadius: '10px', border: '1px solid rgba(200, 169, 126, 0.2)' }}>
               <div style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase' }}>Forma de Cara</div>
               <input style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.75rem', outline: 'none', width: '100%' }} value={formData.formaCara} onChange={e => setFormData({...formData, formaCara: e.target.value})} onBlur={() => handleUpdateProfile()} placeholder="Óvalo, Cuadrada..." />
            </div>
            <div style={{ padding: '8px', background: '#000', borderRadius: '10px', border: '1px solid rgba(200, 169, 126, 0.2)' }}>
               <div style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase' }}>Tipo de Pelo</div>
               <input style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.75rem', outline: 'none', width: '100%' }} value={formData.tipoPelo} onChange={e => setFormData({...formData, tipoPelo: e.target.value})} onBlur={() => handleUpdateProfile()} placeholder="2B, 3C, 1A..." />
            </div>
          </div>

          <div style={{ padding: '12px', background: '#000', borderRadius: '12px', border: '1px solid rgba(200, 169, 126, 0.2)', minHeight: '80px' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '5px' }}>
              <span>Colorimetría {loadingBio && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />}</span>
              {user.biometria?.subtono && <span style={{ color: '#fff', fontWeight: 600 }}>Subtono: {user.biometria.subtono}</span>}
            </div>
            <textarea
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '0.7rem',
                lineHeight: '1.4',
                fontStyle: 'italic',
                width: '100%',
                height: '60px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit'
              }}
              value={formData.colorimetria}
              onChange={e => setFormData({...formData, colorimetria: e.target.value})}
              onBlur={() => handleUpdateProfile()}
              placeholder={loadingBio ? 'La IA está analizando...' : 'Sube tu foto o escribe tu estación (ej: Otoño Cálido)...'}
            />
            {user.biometria?.paletaRecomendada?.length > 0 && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(200,169,126,0.15)' }}>
                {user.biometria.paletaRecomendada.map((col: string, i: number) => (
                  <span key={i} style={{ fontSize: '0.62rem', background: 'rgba(200,169,126,0.12)', color: 'var(--accent)', padding: '2px 7px', borderRadius: '6px' }}>
                    {col}
                  </span>
                ))}
              </div>
            )}
          </div>
          <input id="cara-up" type="file" hidden onChange={(e) => uploadBase64(e, 'fotoCaraUrl')} />
        </Card>

        {/* CARD MORFOLOGÍA (Plata) */}
        <Card style={{ flex: 1, padding: '24px', borderRadius: '24px', background: 'linear-gradient(145deg, rgba(150, 150, 150, 0.1) 0%, rgba(10, 10, 10, 1) 100%)', border: '1px solid rgba(150, 150, 150, 0.3)' }}>
          <div className={styles.bioCardTitle}>Morfología (Cuerpo) <Camera size={14} style={{ float: 'right', cursor: 'pointer', color: '#999' }} onClick={() => document.getElementById('cuerpo-up')?.click()} /></div>
          <div style={{ height: '140px', background: 'rgba(150, 150, 150, 0.05)', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', border: '1px dashed rgba(150, 150, 150, 0.2)' }}>
            {user.fotoCuerpoUrl ? <img src={user.fotoCuerpoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon color="rgba(150, 150, 150, 0.5)" />}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div className={styles.inputGroupMini}>
              <label style={{ color: '#aaa', fontSize: '0.6rem' }}><MoveHorizontal size={10} /> Hombros</label>
              <input style={{...inputStyle, padding: '6px 10px', fontSize: '0.75rem'}} type="text" placeholder="cm" value={formData.hombros} onChange={e => setFormData({...formData, hombros: e.target.value})} onBlur={() => handleUpdateProfile()} />
            </div>
            <div className={styles.inputGroupMini}>
              <label style={{ color: '#aaa', fontSize: '0.6rem' }}><MoveHorizontal size={10} /> Cadera</label>
              <input style={{...inputStyle, padding: '6px 10px', fontSize: '0.75rem'}} type="text" placeholder="cm" value={formData.cadera} onChange={e => setFormData({...formData, cadera: e.target.value})} onBlur={() => handleUpdateProfile()} />
            </div>
            <div className={styles.inputGroupMini} style={{ gridColumn: 'span 2' }}>
              <label style={{ color: '#aaa', fontSize: '0.6rem' }}><ArrowUpDown size={10} /> Altura</label>
              <input style={{...inputStyle, padding: '6px 10px', fontSize: '0.75rem'}} type="text" placeholder="cm" value={formData.altura} onChange={e => setFormData({...formData, altura: e.target.value})} onBlur={() => handleUpdateProfile()} />
            </div>
          </div>

          <div style={{ padding: '10px', background: '#000', borderRadius: '10px', border: '1px solid rgba(150, 150, 150, 0.2)' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--info)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
              Tipo de Cuerpo (IA / Manual) {loadingBody && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite', float: 'right' }} />}
            </div>
            <input
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.75rem', outline: 'none', width: '100%' }}
              value={formData.morfologia}
              onChange={e => setFormData({ ...formData, morfologia: e.target.value })}
              onBlur={() => handleUpdateProfile()}
              placeholder={loadingBody ? 'Detectando silueta con MediaPipe...' : 'Ej: Triángulo Invertido, Rectángulo, Reloj de Arena...'}
            />
            {user.biometria?.recomendacionCorte && (
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)', lineHeight: '1.35' }}>
                {user.biometria.recomendacionCorte}
              </div>
            )}
          </div>
          <input id="cuerpo-up" type="file" hidden onChange={(e) => uploadBase64(e, 'fotoCuerpoUrl')} />
        </Card>
      </div>

      <div style={{ marginTop: '30px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '15px' }}>Inspiración y Estilos</div>
        <Card style={{ padding: '20px', marginBottom: '15px', background: '#000' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
            {formData.estilos.map(s => (
              <div key={s} style={{ background: 'var(--surface2)', padding: '5px 12px', borderRadius: '100px', border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', color: '#fff' }}>
                {s} <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeStyle(s)} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '5px' }}>
               <input style={{...inputStyle, width: '120px', padding: '5px 12px', fontSize: '0.7rem', textTransform: 'uppercase'}} placeholder="Añadir estilo..." value={newStyle} onChange={e => setNewStyle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStyle()} />
               <button onClick={addStyle} style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={16} color="black" /></button>
            </div>
          </div>
        </Card>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
          {formData.galeriaInspiracion.map((img, idx) => (
            <div key={idx} style={{ position: 'relative', height: '160px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', background: '#000' }}>
              <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => removeInspiration(idx)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} /></button>
            </div>
          ))}
          <div onClick={() => document.getElementById('insp-up')?.click()} style={{ height: '160px', border: '2px dashed var(--border)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)', background: 'rgba(255,255,255,0.02)' }}><Plus size={24} /></div>
          <input id="insp-up" type="file" hidden onChange={(e) => uploadBase64(e, 'inspiration')} />
        </div>
      </div>
    </div>
  );
};
