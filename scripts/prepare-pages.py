#!/usr/bin/env python3
"""Package tracked website files for Pages without changing the LAN website."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '.cache/github-pages'

# Navigation URLs only. The UI, model, media and other resources stay unchanged.
REPLACEMENTS = {
    'index.html': [('href="/code/"', 'href="./code/"', 1)],
    'demo/assets/demo-ui.js': [('href="/"', 'href="../"', 3)],
}


def main():
    tracked = subprocess.check_output(
        ['git', 'ls-files', '-z', '--', 'dist/'], cwd=ROOT
    ).decode().strip('\0').split('\0')
    assert 'dist/index.html' in tracked
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir(parents=True)
    report = []
    for name in tracked:
        source = ROOT / name
        assert source.is_file() and not source.is_symlink(), name
        relative = source.relative_to(ROOT / 'dist').as_posix()
        original = source.read_bytes()
        data = original
        for old, new, count in REPLACEMENTS.get(relative, []):
            assert data.count(old.encode()) == count, f'Navigation changed: {relative}'
            data = data.replace(old.encode(), new.encode())
        target = OUTPUT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        report.append({
            'path': relative, 'bytes': len(data),
            'sourceSha256': hashlib.sha256(original).hexdigest(),
            'publishedSha256': hashlib.sha256(data).hexdigest(),
        })
    (OUTPUT / '.nojekyll').touch()
    assert {x['path'] for x in report if x['sourceSha256'] != x['publishedSha256']} == set(REPLACEMENTS)
    assert sum(x['bytes'] for x in report) < 1024**3, 'Pages site exceeds 1 GiB'
    (OUTPUT.parent / 'github-pages-manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f'Packaged {len(report)} files; only four navigation URLs adapted; all other bytes unchanged.')


if __name__ == '__main__':
    main()
