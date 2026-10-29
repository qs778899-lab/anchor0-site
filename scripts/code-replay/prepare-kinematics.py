"""Extract only kinematics from the user-supplied model; no dynamics are replayed."""
import hashlib
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile

root = Path(__file__).resolve().parents[2]
archive = Path(sys.argv[1] if len(sys.argv) > 1 else '/Users/qs/Desktop/web.zip')
source_path = 'web/resources/robot/mujoco/scene_free_pearl_lightgray.xml'
with ZipFile(archive) as bundle:
    raw = bundle.read(source_path)
model = ET.fromstring(raw)
for child in list(model):
    if child.tag not in {'compiler', 'default', 'worldbody'}:
        model.remove(child)
compiler = model.find('compiler')
for attr in ('meshdir', 'texturedir'):
    compiler.attrib.pop(attr, None)
compiler.set('inertiafromgeom', 'false')
compiler.set('fusestatic', 'false')
for default in model.findall('.//default'):
    for child in list(default):
        if child.tag not in {'default', 'joint'}:
            default.remove(child)
for parent in [model.find('worldbody'), *model.findall('.//body')]:
    for child in list(parent):
        if child.tag not in {'body', 'joint', 'freejoint', 'inertial'}:
            parent.remove(child)
output = root / 'source/code-replay/robot-kinematics.xml'
output.parent.mkdir(parents=True, exist_ok=True)
ET.indent(model)
output.write_text('<!-- Kinematic subset of supplied Archon G1; see provenance.json. -->\n' + ET.tostring(model, encoding='unicode') + '\n')
print('Original model SHA-256:', hashlib.sha256(raw).hexdigest())
print('Kinematic model:', output)
