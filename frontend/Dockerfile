FROM node:18-alpine

WORKDIR /app

# Copiamos dependencias
COPY package*.json ./

RUN npm install

# Copiamos código
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
