# Docker Deployment Guide

## Быстрый старт

### Запуск с помощью Docker Compose

```bash
# Клонируйте репозиторий и перейдите в директорию проекта
cd custom_document_recognition

# Создайте файл .env с необходимыми переменными окружения
cp .env.example .env
# Отредактируйте .env файл при необходимости

# Запустите контейнеры
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка контейнеров
docker-compose down
```

После запуска:
- Frontend будет доступен на `http://localhost:3000`
- Backend будет доступен на `http://localhost:4000`
- MongoDB будет доступен на `localhost:27017`
- Ollama будет доступен на `http://localhost:11434`

**Важно:** После первого запуска Ollama нужно загрузить модель mistral:
```bash
docker exec doc-recognition-ollama ollama pull mistral
```

## Переменные окружения

Создайте файл `.env` в корне проекта (опционально, значения по умолчанию уже настроены):

```env
# Backend
NODE_ENV=production
PORT=4000
MONGO_URI=mongodb://mongodb:27017
MONGO_DB=doc-recognition
OLLAMA_URL=http://ollama:11434/api/generate
OLLAMA_MODEL=mistral

# Frontend
VITE_API_BASE=http://localhost:4000
```

**Важно:** 
- MongoDB и Ollama запускаются автоматически в Docker контейнерах
- После первого запуска загрузите модель mistral: `docker exec doc-recognition-ollama ollama pull mistral`
- Если вы используете внешние MongoDB или Ollama, измените соответствующие переменные окружения

## Отдельная сборка контейнеров

### Backend

```bash
cd backend
docker build -t doc-recognition-backend .
docker run -p 4000:4000 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/templates:/app/templates \
  -e OLLAMA_URL=http://host.docker.internal:11434/api/generate \
  doc-recognition-backend
```

### Frontend

```bash
cd frontend
docker build --build-arg VITE_API_BASE=http://your-backend-url:4000 -t doc-recognition-frontend .
docker run -p 3000:80 doc-recognition-frontend
```

## Volumes

Docker Compose автоматически монтирует следующие директории:
- `./backend/uploads` - загруженные файлы
- `./backend/logs` - логи приложения
- `./backend/templates` - шаблоны полей

Это позволяет сохранять данные между перезапусками контейнеров.

## Production рекомендации

1. **Используйте внешнюю базу данных MongoDB** вместо локальной
2. **Настройте обратный прокси** (nginx/traefik) для HTTPS
3. **Используйте secrets** для хранения чувствительных данных
4. **Настройте мониторинг** и логирование
5. **Используйте Docker Swarm или Kubernetes** для масштабирования

## Troubleshooting

### Загрузка модели Ollama

После первого запуска контейнеров загрузите модель mistral:
```bash
docker exec doc-recognition-ollama ollama pull mistral
```

Проверьте, что модель загружена:
```bash
docker exec doc-recognition-ollama ollama list
```

### Проблемы с Ollama

Если Ollama запущен на хосте, убедитесь что используете `host.docker.internal` для доступа из контейнера. На Linux может потребоваться добавить `--add-host=host.docker.internal:host-gateway` при запуске контейнера.

Если Ollama не отвечает, проверьте логи:
```bash
docker logs doc-recognition-ollama
```

### Проблемы с MongoDB

Проверьте статус MongoDB:
```bash
docker logs doc-recognition-mongodb
```

Подключитесь к MongoDB для проверки:
```bash
docker exec -it doc-recognition-mongodb mongosh
```

### Проблемы с правами доступа

Если возникают проблемы с записью файлов, убедитесь что директории `uploads`, `logs` и `templates` имеют правильные права доступа:

```bash
chmod -R 755 backend/uploads backend/logs backend/templates
```

### Проблемы с памятью

Tesseract.js и обработка изображений могут потреблять много памяти. Убедитесь что у Docker достаточно выделенной памяти (минимум 2GB рекомендуется).

