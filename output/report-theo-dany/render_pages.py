from pathlib import Path
import importlib.util, os, shutil, sys
BASE=Path(__file__).resolve().parent
os.environ['PATH']=r'C:\Users\caotu\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin'+os.pathsep+os.environ['PATH']
renderer=Path(r'C:\Users\caotu\.codex\plugins\cache\openai-primary-runtime\documents\26.1105.12137\skills\documents\render_docx.py')
spec=importlib.util.spec_from_file_location('canonical_render_docx',renderer)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
def word_pdf(doc_path,user_profile,convert_tmp_dir,stem,verbose):
    target=Path(convert_tmp_dir)/(stem+'.pdf')
    shutil.copy2(BASE/'Bao cao NCKH theo dan y.pdf',target)
    return str(target),'Native Word PDF export: Windows runtime has no bundled LibreOffice.'
mod.convert_to_pdf=word_pdf
out=BASE/(sys.argv[1] if len(sys.argv)>1 else 'pages')
paths=mod.rasterize(str(BASE.parents[1]/'Bao cao NCKH bo sung ngan xep 9 tang.docx'),str(out),130,False,False)
print('Rendered',len(paths),'pages through render_docx.py')
