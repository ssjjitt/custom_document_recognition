# Команды для выгрузки backend в Git репозиторий

## Шаг 1: Переход в директорию backend

```bash
cd custom_document_recognition/backend
```

## Шаг 2: Инициализация Git репозитория

```bash
git init
```

## Шаг 3: Добавление всех файлов

```bash
git add .
```

## Шаг 4: Первый коммит

```bash
git commit -m "Initial commit: Document Recognition Backend"
```

## Шаг 5: Создание репозитория на GitHub

1. Зайдите на [GitHub](https://github.com)
2. Нажмите "New repository"
3. Укажите название репозитория (например, `document-recognition-backend`)
4. НЕ добавляйте README, .gitignore или лицензию (они уже есть)
5. Нажмите "Create repository"

## Шаг 6: Добавление remote и push

Замените `your-username` и `your-repo-name` на ваши данные:

```bash
git remote add origin https://github.com/your-username/your-repo-name.git
git branch -M main
git push -u origin main
```

## Если репозиторий уже существует

Если вы хотите добавить в существующий репозиторий:

```bash
git remote add origin https://github.com/your-username/your-repo-name.git
git branch -M main
git push -u origin main --force
```

⚠️ **Внимание**: `--force` перезапишет существующую историю в репозитории. Используйте только если уверены.

## Проверка

После выполнения команд проверьте на GitHub, что все файлы загружены:
- ✅ `src/` - исходный код
- ✅ `Dockerfile` - для сборки Docker образа
- ✅ `package.json` - зависимости
- ✅ `railway.json` и `railway.toml` - конфигурация Railway
- ✅ `.gitignore` - исключения для Git
- ✅ `README.md` - документация
- ✅ `eng.traineddata` и `rus.traineddata` - файлы для Tesseract
- ✅ `tsconfig.json` и `tsconfig.build.json` - конфигурация TypeScript

## Дальнейшие изменения

После внесения изменений в код:

```bash
git add .
git commit -m "Описание изменений"
git push
```

