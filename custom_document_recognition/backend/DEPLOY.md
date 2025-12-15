# Инструкция по деплою на Railway

## Шаг 1: Подготовка репозитория

1. Убедитесь, что все файлы готовы:
   - `Dockerfile`
   - `railway.json` и `railway.toml`
   - `.env.example`
   - `package.json`
   - Исходный код в `src/`

2. Инициализируйте git репозиторий (если еще не сделано):
```bash
cd backend
git init
git add .
git commit -m "Initial commit"
```

3. Создайте репозиторий на GitHub и добавьте remote:
```bash
git remote add origin https://github.com/your-username/your-repo-name.git
git branch -M main
git push -u origin main
```

## Шаг 2: Настройка Railway

1. Зайдите на [Railway](https://railway.app) и войдите через GitHub

2. Нажмите "New Project" → "Deploy from GitHub repo"

3. Выберите ваш репозиторий

4. Railway автоматически определит конфигурацию из `railway.json`/`railway.toml`

## Шаг 3: Настройка переменных окружения

В настройках проекта Railway добавьте следующие переменные:

### Обязательные:
- `MONGO_URI` - URI вашей MongoDB базы данных
- `MONGO_DB` - название базы данных (например, `document_recognition`)

### Рекомендуемые:
- `ALLOWED_ORIGINS` - домены вашего фронтенда через запятую (например, `https://your-frontend.vercel.app`)
- `NODE_ENV=production`

### Опциональные (для LLM):
- `USE_GROQ=true` (если используете Groq)
- `GROQ_API_KEY` - ваш API ключ Groq
- `GROQ_MODEL` - модель Groq (по умолчанию `mixtral-8x7b-32768`)

ИЛИ

- `OLLAMA_URL` - URL вашего Ollama сервера
- `OLLAMA_MODEL` - модель Ollama (по умолчанию `mistral`)

## Шаг 4: Настройка MongoDB (если нужно)

Railway предлагает плагин MongoDB:
1. В проекте Railway нажмите "New" → "Database" → "MongoDB"
2. Railway создаст MongoDB инстанс и автоматически добавит переменную `MONGO_URI`
3. Скопируйте значение `MONGO_URI` и добавьте его как переменную окружения

## Шаг 5: Деплой

Railway автоматически задеплоит приложение при каждом push в main ветку.

Вы можете также:
- Запустить деплой вручную через Railway dashboard
- Просмотреть логи сборки и выполнения
- Настроить домен в настройках проекта

## Проверка деплоя

После успешного деплоя:
1. Railway предоставит URL вашего приложения (например, `https://your-app.up.railway.app`)
2. Проверьте работоспособность: `GET https://your-app.up.railway.app/api/ping`
3. Должен вернуться ответ: `{"message": "Server is alive"}`

## Troubleshooting

### Проблемы со сборкой:
- Проверьте логи сборки в Railway dashboard
- Убедитесь, что `Dockerfile` находится в корне репозитория
- Проверьте, что все зависимости указаны в `package.json`

### Проблемы с запуском:
- Проверьте логи выполнения в Railway dashboard
- Убедитесь, что все переменные окружения установлены
- Проверьте подключение к MongoDB

### Проблемы с CORS:
- Убедитесь, что `ALLOWED_ORIGINS` содержит правильные домены
- Формат: `https://domain1.com,https://domain2.com`

