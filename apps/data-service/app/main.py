"""Ocean PULSE Data Service - FastAPI Application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import health, polygons

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Backend data service for Ocean PULSE - aggregates data from Copernicus, OBIS, and other marine data sources",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(polygons.router, prefix="/api/v1", tags=["Pipeline"])


@app.get("/")
async def root():
    """Root endpoint - service info."""
    return {
        "service": settings.app_name,
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Railway."""
    return {"status": "healthy"}
