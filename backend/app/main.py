from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
import os

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount static games directory
games_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "games")
app.mount("/games", StaticFiles(directory=games_dir), name="games")

# Mount admin panel (self-contained, separate from frontend)
admin_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "admin")
if os.path.isdir(admin_dir):
    app.mount("/admin", StaticFiles(directory=admin_dir, html=True), name="admin")

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint to ensure API is up and running.
    """
    return {"status": "ok", "message": "GIMMY API is running!"}

from app.api.v1.api import api_router

app.include_router(api_router, prefix=settings.API_V1_STR)
