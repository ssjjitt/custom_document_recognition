# Инструкция по развертыванию

## Docker развертывание

### Быстрый старт

1. **Клонируйте репозиторий** (если еще не сделано)

2. **Создайте файл `.env`** в корне проекта:
```bash
cp .env.example .env
```

3. **Отредактируйте `.env`** и укажите нужные значения:
```env
MONGODB_URI=mongodb://localhost:27017/doc-recognition  # опционально
OLLAMA_URL=http://ollama:11434
VITE_API_BASE=http://localhost:4000
```

4. **Запустите приложение**:
```bash
docker-compose up -d
```

5. **Установите модель Mistral в Ollama**:
```bash
docker exec -it doc-recognition-ollama ollama pull mistral
```

6. **Откройте в браузере**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000

### Остановка
```bash
docker-compose down
```

### Просмотр логов
```bash
docker-compose logs -f
```

Подробнее см. [DOCKER.md](./DOCKER.md)

---

## Vercel развертывание (Frontend)

### Через Vercel CLI

1. **Установите Vercel CLI**:
```bash
npm i -g vercel
```

2. **Перейдите в директорию frontend**:
```bash
cd frontend
```

3. **Войдите в Vercel**:
```bash
vercel login
```

4. **Разверните приложение**:
```bash
vercel
```

5. **Установите переменную окружения**:
```bash
vercel env add VITE_API_BASE
# Введите URL вашего backend (например: https://your-backend.com или http://your-vps-ip:4000)
```

6. **Для production**:
```bash
vercel --prod
```

### Через GitHub интеграцию

1. Подключите репозиторий к Vercel через веб-интерфейс
2. Настройки проекта:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Framework Preset**: Vite
3. Добавьте переменную окружения `VITE_API_BASE` в настройках проекта

### Важно для Backend

Backend использует тяжелые зависимости (Tesseract, Canvas, Ollama), которые сложно развернуть на Vercel Serverless Functions.

**Рекомендация**: Разверните backend отдельно:
- На VPS с Docker (см. инструкцию выше)
- На Railway/Render/Fly.io
- На отдельном сервере

После развертывания backend, укажите его URL в переменной `VITE_API_BASE` для frontend на Vercel.

Подробнее см. [VERCEL.md](./VERCEL.md)

---

## Комбинированное развертывание (Рекомендуется)

1. **Backend на VPS/Docker**:
   - Разверните backend используя Docker на VPS
   - Настройте домен для backend (например: `api.yourdomain.com`)
   - Настройте SSL сертификат (Let's Encrypt)

2. **Frontend на Vercel**:
   - Разверните frontend на Vercel
   - Укажите URL backend в `VITE_API_BASE`
   - Vercel автоматически предоставит домен и SSL

3. **Настройте CORS на backend**:
   В `backend/src/index.ts` добавьте домен Vercel:
   ```typescript
   app.use(cors({
     origin: [
       'https://your-app.vercel.app',
       'http://localhost:3000'
     ]
   }));
   ```

---

## Переменные окружения

### Backend
- `PORT` - порт сервера (по умолчанию: 4000)
- `MONGODB_URI` - строка подключения к MongoDB (опционально)
- `OLLAMA_URL` - URL для Ollama (по умолчанию: http://localhost:11434)

### Frontend
- `VITE_API_BASE` - базовый URL API backend

---

## Troubleshooting

### Docker
- Проверьте логи: `docker-compose logs -f`
- Убедитесь что все контейнеры запущены: `docker-compose ps`
- Проверьте что модель Mistral установлена в Ollama

### Vercel
- Проверьте что переменная `VITE_API_BASE` установлена
- Проверьте логи сборки в Vercel Dashboard
- Убедитесь что backend доступен и CORS настроен правильно

### CORS ошибки
- Убедитесь что backend разрешает запросы с домена Vercel
- Проверьте что `VITE_API_BASE` указывает на правильный URL

