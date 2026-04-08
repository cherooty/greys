#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_URL="http://localhost:8000"

PINK='\033[0;35m'
NC='\033[0m'

echo "==> Проверяем backend..."

MAX_RETRIES=10
RETRY_DELAY=1
COUNT=0

until curl -s "$BACKEND_URL" > /dev/null; do
  COUNT=$((COUNT+1))

  if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
    echo "Ошибка: backend не доступен по адресу $BACKEND_URL"
    echo "Сначала запусти backend (./start-backend.sh)"
    exit 1
  fi

  echo "Ожидаем backend... ($COUNT/$MAX_RETRIES)"
  sleep $RETRY_DELAY
done

echo "Backend доступен."

echo "==> Переходим в frontend..."
cd "$FRONTEND_DIR"

if [ ! -f "package.json" ]; then
  echo "Ошибка: не найден package.json"
  exit 1
fi

if ! command -v pnpm &> /dev/null; then
  echo "Ошибка: pnpm не установлен"
  exit 1
fi

echo "==> Проверяем зависимости..."
if [ ! -d "node_modules" ]; then
  echo "Устанавливаем зависимости..."
  pnpm install
fi

echo -e "${PINK}==> Запускаем frontend на порту 5173...${NC}"
pnpm dev
