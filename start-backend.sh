#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
VENV_PATH="$BACKEND_DIR/venv"
CONTAINER_NAME="greys_postgres"

echo "==> Проверяем контейнер БД..."

# Отдельно проверяем доступ к Docker, чтобы не путать проблему прав
# с реальным отсутствием запущенного контейнера.
if ! docker ps >/dev/null 2>&1; then
  echo "Ошибка: нет доступа к Docker daemon."
  echo "Проверь доступ к /var/run/docker.sock и повтори запуск."
  echo "Подсказка (Linux):"
  echo "  1) sudo usermod -aG docker \$USER"
  echo "  2) relogin (или newgrp docker)"
  echo "  3) docker ps"
  exit 1
fi

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "БД уже запущена."
else
  echo "БД не запущена."
  echo "==> Запускаем docker compose..."
  cd "$ROOT_DIR"
  docker compose up -d

  echo "==> Проверяем, что контейнер БД поднялся..."
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "БД успешно запущена."
  else
    echo "Ошибка: контейнер ${CONTAINER_NAME} не запустился."
    exit 1
  fi
fi

echo "==> Переходим в backend..."
cd "$BACKEND_DIR"

if [ ! -d "$VENV_PATH" ]; then
  echo "Ошибка: виртуальное окружение не найдено: $VENV_PATH"
  exit 1
fi

echo "==> Активируем виртуальное окружение..."
source "$VENV_PATH/bin/activate"

echo "==> Запускаем FastAPI сервер на порту 8000..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
