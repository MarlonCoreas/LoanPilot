#!/usr/bin/env bash
# Renderiza scripts/og-image.html a public/og.png (1200x630, el tamaño que
# esperan WhatsApp, Facebook, LinkedIn y X para la vista previa de un enlace).
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"

chrome=""
for candidate in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "$(command -v google-chrome || true)" \
  "$(command -v chromium || true)"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then
    chrome="$candidate"
    break
  fi
done

if [ -z "$chrome" ]; then
  echo "No se encontró Chrome ni Chromium; son necesarios para renderizar la tarjeta." >&2
  exit 1
fi

"$chrome" \
  --headless \
  --disable-gpu \
  --hide-scrollbars \
  --force-device-scale-factor=1 \
  --window-size=1200,630 \
  --screenshot=public/og.png \
  "file://$project_root/scripts/og-image.html"

echo "$project_root/public/og.png"
