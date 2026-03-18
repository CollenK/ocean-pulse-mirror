#!/usr/bin/env bash
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRANCH="$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")"
COMMIT="$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
REPORT_ID="${TIMESTAMP}_${BRANCH}"
REPORT_DIR="$PROJECT_ROOT/.quality/reports/$REPORT_ID"

# Source directories (no src/ in this project — code lives at the top level)
SOURCE_DIRS=("app" "components" "hooks" "lib" "types" "contexts")

mkdir -p "$REPORT_DIR"

echo "=== Quality Measurement: $REPORT_ID ==="
echo ""

# ── 1. LOC Count ────────────────────────────────────────────────────────────
echo "→ Counting lines of code..."
TOTAL_FILES=0
TOTAL_LINES=0
CODE_LINES=0

for dir in "${SOURCE_DIRS[@]}"; do
  target="$PROJECT_ROOT/$dir"
  [ -d "$target" ] || continue
  while IFS= read -r -d '' file; do
    TOTAL_FILES=$((TOTAL_FILES + 1))
    file_lines=$(wc -l < "$file" | tr -d ' ')
    TOTAL_LINES=$((TOTAL_LINES + file_lines))
    # Code lines = non-blank, non-comment lines
    file_code=$(grep -cve '^\s*$' -e '^\s*//' -e '^\s*\*' -e '^\s*/\*' "$file" 2>/dev/null || echo 0)
    CODE_LINES=$((CODE_LINES + file_code))
  done < <(find "$target" -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 2>/dev/null)
done

echo "  Files: $TOTAL_FILES | Lines: $TOTAL_LINES | Code: $CODE_LINES"

# ── 2. ESLint ───────────────────────────────────────────────────────────────
echo "→ Running ESLint..."
ESLINT_EXIT=0
ESLINT_DIRS=""
for dir in "${SOURCE_DIRS[@]}"; do
  [ -d "$PROJECT_ROOT/$dir" ] && ESLINT_DIRS="$ESLINT_DIRS $PROJECT_ROOT/$dir"
done

npx eslint --format json --output-file "$REPORT_DIR/eslint.json" $ESLINT_DIRS 2>/dev/null || ESLINT_EXIT=$?

ESLINT_ERRORS=0
ESLINT_WARNINGS=0
COMPLEXITY_HITS=0

if [ -f "$REPORT_DIR/eslint.json" ] && [ -s "$REPORT_DIR/eslint.json" ]; then
  ESLINT_ERRORS=$(node -e "
    const r = require('$REPORT_DIR/eslint.json');
    console.log(r.reduce((s,f) => s + f.errorCount, 0));
  " 2>/dev/null || echo 0)

  ESLINT_WARNINGS=$(node -e "
    const r = require('$REPORT_DIR/eslint.json');
    console.log(r.reduce((s,f) => s + f.warningCount, 0));
  " 2>/dev/null || echo 0)

  COMPLEXITY_HITS=$(node -e "
    const r = require('$REPORT_DIR/eslint.json');
    const COMPLEXITY_RULES = new Set([
      'complexity', 'max-depth', 'max-lines',
      'max-lines-per-function', 'max-params'
    ]);
    let hits = 0;
    for (const f of r) {
      for (const m of f.messages) {
        if (COMPLEXITY_RULES.has(m.ruleId)) hits++;
      }
    }
    console.log(hits);
  " 2>/dev/null || echo 0)
fi

echo "  Errors: $ESLINT_ERRORS | Warnings: $ESLINT_WARNINGS | Complexity hits: $COMPLEXITY_HITS"

# ── 3. TypeScript ───────────────────────────────────────────────────────────
echo "→ Running TypeScript compiler..."
TSC_OUTPUT="$REPORT_DIR/tsc.txt"
npx tsc --noEmit --pretty false > "$TSC_OUTPUT" 2>&1 || true

TYPE_ERRORS=0
if [ -s "$TSC_OUTPUT" ]; then
  TYPE_ERRORS=$(grep -c "error TS" "$TSC_OUTPUT" 2>/dev/null || echo 0)
fi

echo "  Type errors: $TYPE_ERRORS"

# ── 4. Duplication (jscpd) ──────────────────────────────────────────────────
echo "→ Checking code duplication..."
JSCPD_DIR="$REPORT_DIR/jscpd"
mkdir -p "$JSCPD_DIR"

# Run jscpd from project root with path patterns covering all source dirs
npx jscpd "$PROJECT_ROOT" \
  --pattern "{app,components,hooks,lib,types,contexts}/**/*.{ts,tsx}" \
  --ignore "**/node_modules/**,**/.next/**,**/components/ui/**" \
  --reporters json \
  --output "$JSCPD_DIR" \
  --silent 2>/dev/null || true

DUP_PERCENTAGE="0"
DUP_CLONES="0"

if [ -f "$JSCPD_DIR/jscpd-report.json" ]; then
  DUP_PERCENTAGE=$(node -e "
    const r = require('$JSCPD_DIR/jscpd-report.json');
    console.log((r.statistics?.total?.percentage ?? 0).toFixed(2));
  " 2>/dev/null || echo "0")

  DUP_CLONES=$(node -e "
    const r = require('$JSCPD_DIR/jscpd-report.json');
    console.log(r.duplicates?.length ?? 0);
  " 2>/dev/null || echo "0")
fi

echo "  Duplication: ${DUP_PERCENTAGE}% | Clones: $DUP_CLONES"

# ── 5. Build report.json ───────────────────────────────────────────────────
cat > "$REPORT_DIR/report.json" <<EOF
{
  "meta": {
    "timestamp": "$TIMESTAMP",
    "branch": "$BRANCH",
    "commit": "$COMMIT",
    "reportId": "$REPORT_ID"
  },
  "loc": {
    "totalFiles": $TOTAL_FILES,
    "totalLines": $TOTAL_LINES,
    "codeLines": $CODE_LINES
  },
  "eslint": {
    "errors": $ESLINT_ERRORS,
    "warnings": $ESLINT_WARNINGS,
    "complexityHits": $COMPLEXITY_HITS
  },
  "typescript": {
    "typeErrors": $TYPE_ERRORS
  },
  "duplication": {
    "percentage": $DUP_PERCENTAGE,
    "clones": $DUP_CLONES
  }
}
EOF

# ── 6. Build summary.txt ───────────────────────────────────────────────────
cat > "$REPORT_DIR/summary.txt" <<EOF
Quality Report: $REPORT_ID
Branch: $BRANCH | Commit: $COMMIT
Generated: $(date -Iseconds)
────────────────────────────────────────

LOC
  Total files:  $TOTAL_FILES
  Total lines:  $TOTAL_LINES
  Code lines:   $CODE_LINES

ESLint
  Errors:          $ESLINT_ERRORS
  Warnings:        $ESLINT_WARNINGS
  Complexity hits: $COMPLEXITY_HITS

TypeScript
  Type errors: $TYPE_ERRORS

Duplication
  Percentage: ${DUP_PERCENTAGE}%
  Clones:     $DUP_CLONES

────────────────────────────────────────
Report saved to: $REPORT_DIR
EOF

echo ""
cat "$REPORT_DIR/summary.txt"
echo ""
echo "Done. Report saved to $REPORT_DIR"
