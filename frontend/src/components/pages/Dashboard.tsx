import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, CheckCircle2, Palette, TriangleRight, ThumbsUp, ThumbsDown, Shirt, Heart } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Tag } from '../common/Tag';
import styles from './Dashboard.module.css';

const showToast = (msg: string, type?: any) => (window as any).showToast?.(msg, type);

export const Dashboard: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [prendas, setPrendas] = useState<any[]>([]);
  const [looks, setLooks] = useState<any[]>([]);
  const [usoStats, setUsoStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackSent, setFeedbackSent] = useState<'like' | 'dislike' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const userStr = localStorage.getItem('user');
      if (userStr) setUser(JSON.parse(userStr));

      try {
        const [prendasRes, looksRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/api/prendas`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/looks/saved`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/uso/estadisticas`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (prendasRes.ok) setPrendas(await prendasRes.json());
        if (looksRes.ok) setLooks(await looksRes.json());
        if (statsRes.ok) setUsoStats(await statsRes.json());
      } catch (error) {
        console.error('Error fetching dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleHeroFeedback = async (type: 'like' | 'dislike') => {
    if (looks.length === 0) return;
    const currentLook = looks[0];
    const ids = (currentLook.prendas || []).map((p: any) => p._id);
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    try {
      const res = await fetch(`${API_URL}/api/looks/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type,
          prendasIds: ids,
          motivo: type === 'dislike' ? 'estilo' : '',
          ocasion: currentLook.ocasion || 'Casual',
          explicacion: currentLook.explicacion || ''
        })
      });
      if (res.ok) {
        setFeedbackSent(type);
        showToast(
          type === 'like'
            ? 'Preferencia reforzada en tu perfil de estilo'
            : 'Registrado. Ajustaremos tus próximas recomendaciones.',
          type === 'like' ? 'success' : 'info'
        );
      }
    } catch (e) {
      showToast('Error al registrar preferencia', 'error');
    }
  };

  const categoriasCubiertas = new Set(prendas.map(p => p.categoria)).size;
  const huecos = Math.max(0, 5 - categoriasCubiertas);
  const compatibilidad = prendas.length > 0 ? Math.min(100, Math.round((categoriasCubiertas / 5) * 60 + Math.min(40, prendas.length * 4))) : 0;
  const prendasUsadasCount = prendas.filter(p => (p.contadorUsos || 0) > 0).length;
  const indiceRotacion = prendas.length > 0 ? Math.round((prendasUsadasCount / prendas.length) * 100) : 0;

  return (
    <div className={styles.page}>
      <div className={styles.pageTitle}>Buenas tardes, {user?.nombre || 'Usuario'}</div>
      <div className={styles.pageSubtitle}>
        Aquí está tu resumen de hoy · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      {loading ? (
        <div style={{ padding: '50px', textAlign: 'center', color: 'var(--muted)' }}>Cargando resumen...</div>
      ) : (
        <>
          {/* Stats Row */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>PRENDAS EN ARMARIO</div>
              <div className={styles.statValue}>{prendas.length}<span>piezas</span></div>
              <div className={styles.statTrend}><Shirt size={12} /> {categoriasCubiertas}/5 categorías</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>LOOKS FAVORITOS</div>
              <div className={styles.statValue}>{looks.length}<span>guardados</span></div>
              <div className={styles.statTrend}><Heart size={12} /> Respaldo IA activo</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>ÍNDICE DE ROTACIÓN</div>
              <div className={styles.statValue}>{indiceRotacion}%<span>de uso</span></div>
              <div className={styles.statTrend}><TrendingUp size={12} /> {prendasUsadasCount} prendas estrenadas</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>VERSATILIDAD IA</div>
              <div className={styles.statValue}>{compatibilidad}%<span>armonía</span></div>
              <div className={styles.statTrend}><CheckCircle2 size={12} /> {user?.biometria?.morfologia || 'Perfil activo'}</div>
            </div>
          </div>

          {/* New Feature Announcement */}
          <div className={styles.newFeatureCard}>
            <div className={styles.newFeatureContent}>
              <div className={styles.newFeatureTitle}>
                <Palette size={24} /> Estilista IA & Creación Manual
              </div>
              <div className={styles.newFeatureDesc}>
                Genera propuestas con IA basadas en tu colorimetría o arma tus propios looks para recibir evaluación morfológica.
              </div>
            </div>
            <div className={styles.newFeatureAction}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  localStorage.setItem('lastSection', 'generador');
                  window.location.reload();
                }}
              >
                Ir al Generador
              </Button>
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className={styles.dashGrid}>
            {/* Outfit Hero */}
            <Card className={styles.outfitHero}>
              <div className={styles.outfitHeroHeader}>
                <div>
                  <div className={styles.outfitHeroTitle}>Outfit destacado</div>
                  <div className={styles.outfitHeroDate}>
                    {looks[0]?.ocasion || 'Propuesta Diaria'} · {user?.biometria?.objetivo || 'Estilo Personal'}
                  </div>
                </div>
                <Tag variant="gold">IA Verificado</Tag>
              </div>

              {looks.length > 0 ? (
                <>
                  <div className={styles.outfitItems} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '10px', marginTop: '20px' }}>
                    {looks[0].prendas.map((p: any) => (
                      <div key={p._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <div style={{ background: 'var(--surface2)', padding: '10px', borderRadius: '12px', width: '100%', height: '80px', display: 'flex', justifyContent: 'center' }}>
                          <img src={p.url_imagen_limpia} alt={p.nombre} style={{ height: '100%', objectFit: 'contain' }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center' }}>{p.nombre || p.categoria}</div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.outfitActions} style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleHeroFeedback('like')}
                      disabled={feedbackSent === 'like'}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: feedbackSent === 'like' ? 'rgba(90, 158, 110, 0.2)' : 'var(--surface2)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        color: feedbackSent === 'like' ? '#7ec994' : 'var(--text)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <ThumbsUp size={16} /> Me gusta
                    </button>
                    <button
                      onClick={() => handleHeroFeedback('dislike')}
                      disabled={feedbackSent === 'dislike'}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: feedbackSent === 'dislike' ? 'rgba(192, 97, 74, 0.2)' : 'var(--surface2)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        color: feedbackSent === 'dislike' ? '#e88c78' : 'var(--text)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <ThumbsDown size={16} /> No me gusta
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                  Ve al Generador para crear y guardar tu primer look personalizado.
                </div>
              )}
            </Card>

            {/* Insights */}
            <Card className={styles.insightCard}>
              <div className={styles.insightTitle}>Diagnóstico de Estilo y Biometría</div>

              <div className={styles.insightItem}>
                <div className={styles.insightIcon} style={{ background: 'rgba(200,169,126,0.1)', color: 'var(--accent)' }}>
                  <Palette size={16} />
                </div>
                <div className={styles.insightText}>
                  <strong>Colorimetría y Estilos</strong>
                  {user?.biometria?.colorimetria ? `${user.biometria.colorimetria} · ` : ''}
                  Estilos: {user?.biometria?.estilos?.join(', ') || 'No definidos'}
                </div>
              </div>

              <div className={styles.insightItem}>
                <div className={styles.insightIcon} style={{ background: 'rgba(74,126,181,0.1)', color: '#4a7eb5' }}>
                  <TriangleRight size={16} />
                </div>
                <div className={styles.insightText}>
                  <strong>Morfología y Objetivo</strong>
                  {user?.biometria?.morfologia || 'Morfología pendiente'} · Objetivo: {user?.biometria?.objetivo || 'Mejorar estilo'}
                </div>
              </div>

              <div className={styles.insightItem}>
                <div className={styles.insightIcon} style={{ background: 'rgba(90,158,110,0.1)', color: '#5a9e6e' }}>
                  <CheckCircle2 size={16} />
                </div>
                <div className={styles.insightText}>
                  <strong>Inventario Digitalizado</strong>
                  Tienes {prendas.length} prendas clasificadas con visión artificial.
                </div>
              </div>

              <div className={styles.insightItem}>
                <div className={styles.insightIcon} style={{ background: 'rgba(192,97,74,0.1)', color: '#c0614a' }}>
                  <AlertCircle size={16} />
                </div>
                <div className={styles.insightText}>
                  <strong>Fondo de Armario</strong>
                  {huecos > 0 ? `Te recomendamos cubrir ${huecos} categoría(s) en el Asesor de Compras.` : 'Tienes todas las categorías principales cubiertas.'}
                </div>
              </div>
            </Card>
          </div>

          {/* Uso Analytics */}
          <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <Card style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '15px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <TrendingUp size={16} /> Tus Favoritos Reales
              </div>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                {usoStats?.masUsadas?.length > 0 ? usoStats.masUsadas.map((p: any) => (
                  <div key={p._id} style={{ minWidth: '75px', textAlign: 'center' }}>
                    <div style={{ width: '70px', height: '70px', background: 'var(--surface2)', borderRadius: '12px', padding: '5px', marginBottom: '5px', margin: '0 auto 5px' }}>
                      <img src={p.url_imagen_limpia} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 600 }}>{p.contadorUsos} usos</div>
                  </div>
                )) : <div style={{ fontSize: '0.8rem', color: 'var(--muted)', padding: '20px' }}>Aún no hay datos de uso registrados.</div>}
              </div>
            </Card>

            <Card style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '15px', color: '#c0614a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={16} /> Prendas Olvidadas (Priorizadas por IA)
              </div>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                {usoStats?.nuncaUsadas?.length > 0 ? usoStats.nuncaUsadas.map((p: any) => (
                  <div key={p._id} style={{ minWidth: '75px', textAlign: 'center' }}>
                    <div style={{ width: '70px', height: '70px', background: 'var(--surface2)', borderRadius: '12px', padding: '5px', marginBottom: '5px', opacity: 0.75, margin: '0 auto 5px' }}>
                      <img src={p.url_imagen_limpia} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>Sin estrenar</div>
                  </div>
                )) : <div style={{ fontSize: '0.8rem', color: 'var(--muted)', padding: '20px' }}>Excelente rotación: usas todas tus prendas.</div>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
