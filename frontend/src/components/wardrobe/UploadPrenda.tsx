import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Globe,
  Layers,
  Loader2,
  X,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronUp,
  Crop,
  Sparkles,
  Plus
} from 'lucide-react';
import {
  BasicCatalogItem,
  OrigenCarga,
  CATEGORIAS_PRENDA,
  OCASIONES_DISPONIBLES,
  TEMPORADAS_DISPONIBLES,
  MATERIALES_COMUNES,
  TONOS_ESTACIONALES,
  PALETA_COLORES_MODA
} from '../../types/armario';
import styles from './UploadPrenda.module.css';

interface UploadPrendaProps {
  onUploadSuccess: () => void;
  onBasicAdded?: () => void;
}

type CropPreset = 'original' | 'square' | 'portrait';
type ProcessingStage = 'idle' | 'extracting' | 'removing_bg' | 'analyzing_ai';

const PROCESSING_STEPS: { id: Exclude<ProcessingStage, 'idle'>; label: string }[] = [
  { id: 'extracting', label: 'Extrayendo imagen...' },
  { id: 'removing_bg', label: 'Removiendo fondo...' },
  { id: 'analyzing_ai', label: 'Analizando estilo con IA...' }
];

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 45000
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

const showToast = (msg: string, type?: 'success' | 'error' | 'info') =>
  (window as unknown as { showToast?: (m: string, t?: string) => void }).showToast?.(msg, type);

const MARCAS_SUGERIDAS = ['Zara', 'H&M', 'Massimo Dutti', 'Mango', 'Uniqlo', 'Levi\'s', 'Nike', 'COS'];

const UploadPrenda: React.FC<UploadPrendaProps> = ({ onUploadSuccess, onBasicAdded }) => {
  // Vía de entrada activa: camara | galeria | web | basicos
  const [activeTab, setActiveTab] = useState<OrigenCarga>('galeria');
  const [loading, setLoading] = useState(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const [cleanStageThumb, setCleanStageThumb] = useState<string | null>(null);

  // Estado compartido de archivo / vista previa (Cámara y Galería)
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [cropPreset, setCropPreset] = useState<CropPreset>('original');
  const [zoom, setZoom] = useState<number>(1);

  // Estado de Cámara directa
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Estado de Importador Web
  const [webUrl, setWebUrl] = useState('');
  const [webPreviewUrl, setWebPreviewUrl] = useState<string | null>(null);
  const [fetchingWebPreview, setFetchingWebPreview] = useState(false);

  // Estado de Catálogo de Básicos (1 clic directo desde basicos_seed.json)
  const [catalogoBasicos, setCatalogoBasicos] = useState<BasicCatalogItem[]>([]);
  const [loadingBasicos, setLoadingBasicos] = useState(false);
  const [basicFilter, setBasicFilter] = useState<string>('Todos');
  const [addingBasicSlug, setAddingBasicSlug] = useState<string | null>(null);
  const [addedSlugs, setAddedSlugs] = useState<string[]>([]);

  // Metadata ampliada (Módulo C)
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [categoria, setCategoria] = useState('Top');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [colorPrincipal, setColorPrincipal] = useState('');
  const [colorHex, setColorHex] = useState('#222222');
  const [colorSecundario, setColorSecundario] = useState('');
  const [colorSecundarioHex, setColorSecundarioHex] = useState('#888888');
  const [tonoEstacional, setTonoEstacional] = useState('Neutro');
  const [material, setMaterial] = useState('');
  const [temporada, setTemporada] = useState('Todo el año');
  const [ocasiones, setOcasiones] = useState<string[]>(['Casual']);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    stopCameraStream();
    setCameraError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Tu navegador no expone cámara en vivo. Usa el botón de captura directa inferior.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1600 } },
        audio: false
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch (err) {
      setCameraError('Permiso de cámara no concedido o dispositivo sin cámara web disponible.');
    }
  };

  useEffect(() => {
    if (activeTab === 'camara' && !preview) {
      startCamera(facingMode);
    } else {
      stopCameraStream();
    }
    return () => stopCameraStream();
  }, [activeTab, facingMode]);

  useEffect(() => {
    if (activeTab === 'basicos' && catalogoBasicos.length === 0) {
      const cargarBasicos = async () => {
        setLoadingBasicos(true);
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`${API_URL}/api/prendas/catalogo-basicos`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            setCatalogoBasicos(await res.json());
          }
        } catch (e) {
          showToast('Error al cargar catálogo de básicos', 'error');
        } finally {
          setLoadingBasicos(false);
        }
      };
      cargarBasicos();
    }
  }, [activeTab]);

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const maxDim = 1400;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `captura_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFile(capturedFile);
        setPreview(URL.createObjectURL(capturedFile));
        stopCameraStream();
      },
      'image/jpeg',
      0.92
    );
  };

  const handleSelectLocalFile = (selectedFile?: File | null) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setCropPreset('original');
    setZoom(1);
  };

  /**
   * Si el usuario eligió un recorte de encuadre o zoom sobre la imagen de galería/cámara,
   * renderiza el recorte exacto antes de enviarlo a rembg para limpieza de fondo.
   */
  const generarArchivoRecortado = async (sourceFile: File): Promise<File> => {
    if (cropPreset === 'original' && zoom === 1) return sourceFile;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let targetRatio = img.width / img.height;
        if (cropPreset === 'square') targetRatio = 1;
        if (cropPreset === 'portrait') targetRatio = 3 / 4;

        let cropW = img.width;
        let cropH = img.height;
        if (img.width / img.height > targetRatio) {
          cropW = img.height * targetRatio;
        } else {
          cropH = img.width / targetRatio;
        }

        cropW = cropW / zoom;
        cropH = cropH / zoom;
        const startX = (img.width - cropW) / 2;
        const startY = (img.height - cropH) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(Math.min(1200, cropW));
        canvas.height = Math.round(canvas.width / targetRatio);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(sourceFile);
          return;
        }

        ctx.drawImage(img, startX, startY, cropW, cropH, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(sourceFile);
              return;
            }
            resolve(new File([blob], sourceFile.name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.92
        );
      };
      img.onerror = () => resolve(sourceFile);
      img.src = URL.createObjectURL(sourceFile);
    });
  };

  const handlePreviewWebUrl = async () => {
    if (!webUrl.trim()) {
      showToast('Pega primero el enlace de la imagen o producto', 'info');
      return;
    }
    setFetchingWebPreview(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/prendas/preview-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url: webUrl.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setWebPreviewUrl(data.imageUrl);
        if (data.tituloSugerido && !nombre) setNombre(data.tituloSugerido);
        if (data.marcaSugerida && !marca) setMarca(data.marcaSugerida);
        showToast('Imagen extraída correctamente desde la web', 'success');
      } else {
        showToast(data.error || 'No se pudo previsualizar la URL', 'error');
      }
    } catch (e) {
      showToast('Error al conectar con el importador web', 'error');
    } finally {
      setFetchingWebPreview(false);
    }
  };

  const toggleOcasion = (occ: string) => {
    setOcasiones((prev) => {
      if (prev.includes(occ)) {
        return prev.length > 1 ? prev.filter((item) => item !== occ) : prev;
      }
      return [...prev, occ];
    });
  };

  const handleQuickAddBasic = async (item: BasicCatalogItem) => {
    const slug = item.slug || item.basicId || '';
    if (!slug || addingBasicSlug) return;

    const token = localStorage.getItem('token');
    setAddingBasicSlug(slug);
    try {
      const res = await fetchWithTimeout(
        `${API_URL}/api/prendas/basicos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ slug })
        },
        30000
      );
      const data = await res.json();
      if (res.ok) {
        setAddedSlugs((prev) => (prev.includes(slug) ? prev : [...prev, slug]));
        onBasicAdded?.();
        showToast(`${item.nombre} agregada directamente al armario`, 'success');
      } else {
        showToast(data.error || 'No se pudo agregar la prenda básica', 'error');
      }
    } catch (e) {
      showToast('Error de conexión al insertar prenda básica', 'error');
    } finally {
      setAddingBasicSlug(null);
    }
  };

  const handleSubmit = async () => {
    if (activeTab === 'basicos') {
      onUploadSuccess();
      return;
    }

    const token = localStorage.getItem('token');
    setLoading(true);
    setCleanStageThumb(null);

    try {
      let visionData: {
        url_imagen_limpia: string;
        url_imagen_original?: string;
        analisis?: Record<string, unknown>;
        descripcionPython?: string;
        tituloSugerido?: string;
        marcaSugerida?: string;
      } | null = null;

      // PASO 1A: Extracción de imagen (Web URL o encuadre local de Cámara/Galería)
      setProcessingStage('extracting');

      if (activeTab === 'web') {
        if (!webUrl.trim()) {
          showToast('Ingresa la URL directa o de producto', 'error');
          return;
        }

        if (!webPreviewUrl) {
          const previewRes = await fetchWithTimeout(
            `${API_URL}/api/prendas/preview-url`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ url: webUrl.trim() })
            },
            35000
          );
          if (previewRes.ok) {
            const pData = await previewRes.json();
            setWebPreviewUrl(pData.imageUrl);
            setCleanStageThumb(pData.imageUrl);
            if (pData.tituloSugerido && !nombre) setNombre(pData.tituloSugerido);
            if (pData.marcaSugerida && !marca) setMarca(pData.marcaSugerida);
          }
        } else {
          setCleanStageThumb(webPreviewUrl);
        }

        // PASO 1B: Remoción de fondo (endpoint transitorio /api/prendas/procesar-vision con timeout >= 30s)
        setProcessingStage('removing_bg');
        const visionRes = await fetchWithTimeout(
          `${API_URL}/api/prendas/procesar-vision`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              url: webUrl.trim(),
              categoria
            })
          },
          45000
        );
        const vJson = await visionRes.json();
        if (!visionRes.ok) {
          showToast(vJson.error || 'No se pudo procesar la imagen desde la URL', 'error');
          return;
        }
        visionData = vJson;
        setWebPreviewUrl(vJson.url_imagen_limpia);
        setCleanStageThumb(vJson.url_imagen_limpia);
      } else {
        // Vías Cámara o Galería
        if (!file) {
          showToast('Captura o selecciona una imagen primero', 'error');
          return;
        }

        const processedFile = await generarArchivoRecortado(file);
        setCleanStageThumb(preview);

        // PASO 1B: Remoción de fondo (endpoint transitorio /api/prendas/procesar-vision con timeout >= 30s)
        setProcessingStage('removing_bg');
        const formData = new FormData();
        formData.append('imagen', processedFile);
        formData.append('categoria', categoria);

        const visionRes = await fetchWithTimeout(
          `${API_URL}/api/prendas/procesar-vision`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          },
          45000
        );
        const vJson = await visionRes.json();
        if (!visionRes.ok) {
          showToast(vJson.error || 'Error al remover el fondo de la imagen', 'error');
          return;
        }
        visionData = vJson;
        setPreview(vJson.url_imagen_limpia);
        setCleanStageThumb(vJson.url_imagen_limpia);
      }

      // PASO 2: Etiquetado estilístico con IA y guardado normalizado (/api/prendas/finalizar-ia)
      setProcessingStage('analyzing_ai');
      const finalRes = await fetchWithTimeout(
        `${API_URL}/api/prendas/finalizar-ia`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            url_imagen_limpia: visionData?.url_imagen_limpia,
            url_imagen_original: visionData?.url_imagen_original,
            analisis: visionData?.analisis || {},
            descripcionPython: visionData?.descripcionPython || '',
            tituloSugerido: visionData?.tituloSugerido || '',
            marcaSugerida: visionData?.marcaSugerida || '',
            origen_carga: activeTab,
            nombre: nombre.trim(),
            marca: marca.trim(),
            categoria,
            color_principal: colorPrincipal.trim(),
            color_hex: colorPrincipal.trim() ? colorHex : '',
            color_secundario: colorSecundario.trim(),
            color_secundario_hex: colorSecundario.trim() ? colorSecundarioHex : '',
            tono_estacional: tonoEstacional,
            material: material.trim(),
            temporada,
            ocasiones
          })
        },
        45000
      );

      if (finalRes.ok) {
        onUploadSuccess();
      } else {
        const errorData = await finalRes.json();
        showToast(errorData.error || 'Error al analizar y guardar la prenda', 'error');
      }
    } catch (error: unknown) {
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      showToast(
        isAbort
          ? 'El procesamiento superó el tiempo límite (45s). Intenta de nuevo.'
          : 'Error de conexión procesando la prenda',
        'error'
      );
    } finally {
      setLoading(false);
      setProcessingStage('idle');
    }
  };

  const basicosFiltrados = basicFilter === 'Todos'
    ? catalogoBasicos
    : catalogoBasicos.filter((b) => b.categoria === basicFilter);

  const isSubmitDisabled = loading
    || ((activeTab === 'camara' || activeTab === 'galeria') && !file)
    || (activeTab === 'web' && !webUrl.trim())
    || (activeTab === 'basicos' && addedSlugs.length === 0);

  const currentStageIndex = PROCESSING_STEPS.findIndex((s) => s.id === processingStage);
  const currentStageLabel =
    PROCESSING_STEPS.find((s) => s.id === processingStage)?.label || 'Procesando prenda...';

  return (
    <div className={styles.wrapper}>
      {/* Selector de 4 vías estandarizadas */}
      <div className={styles.pathwayTabs} role="tablist">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'camara' ? styles.tabBtnActive : ''}`}
          onClick={() => { setActiveTab('camara'); setPreview(null); setFile(null); }}
        >
          <Camera size={17} />
          <span>Cámara</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'galeria' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('galeria')}
        >
          <ImageIcon size={17} />
          <span>Galería</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'web' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('web')}
        >
          <Globe size={17} />
          <span>Importar Web</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'basicos' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('basicos')}
        >
          <Layers size={17} />
          <span>Básicos</span>
        </button>
      </div>

      {/* VÍA 1: CÁMARA DIRECTA */}
      {activeTab === 'camara' && (
        <div className={styles.stageBox}>
          <input
            id="camera-fallback-input"
            type="file"
            hidden
            accept="image/*"
            capture="environment"
            onChange={(e) => handleSelectLocalFile(e.target.files?.[0])}
          />
          {!preview ? (
            cameraActive ? (
              <div className={styles.cameraViewport}>
                <video ref={videoRef} autoPlay playsInline muted className={styles.videoFeed} />
                <div className={styles.frameGuide} />
                <div className={styles.cameraControls}>
                  <button
                    type="button"
                    className={styles.camAuxBtn}
                    onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
                  >
                    <RefreshCw size={13} /> Girar
                  </button>
                  <button
                    type="button"
                    className={styles.shutterBtn}
                    onClick={handleCapturePhoto}
                    title="Capturar foto"
                  >
                    <Camera size={22} />
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.dropTrigger} onClick={() => document.getElementById('camera-fallback-input')?.click()}>
                <Camera size={30} color="var(--accent)" />
                <span className={styles.dropTitle}>Abrir captura de cámara</span>
                <span className={styles.dropSub}>
                  {cameraError || 'Encuadra la prenda sobre una superficie contrastada para un recorte limpio.'}
                </span>
              </div>
            )
          ) : (
            <div className={styles.previewWrap}>
              <div className={`${styles.cropFrame} ${styles.cropOriginal}`}>
                <img src={preview} alt="Captura" className={styles.previewImg} />
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => { setPreview(null); setFile(null); startCamera(facingMode); }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VÍA 2: GALERÍA CON ENCUADRE/RECORTE Y FONDO LIMPIO */}
      {activeTab === 'galeria' && (
        <div
          className={`${styles.stageBox} ${dragActive ? styles.stageBoxDrag : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleSelectLocalFile(e.dataTransfer.files?.[0]);
          }}
        >
          <input
            id="gallery-file-input"
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => handleSelectLocalFile(e.target.files?.[0])}
          />
          {!preview ? (
            <div className={styles.dropTrigger} onClick={() => document.getElementById('gallery-file-input')?.click()}>
              <ImageIcon size={30} color="var(--accent)" />
              <span className={styles.dropTitle}>Selecciona o arrastra una fotografía</span>
              <span className={styles.dropSub}>
                Incluye ajuste de encuadre y eliminación automática de fondo mediante visión artificial
              </span>
            </div>
          ) : (
            <div className={styles.previewWrap}>
              <div
                className={`${styles.cropFrame} ${
                  cropPreset === 'square'
                    ? styles.cropSquare
                    : cropPreset === 'portrait'
                    ? styles.cropPortrait
                    : styles.cropOriginal
                }`}
              >
                <img
                  src={preview}
                  alt="Vista previa"
                  className={styles.previewImg}
                  style={{ transform: `scale(${zoom})` }}
                />
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => { setPreview(null); setFile(null); }}
                >
                  <X size={14} />
                </button>
              </div>

              <div className={styles.cropToolbar}>
                <div className={styles.cropRatioGroup}>
                  <button
                    type="button"
                    className={`${styles.ratioBtn} ${cropPreset === 'original' ? styles.ratioBtnActive : ''}`}
                    onClick={() => setCropPreset('original')}
                  >
                    <Crop size={11} /> Libre
                  </button>
                  <button
                    type="button"
                    className={`${styles.ratioBtn} ${cropPreset === 'square' ? styles.ratioBtnActive : ''}`}
                    onClick={() => setCropPreset('square')}
                  >
                    1:1
                  </button>
                  <button
                    type="button"
                    className={`${styles.ratioBtn} ${cropPreset === 'portrait' ? styles.ratioBtnActive : ''}`}
                    onClick={() => setCropPreset('portrait')}
                  >
                    3:4
                  </button>
                </div>
                <label className={styles.zoomControl}>
                  <span>Zoom</span>
                  <input
                    type="range"
                    min="1"
                    max="1.6"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className={styles.zoomSlider}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VÍA 3: IMPORTADOR WEB */}
      {activeTab === 'web' && (
        <div className={styles.formGrid}>
          <div>
            <label className={styles.label}>URL de imagen directa o ficha de tienda online</label>
            <div className={styles.webInputBox}>
              <input
                type="url"
                className={styles.input}
                placeholder="https://tienda.com/producto o enlace directo .jpg/.png/.webp"
                value={webUrl}
                onChange={(e) => { setWebUrl(e.target.value); setWebPreviewUrl(null); }}
              />
              <button
                type="button"
                className={styles.previewUrlBtn}
                onClick={handlePreviewWebUrl}
                disabled={fetchingWebPreview || !webUrl.trim()}
              >
                {fetchingWebPreview ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                Extraer
              </button>
            </div>
          </div>

          {webPreviewUrl && (
            <div className={styles.stageBox}>
              <div className={styles.previewWrap}>
                <div className={`${styles.cropFrame} ${styles.cropOriginal}`}>
                  <img src={webPreviewUrl} alt="Extracción web" className={styles.previewImg} />
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => setWebPreviewUrl(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VÍA 4: CATÁLOGO DE BÁSICOS */}
      {activeTab === 'basicos' && (
        <div className={styles.formGrid}>
          <div className={styles.basicsFilterRow}>
            {['Todos', 'Top', 'Bottom', 'Outerwear', 'Shoes', 'Accessories'].map((cat) => (
              <button
                type="button"
                key={cat}
                className={`${styles.basicCatChip} ${basicFilter === cat ? styles.basicCatChipActive : ''}`}
                onClick={() => setBasicFilter(cat)}
              >
                {cat === 'Todos' ? 'Todos los básicos' : cat}
              </button>
            ))}
          </div>

          {loadingBasicos ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>
              Cargando biblioteca de esenciales...
            </div>
          ) : (
            <div className={styles.basicsGrid}>
              {basicosFiltrados.map((item) => {
                const slug = item.slug || item.basicId || '';
                const isAdded = addedSlugs.includes(slug);
                const isAddingThis = addingBasicSlug === slug;
                return (
                  <div
                    key={slug}
                    className={`${styles.basicCard} ${isAdded ? styles.basicCardSelected : ''}`}
                    onClick={() => handleQuickAddBasic(item)}
                  >
                    {isAdded && (
                      <div className={styles.basicCheck} title="Agregada al armario">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                    <div className={styles.basicThumb}>
                      <img src={item.url_imagen_limpia} alt={item.nombre} loading="lazy" />
                    </div>
                    <div className={styles.basicName}>{item.nombre}</div>
                    <div className={styles.basicMeta}>
                      <span className={styles.swatchDot} style={{ background: item.color_hex }} />
                      <span>{item.color_principal} · {item.categoria}</span>
                    </div>
                    <button
                      type="button"
                      className={`${styles.basicQuickBtn} ${isAdded ? styles.basicQuickBtnAdded : ''}`}
                      disabled={Boolean(addingBasicSlug)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAddBasic(item);
                      }}
                    >
                      {isAddingThis ? (
                        <>
                          <Loader2 size={12} className="spin" />
                          <span>Agregando...</span>
                        </>
                      ) : isAdded ? (
                        <>
                          <Check size={12} />
                          <span>Agregada (clic +1)</span>
                        </>
                      ) : (
                        <>
                          <Plus size={12} />
                          <span>1 clic para agregar</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* METADATA Y ATRIBUTOS DE ARMARIO (Para Cámara, Galería y Web) */}
      {activeTab !== 'basicos' && (
        <div className={styles.formGrid}>
          <div className={styles.row2}>
            <div>
              <label className={styles.label}>Nombre (opcional, IA autocompleta)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ej: Pantalón Jean Gris Recto"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div>
              <label className={styles.label}>Marca</label>
              <input
                type="text"
                list="marcas-list"
                className={styles.input}
                placeholder="Ej: Zara, H&M, Massimo Dutti..."
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
              />
              <datalist id="marcas-list">
                {MARCAS_SUGERIDAS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
          </div>

          <div className={styles.row2}>
            <div>
              <label className={styles.label}>Categoría</label>
              <select
                className={styles.input}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
              >
                {CATEGORIAS_PRENDA.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={styles.label}>Estación del año</label>
              <select
                className={styles.input}
                value={temporada}
                onChange={(e) => setTemporada(e.target.value)}
              >
                {TEMPORADAS_DISPONIBLES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            className={styles.advancedToggle}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span>Paleta de color, tela y ocasiones ({ocasiones.length})</span>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAdvanced && (
            <div className={styles.advancedPanel}>
              <div>
                <label className={styles.label}>Selector rápido de paleta</label>
                <div className={styles.paletteRow}>
                  {PALETA_COLORES_MODA.map((sw) => (
                    <button
                      type="button"
                      key={sw.nombre}
                      title={`${sw.nombre} (${sw.subtono})`}
                      className={`${styles.paletteSwatch} ${colorPrincipal === sw.nombre ? styles.paletteSwatchSelected : ''}`}
                      style={{ background: sw.hex }}
                      onClick={() => {
                        setColorPrincipal(sw.nombre);
                        setColorHex(sw.hex);
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.row2}>
                <div>
                  <label className={styles.label}>Color primario + HEX</label>
                  <div className={styles.colorInputGroup}>
                    <input
                      type="color"
                      className={styles.hexPicker}
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="IA detecta si queda vacío"
                      value={colorPrincipal}
                      onChange={(e) => setColorPrincipal(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={styles.label}>Color secundario (opcional)</label>
                  <div className={styles.colorInputGroup}>
                    <input
                      type="color"
                      className={styles.hexPicker}
                      value={colorSecundarioHex}
                      onChange={(e) => setColorSecundarioHex(e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Ej: Rayas blancas"
                      value={colorSecundario}
                      onChange={(e) => setColorSecundario(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.row2}>
                <div>
                  <label className={styles.label}>Tono estacional</label>
                  <select
                    className={styles.input}
                    value={tonoEstacional}
                    onChange={(e) => setTonoEstacional(e.target.value)}
                  >
                    {TONOS_ESTACIONALES.map((tono) => (
                      <option key={tono} value={tono}>{tono}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={styles.label}>Tipo de tela / Material</label>
                  <input
                    type="text"
                    list="materiales-list"
                    className={styles.input}
                    placeholder="Ej: Algodón, Lino, Denim..."
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                  />
                  <datalist id="materiales-list">
                    {MATERIALES_COMUNES.map((mat) => (
                      <option key={mat} value={mat} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className={styles.label}>Ocasión de uso</label>
                <div className={styles.occasionChips}>
                  {OCASIONES_DISPONIBLES.map((occ) => (
                    <button
                      type="button"
                      key={occ}
                      className={`${styles.occChip} ${ocasiones.includes(occ) ? styles.occChipActive : ''}`}
                      onClick={() => toggleOcasion(occ)}
                    >
                      {occ}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SKELETON EXPLÍCITO CON INDICADORES DE PROGRESO EN TIEMPO REAL */}
      {loading && activeTab !== 'basicos' && (
        <div className={styles.skeletonCard} role="status" aria-live="polite">
          <div className={styles.skeletonHeader}>
            <div className={styles.skeletonStatusText}>
              <Loader2 size={15} className="spin" />
              <span>{currentStageLabel}</span>
            </div>
            <span className={styles.skeletonSub}>
              Paso {Math.max(1, currentStageIndex + 1)} de {PROCESSING_STEPS.length}
            </span>
          </div>

          <div className={styles.shimmerBar} />

          <div className={styles.skeletonLines}>
            <div className={styles.skeletonThumb}>
              {cleanStageThumb ? (
                <img src={cleanStageThumb} alt="Prenda en proceso" />
              ) : null}
            </div>

            <div className={styles.stepperList}>
              {PROCESSING_STEPS.map((step, idx) => {
                const isDone = idx < currentStageIndex;
                const isActive = idx === currentStageIndex;
                return (
                  <div
                    key={step.id}
                    className={`${styles.stepItem} ${isActive ? styles.stepItemActive : ''} ${isDone ? styles.stepItemDone : ''}`}
                  >
                    <span
                      className={`${styles.stepDot} ${isActive ? styles.stepDotActive : ''} ${isDone ? styles.stepDotDone : ''}`}
                    >
                      {isDone ? <Check size={10} strokeWidth={3} /> : idx + 1}
                    </span>
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {(activeTab !== 'basicos' || addedSlugs.length > 0) && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className={styles.submitBtn}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="spin" />
              <span>{currentStageLabel}</span>
            </>
          ) : activeTab === 'basicos' ? (
            <span>Listo ({addedSlugs.length} agregado{addedSlugs.length > 1 ? 's' : ''}) · Cerrar</span>
          ) : activeTab === 'web' ? (
            <span>Importar y Digitalizar Prenda</span>
          ) : (
            <span>Guardar en Mi Armario</span>
          )}
        </button>
      )}
    </div>
  );
};

export default UploadPrenda;
