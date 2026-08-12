from fastapi.testclient import TestClient

from ripplelab_engine.main import app

client = TestClient(app)


def test_health_contract() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "ripplelab-economic-engine",
        "version": "0.1.0",
    }


def test_service_info_does_not_expose_environment() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "name": "RippleLab Economic Engine",
        "version": "0.1.0",
        "documentation": "/docs",
    }
