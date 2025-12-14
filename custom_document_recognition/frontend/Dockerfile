# Frontend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Аргументы сборки для переменных окружения
ARG VITE_API_BASE=http://localhost:4000
ENV VITE_API_BASE=$VITE_API_BASE

# Копирование package файлов
COPY package*.json ./

# Установка зависимостей
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка приложения
RUN npm run build

# Production stage
FROM nginx:alpine

# Копирование собранного приложения
COPY --from=builder /app/dist /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открытие порта
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

