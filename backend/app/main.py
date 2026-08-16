from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import samples, pipeline
from app.ml import pipeline_runner


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML models once at startup; clean up on shutdown."""
    pipeline_runner.startup()
    yield
    # Nothing to clean up for now


app = FastAPI(title="eDNA Classification API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",   # common Vite default
        "http://127.0.0.1:5173",
        "http://127.0.0.1:58963",  # whatever port you're actually seeing right now
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(samples.router, prefix="/samples", tags=["samples"])
app.include_router(pipeline.router, prefix="/pipeline", tags=["pipeline"])