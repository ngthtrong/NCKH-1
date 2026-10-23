#!/usr/bin/env bash
set -euo pipefail
learning_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$learning_dir"
mkdir -p build
rm -f build/main.aux build/main.toc build/main.lof build/main.lot build/main.out
export TEXINPUTS=".:$learning_dir/../../report//:${TEXINPUTS:-}"
xelatex -interaction=nonstopmode -halt-on-error -output-directory=build placement-diagram.tex > build/diagram-build.log 2>&1
pandoc bao-cao-hoc-tap.md --from=markdown --to=latex --top-level-division=chapter \
  --no-highlight --lua-filter=table-widths.lua --output=build/content.tex
for pass in 1 2 3; do
  xelatex -interaction=nonstopmode -halt-on-error -output-directory=build main.tex > "build/pdf-build-$pass.log" 2>&1
done
cp build/main.pdf bao-cao-hoc-tap.pdf
pdfinfo bao-cao-hoc-tap.pdf > build/pdf-info.txt
pdftotext -layout bao-cao-hoc-tap.pdf build/bao-cao-hoc-tap.txt
printf 'PDF: %s/bao-cao-hoc-tap.pdf\n' "$learning_dir"
