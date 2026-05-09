"""Vercel @vercel/python entry point for the Beli Aman BAP.

Mirrors the existing /api/index.py shim used by the JD BAP. Vercel's Python
runtime looks for an `app` symbol exported from the file under /api/.
"""

import os
import sys

# This file lives at: <repo>/apps/beli-aman-bap/vercel/api/index.py
# We want to import: <repo>/apps/beli-aman-bap/main.py
_here = os.path.dirname(os.path.abspath(__file__))
_app_dir = os.path.dirname(os.path.dirname(_here))  # apps/beli-aman-bap
_repo_root = os.path.dirname(os.path.dirname(_app_dir))  # repo root
_beckn_lib = os.path.join(_repo_root, "packages", "beckn-protocol")

for p in (_app_dir, _beckn_lib):
    if p not in sys.path:
        sys.path.insert(0, p)

# Use __import__ to avoid name-collision between Python's `app` module and
# the FastAPI `app` instance Vercel expects.
_main = __import__("main", fromlist=["app"])
app = _main.app
