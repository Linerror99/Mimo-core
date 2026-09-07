"""
Tests pour les fonctionnalités Projets et Simulation What-If
"""
from datetime import date, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project, ProjectItem, ProjectStatus
from app.models.transaction import Transaction, TransactionState


async def create_user_account(client: AsyncClient, headers: dict, name: str = "Compte Courant", initial_balance: float = 1000.0) -> str:
    """Helper pour créer un compte rattaché à l'utilisateur authentifié"""
    res = await client.post(
        "/api/v1/accounts",
        json={
            "name": name,
            "type": "CHECKING",
            "initial_balance": initial_balance,
            "currency": "EUR"
        },
        headers=headers
    )
    assert res.status_code == 201
    return res.json()["id"]


@pytest.mark.asyncio
async def test_create_and_list_project(
    client: AsyncClient,
    test_user_headers: dict,
):
    """Tester la création d'un projet avec des items et la liste des projets"""
    acc_id = await create_user_account(client, test_user_headers, initial_balance=1000.0)

    payload = {
        "name": "Vacances Grèce 2026",
        "description": "Voyage estival 2 semaines",
        "color": "#3b82f6",
        "icon": "Plane",
        "total_budget": 2500.0,
        "items": [
            {
                "name": "Billets d'avion",
                "amount": 600.0,
                "planned_date": (date.today() + timedelta(days=20)).isoformat(),
                "account_id": acc_id,
                "notes": "Réservation Aegean"
            },
            {
                "name": "Hôtel Santorin",
                "amount": 900.0,
                "planned_date": (date.today() + timedelta(days=50)).isoformat(),
                "account_id": acc_id,
            }
        ]
    }

    resp = await client.post("/api/v1/projects", json=payload, headers=test_user_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Vacances Grèce 2026"
    assert data["status"] == "DRAFT"
    assert len(data["items"]) == 2
    assert float(data["total_planned_amount"]) == 1500.0

    project_id = data["id"]

    # Lister les projets
    list_resp = await client.get("/api/v1/projects", headers=test_user_headers)
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert any(p["id"] == project_id for p in list_data)
    target = next(p for p in list_data if p["id"] == project_id)
    assert target["items_count"] == 2
    assert float(target["total_planned_amount"]) == 1500.0


@pytest.mark.asyncio
async def test_project_items_crud(
    client: AsyncClient,
    test_user_headers: dict,
):
    """Tester l'ajout, modification et suppression d'une dépense prévisionnelle"""
    acc_id = await create_user_account(client, test_user_headers, initial_balance=1000.0)

    # 1. Créer projet vide
    p_resp = await client.post(
        "/api/v1/projects",
        json={"name": "Travaux Salon", "color": "#10b981"},
        headers=test_user_headers
    )
    assert p_resp.status_code == 201
    project_id = p_resp.json()["id"]

    # 2. Ajouter un item
    item_payload = {
        "name": "Peinture & Rouleaux",
        "amount": 150.0,
        "planned_date": (date.today() + timedelta(days=10)).isoformat(),
        "account_id": acc_id,
    }
    item_resp = await client.post(
        f"/api/v1/projects/{project_id}/items",
        json=item_payload,
        headers=test_user_headers
    )
    assert item_resp.status_code == 201
    item_data = item_resp.json()
    item_id = item_data["id"]
    assert item_data["name"] == "Peinture & Rouleaux"

    # 3. Modifier l'item
    update_resp = await client.put(
        f"/api/v1/projects/{project_id}/items/{item_id}",
        json={"amount": 180.0, "name": "Peinture Pro & Rouleaux"},
        headers=test_user_headers
    )
    assert update_resp.status_code == 200
    assert float(update_resp.json()["amount"]) == 180.0
    assert update_resp.json()["name"] == "Peinture Pro & Rouleaux"

    # 4. Supprimer l'item
    del_resp = await client.delete(
        f"/api/v1/projects/{project_id}/items/{item_id}",
        headers=test_user_headers
    )
    assert del_resp.status_code == 200

    # Vérifier que le projet a 0 item
    detail_resp = await client.get(f"/api/v1/projects/{project_id}", headers=test_user_headers)
    assert len(detail_resp.json()["items"]) == 0


@pytest.mark.asyncio
async def test_project_whatif_simulation(
    client: AsyncClient,
    test_user_headers: dict,
):
    """Tester le calcul de la simulation What-If et la détection d'alerte de viabilité"""
    acc_id = await create_user_account(client, test_user_headers, initial_balance=1000.0)

    # Créer un projet avec une dépense modérée (viable : compte a 1000€)
    p_resp = await client.post(
        "/api/v1/projects",
        json={
            "name": "Week-end Rome",
            "items": [
                {
                    "name": "AirBnB",
                    "amount": 300.0,
                    "planned_date": (date.today() + timedelta(days=15)).isoformat(),
                    "account_id": acc_id,
                }
            ]
        },
        headers=test_user_headers
    )
    assert p_resp.status_code == 201
    project_id = p_resp.json()["id"]

    sim_resp = await client.get(f"/api/v1/projects/{project_id}/simulate", headers=test_user_headers)
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert sim_data["project_name"] == "Week-end Rome"
    assert sim_data["is_viable"] is True
    assert float(sim_data["total_cost"]) == 300.0
    assert len(sim_data["timeline"]) > 0

    # Maintenant, ajouter une énorme dépense (2000€) qui va plonger le compte dans le rouge
    await client.post(
        f"/api/v1/projects/{project_id}/items",
        json={
            "name": "Dépense extravagante",
            "amount": 2000.0,
            "planned_date": (date.today() + timedelta(days=25)).isoformat(),
            "account_id": acc_id,
        },
        headers=test_user_headers
    )

    sim2_resp = await client.get(f"/api/v1/projects/{project_id}/simulate", headers=test_user_headers)
    assert sim2_resp.status_code == 200
    sim2_data = sim2_resp.json()
    assert sim2_data["is_viable"] is False
    assert len(sim2_data["warnings"]) > 0
    assert sim2_data["warnings"][0]["severity"] == "CRITICAL"
    assert "découvert" in sim2_data["warnings"][0]["message"].lower()


@pytest.mark.asyncio
async def test_project_commit_and_rollback(
    client: AsyncClient,
    test_user_headers: dict,
    db_session: AsyncSession,
):
    """Tester la validation (commit) du projet en transactions réelles et le rollback en simulation"""
    acc_id = await create_user_account(client, test_user_headers, initial_balance=1000.0)

    p_resp = await client.post(
        "/api/v1/projects",
        json={
            "name": "Achat Vélo Électrique",
            "items": [
                {
                    "name": "Acompte Magasin",
                    "amount": 200.0,
                    "planned_date": (date.today() + timedelta(days=5)).isoformat(),
                    "account_id": acc_id,
                },
                {
                    "name": "Solde Livraison",
                    "amount": 500.0,
                    "planned_date": (date.today() + timedelta(days=30)).isoformat(),
                    "account_id": acc_id,
                }
            ]
        },
        headers=test_user_headers
    )
    assert p_resp.status_code == 201
    project_id = p_resp.json()["id"]

    # 1. Validation (commit)
    commit_resp = await client.post(f"/api/v1/projects/{project_id}/commit", headers=test_user_headers)
    assert commit_resp.status_code == 200
    commit_data = commit_resp.json()
    assert commit_data["success"] is True
    assert commit_data["transactions_created"] == 2
    assert commit_data["status"] == "COMMITTED"

    # Vérifier que les transactions existent en BDD avec project_id
    tx_res = await db_session.execute(
        select(Transaction).where(Transaction.project_id == project_id)
    )
    txs = list(tx_res.scalars().all())
    assert len(txs) == 2
    for tx in txs:
        assert tx.state == TransactionState.PROJECTED
        assert "[Achat Vélo Électrique]" in tx.description

    # 2. Rollback (repasser en simulation)
    rollback_resp = await client.post(f"/api/v1/projects/{project_id}/rollback", headers=test_user_headers)
    assert rollback_resp.status_code == 200
    rollback_data = rollback_resp.json()
    assert rollback_data["success"] is True
    assert rollback_data["status"] == "DRAFT"

    # Vérifier que les transactions futures ont été supprimées
    tx_res_after = await db_session.execute(
        select(Transaction).where(Transaction.project_id == project_id)
    )
    assert len(list(tx_res_after.scalars().all())) == 0
