#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$project_root"

npm run build
mkdir -p release
rm -f release/loanpilot-site.zip
(
  cd dist
  zip -qr ../release/loanpilot-site.zip .
)

echo "$project_root/release/loanpilot-site.zip"
