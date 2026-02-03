"""
Initialize and run FastAPI app with Uvicorn.
Can be run from any folder or inside Docker.
"""

import os
import sys
import uvicorn

# Add backend folder to Python path dynamically
# This ensures 'api' package is always found
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Optional: print for debug
#print("Python path:", sys.path)
#print("Current dir:", os.getcwd())

# Run Uvicorn
if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",  # module:variable
        host="0.0.0.0",
        port=8000,
        reload=True  # auto-reload during development
    )
