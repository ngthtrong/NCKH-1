#!/usr/bin/env python3
"""Check supplied V4 content/assets against the compiled report.

This is a migration check, not external validation of scientific claims.
Requires PyMuPDF and pypandoc_binary (ordinary report builds do not).
"""
from __future__ import annotations

from collections import Counter
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import unicodedata

import fitz
import pypandoc

ROOT = Path(__file__).resolve().parents[1]


def text(node):
    if isinstance(node, list):
        return ''.join(text(x) for x in node)
    if not isinstance(node, dict):
        return ''
    kind, c = node['t'], node.get('c')
    if kind == 'Str':
        return c
    if kind in ('Space', 'SoftBreak', 'LineBreak'):
        return ' '
    if kind in ('Code', 'Math'):
        return c[-1]
    if kind in ('Header', 'Span'):
        return text(c[-1])
    if kind in ('Link', 'Image'):
        return text(c[1])
    if kind == 'Quoted':
        return text(c[-1])
    return text(c)


def tokens(value):
    value = unicodedata.normalize('NFKC', value).casefold()
    # Legal breaks after underscores keep the identifier unchanged on the page.
    value = re.sub(r'(?<=_)\s+(?=\w)', '', value)
    value = re.sub(r'\[[\d,\s–-]+\]', '', value)
    value = re.sub(r'(?m)^\s*[ivxlcdm\d]+\s*$', '', value)
    return re.findall(r'\w+', value)


def ngrams(words, size=5):
    return [tuple(words[i:i+size]) for i in range(len(words)-size+1)]


def pdf_text(path):
    # MuPDF omits some narrow inter-word spaces in XeTeX's justified Vietnamese.
    # Poppler retains them and is already a required report validation tool.
    executable = shutil.which('pdftotext')
    if not executable and os.name == 'nt':
        candidate = Path(os.environ['LOCALAPPDATA']) / 'Programs/MiKTeX/miktex/bin/x64/pdftotext.exe'
        if candidate.is_file():
            executable = str(candidate)
    if not executable:
        raise SystemExit('pdftotext is required for source prose comparison.')
    return subprocess.run([executable, '-raw', str(path), '-'], capture_output=True,
                          encoding='utf-8', errors='strict', check=True).stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--variant', action='append', choices=['content', 'content-twoside'])
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'assets/v4-import-manifest.json').read_text(encoding='utf-8'))
    errors, findings = [], []
    for filename, expected in manifest['sources'].items():
        actual = hashlib.sha256((ROOT.parent / filename).read_bytes()).hexdigest()
        if actual != expected:
            errors.append(f'Source changed: {filename}')
    source = (ROOT.parent / 'Report_V4.md').read_text(encoding='utf-8')
    source = re.sub(r'^\[image\d+\]:[^\n]*$', '', source, flags=re.M)
    source = '\n'.join(line.split(' {#', 1)[0] if line.startswith('#') else line for line in source.splitlines())
    source = source[source.index('# **PHẦN I.'):source.index('# **TÀI LIỆU THAM KHẢO')]
    doc = json.loads(pypandoc.convert_text(source, 'json', format='markdown-smart-citations'))
    # Paragraphs/lists are checked independently from headings, captions and tables.
    paragraphs = []
    def visit(block):
        if isinstance(block, list):
            for child in block:
                visit(child)
        elif isinstance(block, dict):
            if block['t'] in ('Para', 'Plain'):
                value = text(block)
                if not re.match(r'^(Hình|Bảng) \d', value) and len(tokens(value)) >= 10:
                    paragraphs.append(value)
            elif block['t'] in ('BulletList', 'OrderedList'):
                visit(block['c'])
    visit(doc['blocks'])
    original_pdf = fitz.open(ROOT.parent / 'Report_V4.pdf')
    original_grams = set(ngrams(tokens(pdf_text(ROOT.parent / 'Report_V4.pdf'))))
    source_total = sum(len(ngrams(tokens(p))) for p in paragraphs)
    source_matched = sum(sum(g in original_grams for g in ngrams(tokens(p))) for p in paragraphs)
    if source_total != source_matched:
        findings.append('Markdown/PDF source prose differs; inspect source comparison')
    image_digest_ids = {}
    for figure in manifest['figures']:
        data = (ROOT / figure['path']).read_bytes()
        if hashlib.sha256(data).hexdigest() != figure['sha256']:
            errors.append('Changed image ' + figure['number'])
        original = original_pdf.extract_image(figure['pdf_xref'])['image']
        if data != original:
            errors.append('Image differs from PDF stream ' + figure['number'])
        image_digest_ids[fitz.Pixmap(str(ROOT / figure['path'])).digest] = figure['image_id']
    for listing in manifest['code']:
        actual_hash = hashlib.sha256((ROOT / listing['path']).read_bytes()).hexdigest()
        if actual_hash != listing['sha256']:
            errors.append('Changed code listing ' + listing['id'])
    expected = re.findall(r'!\[\]\[(image\d+)\]', source)
    actual = [f['image_id'] for f in manifest['figures']]
    if expected != actual:
        errors.append('Figure ordering differs from Markdown')
    bib = '\n'.join(p.read_text(encoding='utf-8') for p in (ROOT / 'bibliography').glob('*.bib'))
    keys = re.findall(r'@\w+\{(v4-\d+),', bib)
    if sorted(keys) != ['v4-%02d' % i for i in range(1, 26)]:
        errors.append('Bibliography keys are not exactly the 25 V4 references')
    reports = []
    for folder in args.variant or ['content', 'content-twoside']:
        pdf = fitz.open(ROOT / 'build' / folder / 'content.pdf')
        extracted = pdf_text(ROOT / 'build' / folder / 'content.pdf')
        for suffix, expected_numbers in [('lof', [f['number'] for f in manifest['figures']]),
                                          ('lot', [t['number'] for t in manifest['tables'] if t['number']])]:
            auxiliary = (ROOT / 'build' / folder / ('content.' + suffix)).read_text(encoding='utf-8')
            numbers = re.findall(r'\\numberline\s*\{([^}]+)\}', auxiliary)
            if numbers != expected_numbers:
                errors.append(folder + ': ' + suffix + ' numbers differ from V4: ' + ', '.join(numbers))
        embedded = [image_digest_ids[item['digest']] for page in pdf
                    for item in page.get_image_info(hashes=True) if item['digest'] in image_digest_ids]
        if embedded != actual:
            errors.append(folder + ': embedded PDF images/order differ from the 40 source originals')
        available = set(ngrams(tokens(extracted)))
        missing = []
        matched, total = 0, 0
        for para in paragraphs:
            grams = ngrams(tokens(para))
            gaps = [g for g in grams if g not in available]
            matched += len(grams)-len(gaps)
            total += len(grams)
            if gaps:
                missing.append({'source_start': para[:160], 'missing_5grams': [' '.join(g) for g in gaps],
                                'matched': len(grams)-len(gaps), 'total': len(grams)})
        reports.append({'variant': folder, 'pages': len(pdf), 'prose_paragraphs': len(paragraphs),
                        'embedded_original_figures_in_source_order': embedded == actual,
                        'matched_5grams': matched, 'total_5grams': total,
                        'coverage_percent': round(100*matched/total, 5), 'gaps': missing})
        print(folder, len(pdf), 'pages;', len(paragraphs), 'paragraphs;', f'{matched}/{total} prose 5-grams preserved')
        # A missing five-word sequence is a review finding, never silently a PASS.
        if missing:
            findings.append(folder + ': extracted-text gaps require review')
    result = {'source_hashes_verified': not errors, 'figures': len(actual),
              'markdown_pdf_source_prose': {'matched_5grams': source_matched, 'total_5grams': source_total},
              'tables': len(manifest['tables']), 'captioned_tables': sum(bool(t['number']) for t in manifest['tables']),
              'code_listings': len(manifest['code']), 'references': len(keys),
              'errors': errors, 'findings': findings, 'pdfs': reports}
    out = ROOT / 'build/v4/content-verification.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Asset/order/reference errors:', len(errors), '; prose findings:', len(findings))
    if errors:
        raise SystemExit('\n'.join(errors))


if __name__ == '__main__':
    main()
