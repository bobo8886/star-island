"""Build a player-only offline release. Python standard library; no credentials."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
OUT = ROOT / 'output' / 'releases' / ('v' + VERSION)
OUT.mkdir(parents=True, exist_ok=True)
subprocess.run(['node', str(ROOT / 'scripts/build-standalone.cjs')], cwd=ROOT, check=True)
subprocess.run(['node', str(ROOT / 'tests/bundle-integrity.cjs')], cwd=ROOT, check=True)

name = 'star-island-v' + VERSION
html = OUT / (name + '.html')
shutil.copyfile(ROOT / '星屿寻迹.html', html)
archive = OUT / (name + '-offline.zip')
members = {
    '星屿寻迹.html': ROOT / '星屿寻迹.html',
    'LICENSE': ROOT / 'LICENSE',
    'NOTICE': ROOT / 'NOTICE',
    'THIRD_PARTY_NOTICES.md': ROOT / 'THIRD_PARTY_NOTICES.md',
    'START_HERE.md': ROOT / 'docs/OFFLINE_README.md',
}
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for relative, source in members.items():
        info = zipfile.ZipInfo(name + '/' + relative, date_time=(2026, 11, 16, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        z.writestr(info, source.read_bytes())

with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None, 'Corrupt release archive'
    assert set(z.namelist()) == {name + '/' + item for item in members}
    for relative, source in members.items():
        assert z.read(name + '/' + relative) == source.read_bytes(), relative

records = [{'name': p.name, 'bytes': p.stat().st_size,
            'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in [html, archive]]
(OUT / 'SHA256SUMS.txt').write_text(''.join(r['sha256'] + '  ' + r['name'] + '\n' for r in records), encoding='utf-8')
(OUT / 'build-report.json').write_text(json.dumps({'version': VERSION, 'assets': records, 'members': list(members)}, indent=2), encoding='utf-8')
print(json.dumps({'version': VERSION, 'assets': records, 'noticeFilesVerified': True}))
