import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Trash2,
  Award,
  Layers,
  Palette,
  Repeat,
  Tag as TagIcon,
  X,
  Loader2,
  Check
} from 'lucide-react';
import { Button } from '../common/Button';
import {
  AnaliticaClosetResponse,
  CalendarioEntry,
  LookItem,
  PrendaItem,
  OCASIONES_DISPONIBLES,
  ETIQUETAS_CATEGORIA,
  formatearFechaLocalISO,
  optimizarImagenUrl
} from '../../types/armario';
import styles from './Calendario.module.css';

const showToast = (msg: string, type?: 'success' | 'error' | 'info') =>
  (window as unknown as { showToast?: (m: string, t?: string) => void }).showToast?.(msg, type);

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const Calendario: React.FC = () => {
  const hoyDate = new Date();
  const hoyISO = formatearFechaLocalISO(hoyDate);

  const [activeSubView, setActiveSubView] = useState<'calendario' | 'analitica'>('calendario');
  const [cursorMes, setCursorMes] = useState<Date>(new Date(hoyDate.getFullYear(), hoyDate.getMonth(), 1));
  const [selectedDateISO, setSelectedDateISO] = useState<string>(hoyISO);

  const [entries, setEntries] = useState<CalendarioEntry[]>([]);
  const [analitica, setAnalitica] = useState<AnaliticaClosetResponse | null>(null);
  const [looksFavoritos, setLooksFavoritos] = useState<LookItem[]>([]);
  const [armarioPrendas, setArmarioPrendas] = useState<PrendaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Estado modal para añadir registro OOTD en selectedDateISO
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [logSourceMode, setLogSourceMode] = useState<'favoritos' | 'prendas'>('favoritos');
  const [selectedLookId, setSelectedLookId] = useState<string>('');
  const [selectedPrendaIds, setSelectedPrendaIds] = useState<string[]>([]);
  const [logOcasion, setLogOcasion] = useState<string>('Casual');
  const [logNotas, setLogNotas] = useState<string>('');
  const [savingEntry, setSavingEntry] = useState<boolean>(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const claveMesActual = useMemo(() => {
    const y = cursorMes.getFullYear();
    const m = String(cursorMes.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [cursorMes]);

  const cargarDatos = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [calRes, anaRes, looksRes, prendasRes] = await Promise.all([
        fetch(`${API_URL}/api/calendario?mes=${claveMesActual}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/analitica/closet`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/looks/saved`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/prendas`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (calRes.ok) setEntries(await calRes.json());
      if (anaRes.ok) setAnalitica(await anaRes.json());
      if (looksRes.ok) {
        const saved: LookItem[] = await looksRes.json();
        setLooksFavoritos(saved);
        if (saved.length === 0) setLogSourceMode('prendas');
      }
      if (prendasRes.ok) setArmarioPrendas(await prendasRes.json());
    } catch (error) {
      showToast('Error al sincronizar calendario y analítica', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [claveMesActual]);

  // Mapa rápido fechaDia -> lista de registros OOTD
  const mapaPorDia = useMemo(() => {
    const map = new Map<string, CalendarioEntry[]>();
    entries.forEach((e) => {
      const key = e.fechaDia || formatearFechaLocalISO(new Date(e.fecha));
      const arr = map.get(key) || [];
      arr.push(e);
      map.set(key, arr);
    });
    return map;
  }, [entries]);

  // Construcción de celdas del mes (Lunes como primer día)
  const celdasCalendario = useMemo(() => {
    const year = cursorMes.getFullYear();
    const month = cursorMes.getMonth();
    const primerDiaMes = new Date(year, month, 1);
    const ultimoDiaMes = new Date(year, month + 1, 0);

    // 0 (Dom) -> 6, 1 (Lun) -> 0 ...
    const offsetInicio = (primerDiaMes.getDay() + 6) % 7;
    const totalDias = ultimoDiaMes.getDate();

    const lista: { dateISO: string; dayNumber: number; inMonth: boolean }[] = [];

    for (let i = 0; i < offsetInicio; i++) {
      const prevDate = new Date(year, month, -offsetInicio + i + 1);
      lista.push({
        dateISO: formatearFechaLocalISO(prevDate),
        dayNumber: prevDate.getDate(),
        inMonth: false
      });
    }

    for (let d = 1; d <= totalDias; d++) {
      const curr = new Date(year, month, d);
      lista.push({
        dateISO: formatearFechaLocalISO(curr),
        dayNumber: d,
        inMonth: true
      });
    }

    while (lista.length % 7 !== 0) {
      const extraIdx = lista.length - (offsetInicio + totalDias) + 1;
      const nextDate = new Date(year, month + 1, extraIdx);
      lista.push({
        dateISO: formatearFechaLocalISO(nextDate),
        dayNumber: nextDate.getDate(),
        inMonth: false
      });
    }

    return lista;
  }, [cursorMes]);

  const registrosDiaSeleccionado = mapaPorDia.get(selectedDateISO) || [];

  const handleConfirmarUsado = async (id: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/calendario/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ estado: 'usado' })
      });
      if (res.ok) {
        showToast('Outfit confirmado como usado. Analítica actualizada.', 'success');
        cargarDatos();
      }
    } catch (e) {
      showToast('No se pudo actualizar el estado', 'error');
    }
  };

  const handleEliminarRegistro = async (id: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/calendario/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Registro eliminado del calendario', 'info');
        cargarDatos();
      }
    } catch (e) {
      showToast('Error al eliminar el registro', 'error');
    }
  };

  const handleGuardarNuevoOOTD = async (e: React.FormEvent) => {
    e.preventDefault();
    let prendasIdsFinales: string[] = [];
    let lookRef: string | null = null;

    if (logSourceMode === 'favoritos') {
      const lookObj = looksFavoritos.find((l) => l._id === selectedLookId);
      if (!lookObj) {
        showToast('Selecciona un look favorito primero', 'info');
        return;
      }
      prendasIdsFinales = lookObj.prendas.map((p) => p._id);
      lookRef = lookObj._id;
    } else {
      if (selectedPrendaIds.length === 0) {
        showToast('Selecciona al menos una prenda del armario', 'info');
        return;
      }
      prendasIdsFinales = selectedPrendaIds;
    }

    setSavingEntry(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/calendario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          prendasIds: prendasIdsFinales,
          lookId: lookRef,
          fechaDia: selectedDateISO,
          ocasion: logOcasion,
          notas: logNotas
        })
      });

      if (res.ok) {
        showToast(
          selectedDateISO > hoyISO
            ? 'Outfit planificado en el calendario'
            : 'OOTD registrado correctamente',
          'success'
        );
        setShowLogModal(false);
        setSelectedLookId('');
        setSelectedPrendaIds([]);
        setLogNotas('');
        cargarDatos();
      } else {
        const err = await res.json();
        showToast(err.error || 'Error al guardar registro', 'error');
      }
    } catch (error) {
      showToast('Error de red al guardar en calendario', 'error');
    } finally {
      setSavingEntry(false);
    }
  };

  const togglePrendaManual = (id: string) => {
    setSelectedPrendaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const fechaLegibleSeleccionada = useMemo(() => {
    const [y, m, d] = selectedDateISO.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }, [selectedDateISO]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.overline}>Diario OOTD & Inteligencia de Uso</span>
          <h1 className={styles.pageTitle}>Calendario y Analítica de Estilo</h1>
          <p className={styles.pageSub}>
            Planifica tus outfits por fecha y descubre patrones reales de rotación, colorimetría y marcas
          </p>
        </div>

        <div className={styles.tabSwitch}>
          <button
            type="button"
            className={`${styles.tabSwitchBtn} ${activeSubView === 'calendario' ? styles.tabSwitchBtnActive : ''}`}
            onClick={() => setActiveSubView('calendario')}
          >
            <CalendarIcon size={16} /> Calendario OOTD
          </button>
          <button
            type="button"
            className={`${styles.tabSwitchBtn} ${activeSubView === 'analitica' ? styles.tabSwitchBtnActive : ''}`}
            onClick={() => setActiveSubView('analitica')}
          >
            <BarChart3 size={16} /> Analítica de Estilo
          </button>
        </div>
      </header>

      {/* Franja KPI siempre visible */}
      <section className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}><Award size={13} color="var(--accent)" /> Prenda Más Usada</span>
          <div className={styles.kpiValue}>
            {analitica?.prendaMasUtilizada ? analitica.prendaMasUtilizada.nombre : 'Sin registros'}
          </div>
          <span className={styles.kpiSub}>
            {analitica?.prendaMasUtilizada
              ? `${analitica.prendaMasUtilizada.usosCalendario || analitica.prendaMasUtilizada.contadorUsos || 0} puestas en calendario`
              : 'Registra tu primer OOTD'}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}><Layers size={13} color="var(--accent)" /> Categoría Preferida</span>
          <div className={styles.kpiValue}>
            {analitica?.categoriaPreferida
              ? ETIQUETAS_CATEGORIA[analitica.categoriaPreferida.categoria] || analitica.categoriaPreferida.categoria
              : 'Equilibrada'}
          </div>
          <span className={styles.kpiSub}>
            {analitica?.categoriaPreferida
              ? `${analitica.categoriaPreferida.porcentaje}% de participación`
              : '0% registrado'}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}><TagIcon size={13} color="var(--accent)" /> Marca Favorita</span>
          <div className={styles.kpiValue}>
            {analitica?.marcaFavorita ? analitica.marcaFavorita.marca : 'Sin marca'}
          </div>
          <span className={styles.kpiSub}>
            {analitica?.marcaFavorita
              ? `${analitica.marcaFavorita.usos} usos · ${analitica.marcaFavorita.cantidadPrendas} prenda(s)`
              : 'Añade marcas en tu armario'}
          </span>
        </div>

        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}><Repeat size={13} color="var(--accent)" /> Rotación de Clóset</span>
          <div className={styles.kpiValue}>{analitica?.resumen.tasaRotacion ?? 0}%</div>
          <span className={styles.kpiSub}>
            {analitica?.resumen.totalRegistrosUsados ?? 0} usados · {analitica?.resumen.totalPlanificados ?? 0} agendados
          </span>
        </div>
      </section>

      {activeSubView === 'calendario' ? (
        <div className={styles.calendarWorkspace}>
          {/* Cuadrícula Mensual */}
          <div className={styles.calendarCard}>
            <div className={styles.monthNav}>
              <h2 className={styles.monthTitle}>
                {cursorMes.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </h2>
              <div className={styles.monthBtns}>
                <button
                  type="button"
                  className={styles.todayBtn}
                  onClick={() => {
                    setCursorMes(new Date(hoyDate.getFullYear(), hoyDate.getMonth(), 1));
                    setSelectedDateISO(hoyISO);
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  className={styles.iconNavBtn}
                  onClick={() => setCursorMes(new Date(cursorMes.getFullYear(), cursorMes.getMonth() - 1, 1))}
                  aria-label="Mes anterior"
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  type="button"
                  className={styles.iconNavBtn}
                  onClick={() => setCursorMes(new Date(cursorMes.getFullYear(), cursorMes.getMonth() + 1, 1))}
                  aria-label="Mes siguiente"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>

            <div className={styles.weekdaysGrid}>
              {DIAS_SEMANA.map((dia) => (
                <div key={dia} className={styles.weekdayLabel}>{dia}</div>
              ))}
            </div>

            <div className={styles.daysGrid}>
              {celdasCalendario.map((cell) => {
                const cellEntries = mapaPorDia.get(cell.dateISO) || [];
                const isSelected = cell.dateISO === selectedDateISO;
                const isToday = cell.dateISO === hoyISO;
                const hasPlannedOnly =
                  cellEntries.length > 0 && cellEntries.every((e) => e.estado === 'planificado');

                // Recolectar miniaturas de prendas del día
                const prendasDia = cellEntries.flatMap((e) => e.prendas || []).filter(Boolean);

                return (
                  <div
                    key={cell.dateISO}
                    onClick={() => {
                      if (!cell.inMonth) {
                        const [y, m] = cell.dateISO.split('-').map(Number);
                        setCursorMes(new Date(y, m - 1, 1));
                      }
                      setSelectedDateISO(cell.dateISO);
                    }}
                    className={[
                      styles.dayCell,
                      !cell.inMonth ? styles.dayCellMuted : '',
                      isToday ? styles.dayCellToday : '',
                      isSelected ? styles.dayCellSelected : '',
                      hasPlannedOnly ? styles.dayCellPlanned : ''
                    ].join(' ')}
                  >
                    <div className={styles.dayTopRow}>
                      <span className={styles.dayNumber}>{cell.dayNumber}</span>
                      {cellEntries.length > 0 && (
                        <span
                          className={`${styles.statusDot} ${hasPlannedOnly ? styles.dotPlanned : styles.dotUsed}`}
                          title={hasPlannedOnly ? 'Planificado' : 'Outfit usado'}
                        />
                      )}
                    </div>

                    {prendasDia.length > 0 && (
                      <div className={styles.dayThumbs}>
                        {prendasDia.slice(0, 2).map((p, idx) => (
                          <img
                            key={`${p._id}-${idx}`}
                            src={optimizarImagenUrl(p.url_imagen_limpia, 120)}
                            alt={p.nombre}
                            className={styles.miniGarment}
                          />
                        ))}
                        {prendasDia.length > 2 && (
                          <span className={styles.moreCount}>+{prendasDia.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inspector Diario OOTD */}
          <aside className={styles.dayInspector}>
            <div className={styles.inspectorHeader}>
              <div>
                <span className={styles.overline}>
                  {selectedDateISO > hoyISO ? 'Agenda Futura' : selectedDateISO === hoyISO ? 'Registro de Hoy' : 'Historial OOTD'}
                </span>
                <h3 className={styles.inspectorDateTitle}>{fechaLegibleSeleccionada}</h3>
              </div>
              <Button size="sm" icon={<Plus size={15} />} onClick={() => setShowLogModal(true)}>
                Asignar
              </Button>
            </div>

            {loading ? (
              <div className="skeletonShimmer" style={{ height: '140px' }} />
            ) : registrosDiaSeleccionado.length === 0 ? (
              <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                No hay outfits registrados para esta fecha. Asigna un look guardado o arma uno rápido desde tu armario.
              </div>
            ) : (
              <div className={styles.entriesList}>
                {registrosDiaSeleccionado.map((entry) => (
                  <div key={entry._id} className={styles.entryCard}>
                    <div className={styles.entryTop}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>
                        {entry.ocasion || 'Casual'}
                        {entry.clima ? ` · ${entry.clima}` : ''}
                      </span>
                      <span className={entry.estado === 'planificado' ? styles.badgePlanned : styles.badgeUsed}>
                        {entry.estado === 'planificado' ? 'Planificado' : 'Usado'}
                      </span>
                    </div>

                    <div className={styles.entryGarments}>
                      {(entry.prendas || []).map((prenda) => (
                        <div key={prenda._id} className={styles.entryGarmentItem} title={prenda.nombre}>
                          <img src={optimizarImagenUrl(prenda.url_imagen_limpia, 160)} alt={prenda.nombre} />
                          <span>{prenda.nombre}</span>
                        </div>
                      ))}
                    </div>

                    {entry.notas && <p className={styles.entryNotes}>{entry.notas}</p>}

                    <div className={styles.entryFooterActions}>
                      {entry.estado === 'planificado' ? (
                        <button
                          type="button"
                          className={styles.confirmUseBtn}
                          onClick={() => handleConfirmarUsado(entry._id)}
                        >
                          <CheckCircle2 size={13} /> Marcar como usado
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Contabilizado en métricas</span>
                      )}

                      <button
                        type="button"
                        className={styles.deleteEntryBtn}
                        onClick={() => handleEliminarRegistro(entry._id)}
                      >
                        <Trash2 size={13} /> Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      ) : (
        /* VISTA 2: PANEL ANALÍTICO PROFUNDO BASADO EN EL HISTORIAL DEL CALENDARIO */
        <div className={styles.analyticsGrid}>
          {/* 1. Prenda Más Utilizada y Ranking por ID */}
          <div className={styles.analyticCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Prenda Más Utilizada</h3>
                <span className={styles.sectionSub}>Conteo exacto por ID según puestas en calendario</span>
              </div>
              <Award size={20} color="var(--accent)" />
            </div>

            {analitica?.prendaMasUtilizada ? (
              <>
                <div className={styles.heroGarmentBox}>
                  <img
                    src={optimizarImagenUrl(analitica.prendaMasUtilizada.url_imagen_limpia, 240)}
                    alt={analitica.prendaMasUtilizada.nombre}
                    className={styles.heroGarmentImg}
                  />
                  <div className={styles.heroGarmentInfo}>
                    <span className={styles.heroWearCount}>
                      #1 · {analitica.prendaMasUtilizada.usosCalendario || analitica.prendaMasUtilizada.contadorUsos} puestas registradas
                    </span>
                    <div className={styles.heroName}>{analitica.prendaMasUtilizada.nombre}</div>
                    <span className={styles.sectionSub}>
                      {analitica.prendaMasUtilizada.marca || 'Sin marca'} · {analitica.prendaMasUtilizada.categoria} · {analitica.prendaMasUtilizada.material || 'Tejido estándar'}
                    </span>
                  </div>
                </div>

                {analitica.masUsadas.length > 1 && (
                  <div className={styles.miniRankStrip}>
                    {analitica.masUsadas.slice(1).map((item) => (
                      <div key={item._id} className={styles.miniRankCard}>
                        <img src={optimizarImagenUrl(item.url_imagen_limpia, 140)} alt={item.nombre} />
                        <span className={styles.miniRankTitle}>{item.nombre}</span>
                        <span className={styles.miniRankCount}>{item.usosCalendario} usos</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '30px 10px', color: 'var(--muted)', fontSize: '0.86rem' }}>
                Registra tus outfits en el calendario para descubrir qué pieza lidera tu rotación real.
              </div>
            )}
          </div>

          {/* 2. Combinaciones y Pares Recurrentes */}
          <div className={styles.analyticCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Combinaciones Recurrentes</h3>
                <span className={styles.sectionSub}>Detección de conjuntos y pares frecuentes en tus OOTD</span>
              </div>
              <Repeat size={20} color="var(--accent)" />
            </div>

            {(analitica?.combinaciones.pares.length || 0) > 0 ? (
              <div className={styles.comboList}>
                {(analitica?.combinaciones.conjuntos.filter((c) => c.veces >= 2).length
                  ? analitica.combinaciones.conjuntos.filter((c) => c.veces >= 2)
                  : analitica?.combinaciones.pares || []
                )
                  .slice(0, 4)
                  .map((combo, idx) => (
                    <div key={idx} className={styles.comboItem}>
                      <div className={styles.comboPhotos}>
                        {combo.prendas.slice(0, 3).map((p) => (
                          <div key={p._id} className={styles.comboPhotoBox} title={p.nombre}>
                            <img src={optimizarImagenUrl(p.url_imagen_limpia, 120)} alt={p.nombre} />
                          </div>
                        ))}
                      </div>
                      <div className={styles.comboDetails}>
                        <div className={styles.comboNames}>
                          {combo.prendas.map((p) => p.nombre).join(' + ')}
                        </div>
                        <div className={styles.comboMeta}>
                          Última puesta: {combo.ultimaFecha}
                        </div>
                      </div>
                      <span className={styles.comboFreqBadge}>
                        {combo.veces} {combo.veces === 1 ? 'vez' : 'veces'}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div style={{ padding: '30px 10px', color: 'var(--muted)', fontSize: '0.86rem' }}>
                En cuanto registres dos o más días con combinaciones en común, aquí verás tus fórmulas de estilo favoritas.
              </div>
            )}
          </div>

          {/* 3. Categoría Preferida */}
          <div className={styles.analyticCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Distribución por Categoría</h3>
                <span className={styles.sectionSub}>
                  {analitica?.resumen.basadoEnInventarioPorFaltaDeUsos
                    ? 'Basado en inventario actual (sin puestas aún)'
                    : 'Porcentaje de puestas reales por tipo de prenda'}
                </span>
              </div>
              <Layers size={20} color="var(--accent)" />
            </div>

            <div className={styles.barList}>
              {(analitica?.categoriasDistribucion || []).map((cat) => (
                <div key={cat.categoria} className={styles.barRow}>
                  <div className={styles.barLabels}>
                    <strong>{ETIQUETAS_CATEGORIA[cat.categoria] || cat.categoria}</strong>
                    <span>{cat.porcentaje}% ({cat.usos} puestas · {cat.cantidadInventario} en clóset)</span>
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${Math.max(4, cat.porcentaje)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Marca Favorita / Más Usada */}
          <div className={styles.analyticCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Marcas Más Usadas</h3>
                <span className={styles.sectionSub}>Afinidad de marca según frecuencia en tus looks</span>
              </div>
              <TagIcon size={20} color="var(--accent)" />
            </div>

            <div className={styles.barList}>
              {(analitica?.marcasRanking || []).map((m) => {
                const maxMarca = Math.max(
                  1,
                  ...(analitica?.marcasRanking || []).map((item) => Math.max(item.usos, item.cantidadPrendas))
                );
                const valorVisual = m.usos > 0 ? m.usos : m.cantidadPrendas;
                const widthPct = Math.round((valorVisual / maxMarca) * 100);
                return (
                  <div key={m.marca} className={styles.barRow}>
                    <div className={styles.barLabels}>
                      <strong>{m.marca}</strong>
                      <span>{m.usos} usos · {m.cantidadPrendas} prenda(s)</span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${Math.max(6, widthPct)}%`, background: 'var(--info)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Análisis Cromático y Tipos de Tela */}
          <div className={`${styles.analyticCard} ${styles.analyticCardWide}`}>
            <div className={styles.sectionHeader}>
              <div>
                <h3 className={styles.sectionTitle}>Análisis Cromático y Textil</h3>
                <span className={styles.sectionSub}>
                  Patrones de color, temperatura de subtono y tejidos más repetidos en tus outfits
                </span>
              </div>
              <Palette size={20} color="var(--accent)" />
            </div>

            {(analitica?.analisisCromatico.colores.length || 0) > 0 && (
              <div className={styles.spectrumBar}>
                {analitica?.analisisCromatico.colores.map((c) => (
                  <div
                    key={c.color}
                    style={{ width: `${Math.max(5, c.porcentaje)}%`, background: c.hex }}
                    title={`${c.color}: ${c.porcentaje}%`}
                  />
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--accent)', fontWeight: 700, marginBottom: '10px' }}>
                  Colores Dominantes
                </div>
                <div className={styles.colorChipsGrid}>
                  {(analitica?.analisisCromatico.colores || []).map((c) => (
                    <div key={c.color} className={styles.colorMetricChip}>
                      <span className={styles.colorSwatchLg} style={{ background: c.hex }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.color}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{c.porcentaje}% de presencia</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--accent)', fontWeight: 700, marginBottom: '10px' }}>
                  Tejidos y Materiales Frecuentes
                </div>
                <div className={styles.barList}>
                  {(analitica?.analisisCromatico.telas || []).map((t) => (
                    <div key={t.material} className={styles.barRow}>
                      <div className={styles.barLabels}>
                        <strong>{t.material}</strong>
                        <span>{t.porcentaje}% ({t.usos})</span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${Math.max(6, t.porcentaje)}%`, background: 'var(--success)' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR O PLANIFICAR OUTFIT EN EL DÍA SELECCIONADO */}
      {showLogModal && (
        <div className={styles.modalOverlay} onClick={() => setShowLogModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className={styles.overline}>Fecha: {selectedDateISO}</span>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--text)' }}>Asignar Outfit al Día</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.tabSwitch}>
              <button
                type="button"
                className={`${styles.tabSwitchBtn} ${logSourceMode === 'favoritos' ? styles.tabSwitchBtnActive : ''}`}
                onClick={() => setLogSourceMode('favoritos')}
              >
                Desde Favoritos ({looksFavoritos.length})
              </button>
              <button
                type="button"
                className={`${styles.tabSwitchBtn} ${logSourceMode === 'prendas' ? styles.tabSwitchBtnActive : ''}`}
                onClick={() => setLogSourceMode('prendas')}
              >
                Seleccionar Prendas ({armarioPrendas.length})
              </button>
            </div>

            <form onSubmit={handleGuardarNuevoOOTD} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {logSourceMode === 'favoritos' ? (
                looksFavoritos.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
                    Aún no tienes looks guardados en Favoritos. Cambia a "Seleccionar Prendas" o guarda un outfit desde el Generador.
                  </div>
                ) : (
                  <div className={styles.savedLooksSelector}>
                    {looksFavoritos.map((look) => (
                      <div
                        key={look._id}
                        className={`${styles.savedLookOption} ${selectedLookId === look._id ? styles.savedLookOptionActive : ''}`}
                        onClick={() => {
                          setSelectedLookId(look._id);
                          if (look.ocasion) setLogOcasion(look.ocasion);
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--accent)' }}>
                            {look.ocasion || 'Casual'}
                          </span>
                          {selectedLookId === look._id && <Check size={14} color="var(--accent)" />}
                        </div>
                        <div className={styles.savedLookThumbs}>
                          {(look.prendas || []).slice(0, 3).map((p) => (
                            <img key={p._id} src={optimizarImagenUrl(p.url_imagen_limpia, 120)} alt={p.nombre} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className={styles.wardrobePickerGrid}>
                  {armarioPrendas.map((p) => {
                    const active = selectedPrendaIds.includes(p._id);
                    return (
                      <div
                        key={p._id}
                        className={`${styles.wardrobePickItem} ${active ? styles.wardrobePickItemActive : ''}`}
                        onClick={() => togglePrendaManual(p._id)}
                      >
                        <img src={optimizarImagenUrl(p.url_imagen_limpia, 150)} alt={p.nombre} />
                        <span>{p.nombre}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <select
                  className={styles.input}
                  value={logOcasion}
                  onChange={(e) => setLogOcasion(e.target.value)}
                >
                  {OCASIONES_DISPONIBLES.map((occ) => (
                    <option key={occ} value={occ}>{occ}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Nota opcional (ej: Reunión cliente)"
                  value={logNotas}
                  onChange={(e) => setLogNotas(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={savingEntry} icon={savingEntry ? <Loader2 size={16} className="spin" /> : <CalendarIcon size={16} />}>
                {savingEntry
                  ? 'Guardando...'
                  : selectedDateISO > hoyISO
                  ? 'Planificar en esta fecha'
                  : 'Registrar OOTD'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
