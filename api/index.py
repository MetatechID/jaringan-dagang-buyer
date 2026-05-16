"""Vercel serverless entry point for the BAP (buyer) FastAPI backend.

As of 2026-05-16 this serves apps/beli-aman-bap (the Beli Aman BAP with
Beckn /api/v1/beckn/on_* routes, mirror tables, refund disputes, etc.).
The legacy top-level `app/main.py` is retired from the deploy.

The Beli Aman BAP folder uses a hyphen (`beli-aman-bap`) which isn't a
valid Python package name, so we load its main.py via SourceFileLoader and
pre-seed sys.path the way that module itself does at the top.
"""

import importlib.util
import os
import sys

_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_bap_dir = os.path.join(_root, "apps", "beli-aman-bap")
_beckn_pkg = os.path.join(_root, "packages", "beckn-protocol")

for p in (_root, _bap_dir, _beckn_pkg):
    if p not in sys.path:
        sys.path.insert(0, p)

# Disable background workers in serverless mode — Vercel functions are short-lived.
os.environ.setdefault("BECKN_WORKERS_ENABLED", "false")

_main_path = os.path.join(_bap_dir, "main.py")
_spec = importlib.util.spec_from_file_location("beli_aman_bap_main", _main_path)
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
app = _module.app
