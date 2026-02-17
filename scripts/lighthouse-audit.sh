#!/usr/bin/env bash
set -euo pipefail

REPORT_DIR="perf-reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BASE_URL="${1:-http://localhost:4173}"
ROUTES=("/" "/faq" "/contact" "/mushrooms")
ROUTE_NAMES=("home" "faq" "contact" "mushrooms")

mkdir -p "$REPORT_DIR"

echo "Running Lighthouse audits against $BASE_URL"
echo "Reports saved to $REPORT_DIR/"
echo ""

for i in "${!ROUTES[@]}"; do
  ROUTE="${ROUTES[$i]}"
  NAME="${ROUTE_NAMES[$i]}"
  echo "=== Auditing $NAME ($BASE_URL$ROUTE) ==="
  npx lighthouse "$BASE_URL$ROUTE" \
    --output=json --output=html \
    --output-path="$REPORT_DIR/${TIMESTAMP}-${NAME}" \
    --chrome-flags="--headless --no-sandbox" \
    --only-categories=performance,seo \
    --quiet 2>/dev/null
  echo "  Done: $REPORT_DIR/${TIMESTAMP}-${NAME}.report.html"
done

echo ""
echo "=== Summary ==="
printf "%-12s %-6s %-6s %-10s %-10s %-10s %-6s\n" "Page" "Perf" "SEO" "FCP" "LCP" "TBT" "CLS"
printf "%-12s %-6s %-6s %-10s %-10s %-10s %-6s\n" "----" "----" "---" "---" "---" "---" "---"

for i in "${!ROUTES[@]}"; do
  NAME="${ROUTE_NAMES[$i]}"
  JSON="$REPORT_DIR/${TIMESTAMP}-${NAME}.report.json"
  if [ -f "$JSON" ]; then
    PERF=$(node -e "const r=require('./$JSON');console.log(Math.round(r.categories.performance.score*100))")
    SEO=$(node -e "const r=require('./$JSON');console.log(Math.round(r.categories.seo.score*100))")
    FCP=$(node -e "const r=require('./$JSON');console.log(r.audits['first-contentful-paint'].displayValue)")
    LCP=$(node -e "const r=require('./$JSON');console.log(r.audits['largest-contentful-paint'].displayValue)")
    TBT=$(node -e "const r=require('./$JSON');console.log(r.audits['total-blocking-time'].displayValue)")
    CLS=$(node -e "const r=require('./$JSON');console.log(r.audits['cumulative-layout-shift'].displayValue)")
    printf "%-12s %-6s %-6s %-10s %-10s %-10s %-6s\n" "$NAME" "$PERF" "$SEO" "$FCP" "$LCP" "$TBT" "$CLS"
  fi
done

echo ""
echo "Timestamp: $TIMESTAMP"
