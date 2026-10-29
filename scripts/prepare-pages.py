#!/usr/bin/env python3
"""Package tracked website files for Pages without changing the LAN website."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import re
import posixpath
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '.cache/github-pages'

# Navigation URLs only. The UI, model, media and other resources stay unchanged.
REPLACEMENTS = {
    'index.html': [('href="/code/"', 'href="./code/"', 1)],
    'demo/assets/demo-ui.js': [('href="/"', 'href="../"', 3)],
}


def main():
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT).decode().strip()
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
    assert {x['path'] for x in report if x['sourceSha256'] != x['publishedSha256']} == set(REPLACEMENTS)
    # Version all existing relative code/data references, including module imports.
    # Media already carries its own content revisions and remains byte-identical.
    paths = {x['path'] for x in report}
    for item in report:
        relative = item['path']
        if Path(relative).suffix not in {'.html', '.js', '.mjs', '.css'}:
            continue
        target = OUTPUT / relative
        content = target.read_text()
        def version(match):
            quote, value = match.group(1), match.group(2)
            parsed = urlsplit(value)
            resolved = posixpath.normpath(posixpath.join(posixpath.dirname(relative), parsed.path))
            if parsed.scheme or parsed.netloc or value.startswith('/') or resolved not in paths:
                return match.group(0)
            if Path(parsed.path).suffix not in {'.js', '.mjs', '.css', '.json'} or parsed.query:
                return match.group(0)
            return quote + parsed.path + '?v=' + revision + (('#' + parsed.fragment) if parsed.fragment else '') + quote
        content = re.sub(r'''(["'])([^"'\s<>]+)\1''', version, content)
        if relative.endswith('.html'):
            prefix = '../' * relative.count('/')
            content = content.replace('</head>', f'<script src="{prefix}pages-version.js?v={revision}" data-revision="{revision}" data-base="{prefix}" defer></script>\n</head>')
        target.write_text(content)
        item['publishedSha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
        item['bytes'] = target.stat().st_size
    (OUTPUT / 'version.json').write_text(json.dumps({'revision': revision}) + '\n')
    (OUTPUT / 'pages-version.js').write_text('''(() => {
  const script = document.currentScript;
  const revision = script.dataset.revision;
  const base = new URL(script.dataset.base || './', location.href);
  // Check on opening/reloading a page, including a browser back-cache restore.
  // Do not interrupt an active video or simulation with periodic reloads.
  const check = async () => {
    try {
      const url = new URL('version.json', base);
      url.searchParams.set('check', Date.now());
      const response = await fetch(url, {cache: 'no-store'});
      if (!response.ok) return;
      const latest = (await response.json()).revision;
      if (!/^[a-f0-9]{40}$/.test(latest) || latest === revision) return;
      const next = new URL(location.href);
      if (next.searchParams.get('v') === latest) return;
      next.searchParams.set('v', latest);
      location.replace(next.href);
    } catch { /* Keep the available page usable if the network is unavailable. */ }
  };
  check();
  addEventListener('pageshow', event => { if (event.persisted) check(); });
})();\n''')
    (OUTPUT / '.nojekyll').touch()
    assert sum(x['bytes'] for x in report) < 1024**3, 'Pages site exceeds 1 GiB'
    (OUTPUT.parent / 'github-pages-manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f'Packaged {len(report)} files with navigation/cache compatibility; media and model bytes unchanged. Version: {revision}')


if __name__ == '__main__':
    main()
