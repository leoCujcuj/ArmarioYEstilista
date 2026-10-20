## IDIOMA DE RESPUESTAS
** Espapñol

```python
content = """# Gemini AI Integration: Armario IA & Estilista Personal

Este archivo detalla la integración de inteligencia artificial para el proyecto **"Asesor de Imagen Digital y Probador Virtual"**, enfocándose en el uso de modelos generativos (Gemini/GPT) y visión por computadora para personalizar la experiencia del usuario.

## 1. Visión General de la IA
El proyecto utiliza una arquitectura híbrida de IA para resolver tres problemas principales:
1. **Análisis Biométrico:** Identificación de colorimetría y morfología corporal mediante visión artificial (MediaPipe/OpenPose) o entrada manual de datos.
2. **Visión de Producto:** Etiquetado automático y eliminación de fondos de prendas para un armario virtual visualmente limpio y profesional.
3. **Motor de Estilismo:** Recomendaciones personalizadas de outfits y compras basadas en datos técnicos del usuario, clima local e inventario actual.

---

## 2. Definición de Agentes y Prompts

### A. Agente de Perfilamiento (Color y Cuerpo)
Este agente analiza los datos extraídos por los microservicios de Python (MediaPipe/OpenCV).

**Input:** JSON con valores de subtono de piel, color de ojos, ratio hombros-cadera.
**Instrucción:**
> "Actúa como un experto en teoría del color (sistema de las 12 estaciones) y morfología corporal. Basado en los datos técnicos adjuntos, clasifica al usuario en una estación (ej. Invierno Brillante) y tipo de cuerpo (ej. Triángulo Invertido). Explica brevemente qué colores y cortes le favorecen."

### B. Agente de Estilismo (Core)
El motor principal que genera las combinaciones. Se recomienda usar **OpenRouter** para flexibilidad entre modelos o **Gemini API**.

**System Prompt (Ejemplo):**
```text
Eres un estilista de moda profesional y personal shopper de IA. 
Tu objetivo es crear outfits armónicos utilizando el inventario del usuario y considerando su biometría.

Reglas de Estilo:
1. Balance Visual: Si el usuario es tipo 'Triángulo', busca añadir volumen en la parte superior.
2. Armonía de Color: Utiliza la paleta asignada (ej. Fría) para resaltar sus facciones.
3. Contexto: Ajusta la recomendación al clima local y la ocasión solicitada.

```

---

## 3. Flujo de Datos (IA Pipeline)

### Paso 1: Procesamiento de Imagen (Python FastAPI)

1. **Rembg:** Elimina el fondo de la prenda para normalizar la base de datos visual.
2. **Etiquetado:** Se envía la imagen limpia a la IA de visión para identificar:
* Categoría (Top, Bottom, Outerwear, Shoes).
* Material (Lino, Algodón, Denim).
* Estilo (Formal, Sport, Casual).



### Paso 2: Generación de Recomendación (Node.js + IA)

1. El backend recupera el inventario desde **MongoDB** y el perfil biométrico desde **PostgreSQL**.
2. Se envía un prompt consolidado incluyendo:
* Clima actual (vía API externa).
* Perfil del usuario (Morfología + Colorimetría).
* Lista de prendas disponibles en formato JSON.


3. **Output:** Un JSON con el ID de las prendas seleccionadas y una breve justificación de la combinación.

---

## 4. Mejora Continua (Feedback Loop)

Para mejorar las recomendaciones, implementamos un sistema de aprendizaje:

* **Evento 'Me Gusta':** Guarda el outfit en la tabla de favoritos (PostgreSQL) y refuerza esos estilos en el perfil.
* **Evento 'No Me Gusta':** Si el usuario rechaza sugerencias, la IA pregunta: *"¿Qué prefieres cambiar?"* (Corte, color o estilo) para ajustar el prompt dinámicamente y filtrar mejor en el futuro.

---

## 5. Resumen de Tecnologías IA

| Herramienta | Función |
| --- | --- |
| **MediaPipe / OpenPose** | Detección de puntos clave corporales y proporciones. |
| **Rembg (Python Library)** | Remoción de fondos en fotos de ropa. |
| **Gemini 1.5 / GPT-4o** | Análisis de colorimetría y etiquetado de prendas. |
| **OpenRouter / Gemini API** | Motor de razonamiento para combinaciones de outfits. |
| **AWS S3 (Cifrado AES-256) o claudinary** | Almacenamiento seguro de biometría (Fotos cara/cuerpo). |
| """ |  |


* **Módulo de Persona:** Detalla cómo la IA procesa la "Colorimetría" (cara) y "Morfología" (cuerpo) para dar recomendaciones que realmente favorezcan al usuario.
* **Entrada Manual:** He incluido que, en caso de que el usuario no desee subir fotos de cuerpo completo, el sistema acepte los datos manuales para alimentar el motor de estilismo.
* **Pipeline de Visión:** Explica el proceso desde que se sube la prenda, se limpia el fondo con `rembg` y se etiqueta con Gemini/GPT.
* **Feedback Loop:** Define cómo la app aprende de los "Me gusta" y "No me gusta" para refinar el estilo personal del usuario.


## Diseño
Nuca uses emojis, usa iconos o images para que sea mas profesional
```