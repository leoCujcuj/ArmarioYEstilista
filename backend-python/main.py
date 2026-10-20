from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from rembg import remove, new_session
import cv2
import numpy as np
import io
import base64
from PIL import Image

app = FastAPI(title="Asesor de Imagen IA - Microservicio de Visión")

# Modelos de segmentación especializados:
# - u2net_cloth_seg: enfocado en prendas de vestir corporales (Top, Bottom, Outerwear)
# - u2net: modelo general robusto para calzado (Shoes), accesorios y siluetas complejas
session_ropa = new_session("u2net_cloth_seg")
session_general = new_session("u2net")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Base64ImageRequest(BaseModel):
    image_base64: str


def es_recorte_valido(rgba_bytes: bytes, min_visible_ratio: float = 0.03) -> bool:
    """Verifica si la imagen recortada contiene al menos un porcentaje mínimo de píxeles visibles."""
    try:
        img_pil = Image.open(io.BytesIO(rgba_bytes))
        arr = np.array(img_pil)
        if arr.ndim < 3 or arr.shape[2] < 4:
            return True  # Imagen sólida sin canal alfa, siempre es válida
        visible_count = int(np.count_nonzero(arr[:, :, 3] > 25))
        total_pixels = int(arr.shape[0] * arr.shape[1])
        ratio = visible_count / max(total_pixels, 1)
        return ratio >= min_visible_ratio
    except Exception:
        return False


def extraer_color_dominante(rgba_bytes: bytes) -> dict:
    """Extrae el color dominante, código HEX y temperatura térmica de los píxeles visibles de la prenda."""
    try:
        img_pil = Image.open(io.BytesIO(rgba_bytes)).convert("RGBA")
        arr = np.array(img_pil)
        
        # 1. Intentar filtrar píxeles con opacidad significativa (foreground)
        mask = arr[:, :, 3] > 50
        if not np.any(mask):
            # Si no hay canal alfa o todos son transparentes, muestrear el tercio central de la imagen
            h, w = arr.shape[:2]
            h_start, h_end = int(h * 0.25), int(h * 0.75)
            w_start, w_end = int(w * 0.25), int(w * 0.75)
            fg_pixels = arr[h_start:h_end, w_start:w_end, :3].reshape(-1, 3)
        else:
            fg_pixels = arr[mask][:, :3]  # RGB

        if len(fg_pixels) == 0:
            return {"color_hex": "#222222", "subtono": "Neutro", "luminosidad": "Media", "rgb": [34, 34, 34]}

        median_rgb = np.median(fg_pixels, axis=0).astype(int)
        r, g, b = int(median_rgb[0]), int(median_rgb[1]), int(median_rgb[2])
        color_hex = f"#{r:02x}{g:02x}{b:02x}"

        max_c = max(r, g, b)
        min_c = min(r, g, b)
        diff = max_c - min_c
        luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

        if diff < 22:
            subtono = "Neutro"
        elif r > b + 15:
            subtono = "Cálido"
        elif b > r + 15:
            subtono = "Frío"
        else:
            subtono = "Neutro"

        luminosidad = "Oscuro" if luminance < 0.35 else ("Claro" if luminance > 0.72 else "Medio")

        return {
            "color_hex": color_hex,
            "subtono": subtono,
            "luminosidad": luminosidad,
            "rgb": [r, g, b]
        }
    except Exception:
        return {"color_hex": "#222222", "subtono": "Neutro", "luminosidad": "Medio", "rgb": [34, 34, 34]}


def decode_base64_to_cv2(b64_str: str):
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    img_bytes = base64.b64decode(b64_str)
    nparr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def analizar_landmarks_cuerpo(img_bgr) -> dict:
    import mediapipe as mp
    mp_pose = mp.solutions.pose
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    with mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5) as pose_engine:
        results = pose_engine.process(img_rgb)
        if not results.pose_landmarks:
            return {"detectado": False, "error": "No se detectó silueta completa en la imagen"}

        landmarks = results.pose_landmarks.landmark
        shoulder_width = abs(landmarks[11].x - landmarks[12].x)
        hip_width = abs(landmarks[23].x - landmarks[24].x)

        # Punto medio hombros y cadera para proporción vertical
        shoulder_y = (landmarks[11].y + landmarks[12].y) / 2.0
        hip_y = (landmarks[23].y + landmarks[24].y) / 2.0
        ankle_y = (landmarks[27].y + landmarks[28].y) / 2.0
        torso_len = abs(hip_y - shoulder_y)
        leg_len = abs(ankle_y - hip_y)

        ratio_hc = round(shoulder_width / max(hip_width, 0.001), 2)

        morfologia = "Reloj de Arena"
        recomendacion_corte = "Prendas que acompañen la silueta natural y marquen sutilmente la cintura."
        if ratio_hc >= 1.12:
            morfologia = "Triángulo Invertido"
            recomendacion_corte = "Añadir volumen o estructura en la parte inferior (pantalones rectos, wide-leg, pinzas) y líneas limpias en hombros."
        elif ratio_hc <= 0.90:
            morfologia = "Triángulo"
            recomendacion_corte = "Estructurar la parte superior con blazers, sobrecamisas o cuellos llamativos y cortes rectos/oscuros abajo."
        elif abs(shoulder_width - hip_width) < 0.04:
            morfologia = "Rectángulo"
            recomendacion_corte = "Crear dimensión mediante capas (layering), cinturones y contrastes de textura entre top y bottom."

        proporcion_vertical = "Equilibrada"
        if leg_len > 0.1 and torso_len > 0.1:
            ratio_tl = torso_len / leg_len
            if ratio_tl > 0.85:
                proporcion_vertical = "Torso largo (favorecen tiros medios/altos)"
            elif ratio_tl < 0.62:
                proporcion_vertical = "Piernas largas (favorecen tiros medios y capas largas)"

        return {
            "detectado": True,
            "morfologia_ia": morfologia,
            "ratio_hombros_cadera": ratio_hc,
            "proporcion_vertical": proporcion_vertical,
            "recomendacion_corte": recomendacion_corte,
            "proporciones": {
                "hombros": round(shoulder_width, 4),
                "cadera": round(hip_width, 4),
                "torso": round(torso_len, 4)
            }
        }


@app.get("/")
def read_root():
    return {"message": "Backend Python FastAPI - Armario IA Funcionando"}


@app.post("/prenda")
async def procesar_prenda(file: UploadFile = File(...), categoria: str = Form("Other")):
    try:
        input_data = await file.read()
        cat_lower = (categoria or "").lower().strip()

        # Calzado y accesorios no deben usar cloth_seg porque cloth_seg espera silueta de torso/piernas
        es_calzado_o_accesorio = cat_lower in ["shoes", "calzado", "zapatos", "accessories", "accesorios", "bolsos", "joyas"]
        primera_sesion = session_general if es_calzado_o_accesorio else session_ropa

        output_image = None
        # 1. Primer intento de remoción con la sesión prioritaria
        try:
            output_image = remove(input_data, session=primera_sesion)
        except Exception as e1:
            print(f"Aviso en primer intento de rembg: {e1}")

        # 2. Si el recorte quedó vacío, transparente o falló, intentar con el modelo general u2net
        if not output_image or not es_recorte_valido(output_image):
            print("Primer recorte inválido o transparente. Reintentando con session_general (u2net)...")
            try:
                output_image = remove(input_data, session=session_general)
            except Exception as e2:
                print(f"Aviso en segundo intento con u2net: {e2}")

        # 3. Respaldo infalible: Si aún así no es válido, conservar la imagen original (convertida a PNG limpio)
        if not output_image or not es_recorte_valido(output_image):
            print("Aviso: No se pudo aislar la silueta sin perder la prenda. Conservando imagen original.")
            try:
                img_orig = Image.open(io.BytesIO(input_data))
                buf = io.BytesIO()
                img_orig.save(buf, format="PNG")
                output_image = buf.getvalue()
            except Exception:
                output_image = input_data

        # 4. Extraer colorimetría real de los píxeles de la prenda
        color_info = extraer_color_dominante(output_image)

        # Convertir a base64 para enviarlo junto con otros datos
        encoded_img = base64.b64encode(output_image).decode('utf-8')
        img_url = f"data:image/png;base64,{encoded_img}"

        descripciones_provisionales = {
            "Top": "Prenda superior versátil para combinaciones casuales o formales.",
            "Bottom": "Prenda inferior de corte versátil diseñada para ofrecer estructura y estilo.",
            "Outerwear": "Prenda exterior ideal para superposición de capas (layering).",
            "Shoes": "Calzado que define el nivel de formalidad del conjunto.",
            "Accessories": "Complemento clave para elevar la armonía visual del look.",
            "Other": "Pieza de tu colección personal."
        }

        descripcion = descripciones_provisionales.get(categoria, descripciones_provisionales["Other"])

        return {
            "image_base64": img_url,
            "descripcion": descripcion,
            "analisis": {
                "color_hex": color_info["color_hex"],
                "subtono": color_info["subtono"],
                "luminosidad": color_info["luminosidad"],
                "estilo_ia": "Detectado con IA de visión adaptativa"
            }
        }
    except Exception as e:
        print(f"Error en /prenda: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error procesando prenda: {str(e)}")


@app.post("/persona")
async def analizar_persona(file: Optional[UploadFile] = File(None)):
    try:
        if file is None:
            raise HTTPException(status_code=400, detail="Archivo requerido")
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return analizar_landmarks_cuerpo(img)
    except Exception as e:
        print(f"Error en /persona: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analizando biometría: {str(e)}")


@app.post("/persona/base64")
async def analizar_persona_base64(payload: Base64ImageRequest):
    try:
        img = decode_base64_to_cv2(payload.image_base64)
        if img is None:
            return {"detectado": False, "error": "Imagen inválida"}
        return analizar_landmarks_cuerpo(img)
    except Exception as e:
        print(f"Error en /persona/base64: {str(e)}")
        return {"detectado": False, "error": str(e)}

