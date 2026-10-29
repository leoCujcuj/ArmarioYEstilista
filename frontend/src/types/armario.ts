/**
 * Tipado estricto y constantes de dominio para Armario, Outfits, Calendario OOTD y Analítica.
 */

export type CategoriaPrenda = 'Top' | 'Bottom' | 'Outerwear' | 'Shoes' | 'Accessories';
export type OrigenCarga = 'camara' | 'galeria' | 'web' | 'basicos';
export type EstadoCalendario = 'usado' | 'planificado';

export interface PrendaItem {
  _id: string;
  usuarioId?: string;
  nombre: string;
  marca?: string;
  marca_normalizada?: string;
  url_imagen_original?: string;
  url_imagen_limpia: string;
  categoria: string;
  color_principal?: string;
  color_hex?: string;
  color_secundario?: string;
  color_secundario_hex?: string;
  subtono?: string;
  tono_estacional?: string;
  material?: string;
  corte_silueta?: string;
  estilo?: string;
  temporada?: string;
  ocasiones?: string[];
  origen_carga?: OrigenCarga;
  formalidad?: number;
  tags_ia?: string[];
  descripcion?: string;
  favorito?: boolean;
  contadorUsos?: number;
  usosCalendario?: number;
  ultimoUso?: string | null;
  created_at?: string;
}

export interface BasicCatalogItem {
  slug: string;
  basicId?: string;
  nombre: string;
  marca?: string;
  categoria: CategoriaPrenda;
  url_imagen_limpia: string;
  color_principal: string;
  color_hex: string;
  color_secundario?: string;
  color_secundario_hex?: string;
  subtono: string;
  tono_estacional: string;
  material: string;
  corte_silueta: string;
  estilo: string;
  temporada: string;
  ocasiones: string[];
  origen_carga?: OrigenCarga;
  formalidad: number;
  tags_ia: string[];
  descripcion: string;
}

export interface LookItem {
  _id: string;
  nombre?: string;
  temporada?: string;
  ocasion?: string;
  explicacion?: string;
  consejo_color?: string;
  prendas: PrendaItem[];
  score?: {
    color: number;
    balance: number;
  };
  liked?: boolean;
  createdAt?: string;
}

export interface CalendarioEntry {
  _id: string;
  usuarioId: string;
  prendas: PrendaItem[];
  outfitSignature?: string;
  lookId?: LookItem | null;
  fecha: string;
  fechaDia: string;
  ocasion: string;
  clima?: string;
  notas?: string;
  estado: EstadoCalendario;
  created_at?: string;
}

export interface CombinacionRecurrente {
  signature?: string;
  tipo: 'conjunto' | 'par';
  veces: number;
  esRecurrente: boolean;
  ultimaFecha: string;
  ocasion?: string;
  prendas: PrendaItem[];
}

export interface CategoriaMetrica {
  categoria: string;
  usos: number;
  cantidadInventario: number;
  porcentaje: number;
}

export interface ColorMetrica {
  color: string;
  hex: string;
  usos: number;
  porcentaje: number;
}

export interface TelaMetrica {
  material: string;
  usos: number;
  porcentaje: number;
}

export interface SubtonoMetrica {
  subtono: string;
  usos: number;
  porcentaje: number;
}

export interface MarcaMetrica {
  marca: string;
  cantidadPrendas: number;
  usos: number;
}

export interface AnaliticaClosetResponse {
  resumen: {
    totalPrendas: number;
    prendasEstrenadas: number;
    tasaRotacion: number;
    totalRegistrosUsados: number;
    totalPlanificados: number;
    basadoEnInventarioPorFaltaDeUsos: boolean;
  };
  prendaMasUtilizada: PrendaItem | null;
  masUsadas: PrendaItem[];
  nuncaUsadas: PrendaItem[];
  combinaciones: {
    conjuntos: CombinacionRecurrente[];
    pares: CombinacionRecurrente[];
    destacada: CombinacionRecurrente | null;
  };
  categoriaPreferida: CategoriaMetrica | null;
  categoriasDistribucion: CategoriaMetrica[];
  analisisCromatico: {
    colores: ColorMetrica[];
    subtonos: SubtonoMetrica[];
    telas: TelaMetrica[];
  };
  marcaFavorita: MarcaMetrica | null;
  marcasRanking: MarcaMetrica[];
}

export const CATEGORIAS_PRENDA: { value: CategoriaPrenda; label: string }[] = [
  { value: 'Top', label: 'Tops / Superiores' },
  { value: 'Bottom', label: 'Bottoms / Inferiores' },
  { value: 'Outerwear', label: 'Abrigos / Tercera Pieza' },
  { value: 'Shoes', label: 'Calzado' },
  { value: 'Accessories', label: 'Accesorios' }
];

export const ETIQUETAS_CATEGORIA: Record<string, string> = {
  Top: 'Superiores',
  Bottom: 'Inferiores',
  Outerwear: 'Abrigos y Capas',
  Shoes: 'Calzado',
  Accessories: 'Accesorios',
  Other: 'Otros'
};

export const OCASIONES_DISPONIBLES: string[] = [
  'Casual',
  'Oficina',
  'Evento',
  'Noche',
  'Deportivo',
  'Viaje'
];

export const TEMPORADAS_DISPONIBLES: string[] = [
  'Todo el año',
  'Primavera / Verano',
  'Verano',
  'Otoño / Invierno',
  'Invierno',
  'Entretiempo'
];

export const MATERIALES_COMUNES: string[] = [
  'Algodón',
  'Lino',
  'Denim',
  'Lana',
  'Cuero',
  'Punto',
  'Seda / Satén',
  'Gabardina',
  'Técnico / Sintético'
];

export const TONOS_ESTACIONALES: string[] = [
  'Neutro',
  'Invierno Profundo',
  'Verano Suave',
  'Otoño Cálido',
  'Primavera Cálida'
];

export const PALETA_COLORES_MODA: { nombre: string; hex: string; subtono: string }[] = [
  { nombre: 'Negro Carbón', hex: '#181818', subtono: 'Frío' },
  { nombre: 'Blanco Marfil', hex: '#F4F1EA', subtono: 'Neutro' },
  { nombre: 'Gris Marengo', hex: '#3E4147', subtono: 'Neutro' },
  { nombre: 'Azul Marino', hex: '#1C2841', subtono: 'Frío' },
  { nombre: 'Azul Celeste', hex: '#A9C4DC', subtono: 'Frío' },
  { nombre: 'Beige Arena', hex: '#D6C6B2', subtono: 'Cálido' },
  { nombre: 'Camel', hex: '#C19A6B', subtono: 'Cálido' },
  { nombre: 'Café Espresso', hex: '#3B2820', subtono: 'Cálido' },
  { nombre: 'Verde Oliva', hex: '#556347', subtono: 'Cálido' },
  { nombre: 'Terracota', hex: '#B55D44', subtono: 'Cálido' },
  { nombre: 'Burdeos', hex: '#5E2129', subtono: 'Frío' },
  { nombre: 'Rosa Empolvado', hex: '#D8B4B8', subtono: 'Frío' }
];

export function formatearFechaLocalISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function optimizarImagenUrl(url?: string, width = 420): string {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && !url.includes('upload/w_')) {
    return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`);
  }
  return url;
}
