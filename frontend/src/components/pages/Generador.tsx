import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Heart,
  Sparkles,
  CloudRain,
  Sun,
  Calendar,
  Plus,
  MapPin,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Wand2,
  Check,
  Palette
} from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Tag } from '../common/Tag';
import { AssignCalendarModal } from '../common/AssignCalendarModal';
import {
  PrendaItem,
  OCASIONES_DISPONIBLES,
  optimizarImagenUrl
} from '../../types/armario';
import styles from './Generador.module.css';

const showToast = (msg: string, type?: 'success' | 'error' | 'info') =>
  (window as unknown as { showToast?: (m: string, t?: string) => void }).showToast?.(msg, type);

export const Generador: React.FC = () => {
  const [ocasion, setOcasion] = useState('Casual');
  const [customOcasion, setCustomOcasion] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [outfit, setOutfit] = useState<PrendaItem[]>([]);
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

  // Estados para Modo Manual y Reglas de Colorimetría / Ocasión
  const [isManualMode, setIsManualMode] = useState(false);
  const [soloOcasionCompatible, setSoloOcasionCompatible] = useState(false);
  const [todasPrendas, setTodasPrendas] = useState<PrendaItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sugerencia, setSugerencia] = useState<{
    id_original: string;
    id_sugerida: string;
    porque: string;
    prendaDetalle: PrendaItem;
  } | null>(null);

  // Estado Modal Asignación directa al Calendario (Módulo D)
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const [weather, setWeather] = useState({ temp: '--', desc: 'Cargando...', icon: <Sun size={14} /> });
  const [locationName, setLocationName] = useState(
    localStorage.getItem('weatherCity') || user?.direccion || 'Mi ubicación'
  );
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
          setDisplayedExplicacion((prev) => prev + (prev ? ' ' : '') + currentWord);
          index++;
        } else {
          clearInterval(timer);
        }
      }, 24);
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
        const data: PrendaItem[] = await res.json();
        setTodasPrendas(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWeather = async (customCity?: string): Promise<string> => {
    const getW = async (latitude: number, longitude: number, cityName?: string): Promise<string> => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
        );
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
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityToSearch)}&limit=1`
        );
        const data = await res.json();
        if (data && data.length > 0) {
          const shortName = data[0].display_name.split(',')[0];
          return await getW(parseFloat(data[0].lat), parseFloat(data[0].lon), shortName);
        }
      } catch (e) {
        // continúa a geolocalización por defecto
      }
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
    const climaContexto =
      overrideClima || (weather.temp === '--' ? '20°C, Despejado' : `${weather.temp}, ${weather.desc}`);
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
        setSelectedIds((data.outfit || []).map((p: PrendaItem) => p._id));
      } else {
        showToast(data.error || 'No se pudo generar el look', 'info');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Motor algorítmico instantáneo en cliente basado en reglas de colorimetría + ocasión del armario:
   * Permite preseleccionar automáticamente piezas armónicas en el constructor manual.
   */
  const autocompletarPorReglasArmario = () => {
    if (todasPrendas.length === 0) {
      showToast('Añade prendas a tu armario primero', 'info');
      return;
    }
    const occActiva = (isCustomMode && customOcasion ? customOcasion : ocasion).toLowerCase();
    const subtonoUser = (user?.biometria?.subtono || 'Neutro').toLowerCase();

    const puntuar = (p: PrendaItem) => {
      let scoreLocal = 0;
      const occs = (p.ocasiones || []).map((o) => o.toLowerCase());
      if (occs.includes(occActiva)) scoreLocal += 4;
      const subP = (p.subtono || 'Neutro').toLowerCase();
      if (subP === subtonoUser || subP === 'neutro' || subtonoUser === 'neutro') scoreLocal += 3;
      if ((p.contadorUsos || 0) === 0) scoreLocal += 1.5;
      return scoreLocal + Math.random() * 0.8;
    };

    const elegirDeCat = (cat: string) => {
      const candidatas = todasPrendas.filter((p) => p.categoria === cat);
      if (candidatas.length === 0) return null;
      return [...candidatas].sort((a, b) => puntuar(b) - puntuar(a))[0];
    };

    const sugeridas = [
      elegirDeCat('Top'),
      elegirDeCat('Bottom'),
      elegirDeCat('Shoes'),
      occActiva === 'oficina' || occActiva === 'evento' ? elegirDeCat('Outerwear') : null
    ].filter((x): x is PrendaItem => Boolean(x));

    const seleccion = sugeridas.length > 0 ? sugeridas : todasPrendas.slice(0, 3);
    setSelectedIds(seleccion.map((p) => p._id));
    setOutfit(seleccion);
    setExplicacion(
      `Combinación estructurada según tus prendas etiquetadas para ${isCustomMode ? customOcasion : ocasion} y afinidad con subtono ${user?.biometria?.subtono || 'Neutro'}.`
    );
    setConsejoColor('Equilibrio cromático calculado entre paleta primaria y estación registrada.');
    setScore({ color: 90, balance: 89 });
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
        const outfitSeleccionado = todasPrendas.filter((p) => selectedIds.includes(p._id));
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

  const prendasActivasParaGuardar = useMemo(() => {
    if (isManualMode) {
      return todasPrendas.filter((p) => selectedIds.includes(p._id));
    }
    return outfit;
  }, [isManualMode, todasPrendas, selectedIds, outfit]);

  const handleSaveFavorite = async () => {
    const idsToSave = prendasActivasParaGuardar.map((p) => p._id);
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

  const handleUseTodayQuick = async () => {
    const idsToUse = prendasActivasParaGuardar.map((p) => p._id);
    if (idsToUse.length === 0) {
      showToast('Selecciona o genera un look primero', 'info');
      return;
    }
    setRegisteringUse(true);
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const finalOcasion = isCustomMode && customOcasion ? customOcasion : ocasion;
    const climaStr = weather.temp === '--' ? '' : `${weather.temp} ${weather.desc}`;

    try {
      const res = await fetch(`${API_URL}/api/calendario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prendasIds: idsToUse,
          ocasion: finalOcasion,
          clima: climaStr,
          estado: 'usado'
        })
      });
      if (res.ok) {
        showToast('Registrado hoy en el Calendario OOTD. Analítica actualizada.', 'success');
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
    const ids = outfit.map((p) => p._id);
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
          showToast('Preferencia guardada. Añadido como referencia verificada.', 'success');
        } else {
          showToast(`Ajustando ${motivo || 'estilo'}. Generando nueva combinación...`, 'info');
          generateLook(finalOcasion, true);
        }
      }
    } catch (e) {
      showToast('Error al enviar retroalimentación', 'error');
    }
  };

  const togglePrenda = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      setOutfit(todasPrendas.filter((p) => next.includes(p._id)));
      return next;
    });
  };

  const applySuggestion = () => {
    if (!sugerencia) return;
    const { id_original, id_sugerida, prendaDetalle } = sugerencia;

    setSelectedIds((prev) => {
      const filtered = prev.filter((id) => id !== id_original);
      return [...filtered, id_sugerida];
    });

    setOutfit((prev) => {
      const filtered = prev.filter((p) => p._id !== id_original);
      return [...filtered, prendaDetalle];
    });

    setSugerencia(null);
    showToast('Reemplazo aplicado al conjunto', 'success');
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

  const ocasionEfectiva = isCustomMode && customOcasion ? customOcasion : ocasion;

  const prendasSelectorManual = useMemo(() => {
    if (!soloOcasionCompatible) return todasPrendas;
    return todasPrendas.filter((p) => (p.ocasiones || []).includes(ocasionEfectiva));
  }, [todasPrendas, soloOcasionCompatible, ocasionEfectiva]);

  return (
    <div className={styles.page}>
      <span className={styles.overline}>Motor de Combinaciones Sartoriales</span>
      <h1 className={styles.pageTitle}>Estilista Personal & Outfits</h1>
      <div className={styles.pageSubtitle}>
        Generación armónica cruzando tu colorimetría ({user?.biometria?.colorimetria || 'Estación activa'}), ocasiones del armario y clima local
      </div>

      <div className={styles.generatorWrap}>
        <div className={styles.genCanvas}>
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeBtn} ${!isManualMode ? styles.active : ''}`}
              onClick={() => setIsManualMode(false)}
            >
              <Wand2 size={16} /> Motor IA Automático
            </button>
            <button
              className={`${styles.modeBtn} ${isManualMode ? styles.active : ''}`}
              onClick={() => setIsManualMode(true)}
            >
              <Edit3 size={16} /> Laboratorio de Combinación
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div className={styles.genCanvasTitle}>
                {isManualMode ? 'Mesa de Estilismo' : 'Propuesta Armónica'}
              </div>
              <div className={styles.genCanvasSub}>
                {user?.biometria?.genero || 'Colección'} · Ocasión: {ocasionEfectiva}
              </div>
            </div>
            {!isManualMode && origenLook === 'favorito_respaldo' && (
              <Tag variant="gold">Respaldo: Favorito Verificado</Tag>
            )}
          </div>

          {loading ? (
            <div style={{ height: '340px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', color: 'var(--muted)' }}>
              <RefreshCw size={38} className="spin" style={{ color: 'var(--accent)' }} />
              <p style={{ fontSize: '0.9rem' }}>
                {isManualMode
                  ? 'Evaluando proporciones morfológicas y paleta cromática...'
                  : 'Cruzando ocasiones de tus prendas, subtono estacional y clima...'}
              </p>
            </div>
          ) : (
            <>
              {isManualMode && (
                <div>
                  <div className={styles.manualHeaderBar}>
                    <button
                      type="button"
                      className={`${styles.filterOccToggle} ${soloOcasionCompatible ? styles.filterOccToggleActive : ''}`}
                      onClick={() => setSoloOcasionCompatible(!soloOcasionCompatible)}
                    >
                      Filtrar prendas para {ocasionEfectiva} ({todasPrendas.filter((p) => (p.ocasiones || []).includes(ocasionEfectiva)).length})
                    </button>

                    <button
                      type="button"
                      className={styles.filterOccToggle}
                      style={{ color: 'var(--accent2)', borderColor: 'var(--border-accent)' }}
                      onClick={autocompletarPorReglasArmario}
                    >
                      Auto-armar por Colorimetría
                    </button>
                  </div>

                  <div className={styles.manualSelector}>
                    {prendasSelectorManual.map((prenda) => {
                      const matchesOcc = (prenda.ocasiones || []).includes(ocasionEfectiva);
                      return (
                        <div
                          key={prenda._id}
                          className={`${styles.selectableItem} ${selectedIds.includes(prenda._id) ? styles.selected : ''}`}
                          onClick={() => togglePrenda(prenda._id)}
                          title={`${prenda.nombre} · ${prenda.marca || 'Sin marca'}`}
                        >
                          {matchesOcc && <span className={styles.matchDot} title={`Ideal para ${ocasionEfectiva}`} />}
                          <img src={optimizarImagenUrl(prenda.url_imagen_limpia, 180)} alt={prenda.nombre} />
                          <span className={styles.selectableName}>{prenda.nombre}</span>
                          {selectedIds.includes(prenda._id) && (
                            <div className={styles.checkBadge}>
                              <Check size={11} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={styles.genOutfitDisplay}>
                {prendasActivasParaGuardar.length > 0 ? (
                  prendasActivasParaGuardar.map((prenda) => (
                    <div key={prenda._id} className={styles.genItem}>
                      <div className={styles.genItemImg}>
                        {prenda.color_hex && (
                          <span className={styles.itemSwatch} style={{ background: prenda.color_hex }} />
                        )}
                        <img
                          src={optimizarImagenUrl(prenda.url_imagen_limpia, 400)}
                          alt={prenda.nombre}
                        />
                      </div>
                      {prenda.marca && prenda.marca !== 'Sin marca' && (
                        <span className={styles.itemBrand}>{prenda.marca}</span>
                      )}
                      <span style={{ textAlign: 'center', color: 'var(--text)', fontWeight: 600, fontSize: '0.86rem' }}>
                        {prenda.nombre}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                        {[prenda.color_principal, prenda.material || prenda.categoria].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ gridColumn: '1/-1', padding: '52px 20px', textAlign: 'center', color: 'var(--muted)' }}>
                    {todasPrendas.length === 0
                      ? 'Añade tus primeras prendas en Mi Armario (o usa el Catálogo de Básicos) para activar el motor de outfits.'
                      : 'Selecciona prendas arriba o pulsa Auto-armar por Colorimetría.'}
                  </div>
                )}
              </div>

              {displayedExplicacion && (
                <div className={styles.genExplanation}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent)', fontWeight: 700, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <Sparkles size={15} color="var(--accent)" /> Justificación Morfológica y de Estilo
                  </div>
                  <p style={{ margin: 0 }}>{displayedExplicacion}</p>

                  {consejoColor && (
                    <div style={{ marginTop: '12px', paddingTop: '11px', borderTop: '1px solid rgba(200, 169, 126, 0.16)', fontSize: '0.84rem', color: 'var(--muted)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <Palette size={15} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span><strong style={{ color: 'var(--text)' }}>Armonía de Color:</strong> {consejoColor}</span>
                    </div>
                  )}

                  {prendasActivasParaGuardar.length > 0 && (
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
                          {feedbackGiven === 'like'
                            ? 'Propuesta validada en tu perfil de estilo.'
                            : '¿Cómo calificarías esta combinación?'}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleFeedback('like')}
                            disabled={feedbackGiven === 'like'}
                            style={{
                              background: feedbackGiven === 'like' ? 'rgba(94, 168, 116, 0.25)' : 'var(--surface2)',
                              border: '1px solid rgba(94, 168, 116, 0.4)',
                              color: '#82ce98',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.76rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <ThumbsUp size={13} /> Me gusta
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDislikeReasons(!showDislikeReasons)}
                            style={{
                              background: showDislikeReasons ? 'rgba(201, 100, 78, 0.25)' : 'var(--surface2)',
                              border: '1px solid rgba(201, 100, 78, 0.4)',
                              color: '#eb9481',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '0.76rem',
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
                          <span style={{ fontSize: '0.76rem', color: 'var(--text)' }}>¿Qué deseas corregir?</span>
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
                        <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.76rem', marginBottom: '4px', textTransform: 'uppercase' }}>
                          Cambio recomendado: {sugerencia.prendaDetalle?.nombre}
                        </div>
                        <p style={{ fontSize: '0.83rem', margin: 0, color: 'var(--text)' }}>{sugerencia.porque}</p>
                        <button
                          type="button"
                          onClick={applySuggestion}
                          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.78rem', fontWeight: 600, marginTop: '8px', padding: 0, display: 'flex', alignItems: 'center', gap: '5px' }}
                        >
                          <CheckCircle2 size={14} /> Aplicar reemplazo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.genActions}>
                {isManualMode && (
                  <Button icon={<Sparkles size={15} />} onClick={analyzeManualLook} variant="primary">
                    Evaluar con IA
                  </Button>
                )}

                <Button
                  icon={<Calendar size={15} />}
                  onClick={() => setShowCalendarModal(true)}
                  disabled={prendasActivasParaGuardar.length === 0}
                  variant="primary"
                >
                  Asignar a Calendario
                </Button>

                <Button
                  icon={<CheckCircle2 size={15} />}
                  onClick={handleUseTodayQuick}
                  disabled={registeringUse || prendasActivasParaGuardar.length === 0}
                  variant="outline"
                  style={{ borderColor: 'rgba(94, 168, 116, 0.5)', color: '#82ce98' }}
                >
                  {registeringUse ? 'Registrando...' : 'Usar hoy'}
                </Button>

                <Button
                  icon={<Heart size={15} />}
                  onClick={handleSaveFavorite}
                  disabled={savingLook || prendasActivasParaGuardar.length === 0}
                  variant="outline"
                >
                  {savingLook ? 'Guardando...' : 'Guardar favorito'}
                </Button>

                {!isManualMode && (
                  <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={() => generateLook(undefined, true)}>
                    Otra combinación
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        <div className={styles.genPanel}>
          <Card className={styles.genSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div className={styles.genSectionTitle} style={{ marginBottom: 0 }}>Contexto Ambiental</div>
              <button
                type="button"
                onClick={() => { setTempLoc(locationName); setShowLocInput(!showLocInput); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.72rem' }}
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
                  onChange={(e) => setTempLoc(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveLocation()}
                />
                <Button size="sm" onClick={handleSaveLocation}><Check size={14} /></Button>
              </div>
            )}

            <div className={styles.contextItem}>
              <span className={styles.contextLabel} style={{ color: 'var(--accent)' }}><MapPin size={13} /> Ubicación</span>
              <span className={styles.contextValue}>{locationName}</span>
            </div>
            <div className={styles.contextItem}>
              <span className={styles.contextLabel}>{weather.icon} Clima</span>
              <span className={styles.contextValue}>{weather.temp} {weather.desc}</span>
            </div>
            <div className={styles.contextItem} style={{ marginBottom: 0 }}>
              <span className={styles.contextLabel}><Palette size={13} /> Subtono</span>
              <span className={styles.contextValue}>{user?.biometria?.subtono || 'Neutro'}</span>
            </div>
          </Card>

          <Card className={styles.genSection}>
            <div className={styles.genSectionTitle}>Ocasión de Uso</div>
            <div className={styles.occasionGrid}>
              {OCASIONES_DISPONIBLES.map((o) => (
                <button
                  type="button"
                  key={o}
                  className={`${styles.occBtn} ${!isCustomMode && ocasion === o ? styles.active : ''}`}
                  onClick={() => handleOccasionChange(o)}
                >
                  {o}
                </button>
              ))}
              <button
                type="button"
                className={`${styles.occBtn} ${isCustomMode ? styles.active : ''}`}
                style={{ gridColumn: '1 / -1' }}
                onClick={() => setIsCustomMode(true)}
              >
                <Plus size={13} /> Ocasión personalizada
              </button>
            </div>
            {isCustomMode && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <input
                  className={styles.input}
                  placeholder="Ej: Boda de día, Entrevista..."
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
              <div className={styles.genSectionTitle}>Directriz Particular</div>
              <textarea
                className={styles.input}
                style={{ height: '74px', resize: 'none', fontSize: '0.84rem' }}
                placeholder="Ej: Prioriza tonos tierra, evita calzado blanco..."
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
              />
              <Button
                variant="primary"
                size="sm"
                icon={<Sparkles size={14} />}
                onClick={() => generateLook(undefined, true)}
                disabled={loading}
                style={{ width: '100%', marginTop: '10px' }}
              >
                Aplicar y Regenerar
              </Button>
            </Card>
          )}

          <Card className={styles.genSection}>
            <div className={styles.genSectionTitle}>Índice de Armonía</div>
            <div className={styles.aiScore}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.75rem' }}>
                  <span>Colorimetría Estacional</span>
                  <strong>{score?.color || 0}%</strong>
                </div>
                <div className={styles.aiScoreBar}>
                  <div className={styles.aiScoreFill} style={{ width: `${score?.color || 0}%` }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.75rem' }}>
                  <span>Balance Morfológico</span>
                  <strong>{score?.balance || 0}%</strong>
                </div>
                <div className={styles.aiScoreBar}>
                  <div className={styles.aiScoreFill} style={{ width: `${score?.balance || 0}%`, backgroundColor: 'var(--info)' }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal reutilizable para agendar directamente el outfit generado en cualquier fecha */}
      <AssignCalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        prendas={prendasActivasParaGuardar}
        defaultOcasion={ocasionEfectiva}
        defaultClima={weather.temp === '--' ? '' : `${weather.temp} ${weather.desc}`}
        onAssigned={() => fetchPrendas()}
      />
    </div>
  );
};
