# Деплой фронтенда Mega.Audit в Yandex Object Storage

Доступа к Yandex Cloud в рабочем окружении нет, поэтому ниже — точные команды и настройки для финального деплоя. Бэкенд остаётся на Lovable, деплой Lovable не отключается.

## 1. Бакет и статический хостинг

```bash
yc init
yc storage bucket create --name megaaudit-frontend --default-storage-class standard --max-size 1073741824
yc storage bucket update --name megaaudit-frontend --public-read
```

Включить статический хостинг (консоль: бакет → «Веб-сайт» → «Хостинг») или через API:

- Index document: `index.html`
- Error document: `index.html` (обязательно — иначе внутренние адреса и обновление страницы дадут 404)

Публичный адрес: `https://megaaudit-frontend.website.yandexcloud.net`

## 2. Ключи доступа (сервисный аккаунт)

```bash
yc iam service-account create --name megaaudit-deployer
yc storage bucket add-grant --name megaaudit-frontend \
  --grant-type grant-type-account --grantee-id <SERVICE_ACCOUNT_ID> --permission permission-write
yc iam access-key create --service-account-name megaaudit-deployer
```

Полученные `key_id` и `secret` записать **только** в GitHub Secrets:

| Secret | Значение |
|---|---|
| `YC_ACCESS_KEY_ID` | key_id сервисного аккаунта |
| `YC_SECRET_ACCESS_KEY` | secret сервисного аккаунта |
| `YC_BUCKET` | `megaaudit-frontend` |
| `VITE_API_BASE_URL` | `https://megaaudit.lovable.app` |

В репозиторий и во фронтенд ключи не попадают.

## 3. Сборка

```bash
npm install
YANDEX_BUILD=1 VITE_API_BASE_URL=https://megaaudit.lovable.app npm run build
cp dist/client/_shell.html dist/client/index.html
```

Результат — каталог `dist/client/`.

## 4. Загрузка

```bash
aws configure set aws_access_key_id "$YC_ACCESS_KEY_ID"
aws configure set aws_secret_access_key "$YC_SECRET_ACCESS_KEY"
aws configure set region ru-central1

aws --endpoint-url=https://storage.yandexcloud.net s3 sync dist/client s3://megaaudit-frontend \
  --delete --exclude "*.html" --cache-control "public,max-age=31536000,immutable"

aws --endpoint-url=https://storage.yandexcloud.net s3 sync dist/client s3://megaaudit-frontend \
  --exclude "*" --include "*.html" --cache-control "no-cache"
```

Автоматический деплой при пуше в `main` уже описан в `.github/workflows/deploy-yandex.yml`.

## 5. CORS на стороне существующего бэкенда

После получения адреса Yandex добавить его в переменные окружения проекта Lovable:

```
ALLOWED_ORIGINS=https://megaaudit-frontend.website.yandexcloud.net
```

Несколько адресов — через запятую. Домены `*.lovable.app` разрешены по умолчанию, так что текущая версия не ломается. Wildcard-origin не используется.

## 6. Проверка после деплоя

1. Открыть `https://megaaudit-frontend.website.yandexcloud.net` — загружается главная.
2. Перейти на внутреннюю страницу, обновить её по прямому адресу — страница открывается (проверка error document).
3. Запустить аудит — в Network должен быть успешный запрос `GET https://megaaudit.lovable.app/api/public/detect-site?url=...` без ошибок CORS.
4. Открыть отчёт — подтягиваются цены: `POST https://megaaudit.lovable.app/api/public/addon-prices`.
5. Открыть `/staff`, ввести PIN — служебный раздел доступен.
6. Проверить, что `https://megaaudit.lovable.app/` продолжает работать как раньше.

## 7. Важное ограничение

История аудитов, каталог услуг и КП хранятся в браузере пользователя, а не в базе на сервере. Данные не синхронизируются между версией на Lovable и версией на Yandex. Чтобы они стали общими, проекту нужна настоящая база данных — это отдельная задача, здесь бэкенд не создавался.
