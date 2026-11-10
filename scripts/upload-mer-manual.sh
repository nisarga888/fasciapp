#!/bin/bash
# Upload MER manual photos and anatomy drawings into the private mer-manual bucket.
# Does not print the service key. Reads it from the environment.
#
#   export SUPABASE_URL="https://<project>.supabase.co"
#   export SUPABASE_SERVICE_ROLE_KEY="..."
#   ./scripts/upload-mer-manual.sh /path/to/extracted/images
#
# The images directory must contain strokes/ and anatomy/ (webp only).
set -euo pipefail
ROOT="${1:-}"
if [[ -z "$ROOT" || ! -d "$ROOT/strokes" || ! -d "$ROOT/anatomy" ]]; then
  echo "Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... $0 /path/to/images" >&2
  exit 1
fi
if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment." >&2
  exit 1
fi
upload() {
  local file="$1" key="$2"
  local code
  code=$(curl -sS -o /tmp/mer-upload-body.txt -w "%{http_code}" \
    -X POST "$SUPABASE_URL/storage/v1/object/mer-manual/$key" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: image/webp" \
    -H "x-upsert: true" \
    --data-binary @"$file")
  if [[ "$code" != "200" && "$code" != "201" ]]; then
    echo "Failed $key ($code)" >&2
    exit 1
  fi
}
n=0
for dir in strokes anatomy; do
  for file in "$ROOT/$dir"/*.webp; do
    [[ -e "$file" ]] || continue
    base=$(basename "$file")
    upload "$file" "$dir/$base"
    n=$((n+1))
  done
done
echo "Uploaded $n files to mer-manual."
