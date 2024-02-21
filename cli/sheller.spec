# -*- mode: python ; coding: utf-8 -*-

import os

block_cipher = None


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
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
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
    icon=['../src-tauri/icons/icon.ico']
)
