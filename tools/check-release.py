#!/usr/bin/env python3
"""Offline release checks; --publish additionally enforces recorded artwork rights."""
import argparse
import json
from pathlib import Path
import re
import struct
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--publish', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
errors = []
def check(ok, message):
    if not ok:
        errors.append(message)

manifest = json.loads((root / 'manifest.json').read_text())
for key in ('schemaVersion', 'id', 'name', 'version', 'author', 'description', 'kinds', 'entryPoints'):
    check(bool(manifest.get(key)), f'Missing manifest field: {key}')
check(manifest.get('schemaVersion') == 1, 'Manifest schema must be 1')
check(re.fullmatch(r'[a-z0-9]+(?:[._-][a-z0-9]+)+', manifest['id']) is not None, 'ID must be namespaced lowercase')
check(not manifest['id'].startswith(('omarchy.', 'local.')), 'Release ID must not use omarchy.* or local.*')
for kind, entry in (('service', 'service'), ('bar-widget', 'barWidget')):
    check(kind in manifest['kinds'], f'Missing kind: {kind}')
    path = manifest['entryPoints'].get(entry, '')
    check(bool(path) and '..' not in path and not path.startswith('/') and (root/path).is_file(), f'Invalid entry: {entry}')
for file in ('README.md', 'LICENSE', 'THIRD_PARTY.md', 'fonts/OFL.txt', 'fonts/Silkscreen-Regular.ttf', 'assets/README.md', 'assets/LICENSE', 'docs/OMATE-LICENSE.txt'):
    check((root/file).is_file(), f'Missing {file}')
for file in ('BarWidget.qml', 'omachy-pixels', 'README.md'):
    check(manifest['id'] in (root/file).read_text(), f'Plugin ID missing from {file}')
expected = {**{f'ship_{n}.png': (32,32) for n in range(1,21)},
            **{f'enemy_{n}.png': ((48,48) if n == 2 else (32,32)) for n in range(1,6)},
            **{f'boss_{n}.png': (192,128) for n in range(1,4)},
            'bullet.png': (32,16), 'enemy_bullet.png': (24,24),
            'thrusters_sheet.png': (128,32), 'enemy_thruster_sheet.png': (128,32),
            'explode_sheet_big.png': (704,64), 'explode_sheet_small.png': (352,32),
            'impact_big_sheet.png': (672,96), 'impact_small_sheet.png': (336,48),
            'coin_sheet.png': (96,24), 'coin_particle.png': (16,16)}
for name, size in expected.items():
    file = root/'assets'/name
    check(file.is_file(), f'Missing sprite: {name}')
    if file.is_file():
        data = file.read_bytes()
        check(data[:8] == b'\x89PNG\r\n\x1a\n' and len(data) >= 24, f'Invalid PNG: {name}')
        if len(data) >= 24:
            check(struct.unpack('>II', data[16:24]) == size, f'Unexpected sprite dimensions: {name}')
for file in root.rglob('*'):
    if '.git' in file.parts:
        continue
    check(not file.is_symlink(), f'Symlink is not allowed: {file.relative_to(root)}')
    if file.is_file() and file.suffix in ('.qml', '.js', '.cjs', '.py', '.md', '.json'):
        text = file.read_text()
        check(re.search(r'/home/[A-Za-z0-9_-]+/', text) is None, f'Personal absolute path in {file.relative_to(root)}')
        check(re.search(r'gh[pousr]_[A-Za-z0-9]{20,}', text) is None, f'Possible GitHub credential in {file.relative_to(root)}')
if args.publish:
    check('PENDING' not in (root/'assets/README.md').read_text(), 'Sprite redistribution permission is still PENDING')
    check('release hold' not in (root/'THIRD_PARTY.md').read_text(), 'Third-party release hold remains')
    check('Tim Hyatt' in (root/'assets/README.md').read_text(), 'Artwork creator must be credited')
    check('Tim Hyatt' in manifest.get('author', ''), 'Publisher must be credited in manifest')
    check((root/'preview.png').is_file(), 'Release preview is missing')
if errors:
    print('\n'.join('FAIL: ' + e for e in errors))
    sys.exit(1)
print(f'PASS: manifest, entry points, {len(expected)} PNGs, license files, ID consistency, symlinks and portable paths')
if not args.publish:
    print('Run with --publish to also check release artwork credits and the preview. Public repository and listing status are checked separately.')
