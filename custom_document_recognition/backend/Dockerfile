# Backend Dockerfile
FROM node:18-alpine

# Установка системных зависимостей для Tesseract, Canvas и других нативных модулей
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    tesseract-ocr \
    tesseract-ocr-data-rus \
    tesseract-ocr-data-eng \
    poppler-utils \
    && rm -rf /var/cache/apk/*

# Создание рабочей директории
WORKDIR /app

# Копирование package файлов
COPY package*.json ./

# Установка зависимостей
RUN npm ci --only=production

# Копирование исходного кода
COPY . .

# Копирование traineddata файлов для Tesseract
COPY eng.traineddata rus.traineddata ./

# Создание необходимых директорий
RUN mkdir -p uploads logs templates

# Сборка TypeScript
RUN npm run build

# Открытие порта
EXPOSE 4000

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=4000

# Запуск приложения
CMD ["npm", "start"]

