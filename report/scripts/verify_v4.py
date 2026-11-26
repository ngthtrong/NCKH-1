#!/usr/bin/env python3
"""Check Report_newest content/assets against the compiled report.

This is a migration check, not external validation of scientific claims.
Requires PyMuPDF and pypandoc_binary (ordinary report builds do not).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import unicodedata
from zipfile import ZipFile

import pymupdf as fitz
import pypandoc

from import_v4 import (
    APPROVED_EDITS, DOCX, MARKDOWN_FORMAT, PDF, REFERENCE_COUNT, SOURCE,
    apply_approved_edits, body_image_ids, clean_markdown, docx_listings, normalize_list_markers, pixel_key,
)

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
    value = re.sub(r'(?m)^[^\S\n]*[ivxlcdm\d]+[^\S\n]*$', '', value)
    # Legal breaks after underscores keep the identifier unchanged on the page.
    value = re.sub(r'(?<=_)\s+(?=\w)', '', value)
    value = re.sub(r'\[[\d,\s–-]+\]', '', value)
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


def research_prose(source):
    source = normalize_list_markers(clean_markdown(source))
    source = re.sub(r'^\[image\d+\]:[^\n]*$', '', source, flags=re.M)
    source = re.sub(r'!\[[^\]\n]*\]\[image\d+\]', '', source)
    doc = json.loads(pypandoc.convert_text(source, 'json', format=MARKDOWN_FORMAT))
    # Paragraphs/lists are checked independently from headings, captions and tables.
    paragraphs = []
    def visit(block):
        if isinstance(block, list):
            for child in block:
                visit(child)
        elif isinstance(block, dict):
            if block['t'] in ('Para', 'Plain'):
                value = text(block)
                if not re.match(r'^(Hình|Bảng) [\dA-D]+\.\d', value) and len(tokens(value)) >= 10:
                    paragraphs.append(value)
            elif block['t'] in ('BulletList', 'OrderedList'):
                visit(block['c'])
    visit(doc['blocks'])
    return paragraphs


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
    edit_hash = hashlib.sha256(APPROVED_EDITS.read_bytes()).hexdigest()
    if edit_hash != manifest['approved_edits_sha256']:
        errors.append('Approved edits changed since import')
    source = SOURCE.read_text(encoding='utf-8')
    body = source[source.index('# **PHẦN I.'):source.index('# **TÀI LIỆU THAM KHẢO')]
    approved = apply_approved_edits(source)
    paragraphs = research_prose(approved.split('# **PHẦN I.', 1)[1].split('# **TÀI LIỆU THAM KHẢO', 1)[0])
    appendix = approved.split('# **PHỤ LỤC**', 1)[1].split('| ![][image44]', 1)[0]
    paragraphs += research_prose(appendix)
    original_pdf = fitz.open(PDF)
    original_grams = set(ngrams(tokens(pdf_text(PDF))))
    original_paragraphs = research_prose(body)
    source_total = sum(len(ngrams(tokens(p))) for p in original_paragraphs)
    source_matched = sum(sum(g in original_grams for g in ngrams(tokens(p))) for p in original_paragraphs)
    if source_total != source_matched:
        findings.append('Markdown/PDF source prose differs; inspect source comparison')
    image_digest_ids = {}
    images = [asset for figure in manifest['figures'] for asset in figure['images']]
    figure_by_image = {asset['image_id']: figure['number']
                       for figure in manifest['figures'] for asset in figure['images']}
    with ZipFile(DOCX) as docx:
        for asset in images:
            data = (ROOT / asset['path']).read_bytes()
            if hashlib.sha256(data).hexdigest() != asset['sha256']:
                errors.append('Changed image ' + asset['image_id'])
            original = original_pdf.extract_image(asset['pdf_xref'])['image']
            word_original = docx.read(asset['docx_media'])
            expected_asset = original if asset['pdf_pixel_match'] else word_original
            if data != expected_asset or pixel_key(data) != pixel_key(word_original):
                errors.append('Image differs from its recorded original ' + asset['image_id'])
            image_digest_ids[fitz.Pixmap(str(ROOT / asset['path'])).digest] = asset['image_id']
        listings = docx_listings(docx)
        for listing in manifest['code']:
            key = listing['id']
            data = (ROOT / listing['path']).read_bytes()
            if hashlib.sha256(data).hexdigest() != listing['sha256']:
                errors.append('Changed code listing ' + key)
            if listing['representation'] == 'listing' and data.decode('utf-8') != listings[key]:
                errors.append('Listing differs from Word ' + key)
    expected = body_image_ids(body)
    actual = [asset['image_id'] for asset in images]
    if expected != actual:
        errors.append('Figure ordering differs from Markdown')
    bib = '\n'.join(p.read_text(encoding='utf-8') for p in (ROOT / 'bibliography').glob('*.bib'))
    keys = re.findall(r'@\w+\{(v4-\d+),', bib)
    if sorted(keys) != ['v4-%02d' % i for i in range(1, REFERENCE_COUNT + 1)]:
        errors.append(f'Bibliography keys differ from the {REFERENCE_COUNT} source references')
    reports = []
    forms = ('bulletin-vi', 'bulletin-en', 'summary-vi', 'summary-en')
    standalone = []
    for form in forms:
        # Poppler adds a form-feed after the final page as well.
        pages = pdf_text(ROOT / 'build' / form / (form + '.pdf')).rstrip('\f\n').split('\f')
        standalone.extend(tokens(page) for page in pages)
    for folder in args.variant or ['content', 'content-twoside']:
        pdf = fitz.open(ROOT / 'build' / folder / 'content.pdf')
        extracted = pdf_text(ROOT / 'build' / folder / 'content.pdf')
        for suffix, expected_numbers in [('lof', [f['number'] for f in manifest['figures']]),
                                          ('lot', [t['number'] for t in manifest['tables'] if t['number']])]:
            auxiliary = (ROOT / 'build' / folder / ('content.' + suffix)).read_text(encoding='utf-8')
            numbers = re.findall(r'\\numberline\s*\{([^}]+)\}', auxiliary)
            if numbers != expected_numbers:
                errors.append(folder + ': ' + suffix + ' numbers differ from the source: ' + ', '.join(numbers))
        embedded = []
        caption_gaps = {}
        for page in pdf:
            image_bottoms = {}
            for item in page.get_image_info(hashes=True):
                image_id = image_digest_ids.get(item['digest'])
                if image_id is None:
                    continue
                embedded.append(image_id)
                number = figure_by_image[image_id]
                bottom = (fitz.Rect(item['bbox']) * page.rotation_matrix).y1
                image_bottoms[number] = max(bottom, image_bottoms.get(number, 0))
            if not image_bottoms:
                continue
            for block in page.get_text('blocks'):
                caption = re.match(r'^Hình\s+(\d+\.\d+[a-z]?):', block[4].strip())
                if caption and caption[1] in image_bottoms:
                    top = (fitz.Rect(block[:4]) * page.rotation_matrix).y0
                    caption_gaps[caption[1]] = round(top - image_bottoms[caption[1]], 2)
        for figure in manifest['figures']:
            number = figure['number']
            gap = caption_gaps.get(number)
            if gap is None or not -2 <= gap <= 54:
                errors.append(f'{folder}: figure {number} and caption spacing: {gap}')
        if embedded != actual:
            errors.append(folder + ': embedded PDF images/order differ from the source originals')
        book_pages = extracted.rstrip('\f\n').split('\f')
        compiled_forms = [tokens(page) for page in book_pages[-len(standalone):]]
        if compiled_forms != standalone:
            errors.append(folder + ': final pages differ from standalone forms')
        bookmarks = [tokens(title) for _, title, _ in pdf.get_toc()]
        next_bookmark = 0
        for heading in manifest['headings']:
            title = tuple(tokens(heading['rendered_title']))
            for index in range(next_bookmark, len(bookmarks)):
                if title in ngrams(bookmarks[index], len(title)):
                    next_bookmark = index + 1
                    break
            else:
                errors.append(folder + ': missing or misplaced heading ' + heading['rendered_title'])
        normalized = ' '.join(extracted.split())
        markers = ['tháng 10 năm 2026', 'Phòng Quản lý Khoa học', '3.32/4.0', '3.48/4.0', '3.79/4.0',
                   'NFR-03 vượt ngưỡng 5%', 'RESEARCH PROJECT NEWS BRIEF']
        for marker in markers:
            if marker not in normalized:
                errors.append(folder + ': missing PDF text ' + marker)
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
                        'max_figure_caption_gap_bp': max(caption_gaps.values(), default=None),
                        'standalone_forms_match': compiled_forms == standalone,
                        'matched_5grams': matched, 'total_5grams': total,
                        'coverage_percent': round(100*matched/total, 5), 'gaps': missing})
        print(folder, len(pdf), 'pages;', len(paragraphs), 'paragraphs;', f'{matched}/{total} prose 5-grams preserved')
        # A missing five-word sequence is a review finding, never silently a PASS.
        if missing:
            findings.append(folder + ': extracted-text gaps require review')
    result = {'source_hashes_verified': not errors, 'figures': len(manifest['figures']), 'images': len(actual),
              'markdown_pdf_source_prose': {'matched_5grams': source_matched, 'total_5grams': source_total},
              'tables': len(manifest['tables']), 'captioned_tables': sum(bool(t['number']) for t in manifest['tables']),
              'appendix_items': len(manifest['code']),
              'code_listings': sum('path' in item for item in manifest['code']), 'references': len(keys),
              'errors': errors, 'findings': findings, 'pdfs': reports}
    out = ROOT / 'build/v4/content-verification.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Asset/order/reference errors:', len(errors), '; prose findings:', len(findings))
    if errors:
        raise SystemExit('\n'.join(errors))


if __name__ == '__main__':
    main()
