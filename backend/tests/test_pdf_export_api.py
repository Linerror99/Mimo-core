"""
Tests for PDF Export API Endpoints

Tests POST /api/v1/exports/pdf
"""
import pytest
from datetime import date
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_export_pdf_success(client: AsyncClient, test_user_headers):
    """Test export PDF avec année et mois valides"""
    today = date.today()
    
    response = await client.post(
        "/api/v1/exports/pdf",
        params={"year": today.year, "month": today.month},
        headers=test_user_headers
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "Content-Disposition" in response.headers
    assert "rapport_financier" in response.headers["Content-Disposition"]
    assert len(response.content) > 0
    assert response.content[:4] == b'%PDF'


@pytest.mark.asyncio
async def test_export_pdf_specific_month(client: AsyncClient, test_user_headers):
    """Test export PDF pour un mois spécifique"""
    response = await client.post(
        "/api/v1/exports/pdf",
        params={"year": 2025, "month": 12},
        headers=test_user_headers
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"


@pytest.mark.asyncio
async def test_export_pdf_invalid_month(client: AsyncClient, test_user_headers):
    """Test export PDF avec mois invalide"""
    response = await client.post(
        "/api/v1/exports/pdf",
        params={"year": 2025, "month": 13},  # Mois invalide
        headers=test_user_headers
    )
    
    assert response.status_code == 422  # Validation error from Query constraint


@pytest.mark.asyncio
async def test_export_pdf_invalid_month_zero(client: AsyncClient, test_user_headers):
    """Test export PDF avec mois 0"""
    response = await client.post(
        "/api/v1/exports/pdf",
        params={"year": 2025, "month": 0},
        headers=test_user_headers
    )
    
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_export_pdf_invalid_year(client: AsyncClient, test_user_headers):
    """Test export PDF avec année invalide"""
    response = await client.post(
        "/api/v1/exports/pdf",
        params={"year": 1900, "month": 12},  # Année hors limites
        headers=test_user_headers
    )
    
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_export_pdf_missing_params(client: AsyncClient, test_user_headers):
    """Test export PDF sans paramètres requis"""
    response = await client.post(
        "/api/v1/exports/pdf",
        headers=test_user_headers
    )
    
    assert response.status_code == 422  # Missing required params


@pytest.mark.asyncio
async def test_export_pdf_missing_year(client: AsyncClient, test_user_headers):
    """Test export PDF sans année"""
    response = await client.post(
        "/api/v1/exports/pdf",
        params={"month": 12},
        headers=test_user_headers
    )
    
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_export_pdf_missing_month(client: AsyncClient, test_user_headers):
    """Test export PDF sans mois"""
    response = await client.post(
        "/api/v1/exports/pdf",
        params={"year": 2025},
        headers=test_user_headers
    )
    
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_export_pdf_unauthorized(client: AsyncClient):
    """Test export PDF sans authentification"""
    today = date.today()
    
    response = await client.post(
        "/api/v1/exports/pdf",
        params={"year": today.year, "month": today.month}
    )
    
    assert response.status_code == 403  # FastAPI returns 403 for missing auth


@pytest.mark.asyncio
async def test_export_pdf_filename_format(client: AsyncClient, test_user_headers):
    """Test que le nom de fichier est correct"""
    response = await client.post(
        "/api/v1/exports/pdf",
        params={"year": 2025, "month": 12},
        headers=test_user_headers
    )
    
    assert response.status_code == 200
    disposition = response.headers["Content-Disposition"]
    assert "rapport_financier_2025_12.pdf" in disposition


@pytest.mark.asyncio
async def test_export_pdf_content_length(client: AsyncClient, test_user_headers):
    """Test que le PDF a une taille raisonnable"""
    today = date.today()
    
    response = await client.post(
        "/api/v1/exports/pdf",
        params={"year": today.year, "month": today.month},
        headers=test_user_headers
    )
    
    assert response.status_code == 200
    # PDF should be at least 500 bytes (even empty)
    assert len(response.content) >= 500
