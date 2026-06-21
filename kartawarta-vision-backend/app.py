from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import httpx

from core.tcg_manager import tcg_manager
from api.metrics import metrics_middleware, metrics_response

# Keep environment optimizations
import os
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"


app = FastAPI()

app.middleware("http")(metrics_middleware)


@app.get("/metrics", include_in_schema=False)
def metrics():
    return metrics_response()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://kartawarta.pl", "http://localhost:8081", "http://127.0.0.1:5500/", "http://192.168.1.22:8081", "https://scaling-tribble-qv4756579p5c9g9q-3000.app.github.dev"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    # app-scoped resources
    match_concurrency = int(os.getenv("VISION_MATCH_CONCURRENCY", "10"))
    app.state.matching_semaphore = asyncio.Semaphore(match_concurrency)
    app.state.http_client = httpx.AsyncClient()

    # Load FAISS indexes into tcg_manager
    tcg_manager.load_indexes()


# include API router
from api.endpoints import router as api_router
app.include_router(api_router)



