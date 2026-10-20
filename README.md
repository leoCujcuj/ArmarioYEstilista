# Armario IA y Estilista Personal

Plataforma integral de asesoría de imagen digital, análisis biométrico y probador virtual impulsada por Inteligencia Artificial multimodal y Visión por Computadora. Permite digitalizar prendas, remover fondos automáticamente, clasificar siluetas corporales y colorimetría personal, y generar recomendaciones de estilo adaptadas al clima y la ocasión.

---

## Arquitectura del Sistema

La solución opera mediante una arquitectura desacoplada de microservicios contenerizados con Docker:

### 1. Frontend (React + TypeScript)
Ubicado en `/frontend`, desarrollado con Vite.
* Interfaz minimalista y responsiva con CSS Modules y temas oscuros de alto contraste.
* Onboarding biométrico interactivo (morfología, colorimetría, objetivos de estilo y nivel de atrevimiento).
* Armario digital interactivo con vistas compactas/detalladas, filtros por categoría y búsqueda en tiempo real.
* Generador de outfits con justificación morfológica y cromática concisa, puntuaciones de balance y ciclo de retroalimentación interactivo (Me gusta / Ajustar propuesta).
* Tienda inteligente y boutique curada con lista de deseos y registro directo de compras al presupuesto del usuario.

### 2. Backend Principal (Node.js + Express)
Ubicado en `/backend-node`, coordina la lógica de negocio, persistencia e inteligencia artificial.
* Persistencia híbrida:
  * MongoDB (vía Mongoose): Almacenamiento flexible de inventario de prendas, looks y productos de boutique.
  * PostgreSQL: Gestión estructurada de perfiles y trazabilidad de datos de usuario.
  * Redis: Caché de alto rendimiento para recomendaciones de boutique y respuestas frecuentes.
* Motor de Estilismo IA con triple nivel de respaldo:
  * Nivel 1: SDK oficial `@google/genai` con modelo Gemini 3.8 Flash.
  * Nivel 2: Respaldo automático mediante OpenRouter.
  * Nivel 3: Algoritmo heurístico local basado en prendas favoritas y rotación de prendas olvidadas.
* Integración con Cloudinary para optimización y entrega de imágenes de prendas y avatares.
* Seguridad con JWT, Bcrypt y limitación de tokens de salida para máxima eficiencia.

### 3. Backend de Visión por Computadora (Python + FastAPI)
Ubicado en `/backend-python`, procesa imágenes y cálculos biométricos.
* Segmentación adaptativa con Rembg:
  * Modelo `u2net_cloth_seg` para prendas corporales superiores e inferiores.
  * Modelo `u2net` general para calzado y accesorios.
  * Sistema de validación de máscara alfa que evita recortes vacíos o transparentes.
* Análisis corporal con MediaPipe Pose para estimación de proporciones hombro-cadera y proporciones verticales de torso y piernas.
* Extracción óptica de colorimetría dominante (código HEX, subtono frío/cálido y luminosidad).

---

## Tecnologías Utilizadas

| Componente | Tecnologías |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Lucide Icons, CSS Modules, SweetAlert2 |
| Backend Node | Node.js 18, Express, Mongoose, PostgreSQL (pg), Redis, Multer, Cloudinary SDK, Axios |
| Backend Python | Python 3.10+, FastAPI, Uvicorn, Rembg, MediaPipe, OpenCV, Pillow, NumPy |
| Modelos IA | Gemini 3.8 Flash (@google/genai), OpenRouter API |
| Infraestructura | Docker, Docker Compose |

---

## Instalación y Puesta en Marcha

### Requisitos Previos
* Docker y Docker Compose instalados en el sistema.
* Clave de API de Google Gemini o cuenta de OpenRouter.
* Cuenta de Cloudinary para almacenamiento multimedia.

### 1. Clonar el Repositorio
```bash
git clone https://github.com/leoCujcuj/ArmarioYEstilista.git
cd ArmarioYEstilista
```

### 2. Configurar Variables de Entorno
Copia los archivos de ejemplo y añade tus credenciales correspondientes:

```bash
# Backend Node
cp backend-node/.env.example backend-node/.env

# Frontend
cp frontend/.env.example frontend/.env

# Backend Python
cp backend-python/.env.example backend-python/.env
```

Configura en `backend-node/.env` tus claves de Gemini (`GEMINI_API_KEY`), OpenRouter (`OPENROUTER_API_KEY`) y Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

### 3. Ejecutar los Contenedores
Desde la raíz del proyecto:
```bash
docker-compose up --build -d
```

Los servicios estarán disponibles en:
* Frontend: `http://localhost:5173`
* Backend Node: `http://localhost:3000`
* Backend Python: `http://localhost:8000`
* PostgreSQL: Puerto `5434`
* MongoDB: Puerto `27017`
* Redis: Puerto `6379`

### 4. Inicializar Datos de Prueba (Opcional)
Para cargar un usuario inicial con prendas y looks configurados:
```bash
docker exec armario-backend-node node seed.js
```
* Correo predeterminado: `armario@local.gt`
* Contraseña predeterminada: `armario123`

---

## Flujo de Procesamiento

1. **Carga y Limpieza:** El usuario sube la foto de una prenda. Python procesa la imagen, elimina el fondo de forma adaptativa y extrae los valores cromáticos ópticos.
2. **Subida y Etiquetado:** Node.js almacena la imagen procesada en Cloudinary y Gemini Flash genera un etiquetado técnico (corte, material, ocasión y estilo).
3. **Generación de Outfits:** El motor cruza las prendas disponibles con la morfología corporal, la estación cromática y el clima actual, generando sugerencias ultra concisas con puntuación de balance.
4. **Boutique Personal Shopper:** El sistema analiza las piezas faltantes en el armario y recomienda compras específicas en tiendas comerciales para maximizar las combinaciones posibles.

---

## Licencia

Este proyecto está distribuido bajo los términos de la licencia MIT.
