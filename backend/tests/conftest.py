"""
Shared fixtures for QRGate backend tests
"""
import os
from pathlib import Path

# Load BASE_URL from frontend env
def get_base_url():
    frontend_env = Path(__file__).parent.parent.parent / 'frontend' / '.env'
    if frontend_env.exists():
        with open(frontend_env) as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip().rstrip('/')
    return os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

BASE_URL = get_base_url()
