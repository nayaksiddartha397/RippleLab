"""HTTP entrypoint for the RippleLab economic engine."""

from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ripplelab_engine import __version__
from ripplelab_engine.contracts import (
    ContractValidationResponse,
    SimulationRequest,
    SimulationResult,
)
from ripplelab_engine.inflation import simulate_inflation
from ripplelab_engine.repo_rate import simulate_repo_rate


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


@app.exception_handler(RequestValidationError)
async def validation_error_response(
    _request: Request,
    error: RequestValidationError,
) -> JSONResponse:
    """Return compact, field-oriented validation errors for product clients."""

    issues = [
        {
            "field": ".".join(str(part) for part in issue["loc"] if part != "body"),
            "message": issue["msg"],
            "type": issue["type"],
        }
        for issue in error.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "INVALID_SIMULATION_REQUEST",
                "message": "Check the scenario values and assumptions, then try again.",
                "issues": issues,
            }
        },
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


@app.post(
    "/v1/contracts/simulation/validate",
    response_model=ContractValidationResponse,
    tags=["contracts"],
)
def validate_simulation_request(request: SimulationRequest) -> ContractValidationResponse:
    """Validate a request without running an economic calculation."""

    return ContractValidationResponse(
        valid=True,
        schemaVersion=request.schemaVersion,
        scenarioType=request.scenario.type,
        requestId=request.requestId,
    )


@app.post(
    "/v1/simulations/repo-rate",
    response_model=SimulationResult,
    response_model_exclude_none=True,
    tags=["simulations"],
)
def run_repo_rate_simulation(request: SimulationRequest) -> SimulationResult:
    """Calculate personalized loan and deposit impacts for one repo-rate change."""

    try:
        return simulate_repo_rate(request)
    except (TypeError, ValueError) as error:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_REPO_RATE_ASSUMPTION",
                "message": str(error),
            },
        ) from error


@app.post(
    "/v1/simulations/inflation",
    response_model=SimulationResult,
    response_model_exclude_none=True,
    tags=["simulations"],
)
def run_inflation_simulation(request: SimulationRequest) -> SimulationResult:
    """Calculate category-weighted household inflation and purchasing-power impacts."""

    try:
        return simulate_inflation(request)
    except (TypeError, ValueError) as error:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_INFLATION_ASSUMPTION",
                "message": str(error),
            },
        ) from error
