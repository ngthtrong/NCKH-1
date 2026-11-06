"""Export build XML with the native desktop engine; no network renderer."""
from pathlib import Path
import json
import subprocess
import sys
import importlib.util

BASE=Path(__file__).resolve().parents[1]
EXE=BASE.parent/'.diagram-tools/drawio/draw.io.exe'
BUILD=BASE/'_build'
MODE=sys.argv[1] if len(sys.argv)>1 else 'preview'
DEST=BUILD/'preview' if MODE=='preview' else BUILD/'final'
DEST.mkdir(exist_ok=True)
manifest=json.loads((BUILD/'manifest.json').read_text(encoding='utf-8'))

subdirs=sorted({str(Path(m['stem']).parent).replace('.', '') for m in manifest})
for subdir in subdirs:
    target=DEST/subdir;target.mkdir(exist_ok=True)
    formats=['png'] if MODE=='preview' else ['png','svg']
    for fmt in formats:
        args=[str(EXE),'-x','-f',fmt,'-b','20','--theme','light','--timeout','30','-o',str(target),str(BUILD/subdir),'--disable-gpu']
        if fmt=='png':args+=['--width','1800' if MODE=='preview' else '2400']
        if MODE!='preview':args+=['-e']
        r=subprocess.run(args,capture_output=True,timeout=180)
        print(r.stdout.decode('utf-8',errors='replace'),flush=True)
        if r.returncode:raise RuntimeError(r.stderr.decode('utf-8',errors='replace'))

if MODE!='preview':
    spec=importlib.util.spec_from_file_location('repair',BASE.parent/'AIDraw/drawio-skill/scripts/repair_png.py')
    repair=importlib.util.module_from_spec(spec);spec.loader.exec_module(repair)
    for p in DEST.rglob('*.png'):repair.repair(str(p))
print('Exported',MODE,flush=True)
