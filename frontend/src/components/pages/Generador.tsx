import React, { useState, useEffect } from 'react';
import { RefreshCw, Heart, Sparkles, CloudRain, Sun, Calendar, Plus, MapPin, CheckCircle2, ThumbsUp, ThumbsDown, Edit3, Wand2, Check, Palette } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Tag } from '../common/Tag';
import styles from './Generador.module.css';

const showToast = (msg: string, type?: any) => (window as any).showToast?.(msg, type);

export const Generador: React.FC = () => {
  const [ocasion, setOcasion] = useState('Casual');
  const [customOcasion, setCustomOcasion] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [outfit, setOutfit] = useState<any[]>([]);
  const [explicacion, setExplicacion] = useState('');
  const [consejoColor, setConsejoColor] = useState('');
  const [origenLook, setOrigenLook] = useState<string>('ia');
  const [displayedExplicacion, setDisplayedExplicacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingLook, setSavingLook] = useState(false);
  const [registeringUse, setRegisteringUse] = useState(false);
  const [score, setScore] = useState({ color: 0, balance: 0 });
  const [feedbackGiven, setFeedbackGiven] = useState<'like' | 'dislike' | null>(null);
  const [showDislikeReasons, setShowDislikeReasons] = useState(false);
  const [instrucciones, setInstrucciones] = useState('');

  // Estados para Modo Manual
  const [isManualMode, setIsManualMode] = useState(false);
  const [todasPrendas, setTodasPrendas] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sugerencia, setSugerencia] = useState<any>(null);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const [weather, setWeather] = useState({ temp: '--', desc: 'Cargando...', icon: <Sun size={14} /> });
  const [locationName, setLocationName] = useState(localStorage.getItem('weatherCity') || user?.direccion || 'Mi ubicación');
  const [showLocInput, setShowLocInput] = useState(false);
  const [tempLoc, setTempLoc] = useState('');

  useEffect(() => {
    if (explicacion) {
      setDisplayedExplicacion('');
      let index = 0;
      const words = explicacion.split(' ');
      const timer = setInterval(() => {
        if (index < words.length) {
          const currentWord = words[index];
          setDisplayedExplicacion(prev => prev + (prev ? ' ' : '') + currentWord);
          index++;
        } else {
          clearInterval(timer);
        }
      }, 28);
      return () => clearInterval(timer);
    }
  }, [explicacion]);

  const fetchPrendas = async () => {
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const res = await fetch(`${API_URL}/api/prendas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodasPrendas(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWeather = async (customCity?: string): Promise<string> => {
    const getW = async (latitude: number, longitude: number, cityName?: string): Promise<string> => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
        const data = await res.json();
        const temp = Math.round(data.current_weather.temperature);
        const code = data.current_weather.weathercode;
        let desc = 'Despejado';
        if (code > 0) desc = 'Nublado';
        if (code > 50) desc = 'Lluvia';
        const tempStr = `${temp}°C`;
        setWeather({
          temp: tempStr,
          desc,
          icon: code > 50 ? <CloudRain size={14} /> : <Sun size={14} />
        });
        if (cityName) setLocationName(cityName);
        return `${tempStr}, ${desc}`;
      } catch (e) {
        return '20°C, Despejado';
      }
    };

    const cityToSearch = customCity || localStorage.getItem('weatherCity') || user?.direccion;
    if (cityToSearch && cityToSearch !== 'Mi ubicación') {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityToSearch)}&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
          const shortName = data[0].display_name.split(',')[0];
          return await getW(parseFloat(data[0].lat), parseFloat(data[0].lon), shortName);
        }
      } catch (e) {}
    }

    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => resolve(await getW(pos.coords.latitude, pos.coords.longitude)),
          async () => resolve(await getW(40.4168, -3.7038))
        );
      } else {
        getW(40.4168, -3.7038).then(resolve);
      }
    });
  };

  const handleSaveLocation = async () => {
    if (!tempLoc.trim()) return;
    localStorage.setItem('weatherCity', tempLoc.trim());
    setShowLocInput(false);
    const nuevoClima = await fetchWeather(tempLoc.trim());
    window.dispatchEvent(new Event('locationUpdated'));
    if (!isManualMode) {
      generateLook(undefined, true, nuevoClima);
    }
  };

  const generateLook = async (ocasionIn?: string, force = false, overrideClima?: string) => {
    const climaContexto = overrideClima || (weather.temp === '--' ? '20°C, Despejado' : `${weather.temp}, ${weather.desc}`);
    setLoading(true);
    setFeedbackGiven(null);
    setShowDislikeReasons(false);
    setSugerencia(null);
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const finalOcasion = ocasionIn || (isCustomMode ? customOcasion : ocasion);

    try {
      const response = await fetch(`${API_URL}/api/looks/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ocasion: finalOcasion,
          forzarRegenerar: force,
          clima: climaContexto,
          instrucciones: instrucciones.trim()
        })
      });
      const data = await response.json();
      if (response.ok) {
        setOutfit(data.outfit || []);
        setExplicacion(data.explicacion || '');
        setConsejoColor(data.consejo_color || '');
        setOrigenLook(data.origen || 'ia');
        setScore(data.score || { color: 85, balance: 88 });
        setSelectedIds((data.outfit || []).map((p: any) => p._id));
      } else {
        showToast(data.error || 'No se pudo generar el look', 'info');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const analyzeManualLook = async () => {
    if (selectedIds.length === 0) {
      showToast('Selecciona al menos una prenda', 'info');
      return;
    }

    setLoading(true);
    setSugerencia(null);
    setFeedbackGiven(null);
    const climaContexto = weather.temp === '--' ? '20°C, Despejado' : `${weather.temp}, ${weather.desc}`;
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    try {
      const response = await fetch(`${API_URL}/api/looks/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prendasIds: selectedIds,
          ocasion: isCustomMode ? customOcasion : ocasion,
          clima: climaContexto
        })
      });
      const data = await response.json();
      if (response.ok) {
        const outfitSeleccionado = todasPrendas.filter(p => selectedIds.includes(p._id));
        setOutfit(outfitSeleccionado);
        setExplicacion(data.feedback || '');
        setConsejoColor(data.consejo_color || '');
        setScore(data.score || { color: 85, balance: 85 });
        setSugerencia(data.sugerencia);
      }
    } catch (error) {
      showToast('Error al analizar la combinación', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFavorite = async () => {
    const idsToSave = isManualMode ? selectedIds : outfit.map(p => p._id);
    if (idsToSave.length === 0) {
      showToast('No hay prendas en el look para guardar', 'info');
      return;
    }
    setSavingLook(true);
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const finalOcasion = isCustomMode && customOcasion ? customOcasion : ocasion;

    try {
      const res = await fetch(`${API_URL}/api/looks/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prendasIds: idsToSave,
          ocasion: finalOcasion,
          explicacion: explicacion || 'Combinación personalizada guardada en favoritos.',
          consejo_color: consejoColor,
          score
        })
      });
      if (res.ok) {
        showToast('Look guardado en tu colección de Favoritos', 'success');
      } else {
        showToast('No se pudo guardar el look', 'error');
      }
    } catch (e) {
      showToast('Error al guardar en favoritos', 'error');
    } finally {
      setSavingLook(false);
    }
  };

  const handlePlanUse = async () => {
    const idsToUse = isManualMode ? selectedIds : outfit.map(p => p._id);
    if (idsToUse.length === 0) {
      showToast('Selecciona o genera un look primero', 'info');
      return;
    }
    setRegisteringUse(true);
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    try {
      const res = await fetch(`${API_URL}/api/uso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prendasIds: idsToUse,
          fecha: new Date()
        })
      });
      if (res.ok) {
        showToast('Uso registrado hoy. Estadísticas de rotación actualizadas.', 'success');
        fetchPrendas();
      } else {
        showToast('No se pudo registrar el uso', 'error');
      }
    } catch (e) {
      showToast('Error al registrar uso', 'error');
    } finally {
      setRegisteringUse(false);
    }
  };

  const handleFeedback = async (type: 'like' | 'dislike', motivo?: string) => {
    const ids = outfit.map(p => p._id);
    if (ids.length === 0) return;

    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const finalOcasion = isCustomMode && customOcasion ? customOcasion : ocasion;

    try {
      const res = await fetch(`${API_URL}/api/looks/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type,
          prendasIds: ids,
          motivo: motivo || '',
          ocasion: finalOcasion,
          explicacion,
          consejo_color: consejoColor,
          score
        })
      });
      if (res.ok) {
        setFeedbackGiven(type);
        setShowDislikeReasons(false);
        if (type === 'like') {
          showToast('Preferencia guardada. Este look también servirá de respaldo inteligente.', 'success');
        } else {
          showToast(`Preferencia de ${motivo || 'estilo'} actualizada. Generando nueva propuesta...`, 'info');
          generateLook(finalOcasion, true);
        }
      }
    } catch (e) {
      showToast('Error al enviar retroalimentación', 'error');
    }
  };

  const togglePrenda = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const applySuggestion = () => {
    if (!sugerencia) return;
    const { id_original, id_sugerida, prendaDetalle } = sugerencia;

    setSelectedIds(prev => {
      const filtered = prev.filter(id => id !== id_original);
      return [...filtered, id_sugerida];
    });

    setOutfit(prev => {
      const filtered = prev.filter(p => p._id !== id_original);
      return [...filtered, prendaDetalle];
    });

    setSugerencia(null);
    showToast('Cambio de prenda aplicado con éxito', 'success');
  };

  useEffect(() => {
    const init = async () => {
      fetchPrendas();
      const climaInicial = await fetchWeather();
      generateLook(undefined, false, climaInicial);
    };
    init();
  }, []);

  const handleOccasionChange = (newOcc: string) => {
    setOcasion(newOcc);
    setIsCustomMode(false);
    if (!isManualMode) generateLook(newOcc, true);
  };

  const ocasiones = ['Casual', 'Oficina', 'Evento', 'Noche'];

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>Estilista Personal IA</div>
      <div className={styles.pageSubtitle}>Combinaciones inteligentes basadas en tu morfología, colorimetría y clima local</div>

      <div className={styles.generatorWrap}>
        <div className={styles.genCanvas}>
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeBtn} ${!isManualMode ? styles.active : ''}`}
              onClick={() => setIsManualMode(false)}
            >
              <Wand2 size={16} /> Generación Automática
            </button>
            <button
              className={`${styles.modeBtn} ${isManualMode ? styles.active : ''}`}
              onClick={() => setIsManualMode(true)}
            >
              <Edit3 size={16} /> Creación Manual
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div className={styles.genCanvasTitle}>
                {isManualMode ? 'Tu Combinación' : 'Propuesta del Día'}
              </div>
              <div className={styles.genCanvasSub} style={{ marginBottom: '20px' }}>
                {user?.biometria?.genero || 'Estilo'} · {isCustomMode ? customOcasion || 'Personalizado' : ocasion}
              </div>
            </div>
            {!isManualMode && origenLook === 'favorito_respaldo' && (
              <Tag variant="gold">Respaldo: Favorito Verificado</Tag>
            )}
          </div>

          {loading ? (
            <div style={{ height: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', color: 'var(--muted)' }}>
              <RefreshCw size={44} className="spin" style={{ animation: 'spin 2s linear infinite', color: 'var(--accent)' }} />
              <p>{isManualMode ? 'Analizando proporciones y armonía cromática...' : 'Evaluando tu armario, biometría y clima actual...'}</p>
            </div>
          ) : (
            <>
              {isManualMode && (
                <div className={styles.manualSelector}>
                  {todasPrendas.map(prenda => (
                    <div
                      key={prenda._id}
                      className={`${styles.selectableItem} ${selectedIds.includes(prenda._id) ? styles.selected : ''}`}
                      onClick={() => togglePrenda(prenda._id)}
                      title={`${prenda.nombre} (${prenda.color_principal || prenda.categoria})`}
                    >
                      <img src={prenda.url_imagen_limpia} alt={prenda.nombre} />
                      {selectedIds.includes(prenda._id) && (
                        <div className={styles.checkBadge}><Check size={12} strokeWidth={3} /></div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.genOutfitDisplay}>
                {outfit.length > 0 ? outfit.map((prenda) => (
                  <div key={prenda._id} className={styles.genItem}>
                    <div className={styles.genItemImg}>
                      <img
                        src={prenda.url_imagen_limpia?.includes('/upload/')
                          ? prenda.url_imagen_limpia.replace('/upload/', '/upload/w_400,q_auto,f_auto/')
                          : prenda.url_imagen_limpia}
                        alt={prenda.nombre}
                      />
                    </div>
                    <span style={{ textAlign: 'center', color: 'var(--text)', fontWeight: 600 }}>{prenda.nombre}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '-8px' }}>
                      {prenda.color_principal && prenda.color_principal !== 'No especificado' ? `${prenda.color_principal} · ` : ''}{prenda.corte_silueta || prenda.categoria}
                    </span>
                  </div>
                )) : !isManualMode && (
                  <div style={{ gridColumn: '1/-1', padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
                    Aún no tenemos suficientes prendas para crear una combinación. Añade prendas en Mi Armario.
                  </div>
                )}
              </div>

              {displayedExplicacion && (
                <div className={styles.genExplanation}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                        <Sparkles size={16} color="var(--accent)" /> Justificación Morfológica y de Estilo
                      </div>
                      <p style={{ margin: 0 }}>{displayedExplicacion}</p>

                      {consejoColor && (
                        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(200, 169, 126, 0.15)', fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <Palette size={15} color="var(--accent)" style={{ flexShrink: 0, marginTop: '3px' }} />
                          <span><strong style={{ color: 'var(--text)' }}>Armonía de Color:</strong> {consejoColor}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* FEEDBACK LOOP INTERACTIVO */}
                  {outfit.length > 0 && (
                    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                          {feedbackGiven === 'like'
                            ? 'Has indicado que te gusta esta propuesta.'
                            : '¿Qué te parece esta propuesta para tu estilo?'}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleFeedback('like')}
                            disabled={feedbackGiven === 'like'}
                            style={{
                              background: feedbackGiven === 'like' ? 'rgba(90, 158, 110, 0.25)' : 'var(--surface2)',
                              border: '1px solid rgba(90, 158, 110, 0.4)',
                              color: '#7ec994',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <ThumbsUp size={13} /> Me gusta
                          </button>
                          <button
                            onClick={() => setShowDislikeReasons(!showDislikeReasons)}
                            style={{
                              background: showDislikeReasons ? 'rgba(192, 97, 74, 0.25)' : 'var(--surface2)',
                              border: '1px solid rgba(192, 97, 74, 0.4)',
                              color: '#e88c78',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <ThumbsDown size={13} /> Ajustar propuesta
                          </button>
                        </div>
                      </div>

                      {showDislikeReasons && (
                        <div style={{ background: 'var(--surface2)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>¿Qué prefieres cambiar para afinar el motor IA?</span>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <Button size="sm" variant="outline" onClick={() => handleFeedback('dislike', 'corte')}>Corte / Silueta</Button>
                            <Button size="sm" variant="outline" onClick={() => handleFeedback('dislike', 'color')}>Colorimetría</Button>
                            <Button size="sm" variant="outline" onClick={() => handleFeedback('dislike', 'estilo')}>Estilo / Ocasión</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {sugerencia && (
                    <div className={styles.suggestionCard}>
                      <div className={styles.suggestionImg}>
                        <img src={sugerencia.prendaDetalle?.url_imagen_limpia} alt="Sugerencia" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem', marginBottom: '4px', textTransform: 'uppercase' }}>
                          Sugerencia de Mejora: {sugerencia.prendaDetalle?.nombre}
                        </div>
                        <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--text)' }}>{sugerencia.porque}</p>
                        <button
                          onClick={applySuggestion}
                          style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, marginTop: '8px', padding: 0, display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          <CheckCircle2 size={14} /> Aplicar cambio
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.genActions} style={{ flexWrap: 'wrap' }}>
                {isManualMode && (
                  <Button icon={<Sparkles size={16} />} onClick={analyzeManualLook} variant="primary">
                    Analizar Combinación
                  </Button>
                )}
                <Button
                  icon={<Calendar size={16} />}
                  onClick={handlePlanUse}
                  disabled={registeringUse || outfit.length === 0}
                  variant="primary"
                  style={{ backgroundColor: 'var(--success)', color: 'white' }}
                >
                  {registeringUse ? 'Registrando...' : 'Usar hoy'}
                </Button>
                <Button
                  icon={<Heart size={16} />}
                  onClick={handleSaveFavorite}
                  disabled={savingLook || outfit.length === 0}
                  variant="outline"
                >
                  {savingLook ? 'Guardando...' : 'Guardar favorito'}
                </Button>
                {!isManualMode && (
                  <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={() => generateLook(undefined, true)}>
                    Generar otro
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        <div className={styles.genPanel}>
          <Card className={styles.genSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div className={styles.genSectionTitle} style={{ marginBottom: 0 }}>Contexto Actual</div>
              <button
                onClick={() => { setTempLoc(locationName); setShowLocInput(!showLocInput); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.72rem', cursor: 'pointer' }}
              >
                {showLocInput ? 'Cancelar' : 'Cambiar ciudad'}
              </button>
            </div>

            {showLocInput && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                <input
                  className={styles.input}
                  style={{ padding: '8px 10px', fontSize: '0.8rem' }}
                  placeholder="Ciudad, País"
                  value={tempLoc}
                  onChange={e => setTempLoc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveLocation()}
                />
                <Button size="sm" onClick={handleSaveLocation}><Check size={14} /></Button>
              </div>
            )}

            <div className={styles.contextItem} style={{ marginBottom: '15px', color: 'var(--accent)' }}>
              <span className={styles.contextLabel} style={{ color: 'var(--accent)' }}><MapPin size={12} /> Ubicación</span>
              <span className={styles.contextValue}>{locationName}</span>
            </div>
            <div className={styles.contextItem}>
              <span className={styles.contextLabel}>{weather.icon} Clima</span>
              <span className={styles.contextValue}>{weather.temp} {weather.desc}</span>
            </div>
            <div className={styles.contextItem}>
              <span className={styles.contextLabel}><Calendar size={14} /> Fecha</span>
              <span className={styles.contextValue}>{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
            </div>
          </Card>

          <Card className={styles.genSection}>
            <div className={styles.genSectionTitle}>Ocasión</div>
            <div className={styles.occasionGrid}>
              {ocasiones.map((o) => (
                <button
                  key={o}
                  className={`${styles.occBtn} ${!isCustomMode && ocasion === o ? styles.active : ''}`}
                  onClick={() => handleOccasionChange(o)}
                >
                  {o}
                </button>
              ))}
              <button
                className={`${styles.occBtn} ${isCustomMode ? styles.active : ''}`}
                onClick={() => setIsCustomMode(true)}
              >
                <Plus size={14} /> Otro
              </button>
            </div>
            {isCustomMode && (
              <div style={{ marginTop: '15px', display: 'flex', gap: '8px' }}>
                <input
                  className={styles.input}
                  placeholder="Ej: Cena de negocios, Boda..."
                  value={customOcasion}
                  onChange={(e) => setCustomOcasion(e.target.value)}
                />
                {!isManualMode && (
                  <Button size="sm" onClick={() => generateLook(customOcasion, true)}>Ir</Button>
                )}
              </div>
            )}
          </Card>

          {!isManualMode && (
            <Card className={styles.genSection}>
              <div className={styles.genSectionTitle}>Instrucciones Especiales</div>
              <textarea
                className={styles.input}
                style={{ height: '80px', paddingTop: '10px', resize: 'none', fontSize: '0.85rem' }}
                placeholder="Ej: Mi camisa blanca está lavándose, evita tonos oscuros..."
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
              />
              <Button
                variant="primary"
                size="sm"
                icon={<Sparkles size={14} />}
                onClick={() => generateLook(undefined, true)}
                disabled={loading}
                style={{ width: '100%', marginTop: '10px', fontSize: '0.8rem' }}
              >
                Aplicar y Regenerar
              </Button>
            </Card>
          )}

          <Card className={styles.genSection}>
            <div className={styles.genSectionTitle}>Análisis de Armonía</div>
            <div className={styles.aiScore}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.75rem' }}>
                  <span>Colorimetría</span>
                  <span>{score?.color || 0}%</span>
                </div>
                <div className={styles.aiScoreBar}>
                  <div className={styles.aiScoreFill} style={{ width: `${score?.color || 0}%` }}></div>
                </div>
              </div>
              <div style={{ width: '100%', marginTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.75rem' }}>
                  <span>Equilibrio Morfológico</span>
                  <span>{score?.balance || 0}%</span>
                </div>
                <div className={styles.aiScoreBar}>
                  <div className={styles.aiScoreFill} style={{ width: `${score?.balance || 0}%`, backgroundColor: 'var(--info)' }}></div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
