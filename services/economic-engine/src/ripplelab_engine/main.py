"""HTTP entrypoint for the RippleLab economic engine."""

from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

from ripplelab_engine import __version__


class HealthResponse(BaseModel):
    """Stable liveness response shared with the web application."""

    status: Literal["ok"]
    service: Literal["ripplelab-economic-engine"]
    version: str


app = FastAPI(
    title="RippleLab Economic Engine",
    summary="Deterministic economic simulation API",
    version=__version__,
    docs_url="/docs",
    redoc_url=None,
)


@app.get("/", tags=["system"])
def service_info() -> dict[str, str]:
    """Describe the service without exposing environment details."""

    return {
        "name": "RippleLab Economic Engine",
        "version": __version__,
        "documentation": "/docs",
    }


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    """Return a dependency-free liveness signal."""

    return HealthResponse(
        status="ok",
        service="ripplelab-economic-engine",
        version=__version__,
    )
