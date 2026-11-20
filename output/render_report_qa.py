"""Use Word-exported PDF with the canonical document PNG renderer on Windows.

The runtime has no bundled LibreOffice on Windows. No desktop LibreOffice is used.
"""
from pathlib import Path
import importlib.util, os, shutil
root=Path(r'D:\NCKH\output\report-revision-qa')
os.environ['PATH']=r'C:\Users\caotu\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin'+os.pathsep+os.environ['PATH']
renderer=Path(r'C:\Users\caotu\.codex\plugins\cache\openai-primary-runtime\documents\26.1105.12137\skills\documents\render_docx.py')
spec=importlib.util.spec_from_file_location('canonical_render_docx',renderer)
mod=importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
def word_pdf(doc_path,user_profile,convert_tmp_dir,stem,verbose):
    target=Path(convert_tmp_dir)/(stem+'.pdf')
    shutil.copy2(root/'Research Report.pdf',target)
    return str(target),'Microsoft Word native PDF export'
mod.convert_to_pdf=word_pdf
pages=mod.rasterize(r'D:\NCKH\Research Report.docx',str(root/'pages'),145,False,False)
print('Rendered',len(pages),'pages using render_docx.py')
