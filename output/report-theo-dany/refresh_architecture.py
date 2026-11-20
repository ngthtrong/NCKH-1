from pathlib import Path
import subprocess,sys,importlib.util
base=Path(__file__).resolve().parent;root=base.parents[1];fig=base/'figures'
stem='hinh_3_2_kien_truc'
for fmt,folder,filename,width,embed in [('png','png',stem+'.png',2000,False),('svg','svg',stem+'.svg',None,True),('png','editable-png',stem+'.drawio.png',2400,True)]:
    target=fig/folder/filename
    args=[str(root/'.diagram-tools/drawio/draw.io.exe'),'-x','-f',fmt,'-b','15','--theme','light','--timeout','40','-o',str(target),str(fig/'drawio'/(stem+'.drawio')),'--disable-gpu']
    if width:args+=['--width',str(width)]
    if embed:args+=['-e']
    run=subprocess.run(args,capture_output=True,timeout=90)
    if run.returncode:raise RuntimeError(run.stderr.decode(errors='replace'))
    if fmt=='png' and embed:
        spec=importlib.util.spec_from_file_location('repair',root/'AIDraw/drawio-skill/scripts/repair_png.py')
        mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);mod.repair(str(target))
    print('Refreshed',filename,flush=True)
