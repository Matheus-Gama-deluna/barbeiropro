from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[2]
paths=[]
for folder in ['src','server','backend','shared','_migration','tests']:
 paths.extend(p for p in (root/folder).rglob('*') if p.is_file() and not p.name.endswith('.bundle.mjs'))
for name in ['package.json','package-lock.json','README.md','BLINK_ALUNOS.md','index.html','vite.config.ts','tsconfig.json','components.json','schema-meta.json','.gitignore']:
 if (root/name).is_file():paths.append(root/name)
for p in (root/'scripts/native').iterdir():
 if p.is_file() and not p.name.startswith('apply-'): paths.append(p)
target=root/'dist/barbeiropro-source-v2.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
 for p in paths:
  if '.env' in p.name: raise RuntimeError('env not allowed')
  z.write(p,p.relative_to(root))
print(len(paths),'source files',target.stat().st_size,'bytes')
