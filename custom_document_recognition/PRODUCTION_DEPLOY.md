# 🚀 Деплой в продакшн - Пошаговая инструкция

## Архитектура деплоя

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Vercel    │ ──────> │   Railway/   │ ──────> │  MongoDB    │
│  (Frontend) │         │   Render/    │         │    Atlas    │
│             │         │   Fly.io     │         │             │
│             │         │  (Backend)   │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
                                │
                                │
                         ┌──────▼──────┐
                         │   Groq API  │
                         │  (вместо    │
                         │   Ollama)   │
                         └─────────────┘
```

## Часть 1: Frontend на Vercel ✅

### Шаг 1: Подготовка

```powershell
cd custom_document_recognition/frontend
```

### Шаг 2: Вход в Vercel

```powershell
vercel login
```

### Шаг 3: Деплой

```powershell
vercel --prod
```

При первом деплое ответьте на вопросы:
- **Link to existing project?** → `N` (новый проект)
- **What's your project's name?** → `doc-recognition-frontend` (или свое имя)
- **In which directory is your code located?** → `./`
- **Want to override the settings?** → `N` (используем автоматические)

### Шаг 4: Настройка переменных окружения

После деплоя зайдите на https://vercel.com → ваш проект → Settings → Environment Variables

Добавьте:
- `VITE_API_BASE` = `https://your-backend-url.railway.app` (URL вашего backend)

### Шаг 5: Пересборка

После добавления переменных:
```powershell
vercel --prod
```

Или через веб-интерфейс: Deployments → три точки → Redeploy

---

## Часть 2: Backend на Railway (рекомендуется) 🚂

Railway поддерживает Docker и системные зависимости.

### Шаг 1: Регистрация

1. Зайдите на https://railway.app
2. Войдите через GitHub
3. Нажмите "New Project"

### Шаг 2: Подключение репозитория

1. Выберите "Deploy from GitHub repo"
2. Выберите ваш репозиторий
3. Railway автоматически определит Docker

### Шаг 3: Настройка деплоя

Railway автоматически найдет `railway.json` или `Dockerfile` в корне проекта.

**Важно:** В настройках Railway:
1. Settings → Root Directory → оставьте пустым (корень репозитория)
2. Settings → Build Command → оставьте пустым (используется Dockerfile)
3. Settings → Start Command → оставьте пустым (используется CMD из Dockerfile)

### Шаг 4: Переменные окружения

В Railway → Variables добавьте:

```env
NODE_ENV=production
PORT=4000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/doc-recognition
MONGO_DB=doc-recognition
USE_GROQ=true
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=mixtral-8x7b-32768
```

### Шаг 5: Деплой

Railway автоматически задеплоит при пуше в GitHub, или нажмите "Deploy"

### Шаг 6: Получение URL

После деплоя Railway даст вам URL типа: `https://your-app.railway.app`

**Важно:** Обновите `VITE_API_BASE` в Vercel на этот URL!

---

## Альтернатива: Backend на Render 🎨

### Шаг 1: Регистрация

1. Зайдите на https://render.com
2. Войдите через GitHub

### Шаг 2: Создание Web Service

1. "New" → "Web Service"
2. Подключите репозиторий
3. Настройки:
   - **Name:** `doc-recognition-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Docker`
   - **Dockerfile Path:** `backend/Dockerfile`
   - **Start Command:** `node dist/index.js`

### Шаг 3: Переменные окружения

В разделе Environment добавьте те же переменные, что и для Railway

### Шаг 4: Деплой

Render автоматически задеплоит

---

## Альтернатива: Backend на Fly.io 🪰

### Шаг 1: Установка CLI

```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### Шаг 2: Логин

```powershell
fly auth login
```

### Шаг 3: Инициализация

```powershell
cd custom_document_recognition/backend
fly launch
```

### Шаг 4: Настройка переменных

```powershell
fly secrets set MONGO_URI="mongodb+srv://..."
fly secrets set GROQ_API_KEY="your_key"
fly secrets set USE_GROQ="true"
```

### Шаг 5: Деплой

```powershell
fly deploy
```

---

## Часть 3: MongoDB Atlas (облачная БД) 🍃

### Шаг 1: Регистрация

1. Зайдите на https://www.mongodb.com/cloud/atlas
2. Создайте бесплатный аккаунт (M0 cluster)

### Шаг 2: Создание кластера

1. "Create" → "Build a Database"
2. Выберите **FREE** (M0)
3. Выберите регион (ближайший к вашему backend)
4. Создайте кластер (займет 3-5 минут)

### Шаг 3: Настройка доступа

1. **Database Access:**
   - Создайте пользователя
   - Запомните username и password

2. **Network Access:**
   - "Add IP Address"
   - "Allow Access from Anywhere" (0.0.0.0/0) для начала
   - Или добавьте IP вашего Railway/Render сервера

### Шаг 4: Получение connection string

1. "Connect" → "Connect your application"
2. Скопируйте connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   ```
3. Добавьте имя базы данных:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/doc-recognition?retryWrites=true&w=majority
   ```

### Шаг 5: Использование в backend

Добавьте этот connection string в переменные окружения вашего backend как `MONGO_URI`

---

## Часть 4: Groq API (вместо Ollama) 🤖

Ollama не работает в облаке, используем Groq API.

### Шаг 1: Регистрация

1. Зайдите на https://console.groq.com
2. Зарегистрируйтесь (бесплатно)
3. Получите API Key

### Шаг 2: Получение API Key

1. "API Keys" → "Create API Key"
2. Скопируйте ключ (показывается только один раз!)

### Шаг 3: Настройка в backend

Добавьте в переменные окружения backend:

```env
USE_GROQ=true
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=mixtral-8x7b-32768
```

**Доступные модели Groq:**
- `mixtral-8x7b-32768` (рекомендуется)
- `llama2-70b-4096`
- `llama3-8b-8192`

### Шаг 4: Проверка

Backend автоматически будет использовать Groq вместо Ollama при наличии `GROQ_API_KEY`

---

## Итоговая конфигурация

### Frontend (Vercel)
- URL: `https://your-app.vercel.app`
- Переменные:
  - `VITE_API_BASE=https://your-backend.railway.app`

### Backend (Railway/Render/Fly.io)
- URL: `https://your-backend.railway.app`
- Переменные:
  ```env
  NODE_ENV=production
  PORT=4000
  MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/doc-recognition
  MONGO_DB=doc-recognition
  USE_GROQ=true
  GROQ_API_KEY=gsk_...
  GROQ_MODEL=mixtral-8x7b-32768
  ```

### MongoDB Atlas
- Connection string в `MONGO_URI`
- База данных: `doc-recognition`

### Groq API
- API Key в `GROQ_API_KEY`
- Модель в `GROQ_MODEL`

---

## Проверка работы

1. **Frontend:** https://your-app.vercel.app
2. **Backend API:** https://your-backend.railway.app/api/ping
3. **Проверка Groq:** Загрузите документ и проверьте логи backend

---

## Стоимость (примерно)

- **Vercel:** Бесплатно (до 100GB трафика)
- **Railway:** $5/месяц (или $0.20 за 100 часов на бесплатном плане)
- **Render:** Бесплатно (с ограничениями) или $7/месяц
- **Fly.io:** Бесплатно (до 3 shared-cpu-1x VMs)
- **MongoDB Atlas:** Бесплатно (M0 кластер, 512MB)
- **Groq API:** Бесплатно (до 30 requests/minute)

**Итого:** Можно запустить полностью бесплатно! 🎉

---

## Troubleshooting

### Backend не запускается
- Проверьте логи в Railway/Render
- Убедитесь что все переменные окружения установлены
- Проверьте что Dockerfile правильно настроен

### Frontend не может подключиться к Backend
- Проверьте CORS настройки в backend
- Убедитесь что `VITE_API_BASE` правильный
- Проверьте что backend доступен из интернета

### MongoDB не подключается
- Проверьте Network Access в MongoDB Atlas
- Убедитесь что IP адрес разрешен
- Проверьте connection string (username/password)

### Groq не работает
- Проверьте что `GROQ_API_KEY` правильный
- Убедитесь что `USE_GROQ=true`
- Проверьте лимиты API (30 req/min на бесплатном плане)

