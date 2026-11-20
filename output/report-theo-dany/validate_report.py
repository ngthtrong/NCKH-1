from pathlib import Path
import json,re,hashlib,zipfile
from docx import Document
from pypdf import PdfReader
from PIL import Image,ImageChops
base=Path(__file__).resolve().parent;root=base.parents[1]
out=root/'Bao cao NCKH bo sung ngan xep 9 tang.docx'
doc=Document(out)
expected=json.loads((base/'build-summary.json').read_text(encoding='utf-8'))['outline_headings']
headings=[p.text for p in doc.paragraphs if p.style.name.startswith('Heading')]
assert headings[:-1]==expected, 'Outline mismatch'
assert headings[-1]=='TÀI LIỆU THAM KHẢO'
assert len(doc.inline_shapes)==19
assert len(doc.tables)==11
assert hashlib.sha256((root/'Report.docx').read_bytes()).hexdigest()=='a7e55776dd2a5a5ab32129df5e1efa08f79322217484147de5b102085edecb31'
pdf=PdfReader(base/'Bao cao NCKH theo dan y.pdf')
texts=[p.extract_text() for p in pdf.pages]
assert all(len(s.strip())>30 for s in texts),'Blank page'
assert not any('Error! Reference source not found' in s or 'Error! Bookmark not defined' in s for s in texts)
manifest=json.loads((base/'figures/manifest.json').read_text(encoding='utf-8'))
captions=[p.text for p in doc.paragraphs if p.style.name=='Caption' and p.text.startswith('Hình ')]
assert captions==[f['caption'] for f in manifest]
assert not any('\ufffd' in s for s in texts),'Invalid character'
# Reuse prior visual inspection only if the rendered body is pixel-identical.
old={}
for path in (base/'pages-final').glob('page-*.png'):
    with Image.open(path) as im:
        h=hashlib.sha256(im.crop((0,0,im.width,1380)).tobytes()).hexdigest()
    old[h]=path.name
review=[]
for path in sorted((base/'pages-nine-layer-final').glob('page-*.png'),key=lambda p:int(p.stem.split('-')[-1])):
    with Image.open(path) as im:
        h=hashlib.sha256(im.crop((0,0,im.width,1380)).tobytes()).hexdigest()
    review.append({'page':path.name,'matches_reviewed_page':old.get(h),'needs_visual_review':h not in old})
facts={'pages':len(pdf.pages),'outline_headings':len(expected),'figures':len(doc.inline_shapes),'tables':len(doc.tables),'source_unchanged':True,'visual_review':review}
(base/'final-validation.json').write_text(json.dumps(facts,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(facts,ensure_ascii=False,indent=2))
