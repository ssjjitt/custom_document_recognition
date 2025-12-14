# Vercel Deployment Guide

## Деплой Frontend на Vercel

### Способ 1: Через Vercel CLI

```bash
# Установите Vercel CLI (если еще не установлен)
npm i -g vercel

# Перейдите в директорию frontend
cd frontend

# Войдите в Vercel
vercel login

# Деплой
vercel

# Для production деплоя
vercel --prod
```

### Способ 2: Через GitHub Integration

1. Загрузите проект в GitHub репозиторий
2. Зайдите на [vercel.com](https://vercel.com)
3. Нажмите "New Project"
4. Импортируйте ваш репозиторий
5. Настройте проект:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### Настройка переменных окружения

В настройках проекта на Vercel добавьте переменные окружения:

- `VITE_API_BASE` - URL вашего backend API (например, `https://your-backend-api.com`)

**Важно:** После добавления переменных окружения нужно пересобрать проект.

## Деплой Backend на Vercel

Vercel поддерживает Serverless Functions, но для вашего случая с Express.js и зависимостями от системных библиотек (canvas, tesseract.js), рекомендуется использовать альтернативные решения:

### Вариант 1: Отдельный хостинг для Backend

Рекомендуется использовать:
- **Railway** - https://railway.app
- **Render** - https://render.com
- **Fly.io** - https://fly.io
- **DigitalOcean App Platform** - https://www.digitalocean.com/products/app-platform
- **AWS/GCP/Azure** с Docker контейнерами

### Вариант 2: Vercel Serverless Functions (ограниченно)

Если вы хотите попробовать адаптировать backend для Vercel, нужно будет:
1. Переписать Express routes в формат Vercel Serverless Functions
2. Использовать альтернативы для canvas и tesseract.js (например, API сервисы)
3. Обработка файлов через временное хранилище (S3, Cloudinary)

## Рекомендуемая архитектура

```
┌─────────────────┐
│   Vercel        │
│   (Frontend)    │
└────────┬────────┘
         │
         │ HTTPS
         │
┌────────▼────────┐
│   Backend API   │
│   (Railway/     │
│    Render/etc)  │
└─────────────────┘
```

## Настройка CORS

Убедитесь что ваш backend разрешает запросы с домена Vercel:

```typescript
// backend/src/index.ts
app.use(cors({
  origin: [
    'https://your-app.vercel.app',
    'http://localhost:3000' // для разработки
  ]
}));
```

## Environment Variables на Vercel

После деплоя frontend на Vercel:

1. Зайдите в настройки проекта
2. Перейдите в раздел "Environment Variables"
3. Добавьте:
   - `VITE_API_BASE` = `https://your-backend-url.com`

## Проверка деплоя

После деплоя проверьте:
1. Frontend доступен по URL Vercel
2. API запросы идут на правильный backend URL
3. CORS настроен корректно
4. Все статические файлы загружаются

## Troubleshooting

### Проблемы с переменными окружения

Переменные окружения в Vercel должны начинаться с `VITE_` для Vite проектов. После изменения переменных окружения нужно пересобрать проект.

### Проблемы с роутингом

Убедитесь что `vercel.json` содержит правильные rewrites для SPA роутинга.

### Проблемы с CORS

Проверьте что backend разрешает запросы с вашего Vercel домена. Добавьте домен в список разрешенных origins в настройках CORS.

