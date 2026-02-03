from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import router as api_router
from .auth import router as auth_router
from .collection import router as collection_router

origins = ["http://localhost:8081", "http://192.168.1.22:8081", "https://scaling-tribble-qv4756579p5c9g9q-3000.app.github.dev"]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")
app.include_router(api_router)
app.include_router(collection_router, prefix="/collection")
