#!/usr/bin/env python3
"""Import the supplied V4 Markdown/PDF without rewriting research prose.

Requires pypandoc_binary, PyMuPDF and Pillow only when re-importing; ordinary
report builds need none of these. The two source files are never modified.
"""
from __future__ import annotations

import base64
from copy import deepcopy
import hashlib
import io
import json
from pathlib import Path
import re
import unicodedata

import fitz
from PIL import Image
import pypandoc

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'Report_V4.md'
PDF = ROOT.parent / 'Report_V4.pdf'
WORK = ROOT / 'build/v4'
API = []
MANIFEST = {'sources': {}, 'headings': [], 'figures': [], 'tables': [], 'code': []}


def plain(value):
    if isinstance(value, list):
        return ''.join(plain(x) for x in value)
    if not isinstance(value, dict):
        return ''
    kind, c = value['t'], value.get('c')
    if kind in ('Space', 'SoftBreak', 'LineBreak'):
        return ' '
    if kind in ('Str',):
        return c
    if kind in ('Code', 'Math'):
        return c[-1]
    if kind in ('Emph', 'Strong', 'Strikeout', 'SmallCaps', 'Superscript', 'Subscript', 'Para', 'Plain'):
        return plain(c)
    if kind in ('Span', 'Link', 'Image', 'Header'):
        return plain(c[-2] if kind in ('Link', 'Image') else c[-1])
    if kind == 'Quoted':
        return '"' + plain(c[1]) + '"'
    return ''


def latex(blocks):
    return pypandoc.convert_text(
        json.dumps({'pandoc-api-version': API, 'meta': {}, 'blocks': blocks}, ensure_ascii=False),
        'latex', format='json', extra_args=['--wrap=none']).replace('\r\n', '\n').strip()


def inline(c):
    return latex([{'t': 'Plain', 'c': c}])


def literal(text):
    return inline([{'t': 'Str', 'c': text}])


def raw(text):
    return {'t': 'RawBlock', 'c': ['latex', text]}


def write(path, content):
    path = ROOT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    content = content.replace('\r\n', '\n').replace('\r', '')
    with path.open('w', encoding='utf-8', newline='\n') as output:
        output.write('\n'.join(line.rstrip() for line in content.rstrip().split('\n')) + '\n')


def extract_images(source):
    def replace(match):
        name, mime, encoded = match.groups()
        data = base64.b64decode(encoded)
        suffix = {'image/png': '.png', 'image/jpeg': '.jpg'}[mime]
        path = ROOT / 'assets/figures/v4' / (name + suffix)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        with Image.open(io.BytesIO(data)) as img:
            width, height = img.size
        IMAGE_DATA[name] = {'image_id': name, 'path': str(path.relative_to(ROOT)).replace('\\', '/'),
                            'sha256': hashlib.sha256(data).hexdigest(),
                            'width_px': width, 'height_px': height}
        return f'[{name}]: {IMAGE_DATA[name]["path"]}'
    return re.sub(r'^\[(image\d+)\]:\s*<data:([^;]+);base64,([^>]+)>\s*$', replace, source, flags=re.M)


def pdf_code():
    """Recover physical code lines from V4 PDF's code-font spans (pages 101–106)."""
    result, current = {}, None
    for page_no, page in enumerate(fitz.open(PDF), 1):
        if not 101 <= page_no <= 106:
            continue
        for block in page.get_text('dict')['blocks']:
            if block['type'] != 0:
                continue
            spans = [s for line in block['lines'] for s in line['spans']]
            fonts = {s['font'] for s in spans}
            text = '\n'.join(''.join(s['text'] for s in line['spans']).rstrip() for line in block['lines']).strip()
            if 'Consolas-Bold' in fonts:
                match = re.match(r'([A-D]\.\d+)\.', text)
                if match:
                    current = match[1]
                    result[current] = {'lines': [], 'pages': [], 'title': text}
            elif 'Consolas' in fonts and current:
                lines = []
                for line in block['lines']:
                    # Ignore Cambria spacer spans, but retain Arial Vietnamese fallback glyphs.
                    code = ''.join(s['text'] for s in line['spans'] if s['size'] < 10).rstrip()
                    if code:
                        lines.append(code)
                result[current]['lines'].extend(lines + [''])
                result[current]['pages'].append(page_no)
    return result


def prefer_pdf_images():
    """Use the original PDF streams, after visual correspondence was audited.

    Markdown exports downsampled all diagrams to ~565 px and distorted the
    aspect ratios of two figures. No drawing is regenerated or resampled.
    """
    pdf = fitz.open(PDF)
    images = [(page_no, item) for page_no, page in enumerate(pdf, 1)
              if 21 <= page_no <= 100 for item in page.get_images(full=True)]
    assert len(images) == 40, 'Re-audit figure correspondence if the source PDF changes.'
    for index, (page_no, item) in enumerate(images, 2):
        ident = 'image' + str(index)
        source = pdf.extract_image(item[0])
        assert source['ext'] == 'png'
        data = source['image']
        info = IMAGE_DATA[ident]
        info['markdown_sha256'] = info['sha256']
        info['markdown_dimensions'] = [info['width_px'], info['height_px']]
        info.update(source='Report_V4.pdf', pdf_page=page_no, pdf_xref=item[0],
                    sha256=hashlib.sha256(data).hexdigest(), width_px=item[2], height_px=item[3])
        (ROOT / info['path']).write_bytes(data)


def normalize_code(s):
    return re.sub(r'\s+', '', unicodedata.normalize('NFC', s)).replace('–', '-').replace('—', '-')


def walk_inlines(value):
    if isinstance(value, list):
        result = []
        for node in value:
            if isinstance(node, dict) and node['t'] == 'Str':
                pieces = re.split(r'(\[(?:[1-9]|1\d|2[0-5])\])', node['c'])
                for part in pieces:
                    if not part:
                        continue
                    if re.fullmatch(r'\[\d+\]', part):
                        result.append({'t': 'RawInline', 'c': ['latex', '\\cite{v4-%02d}' % int(part[1:-1])]})
                    else:
                        result.append({'t': 'Str', 'c': part})
            else:
                result.append(walk_inlines(node))
        return result
    if isinstance(value, dict):
        return {key: walk_inlines(val) if key == 'c' and value['t'] not in ('RawBlock', 'RawInline', 'Code', 'CodeBlock', 'Math') else val
                for key, val in value.items()}
    return value


def unstyled(c):
    while len(c) == 1 and c[0]['t'] in ('Emph', 'Strong'):
        c = c[0]['c']
    return c


def strip_prefix(c, pattern):
    """Remove a printed number from a heading/caption without changing its text."""
    text = plain(c)
    match = re.match(pattern, text)
    if not match:
        raise ValueError(f'Cannot strip prefix from {text!r}')
    return text[match.end():]


def image_node(block):
    if block['t'] != 'Para':
        return None
    c = unstyled(block['c'])
    return c[0] if len(c) == 1 and c[0]['t'] == 'Image' else None


def table_rows(table):
    c = table['c']
    heads = c[3][1]
    body = [row for part in c[4] for row in part[3]]
    return heads, body


def row_cells(row):
    return [cell[-1] for cell in row[1]]


def render_table(table, caption=None):
    heads, rows = table_rows(table)
    number = re.match(r'Bảng\s+(\d+\.\d+):\s*', plain(caption['c']))[1] if caption else None
    title = strip_prefix(unstyled(caption['c']), r'Bảng\s+\d+\.\d+:\s*') if caption else None
    n = len(table['c'][2])
    landscape = n >= 4
    weights = ([.10, .30, .60] if n == 3 else [1/n]*n)
    if n == 3 and plain(row_cells(heads[0])[0][0]).startswith('Phương diện'):
        weights = [.24, .38, .38]
    # widths sum to the available line width after column padding.
    spec = '@{}' + ''.join('P{\\dimexpr %.5f\\linewidth-%.3fbp\\relax}' % (w, 10*(n-1)*w) for w in weights) + '@{}'
    def render_row(row):
        return ' & '.join(latex(walk_inlines(cell)) for cell in row_cells(row)) + r' \\'
    header = '\n'.join(render_row(row) for row in heads)
    parts = [r'\FloatBarrier']
    if landscape:
        parts.append(r'\begin{landscape}')
    environment = 'longtable' if caption else 'longtable*'
    parts += [r'\begingroup\setlength{\tabcolsep}{5bp}\renewcommand{\arraystretch}{1.12}']
    if number:
        # longtable* still advances the internal counter. Preserve V4's visible
        # number while leaving hyperref's internal destination counter unique.
        parts.append('\\renewcommand{\\thetable}{' + number + '}')
    parts.append('\\begin{' + environment + '}{' + spec + '}')
    if caption:
        parts.append('\\caption{' + literal(title) + '}\\label{tab:v4-' + number.replace('.', '-') + r'}\\')
    parts += [r'\toprule', header, r'\midrule\endfirsthead', r'\toprule', header,
              r'\midrule\endhead', r'\midrule\endfoot', r'\bottomrule\endlastfoot']
    parts += [render_row(row) for row in rows]
    parts += ['\\end{' + environment + '}', r'\endgroup']
    if landscape:
        parts.append(r'\end{landscape}')
    MANIFEST['tables'].append({'number': number, 'caption': title, 'columns': n,
                               'header_rows': len(heads), 'body_rows': len(rows), 'landscape': landscape})
    return raw('\n'.join(parts))


def render_code(table):
    heads, rows = table_rows(table)
    title = plain(row_cells(heads[0])[0][0])
    key = re.match(r'([A-D]\.\d+)\.', title)[1]
    original = ' '.join(plain(b) for cell in row_cells(rows[0]) for b in cell)
    recovered = '\n'.join(CODE[key]['lines']).strip() + '\n'
    # No alteration other than whitespace is allowed in the recovered listing.
    if normalize_code(original) != normalize_code(recovered):
        import difflib
        a, b = normalize_code(original), normalize_code(recovered)
        diffs = [(tag, a[i:j], b[k:l]) for tag, i, j, k, l in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes() if tag != 'equal']
        raise ValueError(f'PDF/Markdown code mismatch {key}: {diffs[:6]}')
    path = 'assets/code/v4/' + key.replace('.', '-') + '.txt'
    write(path, recovered)
    MANIFEST['code'].append({'id': key, 'title': title, 'path': path, 'pdf_pages': CODE[key]['pages'],
                             'sha256': hashlib.sha256(recovered.encode('utf-8')).hexdigest(),
                             'non_whitespace_content_matches_markdown': True})
    return raw('\\par\\noindent\\textbf{' + literal(title) + '}\\par\n'
               '\\VerbatimInput[breaklines,breakanywhere,breaksymbolleft={},baselinestretch=1,samepage=true,'
               'fontsize=\\fontsize{9bp}{11bp}\\selectfont]{' + path + '}')


def render_figure(image, caption):
    number = re.match(r'Hình\s+(\d+\.\d+[ab]?):\s*', plain(caption['c']))[1]
    title = strip_prefix(unstyled(caption['c']), r'Hình\s+\d+\.\d+[ab]?:\s*')
    ident = Path(image['c'][2][0]).stem
    data = dict(IMAGE_DATA[ident])
    landscape = data['width_px'] / data['height_px'] > 1.65
    data.update(number=number, caption=title, landscape=landscape)
    MANIFEST['figures'].append(data)
    return raw('\\VfourFigure' + ('Landscape' if landscape else '') + '{' + number + '}{' + data['path'] + '}{' + literal(title) + '}{fig:v4-' + number.replace('.', '-') + '}')


def heading(block, mode):
    level, attr, c = block['c']
    title = plain(c)
    if not title.strip():
        return None
    label = ''
    if mode == 'introduction':
        command = 'addsec' if level == 3 else 'addsubsec'
        label = 'intro-' + re.match(r'([\d.]+)', title)[1].rstrip('.').replace('.', '-')
    elif mode == 'conclusion':
        command = 'addsec'
        label = 'conclusion-' + attr[0]
    elif level == 2:
        if mode == 'appendix':
            number = re.match(r'PHỤ LỤC ([A-D]):', title)[1]
            title = re.sub(r'^PHỤ LỤC [A-D]:\s*', '', title)
            label = 'appendix-' + number
        else:
            number = re.match(r'CHƯƠNG (\d+)[.:]', title)[1]
            title = re.sub(r'^CHƯƠNG \d+[.:]\s*', '', title)
            label = 'chapter-' + number
        command = 'chapter'
    else:
        number = re.match(r'([\d.]+)\s*', title)[1].rstrip('.')
        title = re.sub(r'^\d+(?:\.\d+)*\.?(?:\s+)', '', title)
        label = 'sec-' + number.replace('.', '-')
        command = {3: 'section', 4: 'subsection', 5: 'subsubsection'}[level]
    MANIFEST['headings'].append({'source': plain(c), 'rendered_title': title, 'command': command, 'label': 'v4-' + label})
    return raw('\\' + command + '{' + literal(title) + '}\\label{v4-' + label + '}')


def process(blocks, mode):
    result = []
    i = 0
    while i < len(blocks):
        block = blocks[i]
        next_block = blocks[i+1] if i+1 < len(blocks) else None
        if block['t'] == 'Header':
            converted = heading(block, mode)
            if converted:
                result.append(converted)
        elif image_node(block):
            assert next_block and re.match('Hình ', plain(next_block)), plain(block)
            result.append(render_figure(image_node(block), next_block))
            i += 1
        elif block['t'] == 'Para' and re.match(r'^Bảng \d+\.\d+:', plain(block)):
            assert next_block and next_block['t'] == 'Table'
            result.append(render_table(next_block, block))
            i += 1
        elif block['t'] == 'Table':
            result.append(render_code(block) if mode == 'appendix' else render_table(block))
        elif mode == 'appendix' and block['t'] == 'Para' and re.match(r'^[A-D]\.\d+\. ', plain(block)):
            title = re.sub(r'^[A-D]\.\d+\. ', '', plain(block))
            key = re.match(r'^([A-D]\.\d+)', plain(block))[1].replace('.', '-')
            count = len('\n'.join(CODE[key.replace('-', '.')]['lines']).strip().splitlines())
            result.append(raw('\\Needspace{' + str(count * 11 + 100) + 'bp}\n\\section{' + literal(title) + '}\\label{v4-sec-' + key + '}'))
        else:
            result.append(walk_inlines(block))
        i += 1
    tex = latex(result)
    for kind, prefix, available in [('Hình', 'fig:v4-', {x['number'] for x in MANIFEST['figures']}),
                                    ('Bảng', 'tab:v4-', {x['number'] for x in MANIFEST['tables'] if x['number']}),
                                    ('Mục', 'v4-sec-', SECTION_NUMBERS),
                                    ('Chương', 'v4-chapter-', set('12345'))]:
        def ref(match):
            number = match[1]
            return kind + '~\\ref{' + prefix + number.replace('.', '-') + '}' if number in available else match[0]
        tex = re.sub(kind + r'\s+(\d+(?:\.\d+)*[ab]?)(?![\d.])', ref, tex)
    tex = re.sub(r'\n{3,}', '\n\n', tex)
    # Identifiers keep every character, with legal line breaks after underscores.
    # Verbatim listings are external files and are not changed by this operation.
    tex = tex.replace('\\_', '\\_\\allowbreak{}')
    return '% Content imported from Report_V4.md; figures/code cross-checked against Report_V4.pdf.\n' + tex


def main():
    global API, CODE, SECTION_NUMBERS
    WORK.mkdir(parents=True, exist_ok=True)
    source = SOURCE.read_text(encoding='utf-8')
    for path in (SOURCE, PDF):
        MANIFEST['sources'][path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
    cleaned = extract_images(source)
    # Exported anchor strings can contain characters invalid in Pandoc attributes.
    # They are navigation metadata, never printed heading text.
    cleaned = '\n'.join(line.split(' {#', 1)[0] if line.startswith('#') else line for line in cleaned.splitlines())
    # V4's second journey table has a physical newline inside its last cell.
    # Rejoin that one exported row through its closing pipe, as in the PDF.
    lines, repaired = [], 0
    for line in cleaned.splitlines():
        if lines and lines[-1].startswith('|') and not lines[-1].rstrip().endswith('|'):
            lines[-1] += ' ' + line.strip()
            if line.rstrip().endswith('|'):
                repaired += 1
        else:
            lines.append(line)
    assert repaired == 1, 'Re-audit multiline table rows if the source changes.'
    cleaned = '\n'.join(lines)
    MANIFEST['markdown_table_rows_repaired_from_pdf'] = repaired
    (WORK / 'source-clean.md').write_text(cleaned, encoding='utf-8')
    doc = json.loads(pypandoc.convert_text(cleaned, 'json', format='markdown-smart-citations'))
    API = doc['pandoc-api-version']
    blocks = doc['blocks']
    CODE = pdf_code()
    prefer_pdf_images()
    headers = [(i, plain(b['c'][2])) for i, b in enumerate(blocks) if b['t'] == 'Header']
    locate = lambda prefix: next(i for i, title in headers if title.startswith(prefix))
    SECTION_NUMBERS = {re.match(r'^([\d.]+)', title)[1].rstrip('.') for _, title in headers if re.match(r'^\d+\.\d+', title)}
    intro, body, end, refs, appendix = [locate(s) for s in ['PHẦN I.', 'PHẦN II.', 'PHẦN III.', 'TÀI LIỆU THAM KHẢO', 'PHỤ LỤC']]
    write('chapters/introduction.tex', '\\addchap{PHẦN I. MỞ ĐẦU}\\label{chap:v4-introduction}\n' + process(blocks[intro+1:body], 'introduction'))
    chapter_starts = [locate('CHƯƠNG ' + str(i)) for i in range(1, 6)] + [end]
    folders = ['01-foundations', '02-architecture', '03-system', '04-implementation', '04-evaluation']
    for start, stop, folder in zip(chapter_starts, chapter_starts[1:], folders):
        write('chapters/' + folder + '/chapter.tex', process(blocks[start:stop], 'body'))
    write('chapters/conclusion.tex', '\\addchap{PHẦN III. KẾT LUẬN VÀ KIẾN NGHỊ}\\label{chap:v4-conclusion}\n' + process(blocks[end+1:refs], 'conclusion'))
    starts = [locate('PHỤ LỤC ' + letter + ':') for letter in 'ABCD']
    # The next table is the logo at the start of the blank bulletin forms.
    stop = next(i for i in range(starts[-1], len(blocks)) if blocks[i]['t'] == 'Table' and len(blocks[i]['c'][2]) == 2)
    starts.append(stop)
    for letter, start, end in zip('ABCD', starts, starts[1:]):
        write('appendices/v4-' + letter.lower() + '.tex', process(blocks[start:end], 'appendix'))
    MANIFEST['template_logos_retained'] = [IMAGE_DATA['image1'], IMAGE_DATA['image42']]
    write('assets/v4-import-manifest.json', json.dumps(MANIFEST, ensure_ascii=False, indent=2))
    print('Imported', len(MANIFEST['headings']), 'headings,', len(MANIFEST['figures']), 'figures,', len(MANIFEST['tables']), 'tables,', len(MANIFEST['code']), 'code listings')


IMAGE_DATA = {}
if __name__ == '__main__':
    main()
