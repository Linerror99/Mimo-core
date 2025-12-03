import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """Test basic health endpoint."""
    response = await client.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_health_detailed_endpoint(client: AsyncClient):
    """Test detailed health endpoint with database and redis checks."""
    response = await client.get("/health/detailed")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "ok"
    assert data["service"] == "DuoFlow Finance API"
    assert data["version"] == "0.1.0"
    assert "checks" in data
    assert data["checks"]["database"] == "ok"
    assert data["checks"]["redis"] == "ok"
