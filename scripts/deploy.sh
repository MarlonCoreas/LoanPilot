#!/usr/bin/env bash
# Publishes the site on Hostinger: builds, then syncs the build folder over SSH.
#
#   npm run deploy:check   build and list what would change, without touching the server
#   npm run deploy         build and publish
#
# Needs the "hostinger" host in ~/.ssh/config (key-based login). Files on the
# server that are not in the build are deleted, except the paths in EXCLUDES.
set -euo pipefail

BUILD_CMD="npm test"
SRC="dist"
REMOTE="hostinger:domains/marloncoreas.com/public_html/loanpilot"
EXCLUDES=""

cd "$(dirname "$0")/.."

DRY=""
if [ "${1:-}" = "--dry-run" ]; then
  DRY="--dry-run"
fi

echo "==> $BUILD_CMD"
$BUILD_CMD

if [ ! -f "$SRC/index.html" ] || [ ! -f "$SRC/.htaccess" ]; then
  echo "Build folder $SRC is missing index.html or .htaccess; nothing was uploaded." >&2
  exit 1
fi

EXCLUDE_ARGS=""
for path in $EXCLUDES; do
  EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude=$path"
done

if [ -n "$DRY" ]; then
  echo "==> Dry run against $REMOTE (nothing is written)"
else
  echo "==> Publishing to $REMOTE"
fi

# -c compares file contents, so a rebuild only uploads what really changed.
# shellcheck disable=SC2086
rsync -rlptzvc --delete --exclude=.DS_Store $EXCLUDE_ARGS $DRY "$SRC/" "$REMOTE/"

if [ -n "$DRY" ]; then
  echo "==> Dry run finished. Run 'npm run deploy' to publish."
else
  echo "==> Published."
fi
