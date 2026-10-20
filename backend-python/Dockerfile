FROM python:3.11-slim-bookworm

WORKDIR /app

# Instalar dependencias del sistema necesarias para OpenCV y mediapipe
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libusb-1.0-0 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Usar el comando de uvicorn directamente para mejor manejo de errores
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
