#!/usr/bin/env python3
"""Import Report_newest and apply the approved copy edits.

Requires pypandoc_binary, PyMuPDF and Pillow only when re-importing; ordinary
report builds need none of these. The three source files are never modified.
"""
from __future__ import annotations

import base64
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
DOCX = ROOT.parent / 'Report_newest.docx'
SOURCE = DOCX.with_suffix('.docx.md')
PDF = DOCX.with_suffix('.docx.pdf')
APPROVED_EDITS = ROOT / 'assets/newest-approved-edits.json'
REFERENCE_COUNT = 24
MARKDOWN_FORMAT = 'markdown-smart-citations-implicit_figures'
API = []
MANIFEST = {'sources': {}, 'headings': [], 'figures': [], 'tables': [], 'code': []}
LANDSCAPE_FIGURES = {'2.6', '2.7', '3.10', '4.4', '4.7', '4.8', '4.9', '5.2', '5.3b'}
FIGURE_HEIGHT_LIMIT = {'2.6': '.52', '3.10': '.55', '4.9': '.62', '5.4': '.355'}
LANDSCAPE_LEAD_COUNT = {'5.3b': 2}
FIGURE_NOTES = {
    '5.2': 'R06/R08: label KB-1/KB-2 evidence and report NFR-03 above threshold',
    '5.3b': 'R07/R08: classify HTTP failures, total RPS, and Pub/Sub evidence',
}
FIGURE_ID = r'\d+\.\d+[a-z]?'
TABLE_ID = r'[\dA-D]+\.\d+[a-z]?'
LISTING_ID = re.compile(r'^Trích đoạn ([A-D](?:\.\d+)+)\s*[-–]')


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


def image_definitions(source):
    def replace(match):
        name, mime, encoded = match.groups()
        data = base64.b64decode(encoded)
        suffix = {'image/png': '.png', 'image/jpeg': '.jpg'}[mime]
        path = Path('assets/figures/v4') / (name + suffix)
        with Image.open(io.BytesIO(data)) as img:
            width, height = img.size
        IMAGE_DATA[name] = {'image_id': name, 'path': path.as_posix(),
                            'markdown_sha256': hashlib.sha256(data).hexdigest(),
                            'markdown_dimensions': [width, height]}
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


def normalize_list_markers(source):
    """Turn Word export's typed markers into real Markdown list structure."""
    source = re.sub(r'(?m)^ {0,1}(\*\*)?\\- +', lambda m: '- ' + (m[1] or ''), source)
    source = re.sub(r'(?m)^ {0,1}\\\+ +', '    - ', source)
    source = re.sub(r'(?m)^(\d+)\\\. ', r'\1. ', source)
    source = re.sub(r'(?m)^\*\*(?:\((\d+)\)|(\d+)\\?\.) +',
                    lambda m: (m[1] or m[2]) + '. **', source)
    return source


def apply_approved_edits(source):
    # Human-readable text and embedded raster streams are different inputs.
    # Some short terms can also occur by chance inside base64 data.
    prose, marker, images = source.partition('\n[image1]:')
    edits = json.loads(APPROVED_EDITS.read_text(encoding='utf-8'))
    for edit in edits:
        before, after, count = edit['before'], edit['after'], edit['count']
        if prose.count(before) != count:
            raise ValueError(f"Recheck {edit['id']} at {edit['location']}")
        prose = prose.replace(before, after)
    return prose + marker + images


def body_image_ids(body):
    return re.findall(r'!\[[^\]\n]*\]\[(image\d+)\]', body)


def import_body_images(docx, body):
    """Recover Word originals in document order and cross-check the PDF."""
    word = ElementTree.fromstring(docx.read('word/document.xml')).find('{*}body')
    rels = ElementTree.fromstring(docx.read('word/_rels/document.xml.rels'))
    targets = {r.attrib['Id']: r.attrib['Target'] for r in rels}
    word_media = []
    in_body = False
    for node in word:
        heading = word_text(node).strip()
        if heading.startswith('PHẦN I. MỞ ĐẦU'):
            in_body = True
        elif in_body and heading.startswith('PHẦN III. KẾT LUẬN'):
            break
        if in_body:
            for blip in node.iterfind('.//{*}blip'):
                rel_id = next(v for k, v in blip.attrib.items() if k.endswith('}embed'))
                word_media.append('word/' + targets[rel_id])
    identifiers = body_image_ids(body)
    with fitz.open(PDF) as pdf:
        toc = pdf.get_toc()
        start = next(page for _, title, page in toc if title.startswith('PHẦN I. MỞ ĐẦU'))
        end = next(page for _, title, page in toc if title.startswith('PHẦN III. KẾT LUẬN'))
        images = [(page.number + 1, item) for page in pdf[start-1:end-1]
                  for item in page.get_image_info(xrefs=True)]
        for ident, word_path, (page_no, item) in zip(identifiers, word_media, images, strict=True):
            word_data = docx.read(word_path)
            word_size, word_digest = pixel_key(word_data)
            pdf_data = pdf.extract_image(item['xref'])['image']
            exact = pixel_key(pdf_data) == (word_size, word_digest)
            if not exact and not (
                ident in {'image10', 'image22', 'image25'}
                and item['width'] < word_size[0] and item['height'] < word_size[1]
                and abs(item['width'] / item['height'] - word_size[0] / word_size[1]) < .01
            ):
                raise ValueError(f'Unexpected Word/PDF image difference at {ident}, page {page_no}')
            data = pdf_data if exact else word_data
            info = IMAGE_DATA[ident]
            info.update(source=PDF.name if exact else DOCX.name, pdf_page=page_no, pdf_xref=item['xref'],
                        pdf_pixel_match=exact, docx_media=word_path, sha256=hashlib.sha256(data).hexdigest(),
                        width_px=word_size[0], height_px=word_size[1])
            path = ROOT / info['path']
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)


def walk_inlines(value):
    if isinstance(value, list):
        result = []
        for node in value:
            if isinstance(node, dict) and node['t'] == 'Str':
                pieces = re.split(r'(\[\d+\])', node['c'])
                for part in pieces:
                    if not part:
                        continue
                    if re.fullmatch(r'\[\d+\]', part):
                        number = int(part[1:-1])
                        if not 1 <= number <= REFERENCE_COUNT:
                            raise ValueError(f'Reference outside source bibliography: {part}')
                        result.append({'t': 'RawInline', 'c': ['latex', '\\cite{v4-%02d}' % number]})
                    else:
                        result.append({'t': 'Str', 'c': part})
            else:
                result.append(walk_inlines(node))
        return result
    if isinstance(value, dict):
        if value['t'] == 'RawInline' and value['c'] == ['html', '<br>']:
            return {'t': 'RawInline', 'c': ['latex', r'\newline{}']}
        if value['t'] in ('Para', 'Plain'):
            inlines = value['c']
            # Word exports some list-item endings as forced line breaks.
            while inlines and inlines[-1]['t'] == 'LineBreak':
                inlines = inlines[:-1]
            return {'t': value['t'], 'c': walk_inlines(inlines)}
        if value['t'] == 'OrderedList':
            (start, style, _), items = value['c']
            return {'t': 'OrderedList', 'c': [[start, style, {'t': 'Period'}], walk_inlines(items)]}
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


def landscape_table(table, number):
    return len(table['c'][2]) >= 4 and number != 'B.2'


def render_table(table, caption=None, lead='', following=''):
    heads, rows = table_rows(table)
    number = re.match(rf'Bảng\s+({TABLE_ID}):\s*', plain(caption['c']))[1] if caption else None
    title = strip_prefix(unstyled(caption['c']), rf'Bảng\s+{TABLE_ID}:\s*') if caption else None
    n = len(table['c'][2])
    landscape = landscape_table(table, number)
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
    elif number == '4.3':
        weights = [.23, .17, .30, .30]
    elif number == 'A.1':
        weights = [.14, .17, .28, .15, .26]
    elif number == 'B.2':
        weights = [.245, .195, .28, .28]
    elif number == 'D.1':
        weights = [.08, .10, .20, .18, .20, .24]
    elif number == 'D.3b':
        weights = [.24, .22, .22, .32]
    # widths sum to the available line width after column padding.
    spec = '@{}' + ''.join('P{\\dimexpr %.5f\\linewidth-%.3fbp\\relax}' % (w, 10*(n-1)*w) for w in weights) + '@{}'
    def render_row(row):
        cells = [latex(walk_inlines(cell)) for cell in row_cells(row)]
        cells = [cell.replace('http://127.0.0.1:8080/api', r'\nolinkurl{http://127.0.0.1:8080/api}')
                 .replace(r'\newline{}• ', r'\newline{}\VfourSubitemLabel{}~')
                 for cell in cells]
        if number == 'B.2':
            cells = [re.sub(r'(?<=\w)/(?=\w)', r'/\\allowbreak{}', cell)
                     .replace(r'Array\textless ', r'Array\textless{}\allowbreak{}')
                     for cell in cells]
        return ' & '.join(cells) + r' \\'
    header = '\n'.join(render_row(row) for row in heads)
    parts = []
    if landscape:
        parts.append(r'\begin{landscape}')
        if lead:
            parts.append(lead)
    environment = 'longtable' if caption else 'longtable*'
    parts += [r'\begingroup\VfourTableSetup']
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
        if following:
            parts.append(following)
        parts.append(r'\end{landscape}')
    MANIFEST['tables'].append({'number': number, 'caption': title, 'columns': n,
                               'header_rows': len(heads), 'body_rows': len(rows), 'landscape': landscape})
    return raw('\n'.join(parts))


def render_code(table):
    heads, _ = table_rows(table)
    title = plain(row_cells(heads[0])[0][0])
    key = LISTING_ID.match(title)[1]
    heading = r'\par\Needspace{65bp}\noindent\textbf{' + literal(title) + r'}\par'
    recovered = CODE[key]
    path = 'assets/code/v4/' + key.replace('.', '-') + '.txt'
    write(path, recovered)
    MANIFEST['code'].append({'id': key, 'title': title, 'path': path, 'source': DOCX.name,
                             'sha256': hashlib.sha256(recovered.encode('utf-8')).hexdigest(),
                             'representation': 'listing'})
    return raw(heading + '\n'
               '\\VerbatimInput[breaklines,breakanywhere,breaksymbolleft={},baselinestretch=1,samepage=false,formatcom={\\clubpenalty10000\\widowpenalty10000},'
               'fontsize=\\fontsize{9bp}{11bp}\\selectfont]{' + path + '}')


def render_figure(images, caption, lead=''):
    number = re.match(rf'Hình\s+({FIGURE_ID}):\s*', plain(caption['c']))[1]
    title = strip_prefix(unstyled(caption['c']), rf'Hình\s+{FIGURE_ID}:\s*')
    assets = [IMAGE_DATA[Path(image['c'][2][0]).stem] for image in images]
    landscape = number in LANDSCAPE_FIGURES
    label = 'fig:v4-' + number.replace('.', '-')
    entry = dict(number=number, caption=title, landscape=landscape, images=assets)
    if number in FIGURE_NOTES:
        entry['rendered_correction'] = FIGURE_NOTES[number]
    MANIFEST['figures'].append(entry)
    command = '\\VfourFigure' if len(assets) == 1 else '\\VfourFigureGroup'
    figure = command + '{' + number + '}{' + ','.join(a['path'] for a in assets) + '}{' + literal(title) + '}{' + label + '}'
    limit = FIGURE_HEIGHT_LIMIT.get(number)
    if limit or landscape:
        height = '\\renewcommand{\\VfourImageMaxHeight}{' + (limit or '.72') + '\\textheight}'
        if landscape:
            figure = '\n'.join([r'\begin{landscape}', height, lead, figure, r'\end{landscape}'])
        else:
            figure = '\n'.join([r'\begingroup', height, figure, r'\endgroup'])
    return raw(figure)


def landscape_lead(result, paragraphs=1):
    """Keep complete introducing paragraphs with the object they describe."""
    lead = []
    while len(lead) < paragraphs and result and result[-1]['t'] in ('Para', 'Plain', 'OrderedList', 'BulletList'):
        lead.insert(0, result.pop())
    if lead:
        if result and result[-1]['t'] == 'RawBlock' and re.match(r'\\(?:section|subsection|subsubsection)\{', result[-1]['c'][1]):
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
            number = re.match(r'PHỤ LỤC ([A-D])[.:]', title)[1]
            title = re.sub(r'^PHỤ LỤC [A-D][.:]\s*', '', title)
            label = 'appendix-' + number
        else:
            number = re.match(r'CHƯƠNG (\d+)[.:]', title)[1]
            title = re.sub(r'^CHƯƠNG \d+[.:]\s*', '', title)
            label = 'chapter-' + number
        command = 'chapter'
    else:
        number = re.match(r'([\dA-D]+(?:\.\d+)*)\.?\s+', title)[1]
        title = re.sub(r'^[\dA-D]+(?:\.\d+)*\.?\s+', '', title)
        label = 'sec-' + number.replace('.', '-')
        command = {3: 'section', 4: 'subsection', 5: 'subsubsection'}[level]
    MANIFEST['headings'].append({'source': plain(c), 'rendered_title': title, 'command': command, 'label': 'v4-' + label})
    heading_tex = '\\' + command + '{' + literal(title) + '}\\label{v4-' + label + '}'
    if label == 'sec-2-2-4':
        heading_tex = '\\Needspace{.55\\textheight}\n' + heading_tex
    return raw(heading_tex)


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
            caption = re.match(rf'Hình\s+({FIGURE_ID}):', plain(next_block))
            if caption is None:
                raise ValueError(f'Missing caption after {images[-1]["c"][2][0]}')
            number = caption[1]
            lead = landscape_lead(result, paragraphs=LANDSCAPE_LEAD_COUNT.get(number, 1)) if number in LANDSCAPE_FIGURES else ''
            result.append(render_figure(images, next_block, lead))
            i += 1
        elif block['t'] == 'Para' and re.match(rf'^Bảng {TABLE_ID}:', plain(block)):
            assert next_block and next_block['t'] == 'Table'
            number = re.match(rf'Bảng\s+({TABLE_ID}):', plain(block))[1]
            # Keep the extended discussion of Table 1.1 with Figure 1.5,
            # so the full table uses a single wide page.
            landscape = landscape_table(next_block, number)
            lead = landscape_lead(result, paragraphs=2 if number == '4.2' else 1) if landscape and number != '1.1' else ''
            # A landscape table at the start of an appendix can carry its
            # chapter title and introduction without a title-only page.
            if (mode == 'appendix' and lead and len(result) == 1 and result[0]['t'] == 'RawBlock'
                    and result[0]['c'][1].startswith(r'\chapter{')):
                lead = latex([result.pop()]) + '\n' + lead
            following = ''
            if number == '1.2' and i + 2 < len(blocks) and blocks[i + 2]['t'] == 'Para':
                following = latex([walk_inlines(blocks[i + 2])])
                i += 1
            result.append(render_table(next_block, block, lead, following))
            i += 1
        elif block['t'] == 'Table':
            result.append(render_code(block) if mode == 'appendix' else render_table(block))
        else:
            result.append(walk_inlines(block))
        i += 1
    tex = latex(result)
    # Adjacent landscape objects can share the same page-building flow.
    tex = re.sub(r'\\end\{landscape\}\s*\\begin\{landscape\}', '\n', tex)
    for kind, prefix, available in [('Hình', 'fig:v4-', FIGURE_NUMBERS),
                                    ('Bảng', 'tab:v4-', TABLE_NUMBERS),
                                    ('Mục', 'v4-sec-', SECTION_NUMBERS),
                                    ('Chương', 'v4-chapter-', set('12345'))]:
        def ref(match):
            number = match[1]
            if number in available:
                return kind + '~\\ref{' + prefix + number.replace('.', '-') + '}'
            if kind == 'Hình' and number[-1].isalpha() and number[:-1] in available:
                return kind + '~\\ref{' + prefix + number[:-1].replace('.', '-') + '}' + number[-1]
            return match[0]
        tex = re.sub(kind + r'\s+([\dA-D]+(?:\.\d+)*[a-z]?)(?!\w|\.\d)', ref, tex)
    tex = re.sub(r'\n{3,}', '\n\n', tex)
    # Identifiers keep every character, with legal line breaks after underscores.
    # Verbatim listings are external files and are not changed by this operation.
    tex = tex.replace('\\_', '\\_\\allowbreak{}')
    return '% Content imported from Report_newest.docx.md with approved edits.\n' + tex


def main():
    global API, CODE, FIGURE_NUMBERS, TABLE_NUMBERS, SECTION_NUMBERS
    source = SOURCE.read_text(encoding='utf-8')
    for path in (SOURCE, PDF, DOCX):
        MANIFEST['sources'][path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
    MANIFEST['approved_edits_sha256'] = hashlib.sha256(APPROVED_EDITS.read_bytes()).hexdigest()
    body = source[source.index('# **PHẦN I.'):source.index('# **TÀI LIỆU THAM KHẢO')]
    cleaned = image_definitions(normalize_list_markers(clean_markdown(apply_approved_edits(source))))
    with ZipFile(DOCX) as docx:
        CODE = docx_listings(docx)
        import_body_images(docx, body)
    doc = json.loads(pypandoc.convert_text(cleaned, 'json', format=MARKDOWN_FORMAT))
    API = doc['pandoc-api-version']
    blocks = doc['blocks']
    headers = [(i, plain(b['c'][2])) for i, b in enumerate(blocks) if b['t'] == 'Header']
    locate = lambda prefix: next(i for i, title in headers if title.startswith(prefix))
    SECTION_NUMBERS = {m[1] for _, title in headers if (m := re.match(r'^([\dA-D]+(?:\.\d+)+)', title))}
    intro, body, end, refs, appendix = [locate(s) for s in ['PHẦN I.', 'PHẦN II.', 'PHẦN III.', 'TÀI LIỆU THAM KHẢO', 'PHỤ LỤC']]
    FIGURE_NUMBERS = {m[1] for b in blocks[intro:refs] if (m := re.match(rf'^Hình ({FIGURE_ID}):', plain(b)))}
    TABLE_NUMBERS = {m[1] for b in blocks[intro:] if (m := re.match(rf'^Bảng ({TABLE_ID}):', plain(b)))}
    write('chapters/introduction.tex', '\\addchap{PHẦN I. MỞ ĐẦU}\\label{chap:v4-introduction}\n' + process(blocks[intro+1:body], 'introduction'))
    chapter_starts = [locate('CHƯƠNG ' + str(i)) for i in range(1, 6)] + [end]
    folders = ['01-foundations', '02-architecture', '03-system', '04-implementation', '04-evaluation']
    for start, stop, folder in zip(chapter_starts, chapter_starts[1:], folders):
        write('chapters/' + folder + '/chapter.tex', process(blocks[start:stop], 'body'))
    write('chapters/conclusion.tex', '\\addchap{PHẦN III. KẾT LUẬN VÀ KIẾN NGHỊ}\\label{chap:v4-conclusion}\n' + process(blocks[end+1:refs], 'conclusion'))
    starts = [locate('PHỤ LỤC ' + letter + '.') for letter in 'ABCD']
    # The next two-column table is the logo at the start of the bulletin forms.
    stop = next(i for i in range(starts[-1], len(blocks)) if blocks[i]['t'] == 'Table' and len(blocks[i]['c'][2]) == 2)
    starts.append(stop)
    for letter, start, end in zip('ABCD', starts, starts[1:]):
        write('appendices/v4-' + letter.lower() + '.tex', process(blocks[start:end], 'appendix'))
    if {entry['id'] for entry in MANIFEST['code']} != set(CODE):
        raise ValueError('Markdown and Word appendix listing identifiers differ.')
    rendered_images = [asset['image_id'] for figure in MANIFEST['figures'] for asset in figure['images']]
    if rendered_images != body_image_ids(source[source.index('# **PHẦN I.'):source.index('# **PHẦN III.')]):
        raise ValueError('Missing or reordered body image during conversion.')
    if len(MANIFEST['figures']) != len(FIGURE_NUMBERS) or sum(t['number'] is not None for t in MANIFEST['tables']) != len(TABLE_NUMBERS):
        raise ValueError('Missing figure or table caption during conversion.')
    MANIFEST['template_logos_retained'] = ['assets/cover-frame.pdf', 'assets/template-headers.pdf']
    write('assets/v4-import-manifest.json', json.dumps(MANIFEST, ensure_ascii=False, indent=2))
    print('Imported', len(MANIFEST['headings']), 'headings,', len(MANIFEST['figures']), 'figures,', len(MANIFEST['tables']), 'tables,', len(MANIFEST['code']), 'code listings')


IMAGE_DATA = {}
if __name__ == '__main__':
    main()
