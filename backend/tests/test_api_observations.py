
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.observations import get_db
from app.services.observations import get_observations


@pytest.fixture
def client():
    session = MagicMock()

    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_health(client):
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_observations(client, monkeypatch):
    observations = [
        MagicMock(
            year=1997,
            season="DJF",
            season_order=1,
            value=0.4,
        ),
        MagicMock(
            year=1997,
            season="JFM",
            season_order=2,
            value=0.5,
        ),
    ]

    monkeypatch.setattr(
        "app.api.observations.get_observations",
        lambda **kwargs: observations,
    )

    response = client.get("/api/v1/observations")

    assert response.status_code == 200

    data = response.json()

    assert data["total"] == 2
    assert data["observations"][0]["season"] == "DJF"
    assert data["observations"][1]["season"] == "JFM"


def test_filter_years(client, monkeypatch):
    received = {}

    def fake_get_observations(**kwargs):
        received.update(kwargs)
        return []

    monkeypatch.setattr(
        "app.api.observations.get_observations",
        fake_get_observations,
    )

    response = client.get(
        "/api/v1/observations?start_year=1997&end_year=1998"
    )

    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert received["start_year"] == 1997
    assert received["end_year"] == 1998


def test_invalid_year_range(client):
    response = client.get(
        "/api/v1/observations?start_year=2000&end_year=1990"
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "query",
    [
        "start_year=1949",
        "end_year=2101",
        "start_year=abc",
    ],
)
def test_invalid_year_parameters(client, query):
    response = client.get(
        f"/api/v1/observations?{query}"
    )

    assert response.status_code == 422
