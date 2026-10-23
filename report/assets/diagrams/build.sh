#!/usr/bin/env bash
# Build every fig-*.tex into fig-*.en.pdf and fig-*.vi.pdf (vector, Times New Roman).
# Usage: ./build.sh [fig-name ...]   (no argument = all figures)
# PNG previews (for review only) go to $PREVIEW_DIR if set.
set -euo pipefail
cd "$(dirname "$0")"
figs=("$@")
if [ ${#figs[@]} -eq 0 ]; then
  mapfile -t figs < <(ls fig-*.tex | sed 's/\.tex$//')
fi
for f in "${figs[@]}"; do
  f="${f%.tex}"
  for lang in en vi; do
    jobs="$f.$lang"
    if [ "$lang" = vi ]; then pre='\def\VI{1}'; else pre=''; fi
    out=$(xelatex -interaction=nonstopmode -halt-on-error -jobname="$jobs" "$pre\\input{$f.tex}" 2>&1) || {
      echo "$out" | tail -40; echo "FAILED: $jobs" >&2; exit 1; }
    echo "$out" | grep -E "Overfull|Underfull|Missing character" | head -5 || true
    if [ -n "${PREVIEW_DIR:-}" ]; then
      mkdir -p "$PREVIEW_DIR"
      pdftoppm -r 130 -png -singlefile "$jobs.pdf" "$PREVIEW_DIR/$jobs"
    fi
    echo "built $jobs.pdf"
  done
done
rm -f ./*.aux ./*.log
