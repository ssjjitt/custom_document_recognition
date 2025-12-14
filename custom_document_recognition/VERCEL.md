# Vercel Deployment Guide

## Развертывание Frontend на Vercel

### Вариант 1: Через Vercel CLI

1. Установите Vercel CLI:
```bash
npm i -g vercel
```

2. Перейдите в директорию frontend:
```bash
cd frontend
```

3. Войдите в Vercel:
```bash
vercel login
```

4. Разверните приложение:
```bash
vercel
```

5. Установите переменные окружения:
```bash
vercel env add VITE_API_BASE
# Введите URL вашего backend API (например: https://your-backend.vercel.app или http://your-vps-ip:4000)
```

6. Для production:
```bash
vercel --prod
```

### Вариант 2: Через GitHub/GitLab интеграцию

1. Подключите ваш репозиторий к Vercel через веб-интерфейс
2. Укажите следующие настройки:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
   - **Framework Preset**: Vite

3. Добавьте переменные окружения в настройках проекта:
   - `VITE_API_BASE` - URL вашего backend API

### Настройка переменных окружения

В Vercel Dashboard → Settings → Environment Variables добавьте:

- **VITE_API_BASE**: URL вашего backend (например: `https://api.yourdomain.com` или `http://your-vps-ip:4000`)

**Важно**: Для переменных, начинающихся с `VITE_`, они должны быть доступны во время сборки.

## Backend на Vercel

### Вариант 1: Serverless Functions (ограниченно)

Backend использует тяжелые зависимости (Tesseract, Canvas, Ollama), которые сложно развернуть на Vercel Serverless Functions из-за ограничений размера и времени выполнения.

**Рекомендация**: Разверните backend отдельно:
- На VPS с Docker
- На Railway/Render/Fly.io
- На отдельном сервере

### Вариант 2: Backend на VPS/Docker

1. Разверните backend на VPS используя Docker (см. DOCKER.md)
2. Настройте домен для backend
3. Укажите этот URL в `VITE_API_BASE` для frontend на Vercel

## CORS настройки

Убедитесь что ваш backend разрешает запросы с домена Vercel:

В `backend/src/index.ts`:
```typescript
app.use(cors({
  origin: [
    'https://your-app.vercel.app',
    'http://localhost:3000' // для разработки
  ],
  credentials: true
}));
```

Или для всех доменов (не рекомендуется для production):
```typescript
app.use(cors({
  origin: '*'
}));
```

## Структура проекта для Vercel

Если весь проект в одном репозитории:

1. Создайте `vercel.json` в корне (уже создан)
2. Или используйте настройки в `frontend/vercel.json`
3. Укажите Root Directory как `frontend` в настройках Vercel

## Проверка развертывания

После развертывания проверьте:

1. Frontend доступен по URL Vercel
2. API запросы идут на правильный backend URL
3. CORS настроен корректно
4. Переменные окружения установлены

## Обновление

После изменений в коде:

```bash
cd frontend
vercel --prod
```

Или используйте автоматический деплой через Git интеграцию.

