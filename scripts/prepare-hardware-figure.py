#!/usr/bin/env python3
"""Update only the model-name text in the pinned vector figure, then render lossless PNG."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
from pypdf import PdfReader, PdfWriter
from pypdf.generic import DecodedStreamObject
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'source/paper-hardware/thresholds-main-5be61b7.pdf'
cache = ROOT / '.cache/anchor-thresholds'
cache.mkdir(parents=True, exist_ok=True)
# Incremental writing preserves the source's other objects byte-for-byte too.
writer = PdfWriter(source, incremental=True)
changed = 0
for page in writer.pages:
    original = page.get_contents().get_data()
    def rename(match):
        global changed
        # This supplied PDF encodes each glyph as a UTF-16BE literal. Keep every
        # other content-stream byte intact, including the original float precision.
        glyphs = b''.join(re.findall(rb'\(([^()]*)\)', match[1]))
        if glyphs != 'Anchor-0'.encode('utf-16-be'):
            return match[0]
        changed += 1
        end = match[1].index(b'(\x00r)') + len(b'(\x00r)')
        return b'[' + match[1][:end] + b' ]\nTJ'
    revised = re.sub(rb'\[(.*?)\]\s*TJ', rename, original, flags=re.S)
    content = DecodedStreamObject()
    content.set_data(revised)
    page.replace_contents(content)
assert changed == 1, 'Expected one model legend in the supplied vector figure'
derived = cache / 'hardware-thresholds-current.pdf'
with derived.open('wb') as out:
    writer.write(out)
assert 'Anchor\n' in PdfReader(derived).pages[0].extract_text()
assert 'Anchor-0' not in PdfReader(derived).pages[0].extract_text()
render = shutil.which('pdftoppm')
assert render, 'pdftoppm is required'
target = ROOT / 'dist/assets/images/hardware-thresholds-current'
subprocess.run([render, '-scale-to-x', '3414', '-scale-to-y', '-1', '-singlefile', '-png', str(derived), str(target)], check=True)
baseline = cache / 'original'
subprocess.run([render, '-scale-to-x', '3414', '-scale-to-y', '-1', '-singlefile', '-png', str(source), str(baseline)], check=True)
original_image = Image.open(baseline.with_suffix('.png')).convert('RGB')
renamed_image = Image.open(target.with_suffix('.png')).convert('RGB')
bounds = ImageChops.difference(original_image, renamed_image).getbbox()
assert original_image.size == renamed_image.size == (3414, 2271)
assert bounds == (1229, 2142, 1259, 2168), 'Pixels outside the renamed legend changed'
record = {
    'sourceCommit': '5be61b757506e6bf0b7f8e8370bab585294bf907',
    'sourcePath': 'figures/realworld_position_threshold_sensitivity.pdf',
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'change': 'Only the -0 glyphs are removed from the Anchor legend; all other content-stream bytes, plot operators and font positioning remain intact.',
    'output': str(target.with_suffix('.png').relative_to(ROOT)),
    'outputSha256': hashlib.sha256(target.with_suffix('.png').read_bytes()).hexdigest(),
    'verification': {'dimensions': list(renamed_image.size), 'changedPixelBounds': list(bounds), 'pixelsOutsideLegendChanged': 0},
}
(ROOT / 'docs/hardware-figure-provenance.json').write_text(json.dumps(record, indent=2) + '\n')
print('Rendered the pinned vector figure with one renamed legend; plot geometry unchanged')
