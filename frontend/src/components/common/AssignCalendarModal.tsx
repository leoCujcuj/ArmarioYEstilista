import React, { useState } from 'react';
import { Calendar, CheckCircle2, Clock, Sparkles, X, Loader2 } from 'lucide-react';
import {
  PrendaItem,
  OCASIONES_DISPONIBLES,
  formatearFechaLocalISO,
  optimizarImagenUrl
} from '../../types/armario';
import styles from './AssignCalendarModal.module.css';

interface AssignCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  prendas: PrendaItem[];
  lookId?: string | null;
  defaultOcasion?: string;
  defaultClima?: string;
  defaultDate?: string;
  onAssigned?: (fechaDia: string, estado: 'usado' | 'planificado') => void;
}

const showToast = (msg: string, type?: 'success' | 'error' | 'info') =>
  (window as unknown as { showToast?: (m: string, t?: string) => void }).showToast?.(msg, type);

export const AssignCalendarModal: React.FC<AssignCalendarModalProps> = ({
  isOpen,
  onClose,
  prendas,
  lookId = null,
  defaultOcasion = 'Casual',
  defaultClima = '',
  defaultDate,
  onAssigned
}) => {
  const hoyISO = formatearFechaLocalISO(new Date());
  const mananaDate = new Date();
  mananaDate.setDate(mananaDate.getDate() + 1);
  const mananaISO = formatearFechaLocalISO(mananaDate);

  const pasadoDate = new Date();
  pasadoDate.setDate(pasadoDate.getDate() + 2);
  const pasadoISO = formatearFechaLocalISO(pasadoDate);

  const [fechaDia, setFechaDia] = useState<string>(defaultDate || hoyISO);
  const [ocasion, setOcasion] = useState<string>(defaultOcasion || 'Casual');
  const [clima, setClima] = useState<string>(defaultClima || '');
  const [notas, setNotas] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const esFuturo = fechaDia > hoyISO;
  const estadoAutomatico: 'usado' | 'planificado' = esFuturo ? 'planificado' : 'usado';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prendas || prendas.length === 0) {
      showToast('No hay prendas seleccionadas para agendar', 'error');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    try {
      const res = await fetch(`${API_URL}/api/calendario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          prendasIds: prendas.map((p) => p._id),
          lookId,
          fechaDia,
          ocasion,
          clima,
          notas,
          estado: estadoAutomatico
        })
      });

      if (res.ok) {
        showToast(
          esFuturo
            ? `Outfit planificado para el ${fechaDia}`
            : `Outfit registrado en el calendario (${fechaDia})`,
          'success'
        );
        onAssigned?.(fechaDia, estadoAutomatico);
        onClose();
      } else {
        const err = await res.json();
        showToast(err.error || 'No se pudo asignar al calendario', 'error');
      }
    } catch (error) {
      showToast('Error de conexión al guardar en calendario', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <span className={styles.overline}>Agenda de Estilo OOTD</span>
            <h3 className={styles.title}>Asignar Outfit al Calendario</h3>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Vista previa de las prendas */}
        <div className={styles.previewStrip}>
          {prendas.map((p) => (
            <div key={p._id} className={styles.previewItem} title={p.nombre}>
              <img src={optimizarImagenUrl(p.url_imagen_limpia, 200)} alt={p.nombre} />
              <span>{p.nombre}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div>
            <label className={styles.label}>Fecha seleccionada</label>
            <div className={styles.quickDates}>
              <button
                type="button"
                className={`${styles.quickPill} ${fechaDia === hoyISO ? styles.activePill : ''}`}
                onClick={() => setFechaDia(hoyISO)}
              >
                Hoy
              </button>
              <button
                type="button"
                className={`${styles.quickPill} ${fechaDia === mananaISO ? styles.activePill : ''}`}
                onClick={() => setFechaDia(mananaISO)}
              >
                Mañana
              </button>
              <button
                type="button"
                className={`${styles.quickPill} ${fechaDia === pasadoISO ? styles.activePill : ''}`}
                onClick={() => setFechaDia(pasadoISO)}
              >
                En 2 días
              </button>
            </div>
            <input
              type="date"
              className={styles.input}
              value={fechaDia}
              onChange={(e) => setFechaDia(e.target.value)}
              required
            />
            <div className={styles.statusHint}>
              {esFuturo ? (
                <>
                  <Clock size={13} color="var(--accent)" />
                  <span>Se guardará como <strong>Planificado</strong> y se contabilizará al llegar la fecha o confirmarlo.</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} color="var(--success)" />
                  <span>Se registrará como <strong>Usado</strong> y actualizará tus métricas de rotación.</span>
                </>
              )}
            </div>
          </div>

          <div className={styles.row2}>
            <div>
              <label className={styles.label}>Ocasión</label>
              <select
                className={styles.input}
                value={ocasion}
                onChange={(e) => setOcasion(e.target.value)}
              >
                {OCASIONES_DISPONIBLES.map((occ) => (
                  <option key={occ} value={occ}>{occ}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={styles.label}>Clima (opcional)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ej: 19°C Templado"
                value={clima}
                onChange={(e) => setClima(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={styles.label}>Notas del día (opcional)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Ej: Reunión trimestral / Cena aniversario"
              maxLength={160}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin" /> Guardando...
                </>
              ) : (
                <>
                  {esFuturo ? <Sparkles size={16} /> : <Calendar size={16} />}
                  {esFuturo ? 'Agendar Outfit' : 'Registrar OOTD'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
