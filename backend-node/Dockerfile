FROM node:18-alpine

WORKDIR /app

# Copiamos solo los archivos de dependencias primero para aprovechar la caché de Docker
COPY package*.json ./

RUN npm install

# Copiamos el resto del código
COPY . .

EXPOSE 3000

# Usamos el modo de desarrollo por defecto
CMD ["npm", "run", "dev"]
