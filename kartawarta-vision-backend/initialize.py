import os
import sys
from services import generate_indexes
import uvicorn

def run_initialization():
    try:
        # Step 1: generate indexes
        print("Generating FAISS indexes (if missing)...")
        generate_indexes.generate_all(force=False)

        # Step 2: ensure app module is in sys.path
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        if BASE_DIR not in sys.path:
            sys.path.insert(0, BASE_DIR)

        # Step 3: run Uvicorn programmatically
        uvicorn.run(
            "app:app",        # module:variable
            host="0.0.0.0",
            port=8002,
            reload=True       # optional hot-reload for development
        )

        print("Initialization completed successfully.")

    except Exception as e:
        print(f"Initialization failed: {e}")
        exit(1)

if __name__ == "__main__":
    run_initialization()
