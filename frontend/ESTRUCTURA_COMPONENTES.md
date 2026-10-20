# 🎨 Armario IA - Estructura de Componentes Mejorada

## 📁 Estructura de Carpetas

```
src/
├── components/
│   ├── common/              # Componentes reutilizables
│   │   ├── Button.tsx       # Botón versátil
│   │   ├── Button.module.css
│   │   ├── Card.tsx         # Tarjeta base
│   │   ├── Card.module.css
│   │   ├── Tag.tsx          # Etiqueta
│   │   └── Tag.module.css
│   │
│   ├── layout/              # Componentes de diseño
│   │   ├── MainLayout.tsx   # Contenedor principal
│   │   ├── MainLayout.module.css
│   │   ├── Topbar.tsx       # Barra superior
│   │   ├── Topbar.module.css
│   │   ├── Sidebar.tsx      # Barra lateral
│   │   ├── Sidebar.module.css
│   │   ├── RightPanel.tsx   # Panel derecho
│   │   └── RightPanel.module.css
│   │
│   ├── pages/               # Páginas principales
│   │   ├── Dashboard.tsx    # Página de inicio
│   │   ├── Dashboard.module.css
│   │   ├── Armario.tsx      # Armario/Closet
│   │   ├── Armario.module.css
│   │   ├── Generador.tsx    # Generador de looks
│   │   ├── Generador.module.css
│   │   ├── Tienda.tsx       # Tienda de productos
│   │   ├── Tienda.module.css
│   │   ├── Favoritos.tsx    # Looks favoritos
│   │   ├── Favoritos.module.css
│   │   ├── Perfil.tsx       # Perfil de usuario
│   │   ├── Perfil.module.css
│   │   └── index.ts
│   │
│   ├── onboarding/          # Componentes de onboarding (existentes)
│   │   ├── GenderSelection.tsx
│   │   ├── GoalSelection.tsx
│   │   ├── Onboarding.tsx
│   │   └── StyleSelection.tsx
│   │
│   └── wardrobe/            # Componentes de armario (existentes)
│       ├── UploadPrenda.tsx
│       └── WardrobeGallery.tsx
│
├── styles/
│   └── globals.css          # Estilos globales y variables CSS
│
├── App.tsx                  # Componente principal
└── main.tsx                 # Punto de entrada
```

## 🎯 Cambios Principales

### ✅ Emojis → Iconos Profesionales
- Reemplazados todos los emojis por iconos de **Lucide React**
- Iconos limpios, profesionales y escalables
- Fácil de cambiar tema y tamaño

### ✅ Diseño Separado por Componentes
- **Componentes reutilizables** (`common/`): Button, Card, Tag
- **Layout components** (`layout/`): Topbar, Sidebar, RightPanel, MainLayout
- **Pages** (`pages/`): Cada página en su propio componente
- Cada componente tiene su propio archivo de estilos CSS Modules

### ✅ Gestión de Estado
- Estado centralizado en `MainLayout` para navegación
- Fácil de extender con Context API o Redux

### ✅ Estilos Organizados
- Variables CSS en `globals.css`
- CSS Modules para componentes aislados
- Responsive y mantenible

## 🚀 Cómo Usar

### Importar Componentes
```typescript
import { MainLayout, Dashboard, Button, Card } from './components'
```

### Crear Nuevos Componentes
```typescript
// pages/NuevaPage.tsx
import React from 'react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import styles from './NuevaPage.module.css';

export const NuevaPage: React.FC = () => {
  return (
    <div className={styles.page}>
      <h1>Nueva Página</h1>
      <Button>Click me</Button>
    </div>
  );
};
```

## 📦 Dependencias Agregadas
- `react-icons`: Colección grande de iconos
- `lucide-react`: Iconos profesionales y limpios

## 🎨 Paleta de Colores
Las variables CSS se definen en `globals.css`:
- `--accent`: #c8a97e (Dorado)
- `--text`: #f0ece4 (Texto claro)
- `--surface`: #111111 (Fondo)
- Y más...

## 💡 Próximas Mejoras
1. Agregar Context API para estado global
2. Crear componentes más especializados
3. Añadir animaciones con Framer Motion
4. Mejorar responsive design
5. Agregar tests unitarios
