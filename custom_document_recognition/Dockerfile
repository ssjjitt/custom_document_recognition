# Root Dockerfile for Railway deployment
# Railway будет использовать этот файл если не найдет railway.json
FROM node:18-alpine

# Установка системных зависимостей для canvas, sharp и tesseract
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    libpng-dev \
    librsvg-dev \
    poppler-utils

# Создание рабочей директории
WORKDIR /app

# Копирование package файлов backend
COPY backend/package*.json ./

# Установка всех зависимостей (включая dev для сборки)
RUN npm ci

# Копирование исходного кода backend
COPY backend/ ./

# Копирование traineddata файлов для Tesseract
COPY backend/eng.traineddata backend/rus.traineddata ./

# Сборка TypeScript
RUN echo "Starting TypeScript build..." && \
    npm run build 2>&1 | tee /tmp/build.log && \
    echo "Build completed. Checking output..." && \
    ls -la dist/ 2>&1 || echo "dist directory not found" && \
    test -f dist/index.js && echo "✓ dist/index.js found" || (echo "✗ ERROR: dist/index.js not found after build. Build log:" && cat /tmp/build.log && exit 1)

# Удаление dev зависимостей после сборки (но оставляем скомпилированные файлы)
RUN npm prune --production

# Проверка что dist все еще существует после prune
RUN test -f dist/index.js || (echo "ERROR: dist/index.js missing after prune" && exit 1)

# Создание необходимых директорий
RUN mkdir -p uploads logs templates

# Открытие порта
EXPOSE 4000

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=4000

# Запуск приложения напрямую через node (более надежно для ESM)
CMD ["node", "dist/index.js"]

