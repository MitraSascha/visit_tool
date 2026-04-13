#!/bin/bash
# Deployment auf dem Proxmox-Server
# Vorher: cp .env.prod.example .env.prod  →  Werte anpassen  →  dann dieses Script ausführen

set -e

if [ ! -f ".env.prod" ]; then
  echo "FEHLER: .env.prod nicht gefunden!"
  echo "  cp .env.prod.example .env.prod  →  dann Werte anpassen"
  exit 1
fi

echo "[card-vault] Produktiv-Deployment..."
cp .env.prod .env
docker compose up -d --build

echo ""
echo "Fertig! Erreichbar unter: http://$(hostname -I | awk '{print $1}'):7842"
