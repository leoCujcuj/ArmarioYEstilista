import React, { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, Sun, ShoppingBag, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import styles from './RightPanel.module.css';

interface RightPanelProps {
  onNavigate?: (page: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({ onNavigate }) => {
  const [weather, setWeather] = useState({ temp: '--', desc: 'Cargando...', city: 'Cargando...', humidity: '--', wind: '--' });
  const [prendas, setPrendas] = useState<any[]>([]);
  const [looks, setLooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWeather = async () => {
    try {
      const savedCity = localStorage.getItem('weatherCity');
      let lat = 40.4168, lon = -3.7038;
      let city = savedCity || 'Mi ubicación';

      if (savedCity && savedCity !== 'Mi ubicación') {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(savedCity)}&limit=1`);
        const data = await res.json();
        if (data.length > 0) {
          lat = parseFloat(data[0].lat);
          lon = parseFloat(data[0].lon);
          city = data[0].display_name.split(',')[0];
        }
      }
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m`);
      const data = await res.json();
      setWeather({ 
        temp: `${Math.round(data.current_weather.temperature)}°C`, 
        desc: data.current_weather.weathercode > 50 ? 'Lluvia' : 'Despejado', 
        city,
        humidity: `${data.hourly?.relativehumidity_2m[0] || 60}%`,
        wind: `${data.current_weather.windspeed} km/h`
      });
    } catch (e) {}
  };

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    try {
      const [prendasRes, looksRes] = await Promise.all([
        fetch(`${API_URL}/api/prendas`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/api/looks/saved`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (prendasRes.ok) setPrendas(await prendasRes.json());
      if (looksRes.ok) setLooks(await looksRes.json());
    } catch (error) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    fetchData();
    window.addEventListener('locationUpdated', fetchWeather);
    return () => window.removeEventListener('locationUpdated', fetchWeather);
  }, []);

  const cohension = prendas.length > 0 ? Math.min(100, prendas.length * 12) : 0;
  const versatilidad = prendas.length > 0 ? Math.min(100, new Set(prendas.map(p => p.estilo)).size * 25) : 0;
  const missingCategories = ['Top', 'Bottom', 'Shoes', 'Outerwear', 'Accessories'].filter(c => !prendas.some(p => p.categoria === c));

  return (
    <div className={styles.rightPanel}>
      {/* Clima Detallado */}
      <div className={styles.rpSection}>
        <div className={styles.rpTitle}>Clima · {weather.city}</div>
        <div className={styles.climaRow}><span className={styles.climaKey}><Cloud size={14} /> Condición</span><span className={styles.climaVal}>{weather.desc}</span></div>
        <div className={styles.climaRow}><span className={styles.climaKey}><Sun size={14} /> Temperatura</span><span className={styles.climaVal}>{weather.temp}</span></div>
        <div className={styles.climaRow}><span className={styles.climaKey}><Droplets size={14} /> Humedad</span><span className={styles.climaVal}>{weather.humidity}</span></div>
        <div className={styles.climaRow}><span className={styles.climaKey}><Wind size={14} /> Viento</span><span className={styles.climaVal}>{weather.wind}</span></div>
      </div>

      {/* Puntuación Extendida */}
      <div className={styles.rpSection}>
        <div className={styles.rpTitle}>Métricas de Estilo</div>
        <div className={styles.aiScore}><span className={styles.aiScoreLabel}>Cohesión</span><div className={styles.aiScoreBar}><div className={styles.aiScoreFill} style={{ width: `${cohension}%` }}></div></div><span className={styles.aiScoreVal}>{cohension}%</span></div>
        <div className={styles.aiScore}><span className={styles.aiScoreLabel}>Versatilidad</span><div className={styles.aiScoreBar}><div className={styles.aiScoreFill} style={{ width: `${versatilidad}%` }}></div></div><span className={styles.aiScoreVal}>{versatilidad}%</span></div>
        <div className={styles.aiScore}><span className={styles.aiScoreLabel}>Completitud</span><div className={styles.aiScoreBar}><div className={styles.aiScoreFill} style={{ width: `${100 - (missingCategories.length * 20)}%`, background: 'var(--info)' }}></div></div><span className={styles.aiScoreVal}>{100 - (missingCategories.length * 20)}%</span></div>
      </div>

      {/* Actividad Reciente */}
      <div className={styles.rpSection}>
        <div className={styles.rpTitle}>Actividad Reciente</div>
        {loading ? <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Cargando...</div> : (
          <>
            {prendas.slice(0, 1).map(p => (
              <div key={p._id} className={styles.activityItem}><div className={styles.actDot}></div><div className={styles.actText}><strong>Nueva Prenda</strong> {p.nombre}</div></div>
            ))}
            {looks.slice(0, 1).map(l => (
              <div key={l._id} className={styles.activityItem}><div className={styles.actDot} style={{ background: 'var(--success)' }}></div><div className={styles.actText}><strong>Look Creado</strong> {l.ocasion}</div></div>
            ))}
          </>
        )}
      </div>

      {/* Huecos */}
      <div className={styles.rpSection}>
        <div className={styles.rpTitle}>Sugerencias IA</div>
        {missingCategories.length > 0 ? (
          <div className={styles.activityItem}><div className={styles.actDot} style={{ background: 'var(--danger)' }}></div><div className={styles.actText}>Falta <strong>{missingCategories[0]}</strong> básico.</div></div>
        ) : <div style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle2 size={14} /> Armario completo</div>}
        <Button style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }} size="sm" onClick={() => onNavigate?.('tienda')}>Ver Tienda</Button>
      </div>
    </div>
  );
};
