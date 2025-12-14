# Docker Deployment Guide

## Быстрый старт

### 1. Подготовка

Убедитесь, что у вас установлены:
- Docker
- Docker Compose

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта на основе `.env.example`:

```bash
cp .env.example .env
```

Отредактируйте `.env` файл и укажите нужные значения:
- `MONGODB_URI` - строка подключения к MongoDB (опционально)
- `OLLAMA_URL` - URL для Ollama (по умолчанию `http://ollama:11434`)
- `VITE_API_BASE` - базовый URL API для frontend (по умолчанию `http://localhost:4000`)

### 3. Запуск приложения

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

### 4. Доступ к приложению

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Ollama**: http://localhost:11434

## Отдельная сборка сервисов

### Backend

```bash
cd backend
docker build -t doc-recognition-backend .
docker run -p 4000:4000 doc-recognition-backend
```

### Frontend

```bash
cd frontend
docker build --build-arg VITE_API_BASE=http://your-backend-url:4000 -t doc-recognition-frontend .
docker run -p 3000:80 doc-recognition-frontend
```

## Управление томами

Данные сохраняются в следующих директориях:
- `./backend/uploads` - загруженные файлы
- `./backend/logs` - логи приложения
- `./backend/templates` - шаблоны полей
- `ollama-data` - данные Ollama (Docker volume)

## Установка модели Mistral в Ollama

После запуска контейнера Ollama:

```bash
# Подключение к контейнеру Ollama
docker exec -it doc-recognition-ollama ollama pull mistral
```

Или из хоста:

```bash
# Если Ollama доступен на localhost:11434
ollama pull mistral
```

## Production настройки

Для production рекомендуется:

1. Использовать внешнюю MongoDB вместо локальной
2. Настроить reverse proxy (nginx/traefik) для SSL
3. Использовать секреты Docker для чувствительных данных
4. Настроить мониторинг и логирование
5. Использовать Docker Swarm или Kubernetes для масштабирования

## Troubleshooting

### Проблемы с Tesseract

Если возникают проблемы с распознаванием, убедитесь что traineddata файлы скопированы:
- `backend/eng.traineddata`
- `backend/rus.traineddata`

### Проблемы с Ollama

Проверьте что Ollama контейнер запущен:
```bash
docker-compose ps
docker-compose logs ollama
```

### Проблемы с подключением между сервисами

В Docker Compose сервисы доступны друг другу по именам:
- Backend → Ollama: `http://ollama:11434`
- Frontend → Backend: используйте `VITE_API_BASE` переменную

