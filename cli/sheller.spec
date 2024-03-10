# -*- mode: python ; coding: utf-8 -*-

import os


a = Analysis(
    ['sheller.py'],
    pathex=['mangascraper'],
    binaries=[],
    datas=[
        ('mangascraper/modules.yaml', 'mangascraper'),
        ('mangascraper/modules/*.py', 'mangascraper/modules')
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[f'mangascraper/modules/{os.listdir("mangascraper/modules")[0]}'],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='sheller',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
