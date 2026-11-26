#!/usr/bin/env python3
"""Import Report V4 and apply the approved copy edits.

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
from xml.etree import ElementTree
from zipfile import ZipFile

import pymupdf as fitz
from PIL import Image
import pypandoc

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'Report_V4.md'
PDF = ROOT.parent / 'Report_V4.pdf'
DOCX = ROOT.parent / 'Report_V4.docx'
API = []
MANIFEST = {'sources': {}, 'headings': [], 'figures': [], 'tables': [], 'code': []}
LANDSCAPE_FIGURES = {'2.7', '3.10', '4.4', '4.8', '4.9'}
LISTING_ID = re.compile(r'^([A-D](?:\.\d+)+)\. ')


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


def word_text(node):
    return ''.join(t.text or '' for t in node.iterfind('.//{*}t'))


def docx_listings(docx):
    """Read listing lines and indentation from the Word table paragraphs."""
    body = ElementTree.fromstring(docx.read('word/document.xml')).find('{*}body')
    listings = {}
    for table in body.findall('{*}tbl'):
        rows = table.findall('{*}tr')
        if len(rows) != 2:
            continue
        title = word_text(rows[0]).strip()
        number = LISTING_ID.match(title)
        if number:
            # Word's export surrounds styled code with private-use delimiters.
            listings[number[1]] = '\n'.join(
                word_text(p).replace('\uec03', '').replace('\uec02', '').rstrip()
                for p in rows[1].iterfind('.//{*}p')
            ).strip('\n') + '\n'
    return listings


def pixel_key(data):
    with Image.open(io.BytesIO(data)) as img:
        return img.size, hashlib.sha256(img.convert('RGB').tobytes()).hexdigest()


def clean_markdown(source):
    """Remove export-only navigation and normalize inline image/line breaks."""
    source = '\n'.join(line.split(' {#', 1)[0] if line.startswith('#') else line
                       for line in source.split('\n'))
    source = source.replace('\v', '<br>')
    return re.sub(r'(\S)(!\[\]\[image31\])', r'\1\n\n\2', source)


def apply_approved_edits(source):
    path = ROOT / 'assets/v4-approved-edits.json'
    edits = json.loads(path.read_text(encoding='utf-8'))
    for edit in edits:
        before, after, count = edit['before'], edit['after'], edit['count']
        if source.count(before) != count:
            raise ValueError(f"Recheck {edit['id']} at {edit['location']}")
        source = source.replace(before, after)
    return source


def prefer_pdf_images(docx, body):
    """Use body image streams whose pixels match the Word originals."""
    word_media = {pixel_key(docx.read(name)): name for name in docx.namelist()
                  if name.startswith('word/media/')}
    identifiers = re.findall(r'!\[\]\[(image\d+)\]', body)
    with fitz.open(PDF) as pdf:
        images = [(page.number + 1, item) for page in pdf[17:100]
                  for item in page.get_image_info(xrefs=True)]
        if len(images) != len(identifiers):
            raise ValueError('Recheck image count and order against Report V4.')
        for ident, (page_no, item) in zip(identifiers, images):
            source = pdf.extract_image(item['xref'])
            data = source['image']
            word_path = word_media[pixel_key(data)]
            info = IMAGE_DATA[ident]
            info['markdown_sha256'] = info['sha256']
            info['markdown_dimensions'] = [info['width_px'], info['height_px']]
            info.update(source=PDF.name, pdf_page=page_no, pdf_xref=item['xref'], docx_media=word_path,
                        sha256=hashlib.sha256(data).hexdigest(), width_px=item['width'], height_px=item['height'])
            (ROOT / info['path']).write_bytes(data)


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
        if value['t'] == 'RawInline' and value['c'] == ['html', '<br>']:
            return {'t': 'RawInline', 'c': ['latex', r'\newline{}']}
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


def render_table(table, caption=None, lead=''):
    heads, rows = table_rows(table)
    number = re.match(r'Bảng\s+(\d+\.\d+):\s*', plain(caption['c']))[1] if caption else None
    title = strip_prefix(unstyled(caption['c']), r'Bảng\s+\d+\.\d+:\s*') if caption else None
    n = len(table['c'][2])
    landscape = n >= 4
    weights = ([.10, .30, .60] if n == 3 else [1/n]*n)
    if n == 3 and caption is None:
        weights = [.20, .30, .50]
    if n == 3 and plain(row_cells(heads[0])[0][0]).startswith('Phương diện'):
        weights = [.24, .38, .38]
    if number == '1.2':
        weights = [.12, .28, .45, .15]
    elif number == '2.1':
        weights = [.1875, .1875, .25, .1875, .1875]
    elif number == '4.2':
        weights = [.07, .12, .29, .52]
    # widths sum to the available line width after column padding.
    spec = '@{}' + ''.join('P{\\dimexpr %.5f\\linewidth-%.3fbp\\relax}' % (w, 10*(n-1)*w) for w in weights) + '@{}'
    def render_row(row):
        return ' & '.join(latex(walk_inlines(cell)) for cell in row_cells(row)) + r' \\'
    header = '\n'.join(render_row(row) for row in heads)
    parts = [r'\FloatBarrier']
    if landscape:
        parts.append(r'\begin{landscape}')
        if lead:
            parts.append(lead)
    environment = 'longtable' if caption else 'longtable*'
    parts += [r'\begingroup\let\autodot\relax\setlength{\tabcolsep}{5bp}\renewcommand{\arraystretch}{1.12}']
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
    heads, _ = table_rows(table)
    title = plain(row_cells(heads[0])[0][0])
    key = LISTING_ID.match(title)[1]
    heading = r'\par\noindent\textbf{' + literal(title) + r'}\par'
    if key.startswith('D.'):
        method = {
            'D.1': ('KB-1 đánh giá khả năng từ chối định danh không hợp lệ và duy trì ngữ cảnh thuê bao '
                    'khi tái sử dụng luồng. KB-2 kiểm tra cô lập dữ liệu bằng dữ liệu giả lập trong môi '
                    'trường kiểm thử có kiểm soát. Mục 5.1 nêu tập mẫu và Mục 5.2 báo cáo kết quả.'),
            'D.2': ('KB-3 đối chiếu cấu hình Baseline và Proposed trên tải nghiệp vụ 80 người dùng ảo '
                    'trong cửa sổ đo 60 giây. Thu thập thông lượng, độ trễ theo phân vị và mã phản hồi '
                    'theo nhóm thuê bao. Thiết lập và kết quả được trình bày tại Mục 5.1 và Mục 5.3.1.'),
        }[key]
        MANIFEST['code'].append({'id': key, 'title': title, 'representation': 'method-summary'})
        return raw(heading + '\n' + literal(method))

    original = CODE[key]
    recovered = re.sub(
        r'(?m)^(\s*(?:POSTGRES_PASSWORD|SPRING_DATASOURCE_PASSWORD|APP_JWT_SECRET):).*?$',
        r'\1 <GIÁ TRỊ CẤU HÌNH RIÊNG>', original) if key == 'C.1' else original
    path = 'assets/code/v4/' + key.replace('.', '-') + '.txt'
    write(path, recovered)
    MANIFEST['code'].append({'id': key, 'title': title, 'path': path, 'source': DOCX.name,
                             'sha256': hashlib.sha256(recovered.encode('utf-8')).hexdigest(),
                             'representation': 'redacted-listing' if recovered != original else 'listing'})
    return raw(heading + '\n'
               '\\VerbatimInput[breaklines,breakanywhere,breaksymbolleft={},baselinestretch=1,samepage=false,formatcom={\\clubpenalty10000\\widowpenalty10000},'
               'fontsize=\\fontsize{9bp}{11bp}\\selectfont]{' + path + '}')


def render_figure(images, caption, lead=''):
    number = re.match(r'Hình\s+(\d+\.\d+[ab]?):\s*', plain(caption['c']))[1]
    title = strip_prefix(unstyled(caption['c']), r'Hình\s+\d+\.\d+[ab]?:\s*')
    assets = [IMAGE_DATA[Path(image['c'][2][0]).stem] for image in images]
    landscape = number in LANDSCAPE_FIGURES
    label = 'fig:v4-' + number.replace('.', '-')
    MANIFEST['figures'].append(dict(number=number, caption=title, landscape=landscape, images=assets))
    command = '\\VfourFigure' if len(assets) == 1 else '\\VfourFigureGroup'
    figure = command + '{' + number + '}{' + ','.join(a['path'] for a in assets) + '}{' + literal(title) + '}{' + label + '}'
    if landscape:
        limit = '.62' if number == '4.9' else '.72'
        figure = '\\begin{landscape}\n\\renewcommand{\\VfourImageMaxHeight}{' + limit + '\\textheight}\n' + lead + '\n' + figure + '\n\\end{landscape}'
    return raw(figure)


def landscape_lead(result, extra_paragraph=False):
    """Keep the complete introducing paragraph (and adjacent heading) with its object."""
    lead = []
    if result and result[-1]['t'] in ('Para', 'Plain'):
        lead.insert(0, result.pop())
        if result and result[-1]['t'] == 'RawBlock' and re.match(r'\\(?:section|subsection|subsubsection)\{', result[-1]['c'][1]):
            lead.insert(0, result.pop())
        if extra_paragraph and result and result[-1]['t'] in ('Para', 'Plain'):
            lead.insert(0, result.pop())
    return latex(lead) if lead else ''


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
            images = [image_node(block)]
            while next_block and image_node(next_block):
                images.append(image_node(next_block))
                i += 1
                next_block = blocks[i+1] if i+1 < len(blocks) else None
            caption = re.match(r'Hình\s+(\d+\.\d+[ab]?):', plain(next_block))
            if caption is None:
                raise ValueError(f'Missing caption after {images[-1]["c"][2][0]}')
            number = caption[1]
            lead = landscape_lead(result) if number in LANDSCAPE_FIGURES else ''
            result.append(render_figure(images, next_block, lead))
            i += 1
        elif block['t'] == 'Para' and re.match(r'^Bảng \d+\.\d+:', plain(block)):
            assert next_block and next_block['t'] == 'Table'
            number = re.match(r'Bảng\s+(\d+\.\d+):', plain(block))[1]
            lead = landscape_lead(result, extra_paragraph=number == '4.2') if len(next_block['c'][2]) >= 4 else ''
            result.append(render_table(next_block, block, lead))
            i += 1
        elif block['t'] == 'Table':
            result.append(render_code(block) if mode == 'appendix' else render_table(block))
        elif mode == 'appendix' and block['t'] == 'Para' and re.match(r'^[A-D]\.\d+\. ', plain(block)):
            title = re.sub(r'^[A-D]\.\d+\. ', '', plain(block))
            key = re.match(r'^([A-D]\.\d+)', plain(block))[1].replace('.', '-')
            result.append(raw('\\Needspace{90bp}\n\\section{' + literal(title) + '}\\label{v4-sec-' + key + '}'))
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
    source = SOURCE.read_text(encoding='utf-8')
    for path in (SOURCE, PDF, DOCX):
        MANIFEST['sources'][path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
    MANIFEST['approved_edits_sha256'] = hashlib.sha256(
        (ROOT / 'assets/v4-approved-edits.json').read_bytes()).hexdigest()
    body = source[source.index('# **PHẦN I.'):source.index('# **TÀI LIỆU THAM KHẢO')]
    cleaned = extract_images(clean_markdown(apply_approved_edits(source)))
    with ZipFile(DOCX) as docx:
        CODE = docx_listings(docx)
        prefer_pdf_images(docx, body)
    doc = json.loads(pypandoc.convert_text(cleaned, 'json', format='markdown-smart-citations'))
    API = doc['pandoc-api-version']
    blocks = doc['blocks']
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
    # The next two-column table is the logo at the start of the bulletin forms.
    stop = next(i for i in range(starts[-1], len(blocks)) if blocks[i]['t'] == 'Table' and len(blocks[i]['c'][2]) == 2)
    starts.append(stop)
    for letter, start, end in zip('ABCD', starts, starts[1:]):
        write('appendices/v4-' + letter.lower() + '.tex', process(blocks[start:end], 'appendix'))
    if {entry['id'] for entry in MANIFEST['code']} != set(CODE):
        raise ValueError('Markdown and Word appendix listing identifiers differ.')
    MANIFEST['template_logos_retained'] = [IMAGE_DATA['image1'], IMAGE_DATA['image44']]
    write('assets/v4-import-manifest.json', json.dumps(MANIFEST, ensure_ascii=False, indent=2))
    print('Imported', len(MANIFEST['headings']), 'headings,', len(MANIFEST['figures']), 'figures,', len(MANIFEST['tables']), 'tables,', len(MANIFEST['code']), 'code listings')


IMAGE_DATA = {}
if __name__ == '__main__':
    main()
