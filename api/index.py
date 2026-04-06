"""Vercel serverless entry point for the BAP (buyer) FastAPI backend."""

import os
import sys

_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _root not in sys.path:
    sys.path.insert(0, _root)

# Import the FastAPI instance - use __import__ to avoid name collision
# between the `app` package and the `app` variable Vercel expects
_main = __import__("app.main", fromlist=["app"])
app = _main.app
