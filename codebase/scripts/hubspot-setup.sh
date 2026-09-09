#!/usr/bin/env bash
# HubSpot CLI setup: upload → install-app → verify scopes → (token) → test → seed → sync
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"
ACCOUNT_ID=247334345
APP_ID=52499141

usage() {
  cat <<'EOF'
Usage: pnpm hubspot:setup [options]

Options:
  --skip-upload     Skip hs project upload
  --skip-install    Skip hs project install-app
  --skip-pipeline   Only setup/install; do not run test/seed/sync
  --open            Open HubSpot project in browser (Distribution tab for token)
  --token <pat>     Set HUBSPOT_ACCESS_TOKEN (also reads env HUBSPOT_ACCESS_TOKEN)
  -h, --help        Show this help

CLI can reinstall the app and verify scopes. The static access token (pat-na*)
is only shown once in HubSpot UI — paste it via --token or HUBSPOT_ACCESS_TOKEN.

Get token:
  1. pnpm hubspot:setup --open
  2. Project → AI CRM → Distribution → Show access token
  OR open: https://app.hubspot.com/static-token/247334345/authorize?appId=52499141
EOF
}

SKIP_UPLOAD=0
SKIP_INSTALL=0
SKIP_PIPELINE=0
OPEN_BROWSER=0
TOKEN_ARG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-upload) SKIP_UPLOAD=1 ;;
    --skip-install) SKIP_INSTALL=1 ;;
    --skip-pipeline) SKIP_PIPELINE=1 ;;
    --open) OPEN_BROWSER=1 ;;
    --token) TOKEN_ARG="${2:-}"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
  shift
done

if ! command -v hs >/dev/null 2>&1; then
  echo "error: HubSpot CLI (hs) not found. Install: npm i -g @hubspot/cli && hs account auth"
  exit 1
fi

cd "$ROOT"

echo "==> HubSpot CLI setup (account $ACCOUNT_ID, app $APP_ID)"
echo ""

if [[ "$SKIP_UPLOAD" -eq 0 ]]; then
  echo "==> Uploading project..."
  hs project upload --force
  echo ""
fi

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  echo "==> Installing / reinstalling static-auth app..."
  hs project install-app --force --json
  echo ""
fi

echo "==> Install status:"
STATUS_JSON="$(hs project app-install-status --json)"
echo "$STATUS_JSON"

if command -v python3 >/dev/null 2>&1; then
  SCOPES_OK="$(echo "$STATUS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('isInstalledWithCurrentScopes') else 'no')")"
  if [[ "$SCOPES_OK" != "yes" ]]; then
    echo ""
    echo "warning: app scopes are outdated — run: hs project install-app --force"
    echo "  or reinstall from HubSpot → Project → AI CRM → Distribution"
  else
    echo "scopes: OK (isInstalledWithCurrentScopes=true)"
  fi
fi

echo ""

TOKEN="${TOKEN_ARG:-${HUBSPOT_ACCESS_TOKEN:-}}"
if [[ -z "$TOKEN" ]] && [[ -f "$ENV_FILE" ]]; then
  TOKEN="$(grep -E '^HUBSPOT_ACCESS_TOKEN=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
fi

if [[ -z "$TOKEN" ]] || [[ "$TOKEN" == *"*"* ]]; then
  echo "==> HUBSPOT_ACCESS_TOKEN required (CLI cannot reveal full pat-na* token — HubSpot masks API responses)"
  echo ""
  echo "Open Distribution tab and copy the access token:"
  echo "  https://app.hubspot.com/developer-projects/$ACCOUNT_ID/project/ai-crm"
  echo "  https://app.hubspot.com/static-token/$ACCOUNT_ID/authorize?appId=$APP_ID"
  echo ""
  if [[ "$OPEN_BROWSER" -eq 1 ]]; then
    hs project open 2>/dev/null || true
  fi
  if [[ -t 0 ]]; then
    read -r -p "Paste HUBSPOT_ACCESS_TOKEN (pat-na...): " TOKEN
  fi
fi

if [[ -z "$TOKEN" ]] || [[ "$TOKEN" == *"*"* ]]; then
  echo ""
  echo "No valid token. Re-run with:"
  echo "  HUBSPOT_ACCESS_TOKEN=pat-na2-... pnpm hubspot:setup --skip-upload --skip-install"
  echo "  pnpm hubspot:setup --token pat-na2-... --skip-upload --skip-install"
  exit 1
fi

echo "==> Writing HUBSPOT_ACCESS_TOKEN to .env"
if grep -q '^HUBSPOT_ACCESS_TOKEN=' "$ENV_FILE" 2>/dev/null; then
  sed -i "s|^HUBSPOT_ACCESS_TOKEN=.*|HUBSPOT_ACCESS_TOKEN=$TOKEN|" "$ENV_FILE"
else
  echo "HUBSPOT_ACCESS_TOKEN=$TOKEN" >> "$ENV_FILE"
fi

export HUBSPOT_ACCESS_TOKEN="$TOKEN"

if [[ "$SKIP_PIPELINE" -eq 1 ]]; then
  echo "Done (pipeline skipped)."
  exit 0
fi

echo ""
echo "==> hubspot:test"
pnpm hubspot:test

echo ""
echo "==> hubspot:seed"
pnpm hubspot:seed

echo ""
echo "==> hubspot:sync"
pnpm hubspot:sync

echo ""
echo "Done — HubSpot seeded and synced into AI CRM."
