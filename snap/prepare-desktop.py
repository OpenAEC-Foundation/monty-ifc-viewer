import shlex,sys
from pathlib import Path
root=Path(sys.argv[1]);files=list((root/'usr/share/applications').glob('*.desktop'))
assert len(files)==1, 'Expected one app desktop entry'
p=files[0];text=p.read_text();line=next(x[5:] for x in text.splitlines() if x.startswith('Exec='));argv=shlex.split(line);binary=root/'usr/bin'/Path(argv[0]).name
assert binary.is_file(), f'Missing app binary: {binary}'
target=root/'usr/bin/monty-ifc-viewer'
if binary!=target:binary.rename(target)
text=text.replace('Exec='+line,'Exec=monty-ifc-viewer'+(' '+' '.join(argv[1:]) if len(argv)>1 else ''))
destination=root/'usr/share/applications/monty-ifc-viewer.desktop'
if p!=destination:p.unlink()
destination.write_text(text)
